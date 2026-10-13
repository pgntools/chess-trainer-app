import {
  analysisPositionsOf,
  COMPUTER_ANALYSIS_VARIANTS,
  computerAnalysisOptionsFrom,
  moveVerdicts,
  type AnalysisPosition,
  type ComputerAnalysisOptions,
  type ComputerAnalysisVariant,
  type PositionLine,
  type PositionResult,
} from "./computerAnalysis";
import { computerAnalysisTree } from "./computerAnalysisTree";
import type { Score } from "./engineAnalysis";
import { annotatorOf } from "./engineEvals";
import type { UciOptionValue } from "./engineTypes";
import { treeToPgn, type GameTree } from "./gameTree";
import { parsePgnTree } from "./pgn";

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
 */

const JOB_STATUSES = ["queued", "running", "paused", "interrupted", "done", "failed", "cancelled"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/**
 * One position the job searches, as the screen shows it: its FEN, its ply,
 * the mainline move played from it (the "current move" while it is searched)
 * and whether that move is analysed. The runner works from
 * `analysisPositionsOf` over the parsed source; these are its words for the
 * reader, and the FENs it checks a resumed job against.
 */
export type JobPosition = { fen: string; ply: number; san?: string; analysed: boolean };

/** The engine that ran the job — the one actually running, which the job's choice may have fallen back from. */
type JobEngine = { id: string; name: string; version: string };

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

/** The positions of a parsed source, as the record keeps them. */
const jobPositionsOf = (positions: readonly AnalysisPosition[]): JobPosition[] =>
  positions.map((position) => ({
    fen: position.fen,
    ply: position.ply,
    ...(position.move === undefined ? {} : { san: position.move.san }),
    analysed: position.analysed,
  }));

/** The source's tree and the positions the options name — `undefined` for a PGN that does not read. */
export const jobSearchOf = (
  source: { pgn: string },
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

/** What went wrong — the engine's, the store's, and `target`: where the results were to go is gone (the other Project, the source Case). `analysisV2.jobs.errors.<code>`. */
export const JOB_V2_ERRORS = ["source", "engine", "storage", "too-many", "target"] as const;
export type JobV2Error = (typeof JOB_V2_ERRORS)[number];

/** **What was analysed** — a Case, and its tree as it was sent: the job never reads the Case again until it merges into it. */
export type JobV2Source = {
  projectId: string;
  caseId: string;
  /** The name the outputs are named after — the Case's as shown then. */
  name: string;
  pgn: string;
};

/** **The preset the job was given** — its id and name (the reader's words), and the option values it sends. */
export type JobV2Preset = {
  id: string;
  name: string;
  values: Readonly<Record<string, UciOptionValue>>;
};

/**
 * **Where the results go** (the popup's *Where to save the results*):
 *
 * - `project` — each ticked variant a new Game Case in `projectId`, the
 *   source's Project;
 * - `other` — each ticked variant a new Game Case in `projectId`, another
 *   Project (an existing one, or one the popup made, named after the Case);
 * - `case` — the one variant **merged into the source Case**.
 *
 * Every new Case is **linked from the source Case** (`lib/analysisCaseLinkStore.ts`).
 */
export type JobV2Target = { kind: "project"; projectId: string } | { kind: "other"; projectId: string } | { kind: "case" };

export const JOB_V2_TARGET_KINDS = ["project", "other", "case"] as const;
export type JobV2TargetKind = JobV2Target["kind"];

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

/** What the popup sends. */
export type JobV2Request = {
  source: JobV2Source;
  options: ComputerAnalysisOptions;
  preset: JobV2Preset;
  target: JobV2Target;
};

/** How many Jobs V2 are kept — past it the oldest finished go (`lib/jobV2Store.ts`). */
export const MAX_JOBS_V2 = 100;

/** A new Case's name: "<case> - computer analysis (<variant>)" (CTA-188's decision). */
export const jobV2OutputName = (sourceName: string, variant: ComputerAnalysisVariant): string =>
  `${sourceName} - computer analysis (${variant})`;

/**
 * **A new job from the popup's request**, queued — or `undefined` when there
 * is nothing to run: a PGN that does not read, no analysed move, no variant
 * ticked, or — merged into the source Case — more than one.
 */
export const jobV2Of = (id: string, request: JobV2Request, now: Date = new Date()): JobV2 | undefined => {
  const options = computerAnalysisOptionsFrom(request.options);
  if (options.outputs.length === 0 || (request.target.kind === "case" && options.outputs.length !== 1)) return undefined;
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
    source: { ...request.source, name: request.source.name.trim() },
    options,
    preset: { id: request.preset.id, name: request.preset.name, values: { ...request.preset.values } },
    target: request.target,
    engine: null,
    positions: jobPositionsOf(search.positions),
    checkpoint: search.positions.map(() => null),
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
 * **A job's analysis on a tree** — one variant's annotated tree
 * (`computerAnalysisTree`) built over `tree`, **whatever it holds now**: its
 * positions read again (`analysisPositionsOf`), each given the job's result for
 * its FEN, the verdicts made of those. Every move, side line and comment of
 * `tree` is kept; a move whose position the job never searched (a mainline
 * changed since) is left unannotated. How the results are **merged into the
 * source Case** — by the runner on the Case as stored, and by an open board
 * on the tree it holds (`annotateTree`, which keeps every node).
 */
export const jobV2AnalysisOf = (job: JobV2, tree: GameTree, variant: ComputerAnalysisVariant): GameTree => {
  const positions = analysisPositionsOf(tree, job.options);
  const byFen = new Map(job.checkpoint.flatMap((entry) => (entry === null ? [] : [[entry.fen, entry] as const])));
  const results = positions.map((position) => byFen.get(position.fen));
  return computerAnalysisTree({
    source: tree,
    positions,
    results,
    verdicts: moveVerdicts(positions, results, job.options),
    variant,
    engine: job.engine === null ? job.options.engine : annotatorOf(job.engine),
    options: job.options,
  });
};

/** The source-Case merge as a PGN edit — what `mergeIntoAnalysisCase` takes; `undefined` for a PGN that will not read. */
export const jobV2MergedPgn = (job: JobV2, pgn: string): string | undefined => {
  const variant = job.options.outputs[0];
  if (variant === undefined) return undefined;
  let tree: GameTree;
  try {
    tree = parsePgnTree(pgn);
  } catch {
    return undefined;
  }
  return treeToPgn(jobV2AnalysisOf(job, tree, variant));
};

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
const positionResultFrom = (value: unknown): PositionResult | undefined => {
  if (!isRow(value) || typeof value.fen !== "string" || !Array.isArray(value.lines)) return undefined;
  const lines = value.lines.map(lineFrom);
  // A line that will not read cuts the list there: what follows would be out of order.
  const cut = lines.findIndex((line) => line === undefined);
  const kept = (cut === -1 ? lines : lines.slice(0, cut)) as PositionLine[];
  return kept.length === 0 ? undefined : { fen: value.fen, lines: kept };
};

const sourceFrom = (value: unknown): JobV2Source | undefined => {
  if (!isRow(value) || typeof value.pgn !== "string") return undefined;
  const projectId = idOf(value.projectId);
  const caseId = idOf(value.caseId);
  if (projectId === undefined || caseId === undefined) return undefined;
  return { projectId, caseId, name: stringOr(value.name, ""), pgn: value.pgn };
};

const isOptionValue = (value: unknown): value is UciOptionValue =>
  typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value));

const presetFrom = (value: unknown): JobV2Preset => {
  const row = isRow(value) ? value : {};
  const values = isRow(row.values)
    ? Object.fromEntries(Object.entries(row.values).filter((entry): entry is [string, UciOptionValue] => isOptionValue(entry[1])))
    : {};
  return { id: stringOr(row.id, ""), name: stringOr(row.name, ""), values };
};

const targetFrom = (value: unknown, source: JobV2Source): JobV2Target => {
  if (isRow(value)) {
    if (value.kind === "case") return { kind: "case" };
    const projectId = idOf(value.projectId);
    if (value.kind === "project" && projectId !== undefined) return { kind: "project", projectId };
    // `linked` is the same place under its first name (CTA-188's branch, before Projects stopped being linked).
    if ((value.kind === "other" || value.kind === "linked") && projectId !== undefined) return { kind: "other", projectId };
  }
  // A target that will not read: new Cases beside the source.
  return { kind: "project", projectId: source.projectId };
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

const engineFrom = (value: unknown): JobEngine | null =>
  isRow(value) && typeof value.id === "string" && typeof value.name === "string"
    ? { id: value.id, name: value.name, version: stringOr(value.version, "") }
    : null;

const outputsFrom = (value: unknown): JobV2Output[] =>
  Array.isArray(value)
    ? value.flatMap((entry) => {
        if (!isRow(entry) || !(COMPUTER_ANALYSIS_VARIANTS as readonly unknown[]).includes(entry.variant)) return [];
        const projectId = idOf(entry.projectId);
        const caseId = idOf(entry.caseId);
        return projectId === undefined || caseId === undefined
          ? []
          : [{ variant: entry.variant as ComputerAnalysisVariant, projectId, caseId }];
      })
    : [];

/**
 * **A stored Jobs V2 record, read back** — dropped without an id, the kind, a
 * source (its Case named) or its positions; every other field leniently, as
 * the legacy jobs were: an unknown status `interrupted` (never run unasked), a
 * checkpoint entry that will not read or is about another FEN as missing, a
 * target that will not read as new Cases beside the source, a preset as none.
 */
export const jobV2From = (value: unknown): JobV2 | undefined => {
  if (!isRow(value) || idOf(value.id) === undefined || value.kind !== "computer-analysis") return undefined;
  const source = sourceFrom(value.source);
  if (source === undefined || !Array.isArray(value.positions)) return undefined;
  const positions = value.positions.map(positionFrom);
  if (positions.some((position) => position === undefined)) return undefined;

  const stored = Array.isArray(value.checkpoint) ? value.checkpoint : [];
  const createdAt = isoOr(value.createdAt, null) ?? new Date(0).toISOString();
  return {
    id: value.id as string,
    kind: "computer-analysis",
    status: (JOB_STATUSES as readonly unknown[]).includes(value.status) ? (value.status as JobStatus) : "interrupted",
    createdAt,
    updatedAt: isoOr(value.updatedAt, null) ?? createdAt,
    startedAt: isoOr(value.startedAt, null),
    finishedAt: isoOr(value.finishedAt, null),
    source,
    options: computerAnalysisOptionsFrom(value.options),
    preset: presetFrom(value.preset),
    target: targetFrom(value.target, source),
    engine: engineFrom(value.engine),
    positions: positions as JobPosition[],
    checkpoint: positions.map((position, index) => {
      const result = positionResultFrom(stored[index]);
      return result !== undefined && result.fen === position?.fen ? result : null;
    }),
    outputs: outputsFrom(value.outputs),
    error: (JOB_V2_ERRORS as readonly unknown[]).includes(value.error) ? (value.error as JobV2Error) : null,
  };
};
