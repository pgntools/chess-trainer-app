import type { ChessboardOptions } from "react-chessboard";

import { useChessTokens, usePrefersReducedMotion } from "../../design-system/theme";

/**
 * The board options a theme sets: its squares and the coordinates on them —
 * and, for a reader who asks for reduced motion, no piece animation.
 */
export type BoardSquareOptions = Pick<
  ChessboardOptions,
  "lightSquareStyle" | "darkSquareStyle" | "lightSquareNotationStyle" | "darkSquareNotationStyle" | "showAnimations"
>;

/**
 * **The theme's squares** (CTA-107) as react-chessboard options, for every
 * board to spread into its own — the game boards through
 * `EngineBoardSquare`, and the position editor, the list previews and the
 * Library's filter board directly. Under the default theme these are
 * react-chessboard's own defaults, so the board looks as it always has.
 *
 * **Reduced motion** (CTA-111) rides along the same way, so every board
 * follows it: when the reader's system asks for reduced motion
 * (`prefers-reduced-motion: reduce`) the pieces jump rather than slide
 * (`showAnimations: false`). Without that preference the key is absent and
 * the board animates as it always has.
 *
 * In a file of its own, beside the components, for the fast-refresh rule
 * `moveTokenSx.ts` explains.
 */
export const useBoardSquareOptions = (): BoardSquareOptions => {
  const { board } = useChessTokens();
  const reducedMotion = usePrefersReducedMotion();
  return {
    lightSquareStyle: { backgroundColor: board.lightSquare },
    darkSquareStyle: { backgroundColor: board.darkSquare },
    lightSquareNotationStyle: { color: board.lightSquareNotation },
    darkSquareNotationStyle: { color: board.darkSquareNotation },
    ...(reducedMotion && { showAnimations: false }),
  };
};
