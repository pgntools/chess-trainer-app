import { alpha } from "@mui/material/styles";

import { defaultChessTokens } from "./defaultChess";
import type { ThemeDefinition } from "./types";

/**
 * **The default theme** — the app's look before themes were switchable
 * (`src/theme/themePrimitives.ts`, ported value for value), and the board
 * react-chessboard draws by default. Every other theme is measured against
 * this one, and a stored choice that is not registered falls back to it.
 */
export const defaultTheme: ThemeDefinition = {
  id: "default",
  labelKey: "appearance.themes.default",
  light: {
    // WCAG AA (CTA-111): a button's text colour is picked at 4.5:1, not MUI's 3.
    contrastThreshold: 4.5,
    primary: { main: "#2563eb" },
    // Darkened to AA as text on the page (CTA-111): MUI's #d32f2f, #ed6c02 and #0288d1.
    error: { main: "#d22c2c" },
    warning: { main: "#b45202" },
    info: { main: "#0273b1" },
    background: {
      default: "#eef2f7",
      paper: "#ffffff",
      translucent: "rgba(238, 242, 247, 0.85)",
      sunken: "#f8fafc",
    },
    // text.secondary darkened to AA on the page (CTA-111): was #667085.
    text: { primary: "#1f2937", secondary: "#646e83" },
    divider: "#dfe5ee",
    focusRing: "#2563eb",
    controlBorder: "#7a8ba5",
  },
  dark: {
    // WCAG AA (CTA-111): a button's text colour is picked at 4.5:1, not MUI's 3.
    contrastThreshold: 4.5,
    primary: { main: "#60a5fa" },
    background: {
      default: "#0b0f16",
      paper: "#131a24",
      translucent: "rgba(11, 15, 22, 0.85)",
      sunken: "#0f1621",
    },
    text: { primary: "#e6ebf3", secondary: "#9aa6b7" },
    divider: "#26313f",
    focusRing: "#60a5fa",
    controlBorder: "#576880",
  },
  focusRingWidth: 2,
  typography: {
    fontFamily: [
      "Roboto",
      "ui-sans-serif",
      "system-ui",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "sans-serif",
    ].join(", "),
    h1: {
      fontSize: "clamp(28px, 4vw, 42px)",
      lineHeight: 1.05,
      letterSpacing: "-0.03em",
      fontWeight: 800,
    },
    h2: { fontSize: 24, letterSpacing: "-0.02em", fontWeight: 800 },
    h3: { fontSize: 19, letterSpacing: "-0.02em", fontWeight: 800 },
    button: { fontWeight: 700, textTransform: "none" },
  },
  shape: { borderRadius: 10 },
  overrides: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 10,
          "&.Mui-selected": {
            // `selected` here means "this is the route you are on", so it wants
            // the same weight as an active nav button rather than the faint
            // default tint, which is nearly invisible against `background.sunken`.
            // A theme built for one fixed scheme (the gallery's) has no
            // variables, so it takes the same tint from the plain palette.
            backgroundColor: theme.vars
              ? `rgba(${theme.vars.palette.primary.mainChannel} / 0.16)`
              : alpha(theme.palette.primary.main, 0.16),
            "&:hover": {
              backgroundColor: theme.vars
                ? `rgba(${theme.vars.palette.primary.mainChannel} / 0.24)`
                : alpha(theme.palette.primary.main, 0.24),
            },
          },
        }),
      },
    },
  },
  chess: defaultChessTokens,
};
