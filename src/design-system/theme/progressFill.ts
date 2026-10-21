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

/**
 * **A progress chip's second fill** (CTA-251) — the thin strip along its
 * bottom edge: the theme's primary at full strength, so it reads apart from
 * the tinted fill behind the words. It carries meaning, so `themes/contrast.ts`
 * measures it as a non-text part (3:1) over the paper and over that fill.
 */
export const progressSecondaryFillOf = (palette: Pick<Palette, "primary">): string => palette.primary.main;
