import {
  COMPUTER_ANALYSIS_ERRORS,
  COMPUTER_ANALYSIS_KIND_VERSION,
  COMPUTER_ANALYSIS_TARGET_KINDS,
  analysisOf,
  isComputerAnalysisVariant,
  mergedPgnOf,
  moveLabelOf,
  outputNameOf,
  parseInput,
  parseState,
  planOf,
  readInput,
  searchOf,
  type ComputerAnalysisErrorCode,
  type ComputerAnalysisInput,
  type ComputerAnalysisPreset,
  type ComputerAnalysisSource,
  type ComputerAnalysisTarget,
  type ComputerAnalysisTargetKind,
  type JobPosition,
  type RanEngine,
} from "./jobs/kinds/computerAnalysis/core";
import type { ComputerAnalysisOptions, ComputerAnalysisVariant, PositionResult } from "./computerAnalysis";
import type { GameTree } from "./gameTree";

/**
 * **Jobs V2, the record** (CTA-188) — Analysis V2's own background jobs: a
 * **Case's computer analysis**, run by its own runner (`lib/jobV2Runner.ts`)
 * and kept in Analysis V2's database (`lib/jobV2Store.ts`, the `jobs` object
 * store of `chessapp.analysisProjects`). Begun as a clone of the legacy Jobs
 * (CTA-173, removed in CTA-192, which folded its pure parts in here: the
 * statuses, the positions, the checkpoint's reader, the progress). The
 * reference is `.claude/rules/analysis-v2.md` §6.
 *
 * - **its source is a Case** — its Project, its id, its name and the PGN as
 *   sent (the tree on the board then);
 * - **its options carry the engine and the edited search** — depth, move
 *   time, Threads and Hash as the popup left them — and **its preset** as it
 *   was given (`preset`: its id, name and the values it sends), which the
 *   runner sends — never whatever preset is selected when it runs;
 * - **its target** — where the results go: new Game Cases in the source's
 *   Project, new Game Cases in another Project, or **merged into the source
 *   Case** (one variant). Every new Case is linked from the source Case.
 *
 * ```
 * queued ──▶ running ──▶ done
 *    ▲          │ ├────▶ failed ──────┐
 *    │          │ └────▶ cancelled    │
 *    │          ▼ (a reload)          │
 *    ├──── interrupted ◀──────────────┘ Resume (interrupted, paused, failed → queued)
 *    │
 *    └──── paused ◀── Pause (queued, running)
 * ```
 *
 * **Its pure parts are the Jobs module's computer-analysis kind's** since
 * CTA-218 (`lib/jobs/kinds/computerAnalysis/core.ts` — the input, the
 * positions and their checkpoint, the plan, the analysis and the merge):
 * this file re-exports them under their Jobs V2 names and builds the record
 * over them, until the Jobs module retires it (CTA-215).
 */

const JOB_STATUSES = ["queued", "running", "paused", "interrupted", "done", "failed", "cancelled"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export type { JobPosition };

/** The engine that ran the job — the one actually running, which the job's choice may have fallen back from. */
type JobEngine = RanEngine;

/** The statuses a job ends in. */
export const isFinishedJob = (job: { status: JobStatus }): boolean =>
  job.status === "done" || job.status === "failed" || job.status === "cancelled";

/** Waiting for the runner, or being run. */
const isActiveJob = (job: { status: JobStatus }): boolean => job.status === "queued" || job.status === "running";

/** Cancel stops a job that has not ended. */
export const canCancelJob = (job: { status: JobStatus }): boolean =>
  job.status === "queued" || job.status === "running" || job.status === "paused" || job.status === "interrupted";

/** Pause stops a job waiting or being run, its checkpoint kept, until the reader resumes it (CTA-178). */
export const canPauseJob = (job: { status: JobStatus }): boolean => isActiveJob(job);

/** Resume queues a job the reader paused, or a reload or a failure stopped — it goes on from its checkpoint. */
export const canResumeJob = (job: { status: JobStatus }): boolean =>
  job.status === "paused" || job.status === "interrupted" || job.status === "failed";

/** The source's tree and the positions the options name — `undefined` for a PGN that does not read (the kind's `searchOf`). */
export const jobSearchOf = searchOf;

/** **How far a job has got**: positions with a result, of how many, and the first one still to search. */
export type JobProgress = {
  done: number;
  total: number;
  /** The position searched now (or next); absent once every one has a result. */
  current?: JobPosition;
  /** `done / total` as 0–100. */
  percent: number;
};

export const jobProgress = (job: { positions: readonly JobPosition[]; checkpoint: readonly (PositionResult | null)[] }): JobProgress => {
  const total = job.positions.length;
  const done = job.checkpoint.filter((entry) => entry !== null).length;
  const next = job.checkpoint.findIndex((entry) => entry === null);
  return {
    done,
    total,
    ...(next === -1 ? {} : { current: job.positions[next] }),
    percent: total === 0 ? 100 : Math.round((done / total) * 100),
  };
};

/** The move a position's search is about, as a reader numbers it — "7. Nf3", "7... Nc6" (the kind's `moveLabelOf`). */
export const jobMoveLabel = moveLabelOf;

/** What went wrong — `analysisV2.jobs.errors.<code>` (the kind's error codes). */
export const JOB_V2_ERRORS = COMPUTER_ANALYSIS_ERRORS;
export type JobV2Error = ComputerAnalysisErrorCode;

/** **What was analysed** — a Case, and its tree as it was sent. */
export type JobV2Source = ComputerAnalysisSource;

/** **The preset the job was given** — its id and name, and the option values it sends. */
export type JobV2Preset = ComputerAnalysisPreset;

/** **Where the results go** — new Cases in the source's Project or another, or merged into the source Case. */
export type JobV2Target = ComputerAnalysisTarget;

export const JOB_V2_TARGET_KINDS = COMPUTER_ANALYSIS_TARGET_KINDS;
export type JobV2TargetKind = ComputerAnalysisTargetKind;

/** One variant's result: the Case it is — a new one, or the source merged into. */
export type JobV2Output = { variant: ComputerAnalysisVariant; projectId: string; caseId: string };

export type JobV2 = {
  id: string;
  kind: "computer-analysis";
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  source: JobV2Source;
  /** The engine (`engine`), the search as edited (`depth`, `moveTimeMs`, `threads`, `hashMb`) and the rest of the form. */
  options: ComputerAnalysisOptions;
  preset: JobV2Preset;
  target: JobV2Target;
  /** The engine that actually ran it — `null` until it first runs. */
  engine: JobEngine | null;
  positions: JobPosition[];
  /** A result per position, by index — `null` where it has none yet. Always as long as `positions`. */
  checkpoint: (PositionResult | null)[];
  /** The Cases made, or the source merged into, once it is done. */
  outputs: JobV2Output[];
  error: JobV2Error | null;
};

/** What the popup sends — the kind's input. */
export type JobV2Request = ComputerAnalysisInput;

/** How many Jobs V2 are kept — past it the oldest finished go (`lib/jobV2Store.ts`). */
export const MAX_JOBS_V2 = 100;

/** A new Case's name: "<case> - computer analysis (<variant>)" (the kind's `outputNameOf`). */
export const jobV2OutputName = outputNameOf;

/**
 * **A new job from the popup's request**, queued — or `undefined` when there
 * is nothing to run: a PGN that does not read, no analysed move, no variant
 * ticked, or — merged into the source Case — more than one (the kind's
 * `parseInput`, then its `planOf`).
 */
export const jobV2Of = (id: string, request: JobV2Request, now: Date = new Date()): JobV2 | undefined => {
  const input = parseInput(request);
  const plan = input === undefined ? undefined : planOf(input);
  if (input === undefined || plan === undefined) return undefined;
  const at = now.toISOString();
  return {
    id,
    kind: "computer-analysis",
    status: "queued",
    createdAt: at,
    updatedAt: at,
    startedAt: null,
    finishedAt: null,
    ...input,
    engine: null,
    ...plan.state,
    outputs: [],
    error: null,
  };
};

/** The job with position `index`'s result written down. */
export const withCheckpointV2 = (job: JobV2, index: number, result: PositionResult, now: Date = new Date()): JobV2 => ({
  ...job,
  checkpoint: job.checkpoint.map((entry, at) => (at === index ? result : entry)),
  updatedAt: now.toISOString(),
});

/**
 * **A job's analysis on a tree** — one variant's annotated tree over `tree`,
 * whatever it holds now, the job's results given by FEN (the kind's
 * `analysisOf`, the engine that ran it the annotator). How the results are
 * **merged into the source Case** — by the runner on the Case as stored, and
 * by an open board on the tree it holds (`annotateTree`, which keeps every node).
 */
export const jobV2AnalysisOf = (job: JobV2, tree: GameTree, variant: ComputerAnalysisVariant): GameTree =>
  analysisOf(job, job, tree, variant, job.engine);

/** The source-Case merge as a PGN edit — what `mergeIntoAnalysisCase` takes; `undefined` for a PGN that will not read. */
export const jobV2MergedPgn = (job: JobV2, pgn: string): string | undefined => mergedPgnOf(job, job, pgn, job.engine);

/**
 * **The job a Case's New job leads to** when it has one: of the Case's jobs,
 * the newest unfinished, else the newest done, else the newest — so the popup
 * asks first (Start a new analysis / Check existing).
 */
export const jobV2OfCase = (jobs: readonly JobV2[] | undefined, caseId: string): JobV2 | undefined => {
  if (jobs === undefined) return undefined;
  const ofCase = jobs.filter((job) => job.source.caseId === caseId);
  return (
    ofCase.find((job) => job.status !== "done" && job.status !== "failed" && job.status !== "cancelled") ??
    ofCase.find((job) => job.status === "done") ??
    ofCase[0]
  );
};

/* ─── Reading a stored record back ────────────────────────────────────── */

type Row = Record<string, unknown>;

const isRow = (value: unknown): value is Row => typeof value === "object" && value !== null && !Array.isArray(value);

const stringOr = <T>(value: unknown, fallback: T): string | T => (typeof value === "string" ? value : fallback);

const idOf = (value: unknown): string | undefined => (typeof value === "string" && value !== "" ? value : undefined);

const isoOr = (value: unknown, fallback: string | null): string | null =>
  typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : fallback;

const engineFrom = (value: unknown): JobEngine | null =>
  isRow(value) && typeof value.id === "string" && typeof value.name === "string"
    ? { id: value.id, name: value.name, version: stringOr(value.version, "") }
    : null;

const outputsFrom = (value: unknown): JobV2Output[] =>
  Array.isArray(value)
    ? value.flatMap((entry) => {
        if (!isRow(entry) || !isComputerAnalysisVariant(entry.variant)) return [];
        const projectId = idOf(entry.projectId);
        const caseId = idOf(entry.caseId);
        return projectId === undefined || caseId === undefined ? [] : [{ variant: entry.variant, projectId, caseId }];
      })
    : [];

/**
 * **A stored Jobs V2 record, read back** — dropped without an id, the kind, a
 * source (its Case named) or its positions; every other field leniently, as
 * the legacy jobs were: an unknown status `interrupted` (never run unasked), a
 * checkpoint entry that will not read or is about another FEN as missing, a
 * target that will not read as new Cases beside the source, a preset as none
 * (the kind's `readInput` and `parseState`, over the row's own fields).
 */
export const jobV2From = (value: unknown): JobV2 | undefined => {
  if (!isRow(value) || idOf(value.id) === undefined || value.kind !== "computer-analysis") return undefined;
  const input = readInput(value);
  const state = parseState(value, COMPUTER_ANALYSIS_KIND_VERSION);
  if (input === undefined || state === undefined) return undefined;

  const createdAt = isoOr(value.createdAt, null) ?? new Date(0).toISOString();
  return {
    id: value.id as string,
    kind: "computer-analysis",
    status: (JOB_STATUSES as readonly unknown[]).includes(value.status) ? (value.status as JobStatus) : "interrupted",
    createdAt,
    updatedAt: isoOr(value.updatedAt, null) ?? createdAt,
    startedAt: isoOr(value.startedAt, null),
    finishedAt: isoOr(value.finishedAt, null),
    ...input,
    engine: engineFrom(value.engine),
    ...state,
    outputs: outputsFrom(value.outputs),
    error: (JOB_V2_ERRORS as readonly unknown[]).includes(value.error) ? (value.error as JobV2Error) : null,
  };
};
