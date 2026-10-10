import {
  analysisPositionsOf,
  COMPUTER_ANALYSIS_VARIANTS,
  computerAnalysisOptionsFrom,
  type AnalysisPosition,
  type ComputerAnalysisOptions,
  type ComputerAnalysisVariant,
  type PositionLine,
  type PositionResult,
} from "./computerAnalysis";
import type { Score } from "./engineAnalysis";
import type { GameTree } from "./gameTree";
import { parsePgnTree } from "./pgn";

/**
 * **A background job, the record** (CTA-173, CTA-171) — what the app-wide
 * runner (`lib/jobRunner.ts`) works through and the Jobs screen lists, kept in
 * IndexedDB (`lib/jobStore.ts`, `chessapp.jobs`). Pure: the record, its
 * normaliser, and what a screen reads off it. The reference is
 * `.claude/rules/jobs.md`.
 *
 * One kind so far, a game's **computer analysis**: the engine run once over
 * the game's mainline (`lib/computerAnalysis.ts`), each finished position
 * written down as it lands — the **checkpoint** — so a job a reload cut short
 * goes on from the first position it has no result for. When every position
 * has one, each ticked variant is built (`lib/computerAnalysisTree.ts`) and
 * saved as a new Saved analysis, and the job names them (`outputs`).
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
 */

export const JOB_KINDS = ["computer-analysis"] as const;
export type JobKind = (typeof JOB_KINDS)[number];

export const JOB_STATUSES = ["queued", "running", "paused", "interrupted", "done", "failed", "cancelled"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/** What went wrong with a failed job — a catalog key's last part (`jobs.errors.<code>`). */
export const JOB_ERRORS = ["source", "engine", "storage", "too-many"] as const;
export type JobError = (typeof JOB_ERRORS)[number];

/**
 * **What was analysed**: the saved analysis it came from (`null` for a board
 * never saved), the name the outputs are named after, the folder they are
 * filed in, and the PGN as it was sent — the job never reads the source
 * again, so editing or deleting it changes nothing here.
 */
export type JobSource = {
  analysisId: string | null;
  name: string;
  folderId: string | null;
  pgn: string;
};

/**
 * One position the job searches, as the screen shows it: its FEN, its ply,
 * the mainline move played from it (the "current move" while it is searched)
 * and whether that move is analysed. The runner works from
 * `analysisPositionsOf` over the parsed source; these are its words for the
 * reader, and the FENs it checks a resumed job against.
 */
export type JobPosition = { fen: string; ply: number; san?: string; analysed: boolean };

/** The engine that ran the job — the one actually running, which the job's choice may have fallen back from. */
export type JobEngine = { id: string; name: string; version: string };

/** One variant saved: which, and the Saved analysis it is. */
export type JobOutput = { variant: ComputerAnalysisVariant; analysisId: string };

export type ComputerAnalysisJob = {
  id: string;
  kind: "computer-analysis";
  status: JobStatus;
  /** When it was asked for (ISO). */
  createdAt: string;
  /** When the record last changed (ISO) — a checkpoint, a status. */
  updatedAt: string;
  /** When the engine first started on it; `null` while it has not. */
  startedAt: string | null;
  /** When it ended — done, failed or cancelled; `null` while it has not. */
  finishedAt: string | null;
  source: JobSource;
  options: ComputerAnalysisOptions;
  /** `null` until it first runs. */
  engine: JobEngine | null;
  positions: JobPosition[];
  /** A result per position, by index — `null` where it has none yet. Always as long as `positions`. */
  checkpoint: (PositionResult | null)[];
  /** The Saved analyses made, one per ticked variant, once it is done. */
  outputs: JobOutput[];
  error: JobError | null;
};

/** Every kind of job is a computer analysis, today. */
export type Job = ComputerAnalysisJob;

/**
 * **What the board sends** (CTA-174): the game, and how to analyse it. The
 * board's own form makes the options (`computerAnalysisOptionsFrom` holds them
 * to their bounds again here).
 */
export type ComputerAnalysisRequest = {
  source: JobSource;
  options: ComputerAnalysisOptions;
};

/**
 * How many jobs are kept. A finished job is only a record of what was done —
 * its outputs are Saved analyses of their own — so past the cap the oldest
 * finished ones go; the unfinished ones never do (`lib/jobStore.ts`).
 */
export const MAX_JOBS = 100;

/** The statuses a job ends in. */
export const isFinishedJob = (job: Pick<Job, "status">): boolean =>
  job.status === "done" || job.status === "failed" || job.status === "cancelled";

/** Waiting for the runner, or being run. */
export const isActiveJob = (job: Pick<Job, "status">): boolean => job.status === "queued" || job.status === "running";

/** Cancel stops a job that has not ended. */
export const canCancelJob = (job: Pick<Job, "status">): boolean =>
  job.status === "queued" || job.status === "running" || job.status === "paused" || job.status === "interrupted";

/** Pause stops a job waiting or being run, its checkpoint kept, until the reader resumes it (CTA-178). */
export const canPauseJob = (job: Pick<Job, "status">): boolean => isActiveJob(job);

/** Resume queues a job the reader paused, or a reload or a failure stopped — it goes on from its checkpoint. */
export const canResumeJob = (job: Pick<Job, "status">): boolean =>
  job.status === "paused" || job.status === "interrupted" || job.status === "failed";

/** What a saved variant is called: "<source> — computer analysis (light)" (CTA-171's decision). */
export const jobOutputName = (sourceName: string, variant: ComputerAnalysisVariant): string =>
  `${sourceName} — computer analysis (${variant})`;

/** The positions of a parsed source, as the record keeps them. */
export const jobPositionsOf = (positions: readonly AnalysisPosition[]): JobPosition[] =>
  positions.map((position) => ({
    fen: position.fen,
    ply: position.ply,
    ...(position.move === undefined ? {} : { san: position.move.san }),
    analysed: position.analysed,
  }));

/** The source's tree and the positions the options name — `undefined` for a PGN that does not read. */
export const jobSearchOf = (
  source: Pick<JobSource, "pgn">,
  options: ComputerAnalysisOptions,
): { tree: GameTree; positions: AnalysisPosition[] } | undefined => {
  let tree: GameTree;
  try {
    tree = parsePgnTree(source.pgn);
  } catch {
    return undefined;
  }
  return { tree, positions: analysisPositionsOf(tree, options) };
};

/**
 * **A new job from the board's request**, queued — or `undefined` when there
 * is nothing to run: a PGN that does not read, no analysed move (a position
 * with no moves, a range past the game's end), or no variant ticked.
 */
export const computerAnalysisJobOf = (
  id: string,
  request: ComputerAnalysisRequest,
  now: Date = new Date(),
): Job | undefined => {
  const options = computerAnalysisOptionsFrom(request.options);
  if (options.outputs.length === 0) return undefined;
  const search = jobSearchOf(request.source, options);
  if (search === undefined || search.positions.length === 0) return undefined;
  const at = now.toISOString();
  return {
    id,
    kind: "computer-analysis",
    status: "queued",
    createdAt: at,
    updatedAt: at,
    startedAt: null,
    finishedAt: null,
    source: {
      analysisId: request.source.analysisId,
      name: request.source.name.trim(),
      folderId: request.source.folderId,
      pgn: request.source.pgn,
    },
    options,
    engine: null,
    positions: jobPositionsOf(search.positions),
    checkpoint: search.positions.map(() => null),
    outputs: [],
    error: null,
  };
};

/** The job with position `index`'s result written down. */
export const withCheckpoint = (job: Job, index: number, result: PositionResult, now: Date = new Date()): Job => ({
  ...job,
  checkpoint: job.checkpoint.map((entry, at) => (at === index ? result : entry)),
  updatedAt: now.toISOString(),
});

/** **How far a job has got**: positions with a result, of how many, and the first one still to search. */
export type JobProgress = {
  done: number;
  total: number;
  /** The position searched now (or next); absent once every one has a result. */
  current?: JobPosition;
  /** `done / total` as 0–100. */
  percent: number;
};

export const jobProgress = (job: Pick<Job, "positions" | "checkpoint">): JobProgress => {
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

/**
 * The move a position's search is about, as a reader numbers it — "7. Nf3",
 * "7... Nc6", from the FEN's own move number; the position itself ("after
 * 40... Kg7") has no move, so `undefined`.
 */
export const jobMoveLabel = (position: Pick<JobPosition, "fen" | "san">): string | undefined => {
  if (position.san === undefined) return undefined;
  const [, turn, , , , fullmove] = position.fen.split(" ");
  const number = Number(fullmove) || 1;
  return `${number}${turn === "b" ? "..." : "."} ${position.san}`;
};

/* ─── Reading a stored record back ────────────────────────────────────── */

type Row = Record<string, unknown>;

const isRow = (value: unknown): value is Row => typeof value === "object" && value !== null && !Array.isArray(value);

const stringOr = <T>(value: unknown, fallback: T): string | T => (typeof value === "string" ? value : fallback);

const isoOr = (value: unknown, fallback: string | null): string | null =>
  typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : fallback;

const scoreFrom = (value: unknown): Score | undefined => {
  if (!isRow(value) || typeof value.value !== "number" || !Number.isFinite(value.value)) return undefined;
  return value.kind === "cp" || value.kind === "mate" ? { kind: value.kind, value: value.value } : undefined;
};

const lineFrom = (value: unknown): PositionLine | undefined => {
  if (!isRow(value)) return undefined;
  const score = scoreFrom(value.score);
  if (score === undefined) return undefined;
  const depth = typeof value.depth === "number" && Number.isFinite(value.depth) ? value.depth : 0;
  const pv = Array.isArray(value.pv) ? value.pv.filter((move): move is string => typeof move === "string") : [];
  return { score, depth, pv };
};

/** A stored position result, read back strictly: its FEN and at least line 1. */
export const positionResultFrom = (value: unknown): PositionResult | undefined => {
  if (!isRow(value) || typeof value.fen !== "string" || !Array.isArray(value.lines)) return undefined;
  const lines = value.lines.map(lineFrom);
  // A line that will not read cuts the list there: what follows would be out of order.
  const cut = lines.findIndex((line) => line === undefined);
  const kept = (cut === -1 ? lines : lines.slice(0, cut)) as PositionLine[];
  return kept.length === 0 ? undefined : { fen: value.fen, lines: kept };
};

const positionFrom = (value: unknown): JobPosition | undefined => {
  if (!isRow(value) || typeof value.fen !== "string" || typeof value.ply !== "number") return undefined;
  return {
    fen: value.fen,
    ply: value.ply,
    ...(typeof value.san === "string" ? { san: value.san } : {}),
    analysed: value.analysed === true,
  };
};

const sourceFrom = (value: unknown): JobSource | undefined => {
  if (!isRow(value) || typeof value.pgn !== "string") return undefined;
  return {
    analysisId: stringOr(value.analysisId, null),
    name: stringOr(value.name, ""),
    folderId: stringOr(value.folderId, null),
    pgn: value.pgn,
  };
};

const engineFrom = (value: unknown): JobEngine | null =>
  isRow(value) && typeof value.id === "string" && typeof value.name === "string"
    ? { id: value.id, name: value.name, version: stringOr(value.version, "") }
    : null;

const outputsFrom = (value: unknown): JobOutput[] =>
  Array.isArray(value)
    ? value.flatMap((entry) =>
        isRow(entry) &&
        typeof entry.analysisId === "string" &&
        (COMPUTER_ANALYSIS_VARIANTS as readonly unknown[]).includes(entry.variant)
          ? [{ variant: entry.variant as ComputerAnalysisVariant, analysisId: entry.analysisId }]
          : [],
      )
    : [];

/**
 * **A stored job, read back** — the schema (`database.md` §1.2). A record
 * without an id, a known kind, a source or its positions is dropped; every
 * other field reads leniently: an unknown status as `interrupted` (it is
 * never run unasked), a checkpoint entry that will not read as missing (that
 * position is searched again), the checkpoint padded or cut to the positions.
 */
export const jobFrom = (value: unknown): Job | undefined => {
  if (!isRow(value) || typeof value.id !== "string" || value.id === "") return undefined;
  if (!(JOB_KINDS as readonly unknown[]).includes(value.kind)) return undefined;
  const source = sourceFrom(value.source);
  if (source === undefined || !Array.isArray(value.positions)) return undefined;
  const positions = value.positions.map(positionFrom);
  if (positions.some((position) => position === undefined)) return undefined;

  const stored = Array.isArray(value.checkpoint) ? value.checkpoint : [];
  const createdAt = isoOr(value.createdAt, null) ?? new Date(0).toISOString();
  return {
    id: value.id,
    kind: "computer-analysis",
    status: (JOB_STATUSES as readonly unknown[]).includes(value.status) ? (value.status as JobStatus) : "interrupted",
    createdAt,
    updatedAt: isoOr(value.updatedAt, null) ?? createdAt,
    startedAt: isoOr(value.startedAt, null),
    finishedAt: isoOr(value.finishedAt, null),
    source,
    options: computerAnalysisOptionsFrom(value.options),
    engine: engineFrom(value.engine),
    positions: positions as JobPosition[],
    checkpoint: positions.map((position, index) => {
      const result = positionResultFrom(stored[index]);
      // A result for another position is no result for this one.
      return result !== undefined && result.fen === position?.fen ? result : null;
    }),
    outputs: outputsFrom(value.outputs),
    error: (JOB_ERRORS as readonly unknown[]).includes(value.error) ? (value.error as JobError) : null,
  };
};
