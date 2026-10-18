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
} from "../../../computerAnalysis";
import { computerAnalysisTree } from "../../../computerAnalysisTree";
import type { Score } from "../../../engineAnalysis";
import { annotatorOf } from "../../../engineEvals";
import type { UciOptionValue } from "../../../engineTypes";
import { treeToPgn, type GameTree } from "../../../gameTree";
import { parsePgnTree } from "../../../pgn";
import {
  jobContinuationFrom,
  recordedJobEngineSettingsFrom,
  type JobContinuation,
  type JobEngineSettings,
  type RecordedJobEngineSettings,
} from "../../engineJobSettings";

/**
 * **The computer-analysis kind's core** (CTA-218, the Jobs module of CTA-215)
 * — a Case's computer analysis as a job kind, its **pure** parts: the input
 * and its lenient reader, the state (the positions and their checkpoint) and
 * its reader, the plan, one step, the outputs decided, the annotated tree and
 * the merge. No store, no engine: a step is handed its evaluator (the engine
 * session, `lib/jobs/engineSession.ts`), and the outputs are plans the kind's
 * adapter applies.
 *
 * Moved out of Jobs V2's record (`lib/jobsV2.ts`, retired in CTA-221); the
 * kind's adapter is `kind.ts`, and the behaviour `.claude/rules/jobs.md`'s.
 */

/** The kind's id in the Jobs module's registry. */
export const COMPUTER_ANALYSIS_KIND = "analysis.computer-analysis";
/** Its state's version — bumped when {@link ComputerAnalysisState} changes shape. */
export const COMPUTER_ANALYSIS_KIND_VERSION = 1;

/** The entity types a job of this kind names (the Jobs module's entity registry). */
export const ANALYSIS_CASE_ENTITY = "analysis-case";
export const ANALYSIS_PROJECT_ENTITY = "analysis-project";

/** What a job is applied to — the runtime's `EntityRef`, structurally. */
export type EntityRef = { type: string; id: string };

/** What went wrong — the engine's, the store's, and `target`: where the results were to go is gone. */
export const COMPUTER_ANALYSIS_ERRORS = ["source", "engine", "storage", "target"] as const;
export type ComputerAnalysisErrorCode = (typeof COMPUTER_ANALYSIS_ERRORS)[number];

/** A job of this kind ended for a reason. */
export class ComputerAnalysisError extends Error {
  readonly code: ComputerAnalysisErrorCode;
  constructor(code: ComputerAnalysisErrorCode) {
    super(code);
    this.name = "ComputerAnalysisError";
    this.code = code;
  }
}

/* ─── The input ───────────────────────────────────────────────────────── */

/** **What was analysed** — a Case, and its tree as it was sent: the job never reads the Case again until it merges into it. */
export type ComputerAnalysisSource = {
  projectId: string;
  caseId: string;
  /** The name the outputs are named after — the Case's as shown then. */
  name: string;
  pgn: string;
};

/** **The preset the job was given** — its id and name (the reader's words), and the option values it sends. */
export type ComputerAnalysisPreset = {
  id: string;
  name: string;
  values: Readonly<Record<string, UciOptionValue>>;
};

/**
 * **Where the results go**: `project` — each ticked variant a new Game Case
 * in the source's Project; `other` — in another Project; `case` — the one
 * variant merged into the source Case. Every new Case is linked from the source.
 */
export type ComputerAnalysisTarget = { kind: "project"; projectId: string } | { kind: "other"; projectId: string } | { kind: "case" };

export const COMPUTER_ANALYSIS_TARGET_KINDS = ["project", "other", "case"] as const;
export type ComputerAnalysisTargetKind = ComputerAnalysisTarget["kind"];

/** **The input** — the snapshot a job works from, immutable once queued. */
export type ComputerAnalysisInput = {
  source: ComputerAnalysisSource;
  /** The engine (`engine`), the search as edited (`depth`, `moveTimeMs`, `threads`, `hashMb`) and the rest of the form. */
  options: ComputerAnalysisOptions;
  preset: ComputerAnalysisPreset;
  target: ComputerAnalysisTarget;
  /** The job this one continues with the settings in effect then (CTA-236) — absent for a job started from its form. */
  continues?: JobContinuation;
  /**
   * The results that job had (CTA-236): the plan gives each position the
   * seed's result for its FEN, so it is not searched again; a result for no
   * planned position is ignored.
   */
  seed?: PositionResult[];
};

/* ─── The state ───────────────────────────────────────────────────────── */

/**
 * One position the job searches, as the screen shows it: its FEN, its ply,
 * the mainline move played from it and whether that move is analysed. The
 * FENs are what a resumed job is checked against — never node ids, which do
 * not survive a PGN round trip.
 */
export type JobPosition = { fen: string; ply: number; san?: string; analysed: boolean };

/**
 * **The state** — the durable checkpoint: the positions, and a result per
 * position by index (`null` where it has none yet), always as long as them.
 */
export type ComputerAnalysisState = {
  positions: JobPosition[];
  checkpoint: (PositionResult | null)[];
};

/** How far a job has got — the runtime's `JobProgress`, structurally: the label the move searched now (or next). */
export type ComputerAnalysisProgress = { done: number; total: number; label?: string };

/* ─── Reading a stored value back ─────────────────────────────────────── */

type Row = Record<string, unknown>;

const isRow = (value: unknown): value is Row => typeof value === "object" && value !== null && !Array.isArray(value);

const stringOr = <T>(value: unknown, fallback: T): string | T => (typeof value === "string" ? value : fallback);

const idOf = (value: unknown): string | undefined => (typeof value === "string" && value !== "" ? value : undefined);

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

const sourceFrom = (value: unknown): ComputerAnalysisSource | undefined => {
  if (!isRow(value) || typeof value.pgn !== "string") return undefined;
  const projectId = idOf(value.projectId);
  const caseId = idOf(value.caseId);
  if (projectId === undefined || caseId === undefined) return undefined;
  return { projectId, caseId, name: stringOr(value.name, "").trim(), pgn: value.pgn };
};

const isOptionValue = (value: unknown): value is UciOptionValue =>
  typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value));

const presetFrom = (value: unknown): ComputerAnalysisPreset => {
  const row = isRow(value) ? value : {};
  const values = isRow(row.values)
    ? Object.fromEntries(Object.entries(row.values).filter((entry): entry is [string, UciOptionValue] => isOptionValue(entry[1])))
    : {};
  return { id: stringOr(row.id, ""), name: stringOr(row.name, ""), values };
};

const targetFrom = (value: unknown, source: ComputerAnalysisSource): ComputerAnalysisTarget => {
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

/**
 * **An input read back leniently**, as Jobs V2 read its rows: `undefined`
 * without a source naming its Case; the options clamped as a form's are, a
 * preset that will not read none, a target that will not read new Cases
 * beside the source, the source's name trimmed. Fields beside these are ignored.
 */
export const readInput = (value: unknown): ComputerAnalysisInput | undefined => {
  if (!isRow(value)) return undefined;
  const source = sourceFrom(value.source);
  if (source === undefined) return undefined;
  const continues = jobContinuationFrom(value.continues);
  const seed = Array.isArray(value.seed) ? value.seed.flatMap((result) => positionResultFrom(result) ?? []) : [];
  return {
    source,
    options: computerAnalysisOptionsFrom(value.options),
    preset: presetFrom(value.preset),
    target: targetFrom(value.target, source),
    ...(continues === undefined ? {} : { continues }),
    ...(seed.length === 0 ? {} : { seed }),
  };
};

/**
 * **The engine settings a stored input carries** (CTA-236) — its options'
 * engine and search, its preset; a field it does not carry left out, so
 * Resume never calls it different.
 */
export const recordedEngineSettingsOf = (value: unknown): RecordedJobEngineSettings => {
  const row = isRow(value) ? value : {};
  const options = isRow(row.options) ? row.options : {};
  return recordedJobEngineSettingsFrom(options.engine, row.preset, options);
};

/* ─── The plan ────────────────────────────────────────────────────────── */

/** The source's tree and the positions the options name — `undefined` for a PGN that does not read. */
export const searchOf = (
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

/** An input's search, read once per input object — every step re-reads it otherwise. */
const searches = new WeakMap<ComputerAnalysisInput, ReturnType<typeof searchOf>>();
const inputSearchOf = (input: ComputerAnalysisInput): ReturnType<typeof searchOf> => {
  if (!searches.has(input)) searches.set(input, searchOf(input.source, input.options));
  return searches.get(input);
};

/** The source's tree, as the job reads it — `undefined` for a PGN that does not read. */
export const sourceTreeOf = (input: ComputerAnalysisInput): GameTree | undefined => inputSearchOf(input)?.tree;

/**
 * **An input, checked** — {@link readInput}, then refused (`undefined`) when
 * there is nothing to run: a PGN that does not read, no analysed move, no
 * variant ticked, or — merged into the source Case — more than one.
 */
export const parseInput = (value: unknown): ComputerAnalysisInput | undefined => {
  const input = readInput(value);
  if (input === undefined) return undefined;
  const { outputs } = input.options;
  if (outputs.length === 0 || (input.target.kind === "case" && outputs.length !== 1)) return undefined;
  const search = inputSearchOf(input);
  return search === undefined || search.positions.length === 0 ? undefined : input;
};

/**
 * The move a position's search is about, as a reader numbers it — "7. Nf3",
 * "7... Nc6", from the FEN's own move number; the position itself ("after
 * 40... Kg7") has no move, so `undefined`.
 */
export const moveLabelOf = (position: Pick<JobPosition, "fen" | "san">): string | undefined => {
  if (position.san === undefined) return undefined;
  const [, turn, , , , fullmove] = position.fen.split(" ");
  const number = Number(fullmove) || 1;
  return `${number}${turn === "b" ? "..." : "."} ${position.san}`;
};

/** The index of the first position without a result — `-1` once every one has one. */
const nextIndexOf = (state: ComputerAnalysisState): number =>
  state.positions.findIndex((_, index) => (state.checkpoint[index] ?? null) === null);

/** **How far a state has got**: positions with a result, of how many, and the move searched now (or next). */
export const progressOf = (state: ComputerAnalysisState): ComputerAnalysisProgress => {
  const next = nextIndexOf(state);
  const label = next === -1 ? undefined : moveLabelOf(state.positions[next]);
  return {
    done: state.positions.filter((_, index) => (state.checkpoint[index] ?? null) !== null).length,
    total: state.positions.length,
    ...(label === undefined ? {} : { label }),
  };
};

/**
 * **The plan**: every position the options name, as the state keeps them,
 * and an empty checkpoint — or, for a job that continues another (CTA-236),
 * each position the seed has a result for (by FEN) given it, so only the
 * rest is searched. `undefined` for an input with nothing to run.
 */
export const planOf = (input: ComputerAnalysisInput): { state: ComputerAnalysisState; progress: ComputerAnalysisProgress } | undefined => {
  const search = inputSearchOf(input);
  if (search === undefined || search.positions.length === 0) return undefined;
  const state: ComputerAnalysisState = {
    positions: search.positions.map((position) => ({
      fen: position.fen,
      ply: position.ply,
      ...(position.move === undefined ? {} : { san: position.move.san }),
      analysed: position.analysed,
    })),
    checkpoint: search.positions.map(() => null),
  };
  const seeded = new Map((input.seed ?? []).map((result) => [result.fen, result] as const));
  if (seeded.size > 0) state.checkpoint = search.positions.map((position) => seeded.get(position.fen) ?? null);
  return { state, progress: progressOf(state) };
};

/**
 * **A stored state, read back** — `undefined` (re-plan) for another version
 * or positions that will not read; a checkpoint entry that will not read, or
 * is about another FEN, as missing; the checkpoint padded to the positions.
 */
export const parseState = (value: unknown, fromVersion: number): ComputerAnalysisState | undefined => {
  if (fromVersion !== COMPUTER_ANALYSIS_KIND_VERSION || !isRow(value) || !Array.isArray(value.positions)) return undefined;
  const positions = value.positions.map(positionFrom);
  if (positions.some((position) => position === undefined)) return undefined;
  const stored = Array.isArray(value.checkpoint) ? value.checkpoint : [];
  return {
    positions: positions as JobPosition[],
    checkpoint: positions.map((position, index) => {
      const result = positionResultFrom(stored[index]);
      return result !== undefined && result.fen === position?.fen ? result : null;
    }),
  };
};

/**
 * **A job continued with other engine settings** (CTA-236) — the input of the
 * new job *Continue with current settings* queues: the same source, target
 * and form, the engine, preset and search `current` names (held to that
 * engine's bounds, the early stop's depth no deeper than the new depth, as
 * the form's preset change does), the old job named, and its results so far
 * as the seed.
 */
export const continuedInputOf = (
  input: ComputerAnalysisInput,
  state: Pick<ComputerAnalysisState, "checkpoint"> | null,
  current: JobEngineSettings,
  continues: JobContinuation,
): ComputerAnalysisInput => {
  const seed = (state?.checkpoint ?? []).filter((result): result is PositionResult => result !== null);
  return {
    source: input.source,
    options: computerAnalysisOptionsFrom({
      ...input.options,
      engine: current.engine,
      depth: current.depth,
      minDepth: Math.min(input.options.minDepth, current.depth),
      moveTimeMs: current.moveTimeMs,
      threads: current.threads,
      hashMb: current.hashMb,
    }),
    preset: { id: current.preset.id, name: current.preset.name, values: current.preset.values },
    target: input.target,
    continues,
    ...(seed.length === 0 ? {} : { seed }),
  };
};

/* ─── A step ──────────────────────────────────────────────────────────── */

/** A position's result — the engine session's `evaluate` — or `undefined` when the run was stopped. */
export type PositionEvaluator = (position: AnalysisPosition, index: number) => Promise<PositionResult | undefined>;

export type ComputerAnalysisStep = {
  state: ComputerAnalysisState;
  progress: ComputerAnalysisProgress;
  done: boolean;
  /** The result this step wrote, and where — absent when there was nothing left to search. */
  checkpointed?: { index: number; result: PositionResult };
};

/**
 * **One step: one position.** The input's positions are checked against the
 * state's (a PGN that no longer reads, or reads other positions, throws
 * `source`); the first position without a result is evaluated, and its
 * result written at its index — a result about another FEN throws `engine`.
 * `undefined` when the evaluator was stopped. Safe to re-run from the same state.
 */
export const stepOf = async (
  state: ComputerAnalysisState,
  input: ComputerAnalysisInput,
  evaluate: PositionEvaluator,
): Promise<ComputerAnalysisStep | undefined> => {
  const search = inputSearchOf(input);
  if (
    search === undefined ||
    search.positions.length !== state.positions.length ||
    search.positions.some((position, index) => position.fen !== state.positions[index].fen)
  ) {
    throw new ComputerAnalysisError("source");
  }
  const index = nextIndexOf(state);
  if (index === -1) return { state, progress: progressOf(state), done: true };

  const result = await evaluate(search.positions[index], index);
  if (result === undefined) return undefined;
  if (result.fen !== state.positions[index].fen) throw new ComputerAnalysisError("engine");
  const next: ComputerAnalysisState = {
    positions: state.positions,
    checkpoint: state.positions.map((_, at) => (at === index ? result : (state.checkpoint[at] ?? null))),
  };
  return { state: next, progress: progressOf(next), done: nextIndexOf(next) === -1, checkpointed: { index, result } };
};

/* ─── The outputs ─────────────────────────────────────────────────────── */

/** A new Case's name: "<case> - computer analysis (<variant>)" (CTA-188's decision). */
export const outputNameOf = (sourceName: string, variant: ComputerAnalysisVariant): string =>
  `${sourceName} - computer analysis (${variant})`;

/**
 * **An output decided** — the runtime's `OutputPlan`, keyed so applying it
 * twice makes nothing twice: a ticked variant's new Game Case, its record id
 * `<jobId>:<variant>`, linked from the source; or the one variant merged into
 * the source Case (a merge the Case already holds is a no-op).
 */
export type ComputerAnalysisOutputPlan =
  | { key: string; kind: "new-case"; variant: ComputerAnalysisVariant; projectId: string; caseId: string; name: string }
  | { key: string; kind: "merge"; variant: ComputerAnalysisVariant; projectId: string; caseId: string };

/** **The outputs, by the input's target** — a finished state's; an unfinished one throws `source`. */
export const outputPlansOf = (
  state: ComputerAnalysisState,
  input: ComputerAnalysisInput,
  jobId: string,
): ComputerAnalysisOutputPlan[] => {
  if (nextIndexOf(state) !== -1) throw new ComputerAnalysisError("source");
  const { source, target, options } = input;
  if (target.kind === "case") {
    const variant = options.outputs[0];
    return variant === undefined
      ? []
      : [{ key: `merge:${variant}`, kind: "merge", variant, projectId: source.projectId, caseId: source.caseId }];
  }
  return options.outputs.map((variant) => ({
    key: `case:${variant}`,
    kind: "new-case",
    variant,
    projectId: target.projectId,
    caseId: `${jobId}:${variant}`,
    name: outputNameOf(source.name, variant),
  }));
};

/** The engine that ran a job — the one actually running, which the job's choice may have fallen back from. */
export type RanEngine = { id: string; name: string; version: string };

/**
 * **A job's analysis on a tree** — one variant's annotated tree
 * (`computerAnalysisTree`) built over `tree`, **whatever it holds now**: its
 * positions read again, each given the checkpoint's result for its FEN, the
 * verdicts made of those. Every move, side line and comment of `tree` is
 * kept; a move whose position was never searched is left unannotated. The
 * annotator is the engine that ran it, else the options' engine.
 */
export const analysisOf = (
  state: Pick<ComputerAnalysisState, "checkpoint">,
  input: Pick<ComputerAnalysisInput, "options">,
  tree: GameTree,
  variant: ComputerAnalysisVariant,
  engine: RanEngine | null = null,
): GameTree => {
  const positions = analysisPositionsOf(tree, input.options);
  const byFen = new Map(state.checkpoint.flatMap((entry) => (entry === null ? [] : [[entry.fen, entry] as const])));
  const results = positions.map((position) => byFen.get(position.fen));
  return computerAnalysisTree({
    source: tree,
    positions,
    results,
    verdicts: moveVerdicts(positions, results, input.options),
    variant,
    engine: engine === null ? input.options.engine : annotatorOf(engine),
    options: input.options,
  });
};

/** The source-Case merge as a PGN edit — the one variant over `pgn`; `undefined` for a PGN that will not read. */
export const mergedPgnOf = (
  state: Pick<ComputerAnalysisState, "checkpoint">,
  input: Pick<ComputerAnalysisInput, "options">,
  pgn: string,
  engine: RanEngine | null = null,
): string | undefined => {
  const variant = input.options.outputs[0];
  if (variant === undefined) return undefined;
  let tree: GameTree;
  try {
    tree = parsePgnTree(pgn);
  } catch {
    return undefined;
  }
  return treeToPgn(analysisOf(state, input, tree, variant, engine));
};

/** A job's title — the source Case's name as shown when it was sent. */
export const titleOf = (input: ComputerAnalysisInput): string => input.source.name;

/** What a job is about — the source Case, and the other Project when the results go there. */
export const subjectsOf = (input: ComputerAnalysisInput): EntityRef[] => [
  { type: ANALYSIS_CASE_ENTITY, id: input.source.caseId },
  ...(input.target.kind === "other" ? [{ type: ANALYSIS_PROJECT_ENTITY, id: input.target.projectId }] : []),
];

/** Whether a variant name is one the kind knows. */
export const isComputerAnalysisVariant = (value: unknown): value is ComputerAnalysisVariant =>
  (COMPUTER_ANALYSIS_VARIANTS as readonly unknown[]).includes(value);
