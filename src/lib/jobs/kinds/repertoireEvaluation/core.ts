import {
  computerAnalysisOptionsFrom,
  DEFAULT_COMPUTER_ANALYSIS_OPTIONS,
  moveVerdicts,
  terminalResultOf,
  turnOf,
  type AnalysisPosition,
  type ComputerAnalysisOptions,
  type MoveVerdictKind,
  type PositionLine,
  type PositionResult,
  type VerdictThresholds,
} from "../../../computerAnalysis";
import { withMoveVerdict } from "../../../computerAnalysisTree";
import type { Score, Turn } from "../../../engineAnalysis";
import { withAnnotator, withEval } from "../../../engineEvals";
import type { UciOptionValue } from "../../../engineTypes";
import { commentsAt, plyLabel, setComments, treeToPgn, type GameTree, type VariationNode } from "../../../gameTree";
import { parsePgnTree } from "../../../pgn";
import { TreeManager } from "../../../treeManager";

/**
 * **The repertoire evaluation, the pure core** (CTA-219, a kind of the Jobs
 * module — CTA-215's *The three kinds*, `repertoire.evaluation`): the engine
 * over every position of a repertoire up to a ply limit, each judged once
 * however many lines reach it, then a verdict on every move the repertoire's
 * own side plays, by `lib/computerAnalysis.ts`'s rules and thresholds.
 *
 * No engine, store, runtime or React here: the evaluator is injected
 * ({@link RepertoireEvaluator}, the engine session's in the kind's adapter),
 * and the outputs are *planned* ({@link outputPlansOf}) for the adapter to
 * apply. The adapter (`kind.ts`) and its wiring are CTA-221's.
 *
 * ```
 * input ─▶ planOf ─▶ state { positions, results: {} }
 *            stepOf × n (one position each, keyed by FEN) ─▶ state { positions, results }
 *                                                         ─▶ reportOf · annotatedTreeOf · outputPlansOf
 * ```
 *
 * - **A position is its FEN's first four fields** ({@link positionKeyOf}) —
 *   placement, side to move, castling, en passant; the clocks dropped, so two
 *   move orders that meet are **one position, searched once** (the opening
 *   book's exact match drops nothing but compares as the lichess evaluation
 *   database does: `chess.js` writes the en passant square only when a capture
 *   is legal, so a tree's FENs compare cleanly).
 * - **The state is keyed by that FEN**, never by an index or a node id (node
 *   ids do not survive a PGN round trip). It carries a fingerprint of what
 *   planned it ({@link fingerprintOf}); a state planned from another PGN,
 *   side, ply limit or search re-plans ({@link stateFor}) rather than lend
 *   its results to the wrong moves.
 * - **The verdicts are `moveVerdicts`'s own**, asked of each move as a
 *   two-position game (the position before it and the one after), so the
 *   loss, the kind, a missed mate and the best alternative are
 *   computerAnalysis's by construction — no second definition.
 */

/** The kind's id in the Jobs module's registry. */
export const REPERTOIRE_EVALUATION_KIND = "repertoire.evaluation";

/** The report's schema — a data output's `schema`, which its view checks. */
export const REPERTOIRE_EVALUATION_REPORT_SCHEMA = "repertoire.evaluation.report@1";

/** The state's shape version; a state of another reads as none (re-planned). */
export const REPERTOIRE_EVALUATION_STATE_VERSION = 1;

/** The search the job runs: computerAnalysis's own knobs, minus its early stop. */
export type RepertoireEvaluationSearch = Pick<ComputerAnalysisOptions, "threads" | "hashMb" | "depth" | "moveTimeMs" | "multiPv">;

/** The engine's preset the job was given — its id and name, and the option values it sends (as Jobs V2's). */
export type RepertoireEvaluationPreset = {
  id: string;
  name: string;
  values: Readonly<Record<string, UciOptionValue>>;
};

/** What is made besides the report, which always is: a new repertoire, the annotated PGN as a file. */
export type RepertoireEvaluationOutputs = { repertoire: boolean; pgnFile: boolean };

/** **What the reader sets** in the New-job form — the input less the repertoire and the engine. */
export type RepertoireEvaluationSettings = {
  /** The side the repertoire plays: its moves are judged, the other side's only lead somewhere. */
  side: Turn;
  /** Plies from the start; a move past it is neither searched nor judged. */
  maxPlies: number;
  search: RepertoireEvaluationSearch;
  thresholds: VerdictThresholds;
  outputs: RepertoireEvaluationOutputs;
};

/** **The job's input** — immutable once enqueued: the repertoire as it was then. */
export type RepertoireEvaluationInput = RepertoireEvaluationSettings & {
  repertoireId: string;
  name: string;
  /** The repertoire's PGN when the job was started. */
  pgn: string;
  /** The engine, a registry id (`lib/engines/`). */
  engine: string;
  preset: RepertoireEvaluationPreset | null;
};

/** The ply limit's range: a move to the 40th. */
export const REPERTOIRE_EVALUATION_PLY_BOUNDS = { min: 1, max: 80 } as const;

const DEFAULT_SEARCH: RepertoireEvaluationSearch = {
  threads: DEFAULT_COMPUTER_ANALYSIS_OPTIONS.threads,
  hashMb: DEFAULT_COMPUTER_ANALYSIS_OPTIONS.hashMb,
  depth: DEFAULT_COMPUTER_ANALYSIS_OPTIONS.depth,
  moveTimeMs: DEFAULT_COMPUTER_ANALYSIS_OPTIONS.moveTimeMs,
  multiPv: DEFAULT_COMPUTER_ANALYSIS_OPTIONS.multiPv,
};

/** The defaults: White, twenty plies (ten moves), computerAnalysis's search and thresholds, the report alone. */
export const DEFAULT_REPERTOIRE_EVALUATION_SETTINGS: RepertoireEvaluationSettings = {
  side: "w",
  maxPlies: 20,
  search: DEFAULT_SEARCH,
  thresholds: DEFAULT_COMPUTER_ANALYSIS_OPTIONS.thresholds,
  outputs: { repertoire: false, pgnFile: false },
};

/** How far below line 1 a line may score and still be the "best alternative" — computerAnalysis's default. */
const VARIATION_RANGE_CP = DEFAULT_COMPUTER_ANALYSIS_OPTIONS.variationRangeCp;

const isRow = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const isOptionValue = (value: unknown): value is UciOptionValue =>
  typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value));

/**
 * **Settings from a form or a stored input**, every field read on its own:
 * a missing or mistyped one takes its default; the search and thresholds are
 * held as `computerAnalysisOptionsFrom` holds them (the named engine's
 * Threads and Hash, the thresholds in order). Never throws.
 */
export const repertoireEvaluationSettingsFrom = (value: unknown, engine?: string): RepertoireEvaluationSettings => {
  const row = isRow(value) ? value : {};
  const search = isRow(row.search) ? row.search : {};
  const options = computerAnalysisOptionsFrom({
    ...DEFAULT_SEARCH,
    ...search,
    ...(engine === undefined ? {} : { engine }),
    thresholds: row.thresholds,
  });
  const outputs = isRow(row.outputs) ? row.outputs : {};
  const plies = row.maxPlies;
  return {
    side: row.side === "b" ? "b" : "w",
    maxPlies:
      typeof plies === "number" && Number.isFinite(plies)
        ? Math.min(REPERTOIRE_EVALUATION_PLY_BOUNDS.max, Math.max(REPERTOIRE_EVALUATION_PLY_BOUNDS.min, Math.round(plies)))
        : DEFAULT_REPERTOIRE_EVALUATION_SETTINGS.maxPlies,
    search: {
      threads: options.threads,
      hashMb: options.hashMb,
      depth: options.depth,
      moveTimeMs: options.moveTimeMs,
      multiPv: options.multiPv,
    },
    thresholds: options.thresholds,
    outputs: { repertoire: outputs.repertoire === true, pgnFile: outputs.pgnFile === true },
  };
};

const presetFrom = (value: unknown): RepertoireEvaluationPreset | null => {
  if (!isRow(value) || typeof value.id !== "string") return null;
  const values = isRow(value.values)
    ? Object.fromEntries(Object.entries(value.values).filter((entry): entry is [string, UciOptionValue] => isOptionValue(entry[1])))
    : {};
  return { id: value.id, name: typeof value.name === "string" ? value.name : "", values };
};

/**
 * **The input, read leniently** (the kind's `parseInput`): `undefined` without
 * the repertoire's id or its PGN; everything else as
 * {@link repertoireEvaluationSettingsFrom} reads it, the engine the default
 * where none is named. Never throws.
 */
export const parseRepertoireEvaluationInput = (value: unknown): RepertoireEvaluationInput | undefined => {
  if (!isRow(value)) return undefined;
  if (typeof value.repertoireId !== "string" || value.repertoireId === "" || typeof value.pgn !== "string") return undefined;
  const engine = typeof value.engine === "string" && value.engine !== "" ? value.engine : DEFAULT_COMPUTER_ANALYSIS_OPTIONS.engine;
  return {
    repertoireId: value.repertoireId,
    name: typeof value.name === "string" ? value.name : "",
    pgn: value.pgn,
    engine,
    preset: presetFrom(value.preset),
    ...repertoireEvaluationSettingsFrom(value, engine),
  };
};

/* ─── The plan ────────────────────────────────────────────────────────── */

/** **A position, as the state keys it**: the FEN's first four fields. */
export const positionKeyOf = (fen: string): string => fen.trim().split(/\s+/).slice(0, 4).join(" ");

/** A repertoire move played from a planned position. */
export type PlannedMove = {
  san: string;
  uci: string;
  /** The position it leads to, by key. */
  to: string;
};

/** **One position the job searches.** */
export type PlannedPosition = {
  /** {@link positionKeyOf} its FEN — the state's key. */
  key: string;
  /** A full FEN of it, as first reached: what the engine is given. */
  fen: string;
  turn: Turn;
  /** The fewest plies it is reached in. */
  ply: number;
  /** Lines asked for: the search's where a repertoire move is played from it, else 1 (only line 1 is read). */
  multiPv: number;
  /** The first {@link MAX_PATHS_KEPT} SAN paths reaching it, the shortest first. */
  paths: string[][];
  /** How many lines of the repertoire reach it. */
  pathCount: number;
  /** The repertoire's own moves from it, in the tree's order. */
  moves: PlannedMove[];
};

/** **The checkpoint**: the plan, its fingerprint, and a result per position searched — by key. */
export type RepertoireEvaluationState = {
  version: number;
  fingerprint: string;
  positions: PlannedPosition[];
  results: Record<string, PositionResult>;
};

/** How far a job has got — the runtime's `JobProgress`. */
export type RepertoireEvaluationProgress = { done: number; total: number; label?: string };

/** The paths a position keeps — enough for a link and "reached N ways"; the count is kept whole. */
export const MAX_PATHS_KEPT = 5;

/** FNV-1a over a string, as 8 hex digits — the fingerprint's hash. */
const fnv1a = (text: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

/** **What a plan is made from**: the PGN, the side, the ply limit and the search — any change re-plans. */
export const fingerprintOf = (input: Pick<RepertoireEvaluationInput, "pgn" | "side" | "maxPlies" | "search">): string =>
  fnv1a(JSON.stringify([input.pgn, input.side, input.maxPlies, input.search.depth, input.search.moveTimeMs, input.search.multiPv]));

/** A move's UCI from its node: squares, and the promotion piece SAN writes after `=`. */
const uciOf = (node: VariationNode): string => `${node.from}${node.to}${/=([QRBN])/.exec(node.san)?.[1]?.toLowerCase() ?? ""}`;

/** The repertoire's PGN as a tree, or `undefined` where it does not read. */
const treeOf = (pgn: string): GameTree | undefined => {
  try {
    return parsePgnTree(pgn);
  } catch {
    return undefined;
  }
};

/** A tree's move within the ply limit, with the move it follows (`null` the start). */
type WalkedMove = { node: VariationNode; parent: VariationNode | null };

/** Every move of `tree` up to `maxPlies`, depth-first, the mainline first (`treeManager`'s walk). */
const movesWithin = (tree: GameTree, maxPlies: number): WalkedMove[] => {
  const within = (node: VariationNode) => (node.ply < maxPlies ? node.children : []);
  const parents = new Map<string, VariationNode | null>(tree.moves.map((node) => [node.id, null]));
  const walk = new TreeManager<VariationNode>(maxPlies >= 1 ? tree.moves : []);
  const moves: WalkedMove[] = [];
  walk.traverse(
    (node) => {
      moves.push({ node, parent: parents.get(node.id) ?? null });
      for (const child of within(node)) parents.set(child.id, node);
    },
    { getChildren: within },
  );
  return moves;
};

/** Whether `node` is the repertoire side's move: the side to move before it is `side`. */
const isSideMove = (node: VariationNode, side: Turn): boolean => turnOf(node.fen) !== side;

/** The SAN path to `node` (inclusive), through the walk's parents. */
const pathOf = (node: VariationNode | null, parents: ReadonlyMap<string, VariationNode | null>): string[] => {
  const sans: string[] = [];
  for (let at = node; at !== null; at = parents.get(at.id) ?? null) sans.push(at.san);
  return sans.reverse();
};

/**
 * **The plan** (the kind's `plan`): the repertoire parsed (`parsePgnTree`),
 * every line walked to the ply limit, and **the positions the repertoire's
 * own moves are judged by** — the one before each (its best) and the one
 * after it (what it left) — each once by its key, however many lines reach
 * it, with the moves the repertoire plays from it and the paths reaching it.
 * In order of how early they are reached, so a job part-way through has
 * judged the opening first. `undefined` for a PGN that does not read.
 */
export const planOf = (
  input: RepertoireEvaluationInput,
): { state: RepertoireEvaluationState; progress: RepertoireEvaluationProgress } | undefined => {
  const tree = treeOf(input.pgn);
  if (tree === undefined) return undefined;
  const walked = movesWithin(tree, input.maxPlies);
  const parents = new Map(walked.map(({ node, parent }) => [node.id, parent]));

  type Building = PlannedPosition & { reachedVia: Set<string>; order: number };
  const byKey = new Map<string, Building>();
  /** The position after `leading` (`null` the start), its path registered once per move leading there. */
  const reach = (leading: VariationNode | null): Building => {
    const fen = leading?.fen ?? tree.startFen;
    const key = positionKeyOf(fen);
    const ply = leading?.ply ?? 0;
    let position = byKey.get(key);
    if (position === undefined) {
      position = { key, fen, turn: turnOf(fen), ply, multiPv: 1, paths: [], pathCount: 0, moves: [], reachedVia: new Set(), order: byKey.size };
      byKey.set(key, position);
    }
    const via = leading?.id ?? "";
    if (!position.reachedVia.has(via)) {
      position.reachedVia.add(via);
      position.pathCount += 1;
      position.paths.push(pathOf(leading, parents));
      position.paths.sort((a, b) => a.length - b.length);
      position.paths.length = Math.min(position.paths.length, MAX_PATHS_KEPT);
      if (ply < position.ply) position.ply = ply;
    }
    return position;
  };

  for (const { node, parent } of walked) {
    if (!isSideMove(node, input.side)) continue;
    const before = reach(parent);
    const after = reach(node);
    const uci = uciOf(node);
    before.multiPv = input.search.multiPv;
    if (!before.moves.some((move) => move.uci === uci)) before.moves.push({ san: node.san, uci, to: after.key });
  }

  const positions = [...byKey.values()]
    .sort((a, b) => a.ply - b.ply || a.order - b.order)
    .map(
      (position): PlannedPosition => ({
        key: position.key,
        fen: position.fen,
        turn: position.turn,
        ply: position.ply,
        multiPv: position.multiPv,
        paths: position.paths,
        pathCount: position.pathCount,
        moves: position.moves,
      }),
    );
  const state: RepertoireEvaluationState = {
    version: REPERTOIRE_EVALUATION_STATE_VERSION,
    fingerprint: fingerprintOf(input),
    positions,
    results: {},
  };
  return { state, progress: progressOf(state) };
};

/** The move that leads to a position, as a reader numbers it ("7... Nc6"); `undefined` at the start. */
const leadingMoveLabel = (position: PlannedPosition): string | undefined => {
  const path = position.paths[0];
  const san = path?.at(-1);
  if (path === undefined || san === undefined) return undefined;
  const [, turn, , , , fullmove] = position.fen.split(" ");
  // The FEN is after the move: Black to move means White just moved, in this same move number.
  const number = (Number(fullmove) || 1) - (turn === "w" ? 1 : 0);
  return `${Math.max(1, number)}${turn === "b" ? "." : "..."} ${san}`;
};

/** **How far a state has got**: positions with a result, of how many, and the next one's move. */
export const progressOf = (state: RepertoireEvaluationState): RepertoireEvaluationProgress => {
  const done = state.positions.filter((position) => state.results[position.key] !== undefined).length;
  const next = state.positions.find((position) => state.results[position.key] === undefined);
  const label = next === undefined ? undefined : leadingMoveLabel(next);
  return { done, total: state.positions.length, ...(label === undefined ? {} : { label }) };
};

/** The state when it was planned from this input; `undefined` (re-plan) when it was not. */
export const stateFor = (
  input: RepertoireEvaluationInput,
  state: RepertoireEvaluationState | null | undefined,
): RepertoireEvaluationState | undefined =>
  state !== null && state !== undefined && state.fingerprint === fingerprintOf(input) ? state : undefined;

/** The state to read from: this input's, else a fresh plan with no results — never another plan's results. */
const currentState = (
  input: RepertoireEvaluationInput,
  state: RepertoireEvaluationState | null | undefined,
): RepertoireEvaluationState | undefined => stateFor(input, state) ?? planOf(input)?.state;

/* ─── Reading a stored state ──────────────────────────────────────────── */

const scoreFrom = (value: unknown): Score | undefined => {
  if (!isRow(value) || typeof value.value !== "number" || !Number.isFinite(value.value)) return undefined;
  return value.kind === "cp" || value.kind === "mate" ? { kind: value.kind, value: value.value } : undefined;
};

const lineFrom = (value: unknown): PositionLine | undefined => {
  if (!isRow(value)) return undefined;
  const score = scoreFrom(value.score);
  if (score === undefined) return undefined;
  return {
    score,
    depth: typeof value.depth === "number" && Number.isFinite(value.depth) ? value.depth : 0,
    pv: Array.isArray(value.pv) ? value.pv.filter((move): move is string => typeof move === "string") : [],
  };
};

const pathsFrom = (value: unknown): string[][] =>
  Array.isArray(value)
    ? value.filter(Array.isArray).map((path: unknown[]) => path.filter((san): san is string => typeof san === "string"))
    : [];

const positionFrom = (value: unknown): PlannedPosition | undefined => {
  if (!isRow(value) || typeof value.fen !== "string") return undefined;
  const key = positionKeyOf(value.fen);
  if (value.key !== key) return undefined;
  const moves = Array.isArray(value.moves)
    ? value.moves.flatMap((move): PlannedMove[] =>
        isRow(move) && typeof move.san === "string" && typeof move.uci === "string" && typeof move.to === "string"
          ? [{ san: move.san, uci: move.uci, to: move.to }]
          : [],
      )
    : [];
  const whole = (raw: unknown, fallback: number) => (typeof raw === "number" && Number.isInteger(raw) && raw >= 0 ? raw : fallback);
  const paths = pathsFrom(value.paths);
  return {
    key,
    fen: value.fen,
    turn: turnOf(value.fen),
    ply: whole(value.ply, 0),
    multiPv: Math.max(1, whole(value.multiPv, 1)),
    paths,
    pathCount: Math.max(paths.length, whole(value.pathCount, paths.length)),
    moves,
  };
};

/**
 * **A stored state, read leniently** (the kind's `parseState`): `undefined` —
 * re-plan — for another shape version, a kind version that is not this one,
 * or a value that is not a state. A position that does not read is dropped,
 * and so is a result for no planned position or with no line. Never throws.
 */
export const parseRepertoireEvaluationState = (
  value: unknown,
  fromVersion: number = REPERTOIRE_EVALUATION_STATE_VERSION,
): RepertoireEvaluationState | undefined => {
  if (fromVersion !== REPERTOIRE_EVALUATION_STATE_VERSION) return undefined;
  if (!isRow(value) || value.version !== REPERTOIRE_EVALUATION_STATE_VERSION || typeof value.fingerprint !== "string") return undefined;
  if (!Array.isArray(value.positions)) return undefined;
  const positions = value.positions.flatMap((position) => positionFrom(position) ?? []);
  const fens = new Map(positions.map((position) => [position.key, position.fen]));
  const stored = isRow(value.results) ? value.results : {};
  const results: Record<string, PositionResult> = {};
  for (const [key, raw] of Object.entries(stored)) {
    const fen = fens.get(key);
    if (fen === undefined || !isRow(raw) || !Array.isArray(raw.lines)) continue;
    const lines = raw.lines.flatMap((line) => lineFrom(line) ?? []);
    if (lines.length > 0) results[key] = { fen, lines };
  }
  return { version: REPERTOIRE_EVALUATION_STATE_VERSION, fingerprint: value.fingerprint, positions, results };
};

/* ─── One step ────────────────────────────────────────────────────────── */

/** What a job's step asks of the engine: a position, and how many lines. The search is the input's. */
export type RepertoireEvaluationRequest = { fen: string; turn: Turn; multiPv: number };

/**
 * **The evaluator the step is given** — the engine session's in the kind's
 * adapter. Its lines' scores are White's view (`scoreFromUci`), `lines[0]`
 * line 1; `undefined` or no line is an engine error.
 */
export type RepertoireEvaluator = (request: RepertoireEvaluationRequest) => Promise<PositionResult | undefined>;

/** Why a step could not go on: the repertoire no longer reads, or the engine gave nothing. */
export type RepertoireEvaluationErrorCode = "source" | "engine";

export class RepertoireEvaluationError extends Error {
  readonly code: RepertoireEvaluationErrorCode;

  constructor(code: RepertoireEvaluationErrorCode, message?: string) {
    super(message ?? code);
    this.name = "RepertoireEvaluationError";
    this.code = code;
  }
}

/**
 * **One unit of work** (the kind's `step`): the first position with no
 * result, searched through `evaluate` — a mate or stalemate never asked, its
 * result `terminalResultOf`'s — its result stored under its key. At least
 * once: from the same state it searches the same position and stores the same
 * key, so a step re-run after a crash writes nothing twice. A state planned
 * from other input re-plans first. `done` once every position has a result.
 */
export const stepOf = async (
  state: RepertoireEvaluationState | null | undefined,
  input: RepertoireEvaluationInput,
  evaluate: RepertoireEvaluator,
): Promise<{ state: RepertoireEvaluationState; progress: RepertoireEvaluationProgress; done: boolean }> => {
  const current = currentState(input, state);
  if (current === undefined) throw new RepertoireEvaluationError("source", "The repertoire's PGN does not read.");
  const next = current.positions.find((position) => current.results[position.key] === undefined);
  if (next === undefined) return { state: current, progress: progressOf(current), done: true };

  const result = terminalResultOf(next.fen) ?? (await evaluate({ fen: next.fen, turn: next.turn, multiPv: next.multiPv }));
  if (result === undefined || result.lines.length === 0) {
    throw new RepertoireEvaluationError("engine", `No scored line for ${next.fen}.`);
  }
  const stepped: RepertoireEvaluationState = {
    ...current,
    results: { ...current.results, [next.key]: { fen: next.fen, lines: result.lines } },
  };
  const progress = progressOf(stepped);
  return { state: stepped, progress, done: progress.done === progress.total };
};

/* ─── Verdicts and the report ─────────────────────────────────────────── */

/** A move's verdict in the report: computerAnalysis's kinds, `good` under every threshold, `pending` not judged yet. */
export type RepertoireVerdict = MoveVerdictKind | "good" | "pending";

export const REPERTOIRE_VERDICTS: readonly RepertoireVerdict[] = ["blunder", "missedMate", "mistake", "inaccuracy", "good", "pending"];

/** Whether a verdict is flagged — an inaccuracy, a mistake, a blunder or a missed mate. */
export const isFlagged = (verdict: RepertoireVerdict): boolean => verdict !== "good" && verdict !== "pending";

/** **One repertoire move, judged.** */
export type RepertoireReportMove = {
  /** Unique in the report: the move's first SAN path, joined by `_` (no SAN holds one). */
  id: string;
  /** The SAN path to the move, inclusive — `?at=` opens the repertoire there. */
  path: string[];
  /** The moves before it, numbered ("1. e4 c5 2. Nf3"); empty for a first move. */
  line: string;
  /** The move, numbered ("2... d6"). */
  move: string;
  san: string;
  /** The position before the move, as the state keys it. */
  key: string;
  /** Line 1 before the move — the best there was (White's view). */
  before?: Score;
  /** Line 1 after it — what the move left (White's view). */
  after?: Score;
  /** Centipawns given up, from the mover's view (computerAnalysis's). */
  loss?: number;
  verdict: RepertoireVerdict;
  missedMateIn?: number;
  /** The engine's best move that is not this one, in SAN. */
  bestSan?: string;
  /** How many other lines of the repertoire reach the same position. */
  otherPaths: number;
};

/** **The report** — a data output, `repertoire.evaluation.report@1`. */
export type RepertoireEvaluationReport = {
  schema: typeof REPERTOIRE_EVALUATION_REPORT_SCHEMA;
  repertoireId: string;
  name: string;
  side: Turn;
  maxPlies: number;
  thresholds: VerdictThresholds;
  /** Positions searched, of how many. */
  positions: { done: number; total: number };
  /** How many moves have each verdict. */
  counts: Record<RepertoireVerdict, number>;
  /** The moves: flagged first, worst first, then the rest in the tree's order. */
  moves: RepertoireReportMove[];
};

/** A score as `side` sees it (White's view turned for Black) — how the report's block shows a move's evals. */
export const scoreForSide = (score: Score, side: Turn): Score => (side === "w" ? score : { kind: score.kind, value: -score.value });

/** A SAN path numbered from `startFen`: "1. e4 c5 2. Nf3", a line from Black's move "1... c5 2. Nf3". */
export const numberedLine = (startFen: string, sans: readonly string[], fromPly = 1): string =>
  sans
    .map((san, index) => {
      const { number, isWhiteMove } = plyLabel(startFen, fromPly + index);
      if (isWhiteMove) return `${number}. ${san}`;
      return index === 0 ? `${number}... ${san}` : san;
    })
    .join(" ");

/** One move's verdict from the two results: `moveVerdicts` over the move as a two-position game. */
const judged = (
  before: PlannedPosition,
  move: PlannedMove,
  after: PlannedPosition | undefined,
  results: Readonly<Record<string, PositionResult>>,
  thresholds: VerdictThresholds,
) => {
  if (after === undefined) return undefined;
  const positions: AnalysisPosition[] = [
    {
      fen: before.fen,
      ply: before.ply,
      turn: before.turn,
      nodeId: null,
      move: { nodeId: "move", san: move.san, uci: move.uci },
      analysed: true,
      multiPv: before.multiPv,
      terminal: false,
    },
    { fen: after.fen, ply: before.ply + 1, turn: after.turn, nodeId: "move", analysed: false, multiPv: 1, terminal: false },
  ];
  return moveVerdicts(positions, [results[before.key], results[after.key]], { thresholds, variationRangeCp: VARIATION_RANGE_CP })[0];
};

/** Worst first: a blunder, a missed mate, a mistake, an inaccuracy. */
const SEVERITY: Readonly<Record<RepertoireVerdict, number>> = { blunder: 0, missedMate: 1, mistake: 2, inaccuracy: 3, good: 4, pending: 5 };

/**
 * **The report** (the kind's data output): every repertoire move within the
 * ply limit, once per position it is played from — its evals before and
 * after (White's view; the block turns them to the side's), its loss, its
 * verdict by computerAnalysis's rules and the input's thresholds, the
 * engine's best other move and the path that opens it. Flagged moves first,
 * worst first (by kind, then loss); then the rest in the tree's order, a move
 * not judged yet last. Read from a state of other input, nothing is judged.
 * `undefined` for a PGN that does not read.
 */
export const reportOf = (
  state: RepertoireEvaluationState | null | undefined,
  input: RepertoireEvaluationInput,
): RepertoireEvaluationReport | undefined => {
  const current = currentState(input, state);
  const tree = treeOf(input.pgn);
  if (current === undefined || tree === undefined) return undefined;
  const byKey = new Map(current.positions.map((position) => [position.key, position]));

  const moves: RepertoireReportMove[] = [];
  /** Each move's place in the tree's order — the sort's last word. */
  const order = new Map<RepertoireReportMove, number>();
  for (const position of current.positions) {
    for (const move of position.moves) {
      const verdict = judged(position, move, byKey.get(move.to), current.results, input.thresholds);
      const before = position.paths[0] ?? [];
      const path = [...before, move.san];
      moves.push({
        id: path.join("_"),
        path,
        line: numberedLine(tree.startFen, before),
        move: numberedLine(tree.startFen, [move.san], before.length + 1),
        san: move.san,
        key: position.key,
        verdict: verdict === undefined ? "pending" : (verdict.kind ?? "good"),
        otherPaths: Math.max(0, position.pathCount - 1),
        ...(verdict === undefined
          ? {}
          : {
              before: verdict.best,
              after: verdict.played,
              loss: verdict.loss,
              ...(verdict.missedMateIn === undefined ? {} : { missedMateIn: verdict.missedMateIn }),
              ...(verdict.bestSan === undefined ? {} : { bestSan: verdict.bestSan }),
            }),
      });
      order.set(moves[moves.length - 1], moves.length - 1);
    }
  }

  const placeOf = (move: RepertoireReportMove) => order.get(move) ?? 0;
  moves.sort((a, b) => {
    const flagged = Number(isFlagged(b.verdict)) - Number(isFlagged(a.verdict));
    if (flagged !== 0) return flagged;
    if (isFlagged(a.verdict)) return SEVERITY[a.verdict] - SEVERITY[b.verdict] || (b.loss ?? 0) - (a.loss ?? 0) || placeOf(a) - placeOf(b);
    return Number(a.verdict === "pending") - Number(b.verdict === "pending") || placeOf(a) - placeOf(b);
  });

  const counts = Object.fromEntries(REPERTOIRE_VERDICTS.map((verdict) => [verdict, 0])) as Record<RepertoireVerdict, number>;
  for (const move of moves) counts[move.verdict] += 1;
  const progress = progressOf(current);
  return {
    schema: REPERTOIRE_EVALUATION_REPORT_SCHEMA,
    repertoireId: input.repertoireId,
    name: input.name,
    side: input.side,
    maxPlies: input.maxPlies,
    thresholds: input.thresholds,
    positions: { done: progress.done, total: progress.total },
    counts,
    moves,
  };
};

/**
 * **A report read back** from a data output's value: the same object when it
 * carries this schema and its moves, else `undefined` — what the block's
 * screen checks before drawing one.
 */
export const parseRepertoireEvaluationReport = (value: unknown): RepertoireEvaluationReport | undefined =>
  isRow(value) && value.schema === REPERTOIRE_EVALUATION_REPORT_SCHEMA && Array.isArray(value.moves) && isRow(value.counts)
    ? (value as RepertoireEvaluationReport)
    : undefined;

/* ─── The annotated tree and the outputs ──────────────────────────────── */

/** The `Annotator` an evaluated repertoire carries: the engine, then what it did. */
const annotatorText = (engine: string): string => `${engine} [repertoire evaluation]`;

/**
 * **The repertoire, annotated** — as `computerAnalysisTree` writes a game:
 * every move within the ply limit whose position was searched gets line 1's
 * `[%eval]` (`withEval`, so a deeper stored eval stays; the start position's
 * in the opening comment), and every judged repertoire move its verdict's
 * NAG and comment (`withMoveVerdict`). Every node keeps the id
 * `parsePgnTree(input.pgn)` gives it, and everything else it had.
 * `annotator` names the engine that ran (`annotatorOf`) for the `Annotator`
 * tag; absent, the tag is left as it is. `undefined` for a PGN that does not
 * read.
 */
export const annotatedTreeOf = (
  state: RepertoireEvaluationState | null | undefined,
  input: RepertoireEvaluationInput,
  options: { annotator?: string } = {},
): GameTree | undefined => {
  const source = treeOf(input.pgn);
  const current = currentState(input, state);
  if (source === undefined || current === undefined) return undefined;
  const byKey = new Map(current.positions.map((position) => [position.key, position]));
  const lineOneAt = (fen: string) => current.results[positionKeyOf(fen)]?.lines[0];
  const withEvalAt = (tree: GameTree, id: string | null, fen: string): GameTree => {
    const best = lineOneAt(fen);
    return best === undefined ? tree : setComments(tree, id, "comments", withEval(commentsAt(tree, id, "comments"), best.score, best.depth));
  };

  let tree = withEvalAt(source, null, source.startFen);
  for (const { node, parent } of movesWithin(source, input.maxPlies)) {
    tree = withEvalAt(tree, node.id, node.fen);
    if (!isSideMove(node, input.side)) continue;
    const before = byKey.get(positionKeyOf(parent?.fen ?? source.startFen));
    const move = before?.moves.find((each) => each.uci === uciOf(node));
    if (before === undefined || move === undefined) continue;
    const verdict = judged(before, move, byKey.get(move.to), current.results, input.thresholds);
    if (verdict !== undefined) tree = withMoveVerdict(tree, { ...verdict, nodeId: node.id });
  }
  return options.annotator === undefined ? tree : withAnnotator(tree, annotatorText(options.annotator));
};

/** The new repertoire's name: "<name> — evaluated". */
export const evaluatedRepertoireName = (name: string): string => `${name.trim() || "Repertoire"} — evaluated`;

/** The new repertoire's id, from the job's: the same job always makes the same one (`[0-9a-z]`, as `newRecordId`'s). */
export const evaluatedRepertoireId = (jobId: string): string => `r${jobId.toLowerCase().replace(/[^0-9a-z]/g, "")}e`;

/** The PGN file's name: the repertoire's, made safe, then `-evaluated.pgn`. */
export const evaluatedPgnFileName = (name: string): string => {
  const safe = [...name]
    .filter((char) => char >= " ")
    .join("")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return `${safe || "repertoire"}-evaluated.pgn`;
};

export const PGN_MIME_TYPE = "application/x-chess-pgn";

/** **The outbox entries** a finished job decides — each applied once by its key (the kind's `finalize`). */
export type RepertoireEvaluationOutputPlan =
  | { key: "report"; kind: "data"; schema: typeof REPERTOIRE_EVALUATION_REPORT_SCHEMA; value: RepertoireEvaluationReport }
  | { key: "repertoire"; kind: "repertoire"; repertoireId: string; name: string; pgn: string }
  | { key: "pgn-file"; kind: "artifact"; name: string; mimeType: typeof PGN_MIME_TYPE; text: string };

/**
 * **The outputs** (the kind's `finalize`, deciding only): always the report
 * as data; with `outputs.repertoire`, a new repertoire "<name> — evaluated"
 * holding the annotated tree, its id derived from the job's (a re-run makes
 * the same one, never a second); with `outputs.pgnFile`, the annotated PGN as
 * a file. Empty for a PGN that does not read.
 */
export const outputPlansOf = (
  state: RepertoireEvaluationState | null | undefined,
  input: RepertoireEvaluationInput,
  jobId: string,
  options: { annotator?: string } = {},
): RepertoireEvaluationOutputPlan[] => {
  const report = reportOf(state, input);
  if (report === undefined) return [];
  const plans: RepertoireEvaluationOutputPlan[] = [
    { key: "report", kind: "data", schema: REPERTOIRE_EVALUATION_REPORT_SCHEMA, value: report },
  ];
  if (!input.outputs.repertoire && !input.outputs.pgnFile) return plans;
  const tree = annotatedTreeOf(state, input, options);
  if (tree === undefined) return plans;
  const pgn = treeToPgn(tree);
  if (input.outputs.repertoire) {
    plans.push({ key: "repertoire", kind: "repertoire", repertoireId: evaluatedRepertoireId(jobId), name: evaluatedRepertoireName(input.name), pgn });
  }
  if (input.outputs.pgnFile) {
    plans.push({ key: "pgn-file", kind: "artifact", name: evaluatedPgnFileName(input.name), mimeType: PGN_MIME_TYPE, text: pgn });
  }
  return plans;
};
