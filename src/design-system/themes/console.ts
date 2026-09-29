import type { ThemeDefinition } from "./types";

/** A Linux terminal's type: JetBrains Mono (bundled, `@fontsource-variable/jetbrains-mono`), then the monospace faces a Linux, macOS or Windows machine already has. */
const TERMINAL_FONT = [
  '"JetBrains Mono Variable"',
  '"JetBrains Mono"',
  '"DejaVu Sans Mono"',
  '"Ubuntu Mono"',
  '"Liberation Mono"',
  "ui-monospace",
  "Menlo",
  "Consolas",
  "monospace",
].join(", ");

/**
 * **Console** — a Linux terminal. Its colours are the Tango palette that
 * gnome-terminal and much of the Linux desktop ship as the ANSI colours:
 * the prompt's bright green as the accent, cyan, blue, magenta, yellow and
 * red for the rest, near-black pages with a faint green cast in dark and a
 * paper-white terminal in light. Everything is set in one monospace face,
 * corners are square, links are underlined, and the selected nav row carries
 * a bar like a block cursor.
 *
 * Each ANSI colour is taken to WCAG AA where it is text — darkened on the
 * light paper, lightened on the dark — so, like the high-contrast theme, it
 * writes its board's coordinates, move marks and result bars at AA too.
 */
export const consoleTheme: ThemeDefinition = {
  id: "console",
  labelKey: "appearance.themes.console",
  light: {
    // WCAG AA: a button's text colour is picked at 4.5:1, not MUI's 3.
    contrastThreshold: 4.5,
    // Tango's dark green, blue, cyan and red, darkened to AA as text on the paper.
    primary: { main: "#3b6e0a" },
    secondary: { main: "#06787a" },
    error: { main: "#a40000" },
    warning: { main: "#8f5b00" },
    info: { main: "#204a87" },
    success: { main: "#3b6e0a" },
    background: {
      default: "#f3f4ee",
      paper: "#fbfbf7",
      translucent: "rgba(243, 244, 238, 0.9)",
      sunken: "#ebede5",
    },
    text: { primary: "#1d261b", secondary: "#4c5a47" },
    divider: "#d2d7c9",
    focusRing: "#3b6e0a",
    controlBorder: "#737f6c",
  },
  dark: {
    contrastThreshold: 4.5,
    // The prompt's bright green, and Tango's bright cyan, red, yellow and blue.
    primary: { main: "#8ae234" },
    secondary: { main: "#34e2e2" },
    error: { main: "#f25c5c" },
    warning: { main: "#fce94f" },
    info: { main: "#8fb4e0" },
    success: { main: "#8ae234" },
    background: {
      default: "#0e100e",
      paper: "#151915",
      translucent: "rgba(14, 16, 14, 0.9)",
      sunken: "#0b0d0b",
    },
    // Tango's terminal foreground (#d3d7cf), with the green cast of the pages.
    text: { primary: "#d3dcc9", secondary: "#9aab91" },
    divider: "#2e3a2c",
    focusRing: "#8ae234",
    controlBorder: "#62745d",
  },
  focusRingWidth: 2,
  typography: {
    fontFamily: TERMINAL_FONT,
    // Notation and machine words in the same face as everything else.
    fontFamilyMonospace: TERMINAL_FONT,
    h1: { fontSize: "clamp(24px, 3.2vw, 34px)", lineHeight: 1.15, fontWeight: 700 },
    h2: { fontSize: 20, fontWeight: 700 },
    h3: { fontSize: 17, fontWeight: 700 },
    button: { fontWeight: 700, textTransform: "none" },
  },
  shape: { borderRadius: 2 },
  components: {
    // A terminal draws square boxes.
    buttonRadius: 0,
    buttonLip: null,
    outlinedButtonBorder: null,
    // The row you are on carries a bar along its start, like a block cursor.
    selectedRow: { radius: 0, rest: 0.18, hover: 0.28, accent: 3 },
    linkUnderline: "always",
    chipFontWeight: 700,
  },
  chess: {
    // A phosphor-green board, its coordinates at AA on both squares.
    board: {
      lightSquare: "#c9dcb9",
      darkSquare: "#669352",
      lightSquareNotation: "#1c3313",
      darkSquareNotation: "#07120a",
    },
    // Tango's yellow, as a terminal's selection.
    lastMove: "rgba(252, 233, 79, 0.45)",
    arrowPalettes: {
      // Cyan, blue and red — the ANSI colours that stand out on a green board.
      classic: { mainline: "#06989a", sideline: "#3465a4", hovered: "#cc0000" },
      lichess: { mainline: "#15781B", sideline: "#003088", hovered: "#882020" },
      colorblind: { mainline: "#0072B2", sideline: "#E69F00", hovered: "#CC79A7" },
    },
    arrows: {
      // Tango's orange.
      required: "#fcaf3e",
      untagged: "rgba(46, 52, 54, 0.5)",
      chanceFill: "#eeeeec",
      chanceBorder: "#d500f9",
    },
    book: { known: "#06989a", hovered: "#cc0000" },
    // The ANSI families — green, cyan, magenta, blue, orange, red — at AA on each scheme's paper.
    nag: {
      good: { light: "#3b6e0a", dark: "#8ae234" },
      brilliant: { light: "#06787a", dark: "#34e2e2" },
      interesting: { light: "#75507b", dark: "#d7a6d3" },
      dubious: { light: "#204a87", dark: "#8fb4e0" },
      mistake: { light: "#8f5b00", dark: "#fcaf3e" },
      blunder: { light: "#a40000", dark: "#f25c5c" },
    },
    promotion: { scrim: "rgba(0, 0, 0, 0.55)" },
    map: { whiteDot: "#eeeeec", blackDot: "#0e100e" },
    // Tango's white, grey and black.
    filterBoard: {
      white: { background: "#eeeeec", text: "#1d261b" },
      draw: { background: "#888a85", text: "#0e100e" },
      black: { background: "#2e3436", text: "#eeeeec" },
    },
  },
};
