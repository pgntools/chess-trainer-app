import type { PositionGrade, TrainingPosition } from "../accuracyTrainer";
import type { GameTree } from "../gameTree";

/**
 * **Achievements** (CTA-249, the design note
 * `docs/design/accuracy-achievements.md`) — pure: every graded position of a
 * Find Best Move session wins a chess piece (or none) in each of five
 * categories, by how well the reader's answer met that category's goal
 * there. **A category is a goal at one position; a piece is how well it was
 * met** — never a count of positions. The reference is
 * `.claude/rules/accuracy-trainer.md` §10.
 *
 * Nothing here is stored: every input is already in the session record, so
 * the pieces are derived (`lib/findBestMove/selectors.ts`) and cannot drift
 * from the grade.
 */

/** The five pieces, weakest first — the Bishop ranked above the Knight. */
export const PIECES = ["pawn", "knight", "bishop", "rook", "queen"] as const;

export type Piece = (typeof PIECES)[number];

/** **A piece's value** — the material it adds. */
export const PIECE_VALUES: Readonly<Record<Piece, number>> = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9 };

/** Whether `piece` ranks at least as high as `floor` — the tiers' order, not their values (a Bishop outranks a Knight of the same value). */
export const ranksAtLeast = (piece: Piece, floor: Piece): boolean => PIECES.indexOf(piece) >= PIECES.indexOf(floor);

/** The higher-ranked of two pieces, either `null` (none). */
export const higherOf = (a: Piece | null, b: Piece | null): Piece | null => (a === null ? b : b === null ? a : ranksAtLeast(a, b) ? a : b);

/** **What a category grades at one position** — everything is in the session record already. */
export type AchievementInput = {
  /** The position, its lines best first (`trainingPositionOf`). */
  position: TrainingPosition;
  /** The reader's answer there, graded (`gradePosition` — every move they gave, in their order). */
  grade: PositionGrade;
  /** The reader's own lines from the position (`PositionRecord.work`), `null` none — what B1 reads. */
  work: GameTree | null;
  /** X — the session's *Moves to find*. Only the reader's first X moves are graded for a piece. */
  wanted: number;
};
