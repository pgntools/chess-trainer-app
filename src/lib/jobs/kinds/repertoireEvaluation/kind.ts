import type { JobError, JobKind, JobOutput } from "@pgntools/jobs-runtime";

import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS } from "../../../computerAnalysis";
import { annotatorOf } from "../../../engineEvals";
import { parsePgnTree } from "../../../pgn";
import { addRepertoires, loadSavedRepertoires } from "../../../savedRepertoireStore";
import { repertoireCopyOf, savedRepertoireOf } from "../../../savedRepertoires";
import { EngineSessionError, type EngineSessionDeps } from "../../engineSession";
import { ENGINE_HEARTBEAT_MS, ENGINE_RETRY, endEngineRun, EngineServerUnreachableError, engineRunOf, evaluateInRun } from "../engineRuns";
import type { RanEngine } from "../computerAnalysis/core";
import {
  outputPlansOf,
  parseRepertoireEvaluationInput,
  parseRepertoireEvaluationState,
  planOf,
  progressOf,
  REPERTOIRE_EVALUATION_KIND,
  REPERTOIRE_EVALUATION_REPORT_SCHEMA,
  REPERTOIRE_EVALUATION_STATE_VERSION,
  RepertoireEvaluationError,
  stepOf,
  type RepertoireEvaluationInput,
  type RepertoireEvaluationReport,
  type RepertoireEvaluationState,
} from "./core";

/**
 * **The repertoire-evaluation kind** (CTA-221, `repertoire.evaluation`) — the
 * adapter over CTA-219's core: the engine over every position of a
 * repertoire up to a ply limit, one position a step, through the run's
 * engine session (`engineRuns.ts`); engine lane, resumable, never resumed
 * unasked.
 *
 * - **Its state is the core's** (keyed by FEN, a fingerprint of what planned
 *   it) with **the engine that ran it**, the annotator its outputs name.
 * - **Outputs**: always the report (data, `repertoire.evaluation.report@1`);
 *   ticked, a new repertoire "<name> — evaluated" — its id the job's
 *   (`evaluatedRepertoireId`; an id already there is success) — and the
 *   annotated PGN as a file, written and sealed at `finalize`.
 * - **Errors**: `source` (the PGN does not read), `engine`, `storage`,
 *   `too-many` (`jobs.kinds.repertoireEvaluation.errors.*`); an engine server
 *   gone away is retried.
 */

export const REPERTOIRE_EVALUATION_ERRORS = ["source", "engine", "storage", "too-many"] as const;
type ErrorCode = (typeof REPERTOIRE_EVALUATION_ERRORS)[number];

class RepertoireEvaluationOutputError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode) {
    super(code);
    this.name = "RepertoireEvaluationOutputError";
    this.code = code;
  }
}

/** The state: the core's, and the engine that ran it — `null` until a step names it. */
export type RepertoireEvaluationJobState = RepertoireEvaluationState & { engine: RanEngine | null };

/** An output decided — the report, the new repertoire, or the sealed file. */
export type RepertoireEvaluationJobPlan =
  | { key: "report"; kind: "data"; schema: typeof REPERTOIRE_EVALUATION_REPORT_SCHEMA; value: RepertoireEvaluationReport }
  | { key: "repertoire"; kind: "repertoire"; repertoireId: string; name: string; pgn: string }
  | { key: "pgn-file"; kind: "artifact"; artifactId: string; name: string; mimeType: string; size: number };

const isRow = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const ranEngineFrom = (value: unknown): RanEngine | null =>
  isRow(value) && typeof value.id === "string" && typeof value.name === "string"
    ? { id: value.id, name: value.name, version: typeof value.version === "string" ? value.version : "" }
    : null;

const parseRepertoireEvaluationJobState = (value: unknown, fromVersion: number): RepertoireEvaluationJobState | undefined => {
  const state = parseRepertoireEvaluationState(value, fromVersion);
  return state === undefined ? undefined : { ...state, engine: ranEngineFrom(isRow(value) ? value.engine : undefined) };
};

const classifyRepertoireEvaluationError = (error: unknown): JobError => {
  if (error instanceof RepertoireEvaluationError || error instanceof RepertoireEvaluationOutputError) {
    return { code: error.code, message: error.message, retryable: false };
  }
  if (error instanceof EngineServerUnreachableError) return { code: "engine", message: error.message, retryable: true };
  if (error instanceof EngineSessionError) return { code: "engine", message: error.message, retryable: false };
  return { code: "engine", message: error instanceof Error ? error.message : String(error), retryable: false };
};

const aborted = (signal: AbortSignal): unknown => signal.reason ?? new DOMException("The step was stopped.", "AbortError");

/** The file's artifact key — its one part, written at `finalize`. */
const PGN_FILE_KEY = "pgn-file";

export type RepertoireEvaluationKindDeps = { engine?: EngineSessionDeps };

export const repertoireEvaluationKind = ({ engine }: RepertoireEvaluationKindDeps = {}): JobKind<
  RepertoireEvaluationInput,
  RepertoireEvaluationJobState,
  RepertoireEvaluationJobPlan
> => ({
  id: REPERTOIRE_EVALUATION_KIND,
  version: REPERTOIRE_EVALUATION_STATE_VERSION,
  lane: "engine",
  appliesTo: ["repertoire"],
  resumable: true,
  autoResume: false,
  retry: ENGINE_RETRY,
  timeouts: { heartbeatMs: ENGINE_HEARTBEAT_MS },

  parseInput: parseRepertoireEvaluationInput,
  parseState: parseRepertoireEvaluationJobState,
  title: (input) => input.name,
  subjects: (input) => [{ type: "repertoire", id: input.repertoireId }],

  plan: async (input) => {
    const planned = planOf(input);
    if (planned === undefined) throw new RepertoireEvaluationError("source", "The repertoire's PGN does not read.");
    return { state: { ...planned.state, engine: null }, progress: planned.progress };
  },

  step: async (state, input, ctx) => {
    const session = await engineRunOf(
      ctx,
      {
        jobId: ctx.jobId,
        name: input.name,
        search: {
          engine: input.engine,
          ...input.search,
          // No early stop: every position is searched to the depth asked.
          minDepth: input.search.depth,
          variationRangeCp: DEFAULT_COMPUTER_ANALYSIS_OPTIONS.variationRangeCp,
        },
        preset: input.preset?.values ?? {},
      },
      engine,
    );
    if (ctx.signal.aborted) throw aborted(ctx.signal);
    const label = progressOf(state).label;
    const index = state.positions.findIndex((position) => state.results[position.key] === undefined);
    const stepped = await stepOf(state, input, async (request) => {
      const result = await evaluateInRun(ctx, session, (hooks) =>
        session.evaluate({ ...request, terminal: false, analysed: true, index: Math.max(0, index), moveLabel: label }, hooks),
      );
      if (result === undefined && ctx.signal.aborted) throw aborted(ctx.signal);
      return result;
    });
    const { id, name, version } = session.engine;
    return { state: { ...stepped.state, engine: { id, name, version } }, progress: stepped.progress, done: stepped.done };
  },

  finalize: async (state, input, ctx) => {
    endEngineRun(ctx.jobId);
    const annotator = state.engine === null ? undefined : annotatorOf(state.engine);
    const plans: RepertoireEvaluationJobPlan[] = [];
    for (const plan of outputPlansOf(state, input, ctx.jobId, { annotator })) {
      if (plan.kind !== "artifact") {
        plans.push(plan);
        continue;
      }
      // The file is one part, sealed now: a re-run writes the same part and gets the same artifact back.
      await ctx.artifacts.writePart(PGN_FILE_KEY, 0, plan.text);
      const sealed = await ctx.artifacts.seal(PGN_FILE_KEY, { name: plan.name, mimeType: plan.mimeType });
      plans.push({ key: plan.key, kind: "artifact", artifactId: sealed.artifactId, name: plan.name, mimeType: plan.mimeType, size: sealed.size });
    }
    return plans;
  },

  applyOutput: async (plan, input, ctx): Promise<JobOutput> => {
    if (plan.kind === "data") return { key: plan.key, kind: "data", schema: plan.schema, value: plan.value };
    if (plan.kind === "artifact") {
      return { key: plan.key, kind: "artifact", artifactId: plan.artifactId, name: plan.name, mimeType: plan.mimeType, size: plan.size };
    }
    let tree;
    try {
      tree = parsePgnTree(plan.pgn);
    } catch {
      throw new RepertoireEvaluationOutputError("source");
    }
    const at = ctx.now();
    const source = (await loadSavedRepertoires()).find((saved) => saved.id === input.repertoireId);
    // Beside its source — its settings and folder kept — or, the source gone since, a repertoire of its own.
    const record =
      source === undefined
        ? savedRepertoireOf(plan.repertoireId, { index: 0, name: plan.name, pgn: plan.pgn, tree }, plan.name, undefined, at)
        : repertoireCopyOf(source, tree, plan.repertoireId, plan.name, at);
    // Its id is the job's: one already there (an earlier apply) is this one, made.
    const problem = await addRepertoires([record]);
    if (problem !== undefined) throw new RepertoireEvaluationOutputError(problem === "too-many" ? "too-many" : "storage");
    return { key: plan.key, kind: "entity", ref: { type: "repertoire", id: plan.repertoireId }, label: plan.name };
  },

  classifyError: classifyRepertoireEvaluationError,
});
