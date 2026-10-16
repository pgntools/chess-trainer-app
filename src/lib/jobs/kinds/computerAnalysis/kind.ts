import type { JobError, JobKind, JobOutput } from "@pgntools/jobs-runtime";

import { addCaseLinks } from "../../../analysisCaseLinkStore";
import { addAnalysisCases, loadAnalysisCases, mergeIntoAnalysisCase } from "../../../analysisCaseStore";
import { loadAnalysisProjects } from "../../../analysisProjectStore";
import { gameCaseOf } from "../../../analysisProjects";
import type { PositionResult } from "../../../computerAnalysis";
import { treeToPgn } from "../../../gameTree";
import { parsePgnTree } from "../../../pgn";
import { EngineSessionError, type EngineSessionDeps } from "../../engineSession";
import { ENGINE_HEARTBEAT_MS, ENGINE_RETRY, endEngineRun, EngineServerUnreachableError, engineRunOf, evaluateInRun } from "../engineRuns";
import {
  ANALYSIS_CASE_ENTITY,
  analysisOf,
  COMPUTER_ANALYSIS_KIND,
  COMPUTER_ANALYSIS_KIND_VERSION,
  ComputerAnalysisError,
  mergedPgnOf,
  moveLabelOf,
  outputPlansOf,
  parseInput,
  parseState as parseCoreState,
  planOf,
  readInput,
  sourceTreeOf,
  stepOf,
  subjectsOf,
  titleOf,
  type ComputerAnalysisInput,
  type ComputerAnalysisState,
  type RanEngine,
} from "./core";

/**
 * **The computer-analysis kind** (CTA-221, `analysis.computer-analysis`) — a
 * Case's computer analysis on the jobs runtime: the adapter over the kind's
 * pure core (`core.ts`, CTA-218) and the app's stores, Jobs V2's behaviour
 * (`.claude/rules/analysis-v2.md` §6 as it stood) but for the deletion rule.
 *
 * - **Engine lane, resumable, never resumed unasked** (`autoResume: false`):
 *   a tab closed mid-run leaves it interrupted, and Resume goes on from its
 *   checkpoint — one position per step, through the run's engine session
 *   (`engineRuns.ts`).
 * - **Its state is the core's** — the positions and their checkpoint — with
 *   **the engine that ran it** (`engine`), the annotator its outputs name.
 * - **Outputs**, decided at `finalize` and applied once each by key: a
 *   ticked variant's new Game Case, its id `<jobId>:<variant>` (an id already
 *   there is success), linked from the source Case; or the one variant
 *   merged into the source Case (a merge the Case holds is a no-op). A
 *   Project or Case gone fails it `target`.
 * - **Errors** keep Jobs V2's codes — `source`, `engine`, `storage`,
 *   `too-many`, `target` (`jobs.kinds.computerAnalysis.errors.*`). An engine
 *   server gone away is retried (3 attempts from 30 s); every other error
 *   fails at once, its checkpoint kept.
 */

/** The state: the core's, and the engine that ran it — `null` until a step names it. */
export type ComputerAnalysisJobState = ComputerAnalysisState & { engine: RanEngine | null };

/** An output decided — the core's plan with what applying it needs, since `applyOutput` sees no state. */
export type ComputerAnalysisJobPlan =
  | { key: string; kind: "new-case"; variant: string; projectId: string; caseId: string; name: string; pgn: string }
  | {
      key: string;
      kind: "merge";
      variant: string;
      projectId: string;
      caseId: string;
      checkpoint: (PositionResult | null)[];
      engine: RanEngine | null;
    };

const isRow = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const ranEngineFrom = (value: unknown): RanEngine | null =>
  isRow(value) && typeof value.id === "string" && typeof value.name === "string"
    ? { id: value.id, name: value.name, version: typeof value.version === "string" ? value.version : "" }
    : null;

/** **A stored state, read back** — the core's reader, the engine beside it read leniently. */
const parseComputerAnalysisState = (value: unknown, fromVersion: number): ComputerAnalysisJobState | undefined => {
  const state = parseCoreState(value, fromVersion);
  return state === undefined ? undefined : { ...state, engine: ranEngineFrom(isRow(value) ? value.engine : undefined) };
};

/**
 * **A stored job of this kind, read back** for a screen — its input
 * (leniently, as Jobs V2 read its rows) and its state, `null` before it is
 * planned; `undefined` for a record of another kind or an input that does not read.
 */
export const readComputerAnalysisJob = (record: {
  kind: string;
  kindVersion: number;
  input: unknown;
  state: unknown;
}): { input: ComputerAnalysisInput; state: ComputerAnalysisJobState | null } | undefined => {
  if (record.kind !== COMPUTER_ANALYSIS_KIND) return undefined;
  const input = readInput(record.input);
  if (input === undefined) return undefined;
  return { input, state: record.state === null ? null : (parseComputerAnalysisState(record.state, record.kindVersion) ?? null) };
};

/** **An error as the runtime records it** — the kind's code, retryable only for an engine server gone. */
export const classifyComputerAnalysisError = (error: unknown): JobError => {
  if (error instanceof ComputerAnalysisError) return { code: error.code, retryable: false };
  if (error instanceof EngineServerUnreachableError) return { code: "engine", message: error.message, retryable: true };
  if (error instanceof EngineSessionError) return { code: "engine", message: error.message, retryable: false };
  return { code: "engine", message: error instanceof Error ? error.message : String(error), retryable: false };
};

/** The step's abort as an error — the runtime ignores what an aborted step answers. */
const aborted = (signal: AbortSignal): unknown => signal.reason ?? new DOMException("The step was stopped.", "AbortError");

export type ComputerAnalysisKindDeps = { engine?: EngineSessionDeps };

/** **The kind** — `deps` a test's engine and timeouts. */
export const computerAnalysisKind = ({ engine }: ComputerAnalysisKindDeps = {}): JobKind<
  ComputerAnalysisInput,
  ComputerAnalysisJobState,
  ComputerAnalysisJobPlan
> => ({
  id: COMPUTER_ANALYSIS_KIND,
  version: COMPUTER_ANALYSIS_KIND_VERSION,
  lane: "engine",
  appliesTo: [ANALYSIS_CASE_ENTITY],
  resumable: true,
  autoResume: false,
  retry: ENGINE_RETRY,
  timeouts: { heartbeatMs: ENGINE_HEARTBEAT_MS },

  parseInput,
  parseState: parseComputerAnalysisState,
  title: titleOf,
  subjects: subjectsOf,

  plan: async (input) => {
    const planned = planOf(input);
    if (planned === undefined) throw new ComputerAnalysisError("source");
    return { state: { ...planned.state, engine: null }, progress: planned.progress };
  },

  step: async (state, input, ctx) => {
    const session = await engineRunOf(
      ctx,
      { jobId: ctx.jobId, name: input.source.name, search: input.options, preset: input.preset.values },
      engine,
    );
    if (ctx.signal.aborted) throw aborted(ctx.signal);
    const { positions } = state;
    const step = await stepOf(state, input, (position, index) =>
      evaluateInRun(ctx, session, (hooks) => session.evaluate({ ...position, index, moveLabel: moveLabelOf(positions[index]) }, hooks)),
    );
    if (step === undefined) {
      if (ctx.signal.aborted) throw aborted(ctx.signal);
      throw new ComputerAnalysisError("engine");
    }
    const { id, name, version } = session.engine;
    return { state: { ...step.state, engine: { id, name, version } }, progress: step.progress, done: step.done };
  },

  finalize: async (state, input, ctx) => {
    endEngineRun(ctx.jobId);
    const tree = sourceTreeOf(input);
    if (tree === undefined) throw new ComputerAnalysisError("source");
    return outputPlansOf(state, input, ctx.jobId).map((plan): ComputerAnalysisJobPlan =>
      plan.kind === "merge"
        ? { ...plan, checkpoint: state.checkpoint, engine: state.engine }
        : { ...plan, pgn: treeToPgn(analysisOf(state, input, tree, plan.variant, state.engine)) },
    );
  },

  applyOutput: async (plan, input, ctx): Promise<JobOutput> => {
    const at = ctx.now();
    if (plan.kind === "merge") {
      const problem = await mergeIntoAnalysisCase(
        plan.caseId,
        ctx.jobId,
        (pgn) => mergedPgnOf({ checkpoint: plan.checkpoint }, input, pgn, plan.engine),
        at,
      );
      if (problem === "gone") throw new ComputerAnalysisError("target");
      if (problem !== undefined) throw new ComputerAnalysisError(problem === "too-many" ? "too-many" : "storage");
      return { key: plan.key, kind: "entity", ref: { type: ANALYSIS_CASE_ENTITY, id: plan.caseId }, label: input.source.name };
    }
    if (!(await loadAnalysisProjects()).some((project) => project.id === plan.projectId)) throw new ComputerAnalysisError("target");
    let tree;
    try {
      tree = parsePgnTree(plan.pgn);
    } catch {
      throw new ComputerAnalysisError("source");
    }
    const record = gameCaseOf({ id: plan.caseId, projectId: plan.projectId, name: plan.name, now: at }, tree);
    await loadAnalysisCases();
    // Its id is the job's and the variant's: a Case already there (an earlier apply) is this one, made.
    const problem = await addAnalysisCases([record]);
    if (problem !== undefined) throw new ComputerAnalysisError(problem === "too-many" ? "too-many" : "storage");
    // Linked from its source — the Case is made either way, so a refused link does not fail the job.
    await addCaseLinks([{ fromId: input.source.caseId, toId: record.id }], at);
    return { key: plan.key, kind: "entity", ref: { type: ANALYSIS_CASE_ENTITY, id: record.id }, label: plan.name };
  },

  classifyError: classifyComputerAnalysisError,
});
