import { defaultChessTokens } from "./defaultChess";
import { paletteColor, primaryTint } from "./overrides";
import type { ThemeDefinition } from "./types";

/**
 * **High contrast** (CTA-108) — every text and control at WCAG AA or better
 * in both schemes (`highContrast.test.ts` measures it), a visible focus ring
 * on everything that takes the keyboard, strong borders, and a board told
 * apart by lightness rather than hue, drawn over with the Okabe–Ito palette,
 * which stays distinct under every common colour blindness.
 *
 * `contrastThreshold: 4.5` makes MUI pick a button's text colour by the AA
 * ratio for text, not its default 3.
 */
export const highContrastTheme: ThemeDefinition = {
  id: "high-contrast",
  labelKey: "appearance.themes.high-contrast",
  light: {
    contrastThreshold: 4.5,
    primary: { main: "#0040c1" },
    error: { main: "#b00020" },
    warning: { main: "#8a4b00" },
    success: { main: "#00662a" },
    info: { main: "#00539c" },
    background: {
      default: "#ffffff",
      paper: "#ffffff",
      translucent: "rgba(255, 255, 255, 0.94)",
      sunken: "#f2f2f2",
    },
    text: { primary: "#000000", secondary: "#262626", disabled: "#595959" },
    divider: "#595959",
  },
  dark: {
    contrastThreshold: 4.5,
    primary: { main: "#8cc8ff" },
    error: { main: "#ff8a80" },
    warning: { main: "#ffd54f" },
    success: { main: "#7ee787" },
    info: { main: "#80d8ff" },
    background: {
      default: "#000000",
      paper: "#0a0a0a",
      translucent: "rgba(0, 0, 0, 0.94)",
      sunken: "#121212",
    },
    text: { primary: "#ffffff", secondary: "#e6e6e6", disabled: "#a6a6a6" },
    divider: "#a6a6a6",
  },
  typography: {
    fontFamily: ["Roboto", "ui-sans-serif", "system-ui", "-apple-system", '"Segoe UI"', "sans-serif"].join(", "),
    h1: { fontSize: "clamp(28px, 4vw, 42px)", lineHeight: 1.1, fontWeight: 800 },
    h2: { fontSize: 24, fontWeight: 800 },
    h3: { fontSize: 19, fontWeight: 800 },
    button: { fontWeight: 700, textTransform: "none" },
  },
  shape: { borderRadius: 4 },
  overrides: {
    // A focus ring on everything that takes the keyboard.
    MuiButtonBase: {
      styleOverrides: {
        root: ({ theme }) => ({
          "&.Mui-focusVisible": {
            outline: "3px solid",
            outlineColor: paletteColor(theme, (palette) => palette.text.primary),
            outlineOffset: 2,
          },
        }),
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 4 },
        outlined: { borderWidth: 2, "&:hover": { borderWidth: 2 } },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: ({ theme }) => ({ borderColor: paletteColor(theme, (palette) => palette.text.secondary) }),
      },
    },
    MuiLink: { defaultProps: { underline: "always" } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 4,
          "&.Mui-selected": {
            backgroundColor: primaryTint(theme, 0.24),
            borderInlineStart: `3px solid ${paletteColor(theme, (palette) => palette.primary.main)}`,
            "&:hover": { backgroundColor: primaryTint(theme, 0.32) },
          },
        }),
      },
    },
  },
  chess: {
    // Told apart by lightness: a pale grey and a slate, never two hues.
    board: {
      lightSquare: "#e6e6e6",
      darkSquare: "#5b6779",
      lightSquareNotation: "#000000",
      darkSquareNotation: "#ffffff",
    },
    // Okabe–Ito yellow.
    lastMove: "rgba(240, 228, 66, 0.6)",
    arrowPalettes: {
      // Okabe–Ito blue, orange and reddish purple — the colour-blind palette, everywhere.
      classic: defaultChessTokens.arrowPalettes.colorblind,
      lichess: defaultChessTokens.arrowPalettes.lichess,
      colorblind: defaultChessTokens.arrowPalettes.colorblind,
    },
    arrows: {
      required: "#009e73",
      untagged: "rgba(0, 0, 0, 0.55)",
      chanceFill: "#ffffff",
      chanceBorder: "#000000",
    },
    book: { known: "#0072b2", hovered: "#d55e00" },
    // Okabe–Ito families, each darkened to AA on white and lightened to AA on black.
    nag: {
      good: { light: "#00704f", dark: "#3fd6a5" },
      brilliant: { light: "#005f94", dark: "#56b4e9" },
      interesting: { light: "#933b73", dark: "#e7a2cf" },
      dubious: { light: "#665c00", dark: "#f0e442" },
      mistake: { light: "#8a4f00", dark: "#ffb000" },
      blunder: { light: "#b3261e", dark: "#ff7a50" },
    },
    promotion: { scrim: "rgba(0, 0, 0, 0.6)" },
    map: { whiteDot: "#ffffff", blackDot: "#000000" },
    filterBoard: {
      white: { background: "#ffffff", text: "#000000" },
      draw: { background: "#666666", text: "#ffffff" },
      black: { background: "#000000", text: "#ffffff" },
    },
  },
};
