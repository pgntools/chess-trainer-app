import type { Theme } from "@mui/material/styles";
import { chessTokensOf } from "../../design-system/theme";
import type { NagTone } from "../../lib/moveAnnotations";

/**
 * **The move marks' colours** (CTA-97), lichess's families — `!` and `!!`
 * green, `?` orange, `??` red, `!?` magenta, `?!` blue — in one shade for
 * each scheme: the light one dark enough to read on white paper, the dark
 * one light enough to read on the dark theme's. They are the theme's
 * `chess.nag` tokens (CTA-107).
 *
 * The style rules that colour a glyph by its `data-tone` attribute — `prop`
 * is `color` for HTML text and `fill` for the map's SVG. `scope` is the
 * selector each rule hangs off (`&` for the glyph itself, `& .map-nag` for
 * the ones inside a drawing).
 *
 * Pure data in a file of its own, beside the components that draw with it
 * (`NagGlyphs.tsx`, the map's labels), for the fast-refresh rule
 * `moveTokenSx.ts` explains.
 */
export const nagToneStyles = (theme: Theme, prop: "color" | "fill", scope: string) =>
  Object.fromEntries(
    Object.entries(
      chessTokensOf(theme).nag satisfies Readonly<Record<NagTone, { light: string; dark: string }>>,
    ).map(([tone, { light, dark }]) => [
      `${scope}[data-tone="${tone}"]`,
      { [prop]: light, ...theme.applyStyles("dark", { [prop]: dark }) },
    ]),
  );
