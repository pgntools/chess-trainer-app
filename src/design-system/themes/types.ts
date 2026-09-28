import type { PaletteOptions, ThemeOptions } from "@mui/material/styles";

/**
 * **A theme is data** (CTA-107): everything that makes one look differ from
 * another, and nothing that builds it. `buildTheme` (`../theme/`) turns one
 * into an MUI theme; adding a theme is a new file beside `default.ts` and an
 * entry in `registry.ts`, with no component change.
 */
export type ThemeDefinition = {
  /** Stable id — what the reader's choice is stored as. Never rename one. */
  id: string;
  /** Its name, a catalog key (`appearance.themes.<id>`) in both languages. */
  labelKey: string;
  /** The light colour scheme's palette. */
  light: PaletteOptions;
  /** The dark colour scheme's palette. */
  dark: PaletteOptions;
  typography: ThemeOptions["typography"];
  shape: ThemeOptions["shape"];
  /** MUI component defaults and style overrides (`ThemeOptions["components"]`). */
  overrides: ThemeOptions["components"];
  /** The board's colours — see {@link ChessTokens}. */
  chess: ChessTokens;
};

/** The three colours a board's next-move arrows are drawn in. */
export type ArrowPaletteTokens = { mainline: string; sideline: string; hovered: string };

/** A result's slice of a bar: its fill and the percentage written on it. */
export type ResultTone = { background: string; text: string };

/**
 * **The board's colours as theme tokens** — every colour drawn on or over a
 * chessboard, so a theme restyles the board with the rest of the app. The
 * default theme's values are what the board drew before tokens existed.
 *
 * Mode-independent, but for the move marks, whose shades are per scheme (the
 * board itself is the same in light and dark). Read through
 * `useChessTokens()` / `chessTokensOf(theme)`, never `theme.chess` directly:
 * a render with no app theme above it (a test) falls back to the default's.
 */
export type ChessTokens = {
  /** The squares and the coordinates written on them (react-chessboard's options). */
  board: {
    lightSquare: string;
    darkSquare: string;
    /** The coordinates on a light square. */
    lightSquareNotation: string;
    /** The coordinates on a dark square. */
    darkSquareNotation: string;
  };
  /** The last move's fill over its two squares. */
  lastMove: string;
  /**
   * The next-move arrows' palettes — the Analysis Board's Arrows tab offers
   * them by id (`classic`, `lichess`, `colorblind`; `lib/arrowSettings.ts`),
   * and `classic` is what every other board draws.
   */
  arrowPalettes: {
    classic: ArrowPaletteTokens;
    lichess: ArrowPaletteTokens;
    colorblind: ArrowPaletteTokens;
  };
  arrows: {
    /** A move the reader must play here (Backtracking's instruction). */
    required: string;
    /** A width-sized continuation that carries no tag — gray, translucent. */
    untagged: string;
    /** The play-chance arrows' fill (lichess's white). */
    chanceFill: string;
    /** The play-chance arrows' border (lichess's magenta). */
    chanceBorder: string;
  };
  /** The Openings explorer's book-continuation arrows. */
  book: { known: string; hovered: string };
  /** The move marks (`!`, `?`, …) by tone, one shade per colour scheme. */
  nag: Record<
    "good" | "brilliant" | "interesting" | "dubious" | "mistake" | "blunder",
    { light: string; dark: string }
  >;
  /** The promotion picker's scrim over the board. */
  promotion: { scrim: string };
  /** The map's move dots, in the colour of the side that moved. */
  map: { whiteDot: string; blackDot: string };
  /** The Library's opening-moves filter board: its result bars. */
  filterBoard: { white: ResultTone; draw: ResultTone; black: ResultTone };
};
