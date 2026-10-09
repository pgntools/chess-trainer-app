import { Chess } from "chess.js";

import { scoreFromUci, type Score, type Turn } from "./engineAnalysis";
import { ENGINE_SETTING_BOUNDS } from "./engineSettings";
import { DEFAULT_ENGINE_ID } from "./engines/ids";
import { commentsAt, mainline, plyLabel, type GameTree, type VariationNode } from "./gameTree";
import { readComment } from "./moveAnnotations";
import { evalOf, parseEval, type MoveEval } from "./nextMoveWeights";

/**
 * **Computer analysis of a game, the pure core** (CTA-172, CTA-171): what a
 * background job does with the engine's output, ported from the reader's
 * Python tool (`game-anal-v1`, `main.py` / `utils.py`). It has no engine, no
 * store and no React. The job (CTA-173) searches the positions this module
 * names, and feeds each result back. The annotated trees and the report
 * read back from them are `lib/computerAnalysisTree.ts`.
 *
 * ```
 * options ─▶ analysisPositionsOf(tree) ─▶ [the job searches each position:
 *                                          shouldStopEarly, prunedLines]
 *                                     ─▶ PositionResult[] ─▶ moveVerdicts ─▶ playerReports
 * ```
 *
 * **Scores.** A {@link PositionResult}'s scores are White's view, as
 * `scoreFromUci` already made them. The search rules compare lines from **the
 * side to move's** view, and a verdict measures loss in White's view and then
 * signs it for the mover. A mate counts as ±10000 less its distance, which is
 * python-chess's `score(mate_score=10000)`. `mate 0` (the side to move is
 * mated) is −10000 for the side to move.
 *
 * **Where the port departs from `main.py`.**
 * - `main.py` takes the played move's eval from the position *before* the
 *   move, the same line its "best" comes from, so its every loss is 0. Here
 *   the best is the position's line 1, and the played move's eval is **the
 *   next position's** line 1. That is why the positions include the one after
 *   the last analysed move.
 * - A move that mates (`mate 0` after it) is a mate delivered, never a
 *   missed one.
 * - `min_depth` was hard-coded to 24 against a default depth of 20, so the
 *   early stop never fired. Here it is an option, clamped to at most the depth.
 */

/** The three annotated PGNs one run gives (`lib/computerAnalysisTree.ts`). */
export const COMPUTER_ANALYSIS_VARIANTS = ["light", "medium", "full"] as const;
export type ComputerAnalysisVariant = (typeof COMPUTER_ANALYSIS_VARIANTS)[number];

/** Whose moves are analysed. */
export type AnalysisSide = "both" | Turn;

/** The losses, in centipawns, above which a move is an inaccuracy, a mistake, a blunder. */
export type VerdictThresholds = { inaccuracy: number; mistake: number; blunder: number };

/** **The task's options**: how the engine searches, which moves are analysed, what is made. */
export type ComputerAnalysisOptions = {
  /** The engine, a registry id (`lib/engines/`). */
  engine: string;
  /** UCI `Threads` and `Hash`. The job clamps them to what the engine declares. */
  threads: number;
  hashMb: number;
  /** Plies per position. */
  depth: number;
  /** Milliseconds per position; `0` lets the depth alone decide. */
  moveTimeMs: number;
  /** UCI `MultiPV`, the lines searched at a position whose move is analysed. */
  multiPv: number;
  /** The depth from which a search may stop early ({@link shouldStopEarly}); at most `depth`. */
  minDepth: number;
  /** How far below line 1 a line may score and still be kept, in centipawns. */
  variationRangeCp: number;
  side: AnalysisSide;
  /** The first analysed move: its number and colour. */
  fromMove: number;
  fromColour: Turn;
  /** The last analysed move number, both colours; `null` runs to the end of the game. */
  toMove: number | null;
  thresholds: VerdictThresholds;
  /** The annotated PGNs to make; the form requires at least one. */
  outputs: ComputerAnalysisVariant[];
};

/** Where a score stops counting, in centipawns — a verdict's clamp. */
export const LOSS_CLAMP_CP = 1000;

/** What a mate is worth in centipawns, less its distance (python-chess's `mate_score`). */
const MATE_SCORE_CP = 10000;

/** The highest move number the options take. */
const MAX_MOVE_NUMBER = 999;

/**
 * The range each number is taken in. The engine knobs come from
 * `ENGINE_SETTING_BOUNDS`, the board's own. `minDepth` is also clamped to the
 * depth, and the thresholds are kept in order (a mistake at least an
 * inaccuracy, a blunder at least a mistake).
 */
export const COMPUTER_ANALYSIS_BOUNDS = {
  threads: ENGINE_SETTING_BOUNDS.threads,
  hashMb: ENGINE_SETTING_BOUNDS.hashMb,
  depth: ENGINE_SETTING_BOUNDS.depth,
  moveTimeMs: ENGINE_SETTING_BOUNDS.moveTimeMs,
  multiPv: ENGINE_SETTING_BOUNDS.multiPv,
  minDepth: ENGINE_SETTING_BOUNDS.depth,
  variationRangeCp: { min: 0, max: LOSS_CLAMP_CP },
  threshold: { min: 1, max: LOSS_CLAMP_CP },
  move: { min: 1, max: MAX_MOVE_NUMBER },
} as const;

/**
 * The defaults: `main.py`'s (depth 20, 30 s a move, one line, 100 cp, its
 * thresholds 50 / 100 / 300), but with `minDepth` at the depth, where the
 * early stop does nothing, as it did there. Hash is 64 MB rather than its
 * 4096, which the browser's engines cannot take.
 */
export const DEFAULT_COMPUTER_ANALYSIS_OPTIONS: ComputerAnalysisOptions = {
  engine: DEFAULT_ENGINE_ID,
  threads: 1,
  hashMb: 64,
  depth: 20,
  moveTimeMs: 30000,
  multiPv: 1,
  minDepth: 20,
  variationRangeCp: 100,
  side: "both",
  fromMove: 1,
  fromColour: "w",
  toMove: null,
  thresholds: { inaccuracy: 50, mistake: 100, blunder: 300 },
  outputs: ["light"],
};

const clamp = (value: number, { min, max }: { min: number; max: number }): number =>
  Math.min(max, Math.max(min, value));

/** A whole number from `value` within `bounds`, else `fallback`. */
const wholeIn = (value: unknown, bounds: { min: number; max: number }, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? clamp(Math.round(value), bounds) : fallback;

/**
 * **Options from a stored record, or a form**: every field read on its own.
 * A missing or mistyped field takes its default, a number is clamped into its
 * bounds, and the outputs keep the known variants once each, in their order.
 * Never throws.
 */
export const computerAnalysisOptionsFrom = (value: unknown): ComputerAnalysisOptions => {
  const defaults = DEFAULT_COMPUTER_ANALYSIS_OPTIONS;
  const row = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const bounds = COMPUTER_ANALYSIS_BOUNDS;

  const depth = wholeIn(row.depth, bounds.depth, defaults.depth);
  const fromMove = wholeIn(row.fromMove, bounds.move, defaults.fromMove);
  const stored = typeof row.thresholds === "object" && row.thresholds !== null
    ? (row.thresholds as Record<string, unknown>)
    : {};
  const inaccuracy = wholeIn(stored.inaccuracy, bounds.threshold, defaults.thresholds.inaccuracy);
  const mistake = Math.max(inaccuracy, wholeIn(stored.mistake, bounds.threshold, defaults.thresholds.mistake));
  const blunder = Math.max(mistake, wholeIn(stored.blunder, bounds.threshold, defaults.thresholds.blunder));

  return {
    engine: typeof row.engine === "string" && row.engine !== "" ? row.engine : defaults.engine,
    threads: wholeIn(row.threads, bounds.threads, defaults.threads),
    hashMb: wholeIn(row.hashMb, bounds.hashMb, defaults.hashMb),
    depth,
    moveTimeMs: wholeIn(row.moveTimeMs, bounds.moveTimeMs, defaults.moveTimeMs),
    multiPv: wholeIn(row.multiPv, bounds.multiPv, defaults.multiPv),
    minDepth: Math.min(depth, wholeIn(row.minDepth, bounds.minDepth, defaults.minDepth)),
    variationRangeCp: wholeIn(row.variationRangeCp, bounds.variationRangeCp, defaults.variationRangeCp),
    side: row.side === "w" || row.side === "b" ? row.side : "both",
    fromMove,
    fromColour: row.fromColour === "b" ? "b" : "w",
    // A last move before the first one would analyse nothing: it is the first one.
    toMove:
      typeof row.toMove === "number" && Number.isFinite(row.toMove)
        ? Math.max(fromMove, wholeIn(row.toMove, bounds.move, fromMove))
        : defaults.toMove,
    thresholds: { inaccuracy, mistake, blunder },
    outputs: Array.isArray(row.outputs)
      ? COMPUTER_ANALYSIS_VARIANTS.filter((variant) => (row.outputs as unknown[]).includes(variant))
      : [...defaults.outputs],
  };
};

/* ─── Scores ──────────────────────────────────────────────────────────── */

/**
 * A score in centipawns from the side to move's view, a mate as ±10000 less
 * its distance (python-chess's `pov(turn).score(mate_score=10000)`). `turn` is
 * the side to move in the scored position, which is what `mate 0` (that side
 * is mated) needs to be signed at all.
 */
export const moverCp = (score: Score, turn: Turn): number => {
  const sign = turn === "w" ? 1 : -1;
  if (score.kind === "cp") return score.value * sign;
  if (score.value === 0) return -MATE_SCORE_CP;
  const forMover = score.value * sign;
  return forMover > 0 ? MATE_SCORE_CP - forMover : -MATE_SCORE_CP - forMover;
};

/** The same in White's view. */
export const whiteCp = (score: Score, turn: Turn): number =>
  moverCp(score, turn) * (turn === "w" ? 1 : -1);

/** A stored `[%eval]` as a {@link Score}. */
const scoreOfEval = (value: MoveEval): Score =>
  "cp" in value ? { kind: "cp", value: value.cp } : { kind: "mate", value: value.mate };

/** The side to move in a FEN. */
export const turnOf = (fen: string): Turn => (fen.split(" ")[1] === "b" ? "b" : "w");

/* ─── The positions ───────────────────────────────────────────────────── */

/** An evaluation the tree already carries for a position: its score and, when written, its depth. */
export type StoredEval = { score: Score; depth?: number };

/** **One position the job searches**, in mainline order. */
export type AnalysisPosition = {
  fen: string;
  /** Plies from the tree's start: 0 is the start position. */
  ply: number;
  turn: Turn;
  /** The mainline move that leads here; `null` for the start position. */
  nodeId: string | null;
  /** The mainline move played from here, if the game goes on. */
  move?: { nodeId: string; san: string; uci: string };
  /** Whether that move is analysed: it gets a verdict, and lines. */
  analysed: boolean;
  /**
   * How many lines to ask for: the options' `multiPv` where the move is
   * analysed, else 1. Only line 1 of the other positions is read, as the eval
   * of the move that led there.
   */
  multiPv: number;
  /** No legal move (mate or stalemate): never searched, its result is {@link terminalResultOf}. */
  terminal: boolean;
  /**
   * The `[%eval]` the tree already has for this position (on the move that
   * leads here, or the opening comment). The job may skip a search whose
   * stored eval is deep enough and only line 1 is read.
   */
  storedEval?: StoredEval;
};

/** A move's UCI from its node: squares, and the promotion piece SAN writes after `=`. */
const uciOf = (node: VariationNode): string => {
  const promotion = /=([QRBN])/.exec(node.san)?.[1]?.toLowerCase() ?? "";
  return `${node.from}${node.to}${promotion}`;
};

/** An order over moves by number, White's before Black's. */
const moveOrder = (number: number, white: boolean): number => number * 2 + (white ? 0 : 1);

/** The `[%eval]` written in `comments` (a move's, or the opening comment), with its depth. */
const storedEvalIn = (comments: readonly string[]): StoredEval | undefined => {
  for (const text of comments) {
    if (!text.includes("eval")) continue;
    const attributes = readComment(text).attributes;
    const value = attributes.find((attribute) => attribute.key === "eval")?.value;
    const parsed = value === undefined ? undefined : parseEval(value);
    if (parsed === undefined) continue;
    const depth = Number(attributes.find((attribute) => attribute.key === "depth")?.value);
    return { score: scoreOfEval(parsed), ...(Number.isInteger(depth) ? { depth } : {}) };
  }
  return undefined;
};

/** Whether the mainline move at `ply` (1-based) is analysed under `options`. */
const isAnalysedPly = (
  startFen: string,
  ply: number,
  options: Pick<ComputerAnalysisOptions, "side" | "fromMove" | "fromColour" | "toMove">,
): boolean => {
  const { number, isWhiteMove } = plyLabel(startFen, ply);
  if (options.side !== "both" && options.side !== (isWhiteMove ? "w" : "b")) return false;
  if (moveOrder(number, isWhiteMove) < moveOrder(options.fromMove, options.fromColour === "w")) return false;
  return options.toMove === null || number <= options.toMove;
};

/**
 * **The positions a job searches, in order**: from the position before the
 * first analysed move to the one after the last. Each analysed move needs
 * the position before it (the best line and the alternatives) and the one
 * after it (the played move's eval). With an eval-only side that is still
 * every position between them, but the other side's positions only need line 1.
 * Empty when no mainline move is analysed.
 */
export const analysisPositionsOf = (
  tree: GameTree,
  options: ComputerAnalysisOptions,
): AnalysisPosition[] => {
  const nodes = mainline(tree);
  const analysed = nodes.map((_, index) => isAnalysedPly(tree.startFen, index + 1, options));
  const first = analysed.indexOf(true);
  if (first === -1) return [];
  const last = analysed.lastIndexOf(true);

  const positions: AnalysisPosition[] = [];
  // Position `ply` is the one after the ply-th move; the move played from it is nodes[ply].
  for (let ply = first; ply <= last + 1; ply += 1) {
    const before = ply === 0 ? null : nodes[ply - 1];
    const fen = before?.fen ?? tree.startFen;
    const next = nodes[ply] as VariationNode | undefined;
    const isAnalysed = next !== undefined && analysed[ply];
    const storedEval = storedEvalIn(commentsAt(tree, before?.id ?? null, "comments"));
    positions.push({
      fen,
      ply,
      turn: turnOf(fen),
      nodeId: before?.id ?? null,
      ...(next === undefined ? {} : { move: { nodeId: next.id, san: next.san, uci: uciOf(next) } }),
      analysed: isAnalysed,
      multiPv: isAnalysed ? options.multiPv : 1,
      terminal: terminalResultOf(fen) !== undefined,
      ...(storedEval === undefined ? {} : { storedEval }),
    });
  }
  return positions;
};

/* ─── One position's search ───────────────────────────────────────────── */

/** One line of a search: its score (White's view), the depth it reached, and its moves in UCI. */
export type PositionLine = { score: Score; depth: number; pv: string[] };

/** **A position's result**, the job's checkpoint unit: its lines, `lines[0]` line 1. */
export type PositionResult = { fen: string; lines: PositionLine[] };

/**
 * The result of a position with no legal move, which no engine is asked
 * about: a mate is `mate 0` (the side to move is mated), a stalemate `cp 0`.
 * `undefined` for a position with a move to play (or a FEN that does not read).
 */
export const terminalResultOf = (fen: string): PositionResult | undefined => {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return undefined;
  }
  if (chess.moves().length > 0) return undefined;
  const score: Score = chess.isCheckmate() ? { kind: "mate", value: 0 } : { kind: "cp", value: 0 };
  return { fen, lines: [{ score, depth: 0, pv: [] }] };
};

/** What one UCI `info` line carries, as the engine wrapper parses it (`EngineMessage`). */
export type SearchInfo = {
  multipv?: number;
  depth?: number;
  positionEvaluation?: string;
  possibleMate?: string;
  pv?: string;
};

/**
 * One `info` line folded into the lines so far, by its `multipv`
 * (`lines[0]` is line 1): its score normalised against the searched
 * position's `turn`, as `scoreFromUci` does for every board. An `info` with
 * no score is ignored. The same array back when nothing changes.
 */
export const withSearchInfo = (
  lines: readonly (PositionLine | undefined)[],
  info: SearchInfo,
  turn: Turn,
): (PositionLine | undefined)[] => {
  const score = scoreFromUci(info, turn);
  if (score === null) return lines as (PositionLine | undefined)[];
  const at = Math.max(1, info.multipv ?? 1) - 1;
  const next = [...lines];
  next[at] = { score, depth: info.depth ?? 0, pv: (info.pv ?? "").trim().split(/\s+/).filter(Boolean) };
  return next;
};

/**
 * **The early stop** (`analyze_position`): once the search has reached
 * `minDepth` (at most the depth) and line 1 has a score, it stops as soon as
 * any other line is more than `variationRangeCp` below line 1, from the side
 * to move's view. `depth` is the depth of the `info` just folded in.
 */
export const shouldStopEarly = (
  linesByMultiPv: readonly (Pick<PositionLine, "score"> | undefined)[],
  turn: Turn,
  depth: number,
  options: Pick<ComputerAnalysisOptions, "minDepth" | "depth" | "variationRangeCp">,
): boolean => {
  if (depth < Math.min(options.minDepth, options.depth)) return false;
  const best = linesByMultiPv[0];
  if (best === undefined) return false;
  const bestCp = moverCp(best.score, turn);
  return linesByMultiPv
    .slice(1)
    .some((line) => line !== undefined && bestCp - moverCp(line.score, turn) > options.variationRangeCp);
};

/**
 * **The prune** (`analyze_position`'s result): line 1, then every line up to
 * the first one more than `variationRangeCp` below it, from the side to
 * move's view — the lines are in order, so the ones after it are worse
 * still. Without line 1 nothing is pruned (the lines that are there, in order).
 */
export const prunedLines = <Line extends Pick<PositionLine, "score">>(
  lines: readonly (Line | undefined)[],
  turn: Turn,
  options: Pick<ComputerAnalysisOptions, "variationRangeCp">,
): Line[] => {
  const present = lines.filter((line): line is Line => line !== undefined);
  const best = lines[0];
  if (best === undefined) return present;
  const bestCp = moverCp(best.score, turn);
  const cut = present.findIndex(
    (line, index) => index > 0 && bestCp - moverCp(line.score, turn) > options.variationRangeCp,
  );
  return cut === -1 ? present : present.slice(0, cut);
};

/* ─── Verdicts ─────────────────────────────────────────────────────────── */

export type MoveVerdictKind = "inaccuracy" | "mistake" | "blunder" | "missedMate";

/** **What the analysis says of one analysed move.** */
export type MoveVerdict = {
  /** The move, a mainline node of the analysed tree. */
  nodeId: string;
  ply: number;
  /** Who played it. */
  side: Turn;
  san: string;
  /** Line 1 of the position before it: the best the mover had (White's view). */
  best: Score;
  /** Line 1 of the position after it: what the move left (White's view). */
  played: Score;
  /** Centipawns given up, from the mover's view, each score clamped to ±1000; 0 for a missed mate. */
  loss: number;
  kind: MoveVerdictKind | null;
  /** The mate the move gave up, in moves. */
  missedMateIn?: number;
  /** The best line that is not the move played: its first move in SAN, if it plays. */
  bestSan?: string;
};

/**
 * A score's mate as `mover` sees it: whether it is the mover's, and in how
 * many moves. `mate 0` mates the side to move, so after the mover's own move
 * it is a mate the mover delivered.
 */
const moverMate = (
  score: Score,
  turn: Turn,
  mover: Turn,
): { forMover: boolean; moves: number } | undefined => {
  if (score.kind !== "mate") return undefined;
  if (score.value === 0) return { forMover: turn !== mover, moves: 0 };
  return { forMover: score.value > 0 === (mover === "w"), moves: Math.abs(score.value) };
};

/** A move's verdict from the two scores alone — shared with the read-back (`reportFromTree`). */
export const lossAndMissedMate = (
  best: { score: Score; turn: Turn },
  played: { score: Score; turn: Turn },
  mover: Turn,
): { loss: number; missedMateIn?: number } => {
  const bestMate = moverMate(best.score, best.turn, mover);
  const playedMate = moverMate(played.score, played.turn, mover);
  if (bestMate !== undefined && bestMate.forMover && bestMate.moves > 0) {
    // The mover had a forced mate: missing it is giving it up, or taking a longer one.
    const missed =
      playedMate === undefined || !playedMate.forMover || playedMate.moves > bestMate.moves;
    if (missed) return { loss: 0, missedMateIn: bestMate.moves };
  }

  const bestCp = clamp(whiteCp(best.score, best.turn), { min: -LOSS_CLAMP_CP, max: LOSS_CLAMP_CP });
  const playedCp = clamp(whiteCp(played.score, played.turn), { min: -LOSS_CLAMP_CP, max: LOSS_CLAMP_CP });
  const loss = mover === "w" ? bestCp - playedCp : playedCp - bestCp;
  return { loss: Math.max(0, loss) };
};

/** A loss's kind under the thresholds (each "above", as `main.py` has it). */
export const kindOfLoss = (loss: number, thresholds: VerdictThresholds): MoveVerdictKind | null =>
  loss > thresholds.blunder
    ? "blunder"
    : loss > thresholds.mistake
      ? "mistake"
      : loss > thresholds.inaccuracy
        ? "inaccuracy"
        : null;

/** The result of position `index`: the job's, or a terminal position's own. */
export const resultAt = (
  positions: readonly AnalysisPosition[],
  results: readonly (PositionResult | undefined)[],
  index: number,
): PositionResult | undefined => {
  const position = positions[index];
  if (position === undefined) return undefined;
  const result = results[index];
  if (result !== undefined && result.fen === position.fen && result.lines.length > 0) return result;
  return position.terminal ? terminalResultOf(position.fen) : undefined;
};

/** The first move of `uci` played from `fen`, in SAN, or `undefined` where it does not play. */
const sanOf = (fen: string, uci: string | undefined): string | undefined => {
  if (uci === undefined) return undefined;
  try {
    return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined }).san;
  } catch {
    return undefined;
  }
};

/**
 * **Every analysed move's verdict**, in order: the loss from the best line
 * (the position before the move) to the played one (the position after it),
 * its kind under the thresholds, a missed mate, and the best alternative.
 * `results[i]` is `positions[i]`'s. A move whose two results are not both in
 * yet has no verdict, so a job part-way through reads what it has.
 */
export const moveVerdicts = (
  positions: readonly AnalysisPosition[],
  results: readonly (PositionResult | undefined)[],
  options: Pick<ComputerAnalysisOptions, "thresholds" | "variationRangeCp">,
): MoveVerdict[] => {
  const verdicts: MoveVerdict[] = [];
  positions.forEach((position, index) => {
    const { move } = position;
    if (!position.analysed || move === undefined) return;
    const before = resultAt(positions, results, index);
    const after = resultAt(positions, results, index + 1);
    const next = positions[index + 1];
    if (before === undefined || after === undefined || next === undefined) return;

    const best = before.lines[0].score;
    const played = after.lines[0].score;
    const { loss, missedMateIn } = lossAndMissedMate(
      { score: best, turn: position.turn },
      { score: played, turn: next.turn },
      position.turn,
    );
    const alternative = prunedLines(before.lines, position.turn, options).find(
      (line) => line.pv[0] !== undefined && line.pv[0] !== move.uci,
    );
    const bestSan = sanOf(position.fen, alternative?.pv[0]);
    verdicts.push({
      nodeId: move.nodeId,
      ply: position.ply + 1,
      side: position.turn,
      san: move.san,
      best,
      played,
      loss,
      kind: missedMateIn !== undefined ? "missedMate" : kindOfLoss(loss, options.thresholds),
      ...(missedMateIn === undefined ? {} : { missedMateIn }),
      ...(bestSan === undefined ? {} : { bestSan }),
    });
  });
  return verdicts;
};

/* ─── The report ───────────────────────────────────────────────────────── */

/** **One player's summary**, over that side's analysed moves. */
export type PlayerReport = {
  /** The analysed moves. */
  moves: number;
  inaccuracies: number;
  mistakes: number;
  blunders: number;
  missedMates: number;
  /** The average loss, rounded (`main.py`); `null` when no move's loss is known. */
  acpl: number | null;
  /** The lichess formula over the rounded ACPL, 0–100; `null` with it. */
  accuracy: number | null;
};

/** Both players' summaries; `null` for a side with no analysed move. */
export type ComputerAnalysisReport = { w: PlayerReport | null; b: PlayerReport | null };

/** Lichess's accuracy from an ACPL: `103.1668 · e^(−0.004354 · ACPL) − 3.1669`, clamped to 0–100. */
export const accuracyOfAcpl = (acpl: number): number =>
  clamp(103.1668 * Math.exp(-0.004354 * acpl) - 3.1669, { min: 0, max: 100 });

/** What a report is made from: a move's side, kind, and loss where it is known. */
export type ReportedMove = { side: Turn; kind: MoveVerdictKind | null; loss?: number };

/** The two players' summaries over `moves` — the verdicts, or a tree's read-back. */
export const reportOf = (moves: readonly ReportedMove[]): ComputerAnalysisReport => {
  const sideReport = (side: Turn): PlayerReport | null => {
    const own = moves.filter((move) => move.side === side);
    if (own.length === 0) return null;
    const losses = own.flatMap((move) => (move.loss === undefined ? [] : [move.loss]));
    const total = losses.reduce((sum, loss) => sum + loss, 0);
    const acpl = losses.length === 0 ? null : Math.round(total / losses.length);
    const count = (kind: MoveVerdictKind) => own.filter((move) => move.kind === kind).length;
    return {
      moves: own.length,
      inaccuracies: count("inaccuracy"),
      mistakes: count("mistake"),
      blunders: count("blunder"),
      missedMates: count("missedMate"),
      acpl,
      accuracy: acpl === null ? null : accuracyOfAcpl(acpl),
    };
  };
  return { w: sideReport("w"), b: sideReport("b") };
};

/** **The per-player report** of a run: counts, ACPL and accuracy over the analysed moves only. */
export const playerReports = (verdicts: readonly MoveVerdict[]): ComputerAnalysisReport =>
  reportOf(verdicts);

/** The eval a tree's start position carries in its opening comment. */
export const startEvalOf = (tree: GameTree): StoredEval | undefined => storedEvalIn(tree.comments ?? []);

/** The eval a move carries (`evalOf`), as a score. */
export const scoreOfNode = (node: VariationNode): Score | undefined => {
  const value = evalOf(node);
  return value === undefined ? undefined : scoreOfEval(value);
};
