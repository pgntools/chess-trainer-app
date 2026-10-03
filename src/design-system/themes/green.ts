import { defaultChessTokens } from "./defaultChess";
import type { ThemeDefinition } from "./types";

/**
 * **Green** (CTA-108) — a bold, chess.com-like theme. Inspired by chess.com
 * (its green board, its yellow last-move highlight, its orange and green
 * arrows, its move-classification colours, its dark-brown UI and chunky
 * buttons); the id and name stay neutral, since chess.com is another site's
 * name.
 */
export const greenTheme: ThemeDefinition = {
  id: "green",
  labelKey: "appearance.themes.green",
  light: {
    // WCAG AA (CTA-111): a button's text colour is picked at 4.5:1, not MUI's 3.
    contrastThreshold: 4.5,
    // Darkened to AA — as text on the page, and white text on it (CTA-111): chess.com's #5d9948, MUI's #d32f2f, #ed6c02 and #0288d1.
    primary: { main: "#4a7939" },
    error: { main: "#d12c2c" },
    warning: { main: "#b35102" },
    info: { main: "#0273b1" },
    background: {
      default: "#f1f1ef",
      paper: "#ffffff",
      translucent: "rgba(241, 241, 239, 0.88)",
      sunken: "#f7f7f5",
    },
    text: { primary: "#312e2b", secondary: "#5d5a57" },
    divider: "#dcdcd8",
    focusRing: "#4a7939",
    controlBorder: "#8b8b7d",
  },
  dark: {
    // WCAG AA (CTA-111): a button's text colour is picked at 4.5:1, not MUI's 3.
    contrastThreshold: 4.5,
    primary: { main: "#81b64c" },
    // Lightened to AA as text on the page (CTA-111): MUI's #f44336.
    error: { main: "#f6675d" },
    background: {
      default: "#312e2b",
      paper: "#262522",
      translucent: "rgba(49, 46, 43, 0.88)",
      sunken: "#2b2926",
    },
    text: { primary: "#ffffff", secondary: "#b8b6b3" },
    divider: "#45423e",
    focusRing: "#81b64c",
    controlBorder: "#7e7871",
  },
  focusRingWidth: 2,
  typography: {
    fontFamily: ['"Segoe UI"', "system-ui", "-apple-system", "BlinkMacSystemFont", "Roboto", "sans-serif"].join(", "),
    h1: { fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.05, letterSpacing: "-0.02em", fontWeight: 800 },
    h2: { fontSize: 24, fontWeight: 800 },
    h3: { fontSize: 19, fontWeight: 800 },
    button: { fontWeight: 800, textTransform: "none" },
  },
  shape: { borderRadius: 6 },
  components: {
    buttonRadius: 6,
    // chess.com's chunky buttons: a darker lip along the bottom edge.
    buttonLip: { rest: 0.22, hover: 0.3 },
    outlinedButtonBorder: null,
    selectedRow: { radius: 6, rest: 0.2, hover: 0.3, accent: 0 },
    linkUnderline: null,
    chipFontWeight: 700,
  },
  chess: {
    // chess.com's green board.
    board: {
      lightSquare: "#eeeed2",
      darkSquare: "#769656",
      lightSquareNotation: "#769656",
      darkSquareNotation: "#eeeed2",
    },
    // chess.com's yellow last-move highlight.
    lastMove: "rgba(255, 255, 51, 0.5)",
    arrowPalettes: {
      // chess.com's best-move green, its blue and its red.
      classic: { mainline: "#81b64c", sideline: "#5c8bb0", hovered: "#fa412d" },
      lichess: defaultChessTokens.arrowPalettes.lichess,
      colorblind: defaultChessTokens.arrowPalettes.colorblind,
    },
    arrows: {
      // chess.com's orange drawn arrow.
      required: "#ffaa00",
      untagged: "rgba(128, 128, 128, 0.5)",
      chanceFill: "#ffffff",
      chanceBorder: "#e040fb",
    },
    book: { known: "#81b64c", hovered: "#fa412d" },
    // A PGN's drawn shapes keep lichess's brushes, so a study reads as it was drawn.
    drawing: defaultChessTokens.drawing,
    // chess.com's move-classification colours, a darker shade on white paper.
    nag: {
      good: { light: "#4f7f24", dark: "#96bc4b" },
      brilliant: { light: "#127d78", dark: "#26c2a3" },
      interesting: { light: "#9c3aa3", dark: "#e27bea" },
      dubious: { light: "#876c00", dark: "#f7c631" },
      mistake: { light: "#b35f00", dark: "#ffa459" },
      blunder: { light: "#c0302b", dark: "#fa6a5c" },
    },
    promotion: { scrim: "rgba(0, 0, 0, 0.5)" },
    map: { whiteDot: "#ffffff", blackDot: "#312e2b" },
    filterBoard: {
      white: { background: "#ffffff", text: "#312e2b" },
      draw: { background: "#a7a6a2", text: "#312e2b" },
      black: { background: "#403d39", text: "#ffffff" },
    },
  },
};
