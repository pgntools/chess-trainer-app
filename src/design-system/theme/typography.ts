import type { Theme } from "@mui/material/styles";

/**
 * **The monospace stack** (CTA-113) — notation and machine words: SAN in a
 * move list, a FEN or a PGN in a field, a path in a zip, a NAG glyph. Five
 * files wrote this stack out and two others wrote a bare `monospace`; it is
 * one token now, `theme.typography.fontFamilyMonospace`, set by `buildTheme`
 * from a theme's `typography` (this, unless a theme says otherwise).
 */
export const MONOSPACE_FONT_FAMILY = "ui-monospace, SFMono-Regular, Menlo, monospace";

/**
 * The theme's monospace stack — for an `sx` function (`fontFamily: monospaceOf`).
 * A theme `buildTheme` did not make (a bare test render) has none, and reads
 * the default.
 */
export const monospaceOf = (theme: Theme): string => theme.typography.fontFamilyMonospace ?? MONOSPACE_FONT_FAMILY;
