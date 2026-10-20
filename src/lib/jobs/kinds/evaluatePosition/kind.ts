import type { JobError, JobKind, JobOutput } from "@pgntools/jobs-runtime";

import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS, turnOf, type PositionResult } from "../../../computerAnalysis";
import { sessionEvents } from "../../../findBestMove/reducer";
import { editSessionCase } from "../../../findBestMove/store";
import { EngineSessionError, type EngineSessionDeps } from "../../engineSession";
import { ENGINE_HEARTBEAT_MS, ENGINE_RETRY, endEngineRun, EngineServerUnreachableError, engineRunOf, evaluateInRun } from "../engineRuns";
import {
  EVALUATE_POSITION_KIND,
  EVALUATE_POSITION_RESULT_SCHEMA,
  EVALUATE_POSITION_STATE_VERSION,
  parseEvaluatePositionInput,
  parseEvaluatePositionState,
  type EvaluatePositionInput,
  type EvaluatePositionState,
} from "./core";

/**
 * **The Evaluate Position kind** (CTA-238; `analysis.evaluate-session-position`
 * since CTA-244) — one position searched once, through the run's engine
 * session (`engineRuns.ts`); engine lane. Queued by the Accuracy Trainer's
 * Find Best Move alone — `appliesTo` is empty, so no New-job dialog offers it.
 *
 * - **One step**: the search (MultiPV the lines asked for, to the depth
 *   asked — no early stop), its result the state. Small enough to start
 *   again: not resumable from a checkpoint, and **re-queued by itself** after
 *   a lost lease (`autoResume`) rather than waiting for Resume.
 * - **Outputs**: the result (data, `analysis.evaluate-position.result@1`),
 *   then **the session's record takes it** — `editSessionCase(caseId,
 *   [engineSearched(key, jobId, result)])`, the session's one writer: the
 *   lines merged into the position's in its tags, the movetext re-derived.
 *   The event is idempotent — applied twice, written once — and commutes
 *   with the screen's writes; it lands with the trainer closed too.
 * - **Errors**: `engine`, `storage`, `target` (the Case gone, or no longer
 *   a session); an engine server gone away is retried.
 */

export const EVALUATE_POSITION_ERRORS = ["engine", "storage", "target"] as const;
type ErrorCode = (typeof EVALUATE_POSITION_ERRORS)[number];

class EvaluatePositionError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, message: string = code) {
    super(message);
    this.name = "EvaluatePositionError";
    this.code = code;
  }
}

/** An output decided — the result, then its lines into the Case. */
export type EvaluatePositionPlan =
  | { key: "result"; kind: "data"; schema: typeof EVALUATE_POSITION_RESULT_SCHEMA; value: PositionResult }
  | { key: "case"; kind: "case"; result: PositionResult };

const classifyEvaluatePositionError = (error: unknown): JobError => {
  if (error instanceof EvaluatePositionError) return { code: error.code, message: error.message, retryable: false };
  if (error instanceof EngineServerUnreachableError) return { code: "engine", message: error.message, retryable: true };
  if (error instanceof EngineSessionError) return { code: "engine", message: error.message, retryable: false };
  return { code: "engine", message: error instanceof Error ? error.message : String(error), retryable: false };
};

const aborted = (signal: AbortSignal): unknown => signal.reason ?? new DOMException("The step was stopped.", "AbortError");

export type EvaluatePositionKindDeps = { engine?: EngineSessionDeps };

export const evaluatePositionKind = ({ engine }: EvaluatePositionKindDeps = {}): JobKind<
  EvaluatePositionInput,
  EvaluatePositionState,
  EvaluatePositionPlan
> => ({
  id: EVALUATE_POSITION_KIND,
  version: EVALUATE_POSITION_STATE_VERSION,
  lane: "engine",
  appliesTo: [],
  resumable: false,
  autoResume: true,
  retry: ENGINE_RETRY,
  timeouts: { heartbeatMs: ENGINE_HEARTBEAT_MS },

  parseInput: parseEvaluatePositionInput,
  parseState: parseEvaluatePositionState,
  title: (input) => input.name,
  subjects: (input) => [{ type: "analysis-case", id: input.caseId }],

  plan: async () => ({ state: { result: null, engine: null }, progress: { done: 0, total: 1, label: "" } }),

  step: async (state, input, ctx) => {
    if (state.result !== null) return { state, progress: { done: 1, total: 1, label: input.label }, done: true };
    const session = await engineRunOf(
      ctx,
      {
        jobId: ctx.jobId,
        name: input.name,
        search: {
          engine: input.engine,
          depth: input.search.depth,
          moveTimeMs: input.search.moveTimeMs,
          threads: input.search.threads,
          hashMb: input.search.hashMb,
          // No early stop: the position is searched to the depth asked.
          minDepth: input.search.depth,
          variationRangeCp: DEFAULT_COMPUTER_ANALYSIS_OPTIONS.variationRangeCp,
        },
        preset: input.preset?.values ?? {},
      },
      engine,
    );
    if (ctx.signal.aborted) throw aborted(ctx.signal);
    const result = await evaluateInRun(ctx, session, (hooks) =>
      session.evaluate(
        { fen: input.fen, turn: turnOf(input.fen), multiPv: input.search.multiPv, terminal: false, analysed: true, index: 0, moveLabel: input.label },
        hooks,
      ),
    );
    if (result === undefined) throw aborted(ctx.signal);
    const { id, name, version } = session.engine;
    return { state: { result, engine: { id, name, version } }, progress: { done: 1, total: 1, label: input.label }, done: true };
  },

  finalize: async (state, _input, ctx) => {
    endEngineRun(ctx.jobId);
    if (state.result === null) throw new EvaluatePositionError("engine", "The position was not searched.");
    return [
      { key: "result", kind: "data", schema: EVALUATE_POSITION_RESULT_SCHEMA, value: state.result },
      { key: "case", kind: "case", result: state.result },
    ];
  },

  applyOutput: async (plan, input, ctx): Promise<JobOutput> => {
    if (plan.kind === "data") return { key: plan.key, kind: "data", schema: plan.schema, value: plan.value };
    // The search into the session's record as its Case holds it now — an event, so a second apply writes nothing.
    const problem = await editSessionCase(input.caseId, [sessionEvents.engineSearched(input.key, ctx.jobId, plan.result)], { now: ctx.now() });
    if (problem === "gone") throw new EvaluatePositionError("target", "The session's case is gone.");
    if (problem === "not-a-session") throw new EvaluatePositionError("target", "The case holds no session.");
    if (problem !== undefined) throw new EvaluatePositionError("storage", "The case could not be written.");
    return { key: plan.key, kind: "entity", ref: { type: "analysis-case", id: input.caseId }, label: input.name };
  },

  classifyError: classifyEvaluatePositionError,
});
