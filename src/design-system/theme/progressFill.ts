import { alpha, type Palette } from "@mui/material/styles";

/**
 * How strongly a progress fill tints what it sits on (CTA-195): the primary
 * colour at this opacity, so text over it stays the surface's own text colour
 * — measured by `themes/contrast.ts` in every theme, light and dark.
 */
export const PROGRESS_FILL_OPACITY = 0.2;

/** **A progress fill's colour** — the theme's primary, tinted (`ProgressChip`). */
export const progressFillOf = (palette: Pick<Palette, "primary">): string =>
  alpha(palette.primary.main, PROGRESS_FILL_OPACITY);
