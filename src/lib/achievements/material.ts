import { ACHIEVEMENT_CATEGORIES, type AchievementCategoryId } from "./categories";
import { PIECES, PIECE_VALUES, type AchievementInput, type Piece } from "./pieces";

/** **A position's pieces** — one per category (or none), in the registry's order. */
export type AchievementPieces = readonly { category: AchievementCategoryId; piece: Piece | null }[];

/** **What a position won**: every category's grader over the same answer. */
export const piecesOf = (input: AchievementInput): AchievementPieces =>
  ACHIEVEMENT_CATEGORIES.map((category) => ({ category: category.id, piece: category.grade(input) }));

/** The same pieces, none won — a pass, a position graded without its engine. */
export const noPieces = (): AchievementPieces => ACHIEVEMENT_CATEGORIES.map((category) => ({ category: category.id, piece: null }));

/** How many of each piece. */
export type PieceCounts = Readonly<Record<Piece, number>>;

/** **A session's material** — per category and in all — and how many of each piece. */
export type SessionMaterial = {
  /** Every category, in the registry's order: its material and its pieces. */
  categories: readonly { category: AchievementCategoryId; material: number; counts: PieceCounts }[];
  /** Over every category. */
  material: number;
  counts: PieceCounts;
};

const zeroCounts = (): Record<Piece, number> => Object.fromEntries(PIECES.map((piece) => [piece, 0])) as Record<Piece, number>;

const materialOf = (counts: PieceCounts): number => PIECES.reduce((total, piece) => total + counts[piece] * PIECE_VALUES[piece], 0);

/** **The material of a session's positions** — each position's pieces summed, per category and in all. */
export const sessionMaterialOf = (positions: readonly AchievementPieces[]): SessionMaterial => {
  const categories = ACHIEVEMENT_CATEGORIES.map((category) => {
    const counts = zeroCounts();
    for (const pieces of positions) {
      const piece = pieces.find((each) => each.category === category.id)?.piece;
      if (piece !== null && piece !== undefined) counts[piece] += 1;
    }
    return { category: category.id, material: materialOf(counts), counts };
  });
  const counts = zeroCounts();
  for (const each of categories) for (const piece of PIECES) counts[piece] += each.counts[piece];
  return { categories, material: materialOf(counts), counts };
};
