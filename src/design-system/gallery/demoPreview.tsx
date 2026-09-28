import Box from "@mui/material/Box";
import { chessTokensOf } from "../theme";

/**
 * A stand-in for a preview board in the cards' demos: an 8 × 8 of the
 * theme's own squares (`chess.board`), so the card restyles with the theme
 * the way a real preview board does — without the gallery importing a board.
 */
export const demoPreview = (
  <Box
    aria-hidden="true"
    dir="ltr"
    sx={(theme) => {
      const { lightSquare, darkSquare } = chessTokensOf(theme).board;
      return {
        width: "100%",
        height: "100%",
        backgroundColor: lightSquare,
        backgroundImage: `conic-gradient(${darkSquare} 90deg, transparent 90deg 180deg, ${darkSquare} 180deg 270deg, transparent 270deg)`,
        backgroundSize: "25% 25%",
      };
    }}
  />
);
