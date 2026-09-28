import useMediaQuery from "@mui/material/useMediaQuery";

/** The media query a reader's system answers when it asks for less motion. */
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * **Whether the reader's system asks for reduced motion** (CTA-111) — read
 * from the first render (`noSsr`), and followed live if the setting changes.
 * `AppThemeWithLang` hands it to `buildTheme`; the boards turn their piece
 * animation off by it (`views/shared/boardColors.ts`).
 */
export const usePrefersReducedMotion = (): boolean => useMediaQuery(REDUCED_MOTION_QUERY, { noSsr: true });
