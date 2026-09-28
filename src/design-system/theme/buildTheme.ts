import { createTheme, shouldSkipGeneratingVar, type Theme } from "@mui/material/styles";

import type { ThemeDefinition } from "../themes/types";
import "./augment";

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

/**
 * **Builds the MUI theme** for a registered theme, a mode and a direction.
 * `localization` is MUI's locale bundles (`@mui/material/locale`), merged
 * over it as `createTheme`'s own extra arguments are.
 *
 * The theme's `chess` tokens ride along as `theme.chess`; they are read
 * through `chessTokensOf` / `useChessTokens`, never by a CSS variable.
 */
export const buildTheme = (
  definition: ThemeDefinition,
  mode: ThemeMode,
  direction: "ltr" | "rtl",
  ...localization: object[]
): Theme => {
  const shared = {
    direction,
    typography: definition.typography,
    shape: definition.shape,
    components: definition.overrides,
    chess: definition.chess,
  };
  if (mode === "both") {
    return createTheme(
      {
        ...shared,
        cssVariables: {
          colorSchemeSelector: "data-mui-color-scheme",
          // The chess tokens are read as values (react-chessboard's options
          // and SVG attributes take no `var()`), so none becomes a variable.
          shouldSkipGeneratingVar: (keys: string[]) =>
            keys[0] === "chess" || shouldSkipGeneratingVar(keys),
        },
        colorSchemes: {
          light: { palette: definition.light },
          dark: { palette: definition.dark },
        },
      },
      ...localization,
    );
  }
  return createTheme({ ...shared, palette: { ...definition[mode], mode } }, ...localization);
};
