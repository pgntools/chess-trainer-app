import { createTheme, shouldSkipGeneratingVar, type Theme } from "@mui/material/styles";

import type { ThemeDefinition } from "../themes/types";
import { accessibilityOverrides, focusRingOf, REDUCED_MOTION_TRANSITIONS } from "./accessibility";
import "./augment";
import { MONOSPACE_FONT_FAMILY } from "./typography";

/**
 * Which colour schemes a built theme carries:
 *
 * - **`"both"`** — the app's: light *and* dark as CSS variables
 *   (`cssVariables` + `colorSchemes`), the scheme picked by the
 *   `data-mui-color-scheme` attribute the colour-mode toggle sets, so a
 *   scheme change is a variable swap rather than a re-render of every styled
 *   node — which is what keeps the toggle instant.
 * - **`"light"` / `"dark"`** — one fixed scheme and no variables: a theme
 *   that can sit *inside* the app's without fighting it over the page's
 *   variables (the design gallery's preview).
 */
export type ThemeMode = "both" | "light" | "dark";

/** What else a built theme takes besides its theme, scheme and direction. */
export type BuildThemeOptions = {
  /**
   * The reader's system asks for reduced motion (`prefers-reduced-motion:
   * reduce`, `usePrefersReducedMotion`): no transition and no ripple.
   * Absent or `false`, MUI's own.
   */
  reducedMotion?: boolean;
  /** MUI's locale bundles (`@mui/material/locale`), merged over it as `createTheme`'s own extra arguments are. */
  localization?: readonly object[];
};

/**
 * **Builds the MUI theme** for a registered theme, a mode and a direction.
 *
 * The theme's `chess` tokens ride along as `theme.chess`; they are read
 * through `chessTokensOf` / `useChessTokens`, never by a CSS variable. Over
 * the theme's own component overrides go the accessibility baseline's
 * (CTA-111, `accessibilityOverrides`): the focus ring, the target size, the
 * control border and — with `reducedMotion` — no ripple.
 */
export const buildTheme = (
  definition: ThemeDefinition,
  mode: ThemeMode,
  direction: "ltr" | "rtl",
  { reducedMotion = false, localization = [] }: BuildThemeOptions = {},
): Theme => {
  const shared = {
    direction,
    // The monospace token rides with the theme's type (CTA-113); a theme may name its own.
    typography: { fontFamilyMonospace: MONOSPACE_FONT_FAMILY, ...definition.typography },
    shape: definition.shape,
    components: { ...definition.overrides, ...accessibilityOverrides(definition.focusRingWidth, reducedMotion) },
    chess: definition.chess,
    ...(reducedMotion && { transitions: REDUCED_MOTION_TRANSITIONS }),
  };
  const theme =
    mode === "both"
      ? createTheme(
          {
            ...shared,
            cssVariables: {
              colorSchemeSelector: "data-mui-color-scheme",
              // The chess tokens are read as values (react-chessboard's options
              // and SVG attributes take no `var()`), so none becomes a variable.
              shouldSkipGeneratingVar: (keys: string[]) => keys[0] === "chess" || shouldSkipGeneratingVar(keys),
            },
            colorSchemes: {
              light: { palette: definition.light },
              dark: { palette: definition.dark },
            },
          },
          ...localization,
        )
      : createTheme({ ...shared, palette: { ...definition[mode], mode } }, ...localization);
  // The ring reads the palette as the theme has it — a variable in the app's.
  theme.mixins.focusRing = focusRingOf(theme, definition.focusRingWidth);
  return theme;
};
