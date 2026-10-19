import { Chess, type Square } from "chess.js";

import {
  DEFAULT_COMPUTER_ANALYSIS_OPTIONS,
  LOSS_CLAMP_CP,
  kindOfLoss,
  scoreOfNode,
  turnOf,
  whiteCp,
  type MoveVerdictKind,
  type VerdictThresholds,
} from "./computerAnalysis";
import { analysisScopeOf } from "./computerAnalysisTree";
import type { Score, Turn } from "./engineAnalysis";
import { mainline, type GameTree, type VariationNode } from "./gameTree";

/**
 * **The Accuracy Trainer** (CTA-238, experimental, dev-only) — pure: what a
 * fully analysed game asks the reader, and how their answers are graded.
 * The reference is `.claude/rules/accuracy-trainer.md`.
 *
 * The evaluations come from the tree alone — a computer analysis's output
 * (`lib/computerAnalysisTree.ts`, `pgn-annotations.md` §6): at an analysed
 * mainline move, the engine's pruned lines hang as side lines, each line's
 * first move carrying the line's `[%eval]`, and the mainline move its own.
 * No engine runs.
 *
 * - **A position to train** is the position before an analysed mainline move
 *   (inside the `AnalysedPlies` / `AnalysedSide` tags when the tree has them)
 *   that has at least one evaluated side line. Its **lines** are those side
 *   lines' first moves and the game's move, when it carries an eval —
 *   ranked best first from the mover's view.
 * - **The top N** are the lines the engine listed: every side line, and the
 *   game's move when it scores at least as well as the worst of them (the
 *   writer leaves the game's move out of its lines, so a game move inside
 *   the engine's range is one of them; one below it was not listed). A move
 *   that is none of the lines is *outside the top N*: its loss is unknown,
 *   but at least the worst listed line's.
 * - **A loss** is line 1 against the move, each clamped to ±1000 from the
 *   mover's view, a mate counting ±10000 less its distance before the clamp —
 *   the computer analysis's rule — and its verdict the computer analysis's
 *   thresholds (inaccuracy > 50, mistake > 100, blunder > 300).
 */

/** Which side's moves a session asks about. */
export type TrainingSide = Turn | "both";

/** One evaluated move at a position — an engine line's first move, or the game's move. */
export type TrainingLine = {
  san: string;
  /** The eval, White's view, as the tree carries it. */
  score: Score;
  /** From the mover's view: a mate is ±10000 less its distance, unclamped. */
  moverCp: number;
  /** Line 1 against this one, clamped to ±1000 from the mover's view; at least 0. */
  loss: number;
  /** 1 is the best; ties keep the engine's order. */
  rank: number;
  /** One of the engine's top lines (the top N). The game's move may not be. */
  listed: boolean;
  /** The move the game went on with. */
  played: boolean;
  /** The line as the tree has it, from this move — the SANs along its first children. */
  sans: readonly string[];
};

/** **One position to answer**: the position before a mainline move, and its evaluated lines. */
export type TrainingPosition = {
  /** The node the position follows; `null` is the start. */
  nodeId: string | null;
  fen: string;
  turn: Turn;
  /** The move to find, 1-based ply from the tree's start. */
  ply: number;
  /** The move number as a PGN writes it (`12` for both `12.` and `12…`). */
  moveNumber: number;
  /** The game's move. */
  playedSan: string;
  /** Best first. */
  lines: readonly TrainingLine[];
  /** How many of the lines are the engine's top lines. */
  topCount: number;
};

/** The computer analysis's thresholds — what a verdict is measured against. */
export const ACCURACY_THRESHOLDS: VerdictThresholds = DEFAULT_COMPUTER_ANALYSIS_OPTIONS.thresholds;

const clampCp = (cp: number) => Math.min(LOSS_CLAMP_CP, Math.max(-LOSS_CLAMP_CP, cp));

/** A SAN with its check and annotation marks off — how two spellings of one move compare. */
export const bareSan = (san: string): string => san.replace(/[+#!?]+$/, "");

/** The move number of the move at `ply` from a start whose FEN says its own. */
const moveNumberOf = (startFen: string, ply: number): number => {
  const fields = startFen.split(" ");
  const startNumber = Number(fields[5]) || 1;
  const startsBlack = fields[1] === "b";
  return startNumber + Math.floor((ply - 1 + (startsBlack ? 1 : 0)) / 2);
};

/** The SANs from a node along its first children. */
const lineSans = (node: VariationNode): string[] => {
  const sans: string[] = [];
  for (let at: VariationNode | undefined = node; at !== undefined; at = at.children[0]) sans.push(at.san);
  return sans;
};

/**
 * **The positions a tree can train**, in game order, both sides — each with
 * its evaluated lines. Empty for a tree with no engine lines: not a full
 * analysis, nothing to ask.
 */
export const trainingPositionsOf = (tree: GameTree): TrainingPosition[] => {
  const scope = analysisScopeOf(tree);
  const positions: TrainingPosition[] = [];
  let siblings: readonly VariationNode[] = tree.moves;
  let before: { nodeId: string | null; fen: string } = { nodeId: null, fen: tree.startFen };

  for (const move of mainline(tree)) {
    const turn = turnOf(before.fen);
    const inScope =
      scope === undefined ||
      (move.ply >= scope.fromPly && move.ply <= scope.toPly && (scope.side === undefined || scope.side === turn));
    const sign = turn === "w" ? 1 : -1;

    if (inScope) {
      const seen = new Set<string>([bareSan(move.san)]);
      const engine: Omit<TrainingLine, "rank" | "loss">[] = [];
      for (const sibling of siblings) {
        if (sibling === move || seen.has(bareSan(sibling.san))) continue;
        const score = scoreOfNode(sibling);
        if (score === undefined) continue;
        seen.add(bareSan(sibling.san));
        // A line's eval is its search's, at this position: the mover is the side to move here.
        engine.push({ san: sibling.san, score, moverCp: whiteCp(score, turn) * sign, listed: true, played: false, sans: lineSans(sibling) });
      }

      if (engine.length > 0) {
        const playedScore = scoreOfNode(move);
        const unranked = [...engine];
        if (playedScore !== undefined) {
          // The game move's eval is the next position's search: its own side to move signs a mate 0.
          const moverCp = whiteCp(playedScore, turnOf(move.fen)) * sign;
          const worstListed = Math.min(...engine.map((line) => line.moverCp));
          unranked.push({ san: move.san, score: playedScore, moverCp, listed: moverCp >= worstListed, played: true, sans: lineSans(move) });
        }
        // Best first; a stable sort keeps the engine's order between equals, and the game's move after them.
        const sorted = unranked.sort((a, b) => b.moverCp - a.moverCp);
        const bestCp = clampCp(sorted[0].moverCp);
        positions.push({
          nodeId: before.nodeId,
          fen: before.fen,
          turn,
          ply: move.ply,
          moveNumber: moveNumberOf(tree.startFen, move.ply),
          playedSan: move.san,
          lines: sorted.map((line, index) => ({ ...line, rank: index + 1, loss: Math.max(0, bestCp - clampCp(line.moverCp)) })),
          topCount: sorted.filter((line) => line.listed).length,
        });
      }
    }

    siblings = move.children;
    before = { nodeId: move.id, fen: move.fen };
  }
  return positions;
};

/** The positions a session over `side` asks, in game order. */
export const sessionPositionsOf = (positions: readonly TrainingPosition[], side: TrainingSide): TrainingPosition[] =>
  side === "both" ? [...positions] : positions.filter((position) => position.turn === side);

/* ─── A suggestion ────────────────────────────────────────────────────── */

/**
 * The SAN of a move dropped on the board — `from` to `to`, and the piece a
 * pawn promotes to — or `undefined` for a move that is not legal there.
 * `chess.js` only *reads* the legal moves here; the board core alone plays one.
 */
export const sanOfMove = (fen: string, from: string, to: string, promotion?: string): string | undefined => {
  try {
    const moves = new Chess(fen).moves({ square: from as Square, verbose: true }).filter((move) => move.to === to);
    const move = promotion === undefined ? moves.find((each) => each.promotion === undefined) : moves.find((each) => each.promotion === promotion);
    return move?.san;
  } catch {
    return undefined;
  }
};

/** The squares a SAN move goes from and to at a position — its arrow — or `undefined` for one that is not legal there. */
export const moveSquaresOf = (fen: string, san: string): { from: string; to: string } | undefined => {
  try {
    const move = new Chess(fen).moves({ verbose: true }).find((each) => bareSan(each.san) === bareSan(san));
    return move === undefined ? undefined : { from: move.from, to: move.to };
  } catch {
    return undefined;
  }
};

/** **One suggestion, graded.** */
export type SuggestionGrade =
  | {
      san: string;
      kind: "line";
      /** Its line's rank among the position's lines. */
      rank: number;
      loss: number;
      /** `null`: no worse than an inaccuracy's threshold. */
      verdict: MoveVerdictKind | null;
      /** One of the engine's top lines. */
      listed: boolean;
      /** The game's move. */
      played: boolean;
    }
  | {
      san: string;
      kind: "outside";
      /** Its loss is unknown, but at least this — the worst listed line's. */
      lossAtLeast: number;
    };

/** **A position's grade.** */
export type PositionGrade = {
  /** In the order the reader entered them. */
  suggestions: readonly SuggestionGrade[];
  /** No suggestion: a Pass. */
  passed: boolean;
  /** A suggestion lost nothing against line 1 — line 1 itself, or one as good. */
  bestFound: boolean;
  /** How many of the engine's top lines the suggestions found. */
  topFound: number;
  /** The best suggestion's loss; `null` for a pass, or where every suggestion is outside the lines. */
  bestLoss: number | null;
  /** The worst verdict among the suggestions on the lines (`null`: none worse than the threshold). */
  worstVerdict: MoveVerdictKind | null;
  /** How many suggestions were outside the top N. */
  outside: number;
};

const VERDICT_ORDER: readonly (MoveVerdictKind | null)[] = [null, "inaccuracy", "mistake", "blunder"];

/** Grade one suggestion against a position's lines. */
export const gradeSuggestion = (
  position: TrainingPosition,
  san: string,
  thresholds: VerdictThresholds = ACCURACY_THRESHOLDS,
): SuggestionGrade => {
  const line = position.lines.find((each) => bareSan(each.san) === bareSan(san));
  if (line === undefined) {
    const listed = position.lines.filter((each) => each.listed);
    return { san, kind: "outside", lossAtLeast: Math.max(0, ...listed.map((each) => each.loss)) };
  }
  return { san, kind: "line", rank: line.rank, loss: line.loss, verdict: kindOfLoss(line.loss, thresholds), listed: line.listed, played: line.played };
};

/** **Grade a position's suggestions** — none is a pass. A move suggested twice counts once. */
export const gradePosition = (
  position: TrainingPosition,
  sans: readonly string[],
  thresholds: VerdictThresholds = ACCURACY_THRESHOLDS,
): PositionGrade => {
  const unique = sans.filter((san, index) => sans.findIndex((other) => bareSan(other) === bareSan(san)) === index);
  const suggestions = unique.map((san) => gradeSuggestion(position, san, thresholds));
  const onLines = suggestions.filter((grade) => grade.kind === "line");
  const losses = onLines.map((grade) => grade.loss);
  const worstVerdict = onLines.reduce<MoveVerdictKind | null>(
    (worst, grade) => (VERDICT_ORDER.indexOf(grade.verdict) > VERDICT_ORDER.indexOf(worst) ? grade.verdict : worst),
    null,
  );
  return {
    suggestions,
    passed: suggestions.length === 0,
    bestFound: losses.includes(0),
    topFound: onLines.filter((grade) => grade.listed).length,
    bestLoss: losses.length === 0 ? null : Math.min(...losses),
    worstVerdict,
    outside: suggestions.length - onLines.length,
  };
};

/* ─── The session's summary ───────────────────────────────────────────── */

/** **A session's summary**, over the positions graded so far. */
export type SessionSummary = {
  /** Positions graded: answered and passed. */
  positions: number;
  answered: number;
  passed: number;
  /** Positions where the best move was found — a pass found none. */
  bestFound: number;
  /** Positions where at least one of the engine's top lines was found. */
  topFound: number;
  /** `bestFound` / `positions`, 0–1; `null` with nothing graded. */
  bestRate: number | null;
  /** `topFound` / `positions`, 0–1; `null` with nothing graded. */
  topRate: number | null;
  /** The best suggestion's loss, averaged over the positions where it is known (rounded); `null` for none. */
  averageBestLoss: number | null;
  /** Over every suggestion. */
  inaccuracies: number;
  mistakes: number;
  blunders: number;
  outside: number;
};

/** **The summary** of a session's grades. */
export const sessionSummaryOf = (grades: readonly PositionGrade[]): SessionSummary => {
  const suggestions = grades.flatMap((grade) => grade.suggestions);
  const verdicts = suggestions.flatMap((grade) => (grade.kind === "line" ? [grade.verdict] : []));
  const count = (kind: MoveVerdictKind) => verdicts.filter((verdict) => verdict === kind).length;
  const known = grades.flatMap((grade) => (grade.bestLoss === null ? [] : [grade.bestLoss]));
  const bestFound = grades.filter((grade) => grade.bestFound).length;
  const topFound = grades.filter((grade) => grade.topFound > 0).length;
  const rate = (hits: number) => (grades.length === 0 ? null : hits / grades.length);
  return {
    positions: grades.length,
    answered: grades.filter((grade) => !grade.passed).length,
    passed: grades.filter((grade) => grade.passed).length,
    bestFound,
    topFound,
    bestRate: rate(bestFound),
    topRate: rate(topFound),
    averageBestLoss: known.length === 0 ? null : Math.round(known.reduce((sum, loss) => sum + loss, 0) / known.length),
    inaccuracies: count("inaccuracy"),
    mistakes: count("mistake"),
    blunders: count("blunder"),
    outside: suggestions.filter((grade) => grade.kind === "outside").length,
  };
};
