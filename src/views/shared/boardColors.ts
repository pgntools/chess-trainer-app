import type { ChessboardOptions } from "react-chessboard";

import { useChessTokens } from "../../design-system/theme";

/** The board options a theme sets: its squares and the coordinates on them. */
export type BoardSquareOptions = Pick<
  ChessboardOptions,
  "lightSquareStyle" | "darkSquareStyle" | "lightSquareNotationStyle" | "darkSquareNotationStyle"
>;

/**
 * **The theme's squares** (CTA-107) as react-chessboard options, for every
 * board to spread into its own — the game boards through
 * `EngineBoardSquare`, and the position editor, the list previews and the
 * Library's filter board directly. Under the default theme these are
 * react-chessboard's own defaults, so the board looks as it always has.
 *
 * In a file of its own, beside the components, for the fast-refresh rule
 * `moveTokenSx.ts` explains.
 */
export const useBoardSquareOptions = (): BoardSquareOptions => {
  const { board } = useChessTokens();
  return {
    lightSquareStyle: { backgroundColor: board.lightSquare },
    darkSquareStyle: { backgroundColor: board.darkSquare },
    lightSquareNotationStyle: { color: board.lightSquareNotation },
    darkSquareNotationStyle: { color: board.darkSquareNotation },
  };
};
