import { defaultChessTokens } from "./defaultChess";
import type { ThemeDefinition } from "./types";

/**
 * **Brown** (CTA-108) — a calm, lichess-like theme. Inspired by lichess.org
 * (its default "brown" board, its last-move highlight and its arrow brushes,
 * its quiet grey-and-blue UI); the id and name stay neutral, since lichess is
 * another site's name.
 *
 * The squares are lichess's brown — which react-chessboard's own defaults, and
 * so the default theme's, already copy; this board differs from the default
 * one in its arrows (lichess's green / blue / red brushes as the classic
 * palette), its book arrows, the explorer-style result bars and the map's
 * dark dots. The UI around it is lichess's: warm off-white or near-black
 * pages, a single blue accent, square-ish corners, lighter headings.
 */
export const brownTheme: ThemeDefinition = {
  id: "brown",
  labelKey: "appearance.themes.brown",
  light: {
    // WCAG AA (CTA-111): a button's text colour is picked at 4.5:1, not MUI's 3.
    contrastThreshold: 4.5,
    // Darkened to AA as text on the page (CTA-111): lichess's #1b78d0, MUI's #d32f2f, #ed6c02, #0288d1 and #2e7d32.
    primary: { main: "#186cbc" },
    error: { main: "#cb2b2b" },
    warning: { main: "#ae4f01" },
    info: { main: "#0270ac" },
    success: { main: "#2d7931" },
    background: {
      default: "#edebe9",
      paper: "#ffffff",
      translucent: "rgba(237, 235, 233, 0.88)",
      sunken: "#f5f4f2",
    },
    // text.secondary darkened to AA on the page (CTA-111): was #6b6b6b.
    text: { primary: "#333333", secondary: "#6a6a6a" },
    divider: "#d9d6d2",
    focusRing: "#186cbc",
    controlBorder: "#908476",
  },
  dark: {
    // WCAG AA (CTA-111): a button's text colour is picked at 4.5:1, not MUI's 3.
    contrastThreshold: 4.5,
    primary: { main: "#3692e7" },
    // Lightened to AA as text on the paper (CTA-111): MUI's #f44336.
    error: { main: "#f55145" },
    background: {
      default: "#161512",
      paper: "#262421",
      translucent: "rgba(22, 21, 18, 0.88)",
      sunken: "#1e1c1a",
    },
    // Secondary lightened (CTA-113) to AA on a raised row — the paper under
    // `action.hover` (the engine lines, the move list's rows): #8f8d8a read 3.65:1.
    text: { primary: "#bababa", secondary: "#a19f9b" },
    divider: "#3d3a36",
    focusRing: "#3692e7",
    controlBorder: "#746e65",
  },
  focusRingWidth: 2,
  typography: {
    fontFamily: ['"Noto Sans"', "Roboto", "ui-sans-serif", "system-ui", "-apple-system", '"Segoe UI"', "sans-serif"].join(", "),
    h1: { fontSize: "clamp(26px, 3.6vw, 38px)", lineHeight: 1.1, fontWeight: 500 },
    h2: { fontSize: 22, fontWeight: 500 },
    h3: { fontSize: 18, fontWeight: 500 },
    button: { fontWeight: 600, textTransform: "none" },
  },
  shape: { borderRadius: 4 },
  components: {
    buttonRadius: 3,
    buttonLip: null,
    outlinedButtonBorder: null,
    selectedRow: { radius: 4, rest: 0.16, hover: 0.24, accent: 0 },
    linkUnderline: null,
    chipFontWeight: null,
  },
  chess: {
    // lichess's brown board: the same squares react-chessboard ships.
    board: {
      lightSquare: "#f0d9b5",
      darkSquare: "#b58863",
      lightSquareNotation: "#b58863",
      darkSquareNotation: "#f0d9b5",
    },
    // lichess's last-move fill.
    lastMove: "rgba(155, 199, 0, 0.41)",
    arrowPalettes: {
      // lichess's brushes are this theme's everyday arrows.
      classic: { mainline: "#15781b", sideline: "#003088", hovered: "#882020" },
      lichess: { mainline: "#15781b", sideline: "#003088", hovered: "#882020" },
      colorblind: defaultChessTokens.arrowPalettes.colorblind,
    },
    arrows: {
      // lichess's yellow brush.
      required: "#e68f00",
      untagged: "rgba(128, 128, 128, 0.5)",
      chanceFill: "#ffffff",
      chanceBorder: "#d500f9",
    },
    book: { known: "#15781b", hovered: "#882020" },
    // A PGN's drawn shapes keep lichess's brushes, so a study reads as it was drawn.
    drawing: defaultChessTokens.drawing,
    // lichess's own glyph colours — the default theme's already.
    nag: defaultChessTokens.nag,
    promotion: { scrim: "rgba(22, 21, 18, 0.5)" },
    map: { whiteDot: "#ffffff", blackDot: "#161512" },
    // lichess's opening explorer bars.
    filterBoard: {
      white: { background: "#ffffff", text: "#333333" },
      draw: { background: "#a0a0a0", text: "#1f1f1f" },
      black: { background: "#555555", text: "#ffffff" },
    },
  },
};
