import { alpha, type Components, type CssVarsTheme, type Theme } from "@mui/material/styles";

/** A theme under `buildTheme` — with CSS variables (the app's) or without (the gallery's preview). */
type AnyTheme = Omit<Theme, "components"> & Partial<Pick<CssVarsTheme, "vars">>;

/**
 * The primary colour at `opacity`, as the scheme in use has it: a variable
 * reference in the app's theme (so the header's switch changes it), a
 * computed colour in a one-scheme theme (the gallery's preview, which has no
 * variables).
 */
export const primaryTint = (theme: AnyTheme, opacity: number): string =>
  theme.vars ? `rgba(${theme.vars.palette.primary.mainChannel} / ${opacity})` : alpha(theme.palette.primary.main, opacity);

/** A palette colour as the scheme in use has it — a variable, or the value. */
export const paletteColor = (theme: AnyTheme, pick: (palette: Theme["palette"]) => string): string =>
  pick((theme.vars?.palette ?? theme.palette) as Theme["palette"]);

/**
 * **The selected nav row** (the default theme's rule, shared by the themes
 * after it): `selected` means "the route you are on", so it wants the weight
 * of an active button, not MUI's faint tint.
 */
export const selectedRowOverride = (radius: number, rest = 0.16, hover = 0.24): Components<Theme>["MuiListItemButton"] => ({
  styleOverrides: {
    root: ({ theme }) => ({
      borderRadius: radius,
      "&.Mui-selected": {
        backgroundColor: primaryTint(theme, rest),
        "&:hover": { backgroundColor: primaryTint(theme, hover) },
      },
    }),
  },
});
