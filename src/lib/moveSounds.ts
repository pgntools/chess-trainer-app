import { Chess } from "chess.js";

/**
 * **Which sound a move makes** (CTA-260) — every board composed from the core
 * plays one when a move is played or stepped to (`views/board/core/useMoveSounds.ts`),
 * the samples in `public/sounds/` (their source and licence in its `README.md`).
 *
 * Read from the move's SAN and the position after it, never re-played: a `#`
 * or a position with no move left (stalemate, insufficient material, the
 * fifty-move rule) is the game's end; then a promotion (`=`), a check (`+`),
 * castling (`O-O`, `O-O-O`), a capture (`x`); anything else a plain move.
 * One kind per move, in that order — `exd8=Q+` is a promotion.
 */
export const MOVE_SOUND_KINDS = ["move", "capture", "castle", "check", "promote", "game-end"] as const;

export type MoveSoundKind = (typeof MOVE_SOUND_KINDS)[number];

/** Whether the game is over in a position — mate, stalemate or a draw the position itself shows. */
const isOver = (fen: string): boolean => {
  try {
    return new Chess(fen).isGameOver();
  } catch {
    return false;
  }
};

/** The sound for a move, from its SAN and the FEN after it. */
export const moveSoundOf = ({ san, fen }: { san: string; fen: string }): MoveSoundKind => {
  if (san.includes("#") || isOver(fen)) return "game-end";
  if (san.includes("=")) return "promote";
  if (san.includes("+")) return "check";
  if (san.startsWith("O-O")) return "castle";
  if (san.includes("x")) return "capture";
  return "move";
};
