import type { ChessTokens } from "./types";

/**
 * **The default theme's board colours** — what the board drew before themes
 * existed: react-chessboard's own squares, lichess's last-move fill, arrows
 * and move-mark tones.
 *
 * A module of its own, with no MUI import, so `src/lib/` can name these
 * values (`LAST_MOVE_HIGHLIGHT`, the book arrows) without pulling the whole
 * theme — and MUI with it — into the collection-index worker's bundle.
 */
export const defaultChessTokens: ChessTokens = {
  // react-chessboard's own defaults, so the board looks as it always has.
  board: {
    lightSquare: "#F0D9B5",
    darkSquare: "#B58863",
    lightSquareNotation: "#B58863",
    darkSquareNotation: "#F0D9B5",
  },
  // Lichess's last-move fill.
  lastMove: "rgba(155, 199, 0, 0.41)",
  arrowPalettes: {
    classic: { mainline: "#4caf50", sideline: "#2196f3", hovered: "#f44336" },
    // Lichess's board brushes: green, blue, red.
    lichess: { mainline: "#15781B", sideline: "#003088", hovered: "#882020" },
    // Okabe–Ito's blue, orange and reddish purple, told apart under every
    // common colour blindness.
    colorblind: { mainline: "#0072B2", sideline: "#E69F00", hovered: "#CC79A7" },
  },
  arrows: {
    required: "#9c27b0",
    untagged: "rgba(128, 128, 128, 0.5)",
    chanceFill: "#ffffff",
    chanceBorder: "#d500f9",
  },
  book: { known: "#4caf50", hovered: "#f44336" },
  // Lichess's four brushes, as a study draws a PGN's [%cal] / [%csl].
  drawing: { green: "#15781B", red: "#882020", yellow: "#e68f00", blue: "#003088" },
  // Lichess's families — `!` and `!!` green, `?` orange, `??` red, `!?`
  // magenta, `?!` blue — the light shade dark enough to read on white
  // paper, the dark one light enough for the dark scheme's.
  nag: {
    good: { light: "#1e9e38", dark: "#5ad672" },
    brilliant: { light: "#0f7a2a", dark: "#2ee6a6" },
    interesting: { light: "#c2279f", dark: "#f06ee0" },
    dubious: { light: "#2b88c2", dark: "#6cc4f2" },
    mistake: { light: "#c47a00", dark: "#f0ad2a" },
    blunder: { light: "#d03b3b", dark: "#f06a6a" },
  },
  promotion: { scrim: "rgba(0, 0, 0, 0.35)" },
  map: { whiteDot: "#ffffff", blackDot: "#000000" },
  filterBoard: {
    white: { background: "#f5f5f5", text: "#212121" },
    draw: { background: "#9e9e9e", text: "#212121" },
    black: { background: "#424242", text: "#f5f5f5" },
  },
};
