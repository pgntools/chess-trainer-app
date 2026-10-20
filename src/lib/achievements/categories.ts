import { bareSan, type SuggestionGrade } from "../accuracyTrainer";
import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS } from "../computerAnalysis";
import type { VariationNode } from "../gameTree";
import type { AchievementInput, Piece } from "./pieces";

/**
 * **The five categories** (CTA-249, the design note §3) — one grader each,
 * `(input) → Piece | null`, the highest tier whose condition holds, and the
 * registry that names them. Each grader's table is the note's.
 *
 * - **Only the reader's first X moves are graded** (X the session's *Moves to
 *   find*): an answer has no cap, and ten moves would always find three.
 * - **No piece** for a pass or a position with nothing to compare (`target`
 *   0) — every grader; a precondition not met gives none in its category.
 *   (A position graded without its engine is the selector's to leave out.)
 * - **A move outside the lines** — its loss unknown — **fails every tier
 *   above Pawn** wherever a category grades it (A1, A3: any of the first X;
 *   A2, A4: the first), and Pawn too where its bound already fails it.
 */

/** The computer analysis's thresholds — an inaccuracy loses more than 50, a mistake more than 100, a blunder more than 300. */
const THRESHOLDS = DEFAULT_COMPUTER_ANALYSIS_OPTIONS.thresholds;

/** A2's Bishop and A3's Queen: within this of the best. */
export const NEAR_BEST_CP = 20;

/** A2's Queen: the best move is the only one when line 2 loses at least this. */
export const ONLY_MOVE_CP = 150;

/** B1's tiers: how many plies of the reader's line match the engine's, from the best move — the highest first. */
export const LINE_TIERS: readonly { plies: number; piece: Piece }[] = [
  { plies: 6, piece: "queen" },
  { plies: 4, piece: "rook" },
  { plies: 3, piece: "bishop" },
  { plies: 2, piece: "knight" },
  { plies: 1, piece: "pawn" },
];

/** The reader's moves graded for a piece: their first X. */
const gradedMoves = ({ grade, wanted }: AchievementInput): readonly SuggestionGrade[] => grade.suggestions.slice(0, wanted);

/** A move on the lines that loses nothing — line 1, or one as good. */
const isBest = (move: SuggestionGrade | undefined): boolean => move !== undefined && move.kind === "line" && move.loss === 0;

/** A move's loss, where it is known. */
const lossOf = (move: SuggestionGrade): number | undefined => (move.kind === "line" ? move.loss : undefined);

/** A known loss no greater than `limit`; a move outside the lines never. */
const losesAtMost = (move: SuggestionGrade, limit: number): boolean => {
  const loss = lossOf(move);
  return loss !== undefined && loss <= limit;
};

/** Nothing to grade: a pass, or no line to compare with. */
const nothingToGrade = ({ grade }: AchievementInput): boolean => grade.passed || grade.target === 0;

/**
 * **A1. Place X moves in order** — X ≥ 2. Over the first X: Queen all X each
 * in its place; Rook all X in the top X, the order wrong; Bishop the best
 * move first; Knight the best move among them, not first; Pawn one in the
 * top X. Where the target is under X (fewer engine lines), at most Bishop.
 */
export const placeInOrderPiece = (input: AchievementInput): Piece | null => {
  if (nothingToGrade(input) || input.wanted < 2) return null;
  const moves = gradedMoves(input);
  const { target } = input.grade;
  const found = moves.filter((move) => move.inTop).length;
  if (!moves.some((move) => move.kind === "outside")) {
    const whole = target === input.wanted;
    if (whole && moves.filter((move) => move.inPlace).length === target) return "queen";
    if (whole && found === target) return "rook";
    if (isBest(moves[0])) return "bishop";
    if (moves.some(isBest)) return "knight";
  }
  return found >= 1 ? "pawn" : null;
};

/**
 * **A2. Find the best move** — the first move alone: Queen the best and the
 * only one (line 2 loses at least {@link ONLY_MOVE_CP}; no second listed
 * line, at most Rook); Rook the best; Bishop a loss ≤ {@link NEAR_BEST_CP};
 * Knight no inaccuracy; Pawn in the top X.
 */
export const bestMovePiece = (input: AchievementInput): Piece | null => {
  if (nothingToGrade(input)) return null;
  const first = gradedMoves(input)[0];
  if (first === undefined || first.kind === "outside") return null;
  if (first.loss === 0) {
    const second = input.position.lines.filter((line) => line.listed)[1];
    return second !== undefined && second.loss >= ONLY_MOVE_CP ? "queen" : "rook";
  }
  if (first.loss <= NEAR_BEST_CP) return "bishop";
  if (first.loss <= THRESHOLDS.inaccuracy) return "knight";
  return first.inTop ? "pawn" : null;
};

/**
 * **A3. Clean candidates** — X moves given (fewer cannot win), every one of
 * the first X: Queen within {@link NEAR_BEST_CP} of the best; Rook in the top
 * X; Bishop no inaccuracy; Knight no mistake; Pawn no blunder (a move
 * outside the lines passes Pawn while its bound does).
 */
export const cleanCandidatesPiece = (input: AchievementInput): Piece | null => {
  if (nothingToGrade(input)) return null;
  const moves = gradedMoves(input);
  if (moves.length < input.wanted) return null;
  if (!moves.some((move) => move.kind === "outside")) {
    if (moves.every((move) => losesAtMost(move, NEAR_BEST_CP))) return "queen";
    if (moves.every((move) => move.inTop)) return "rook";
    if (moves.every((move) => losesAtMost(move, THRESHOLDS.inaccuracy))) return "bishop";
    if (moves.every((move) => losesAtMost(move, THRESHOLDS.mistake))) return "knight";
  }
  const noBlunder = moves.every((move) => (move.kind === "line" ? move.loss : move.lossAtLeast) <= THRESHOLDS.blunder);
  return noBlunder ? "pawn" : null;
};

/**
 * **A4. Better than the game** — only where the game's move is a mistake or
 * a blunder (its line has an eval and loses more than the mistake
 * threshold). The first move: Queen the best; Rook in the top X; Bishop no
 * inaccuracy; Knight no mistake; Pawn loses less than the game's move. A
 * move that does not lose less than the game's wins nothing — the game's
 * move itself among them.
 */
export const betterThanGamePiece = (input: AchievementInput): Piece | null => {
  if (nothingToGrade(input)) return null;
  const game = input.position.lines.find((line) => line.played);
  if (game === undefined || game.loss <= THRESHOLDS.mistake) return null;
  const first = gradedMoves(input)[0];
  if (first === undefined) return null;
  if (first.kind === "outside") return first.lossAtLeast < game.loss ? "pawn" : null;
  if (first.loss >= game.loss) return null;
  if (first.loss === 0) return "queen";
  if (first.inTop) return "rook";
  if (first.loss <= THRESHOLDS.inaccuracy) return "bishop";
  if (first.loss <= THRESHOLDS.mistake) return "knight";
  return "pawn";
};

/** The SANs from a node along its first children. */
const lineFrom = (node: VariationNode): string[] => {
  const sans: string[] = [];
  for (let at: VariationNode | undefined = node; at !== undefined; at = at.children[0]) sans.push(at.san);
  return sans;
};

/** How many plies of the reader's line from the best move match the engine's line from it — 0 where the precondition fails. */
export const matchedPliesOf = (input: AchievementInput): number => {
  const best = gradedMoves(input).find(isBest);
  if (best === undefined) return 0;
  const engine = input.position.lines.find((line) => bareSan(line.san) === bareSan(best.san))?.sans ?? [best.san];
  const root = input.work?.moves.find((node) => bareSan(node.san) === bareSan(best.san));
  const yours = root === undefined ? [best.san] : lineFrom(root);
  let matched = 0;
  while (matched < engine.length && matched < yours.length && bareSan(engine[matched] ?? "") === bareSan(yours[matched] ?? "")) matched += 1;
  return matched;
};

/**
 * **B1. See the line** — one of the first X moves is the best move: the
 * reader's line from it (their work there, along its first children) against
 * the engine's line from it, plies matched from the start — Pawn 1 (the move
 * itself), Knight 2, Bishop 3, Rook 4, Queen 6. A tier is reachable only
 * where the engine's line is that long.
 */
export const seeTheLinePiece = (input: AchievementInput): Piece | null => {
  if (nothingToGrade(input)) return null;
  const matched = matchedPliesOf(input);
  return LINE_TIERS.find((tier) => matched >= tier.plies)?.piece ?? null;
};

/* ─── The registry ────────────────────────────────────────────────────── */

export type AchievementCategoryId = "order" | "best" | "clean" | "game" | "line";

/** **A category**: its id, its catalog key (`accuracyTrainer.achievements.categories.<id>`), its grader. */
export type AchievementCategory = {
  id: AchievementCategoryId;
  /** The note's name — A1…A4 over the top-X lines, B1 over the reader's own line. */
  code: string;
  labelKey: string;
  grade: (input: AchievementInput) => Piece | null;
};

const category = (id: AchievementCategoryId, code: string, grade: AchievementCategory["grade"]): AchievementCategory => ({
  id,
  code,
  labelKey: `accuracyTrainer.achievements.categories.${id}`,
  grade,
});

/** **Every category**, in the order they are shown. A new one is a grader and a line here (and its catalog key). */
export const ACHIEVEMENT_CATEGORIES: readonly AchievementCategory[] = [
  category("order", "A1", placeInOrderPiece),
  category("best", "A2", bestMovePiece),
  category("clean", "A3", cleanCandidatesPiece),
  category("game", "A4", betterThanGamePiece),
  category("line", "B1", seeTheLinePiece),
];
