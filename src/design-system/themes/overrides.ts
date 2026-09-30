import { alpha, type Components, type CssVarsTheme, type Theme } from "@mui/material/styles";

import type { ComponentKnobs } from "./types";

/** A theme under `buildTheme` — with CSS variables (the app's) or without (the gallery's preview). */
type AnyTheme = Omit<Theme, "components"> & Partial<Pick<CssVarsTheme, "vars">>;

/**
 * The primary colour at `opacity`, as the scheme in use has it: a variable
 * reference in the app's theme (so the header's switch changes it), a
 * computed colour in a one-scheme theme (the gallery's preview, which has no
 * variables).
 */
const primaryTint = (theme: AnyTheme, opacity: number): string =>
  theme.vars ? `rgba(${theme.vars.palette.primary.mainChannel} / ${opacity})` : alpha(theme.palette.primary.main, opacity);

/** A palette colour as the scheme in use has it — a variable, or the value. */
export const paletteColor = (theme: AnyTheme, pick: (palette: Theme["palette"]) => string): string =>
  pick((theme.vars?.palette ?? theme.palette) as Theme["palette"]);

/**
 * **The selected nav row** (the default theme's rule, shared by the themes
 * after it): `selected` means "the route you are on", so it wants the weight
 * of an active button, not MUI's faint tint. `accent`, when above 0, adds a
 * bar of that many pixels in the primary colour along the row's start edge
 * (the high-contrast theme's).
 */
const selectedRowOverride = (radius: number, rest = 0.16, hover = 0.24, accent = 0): Components<Theme>["MuiListItemButton"] => ({
  styleOverrides: {
    root: ({ theme }) => ({
      borderRadius: radius,
      "&.Mui-selected": {
        backgroundColor: primaryTint(theme, rest),
        ...(accent > 0 && { borderInlineStart: `${accent}px solid ${paletteColor(theme, (palette) => palette.primary.main)}` }),
        "&:hover": { backgroundColor: primaryTint(theme, hover) },
      },
    }),
  },
});

/** **Every button**: flat, its radius, and the knobs' lip and outlined border. */
const buttonOverride = ({ buttonRadius, buttonLip, outlinedButtonBorder }: ComponentKnobs): Components<Theme>["MuiButton"] => ({
  defaultProps: { disableElevation: true },
  styleOverrides: {
    root: { borderRadius: buttonRadius },
    ...(buttonLip !== null && {
      contained: {
        boxShadow: `inset 0 -3px 0 rgba(0, 0, 0, ${buttonLip.rest})`,
        "&:hover": { boxShadow: `inset 0 -3px 0 rgba(0, 0, 0, ${buttonLip.hover})` },
      },
    }),
    ...(outlinedButtonBorder !== null && {
      outlined: { borderWidth: outlinedButtonBorder, "&:hover": { borderWidth: outlinedButtonBorder } },
    }),
  },
});

/**
 * **A theme's component overrides, from its knobs** (CTA-115) — what
 * `buildTheme` puts under the accessibility baseline's. A knob left `null`
 * writes no override, so MUI's own stands.
 */
export const componentOverrides = (knobs: ComponentKnobs): Components<Theme> => ({
  MuiButton: buttonOverride(knobs),
  MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
  MuiListItemButton: selectedRowOverride(knobs.selectedRow.radius, knobs.selectedRow.rest, knobs.selectedRow.hover, knobs.selectedRow.accent),
  ...(knobs.linkUnderline !== null && { MuiLink: { defaultProps: { underline: knobs.linkUnderline } } }),
  ...(knobs.chipFontWeight !== null && { MuiChip: { styleOverrides: { root: { fontWeight: knobs.chipFontWeight } } } }),
});
