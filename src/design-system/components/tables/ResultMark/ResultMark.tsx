import Box from "@mui/material/Box";

import { visuallyHidden } from "../../a11y";
import { RESULT_GLYPHS, type ResultOutcome } from "./resultGlyphs";

export type ResultMarkProps = {
  outcome: ResultOutcome;
  /**
   * The mark's words — everything the glyph leaves out ("Round 3, against
   * Ada Lovelace: win"). Read in the glyph's place, out of sight; shown
   * beside it in a legend (`legend`).
   */
  label: string;
  /** A legend's entry: the glyph, then its words in view — "* = unfinished". */
  legend?: boolean;
  /**
   * Text in place of the outcome's own glyph, toned by the outcome all the
   * same (CTA-128) — a team match's board points, "4½". Absent, the
   * outcome's (`RESULT_GLYPHS`).
   */
  glyph?: string;
  testId?: string;
};

/** The palette key each outcome is toned with — every one measured as text on every surface (`themes/contrast.ts`). */
const TONES: Readonly<Record<ResultOutcome, string>> = {
  win: "success.main",
  draw: "text.secondary",
  loss: "error.main",
  unfinished: "text.primary",
  none: "text.secondary",
};

/**
 * **A result in a table** (CTA-120): one glyph — `1`, `½`, `0`, `*`, `–`,
 * or a caller's own `glyph` (a score, "4½") — toned by its outcome, a win in bold. The glyph is text, so the tone is
 * never the only signal, and it is pinned `dir="ltr"`.
 *
 * Accessible: the glyph is decoration and the `label` is what is read — out
 * of sight, in the glyph's place, so a cell of marks is named by their words.
 * As a `legend` entry the words show, and the glyph explains itself.
 */
function ResultMark({ outcome, label, legend = false, glyph, testId }: ResultMarkProps) {
  return (
    <Box
      component="span"
      data-testid={testId}
      data-outcome={outcome}
      // The hidden words are positioned against the mark itself, so they scroll with their table.
      sx={{ position: "relative", whiteSpace: "nowrap", ...(legend && { color: "text.secondary" }) }}
    >
      <Box
        component="span"
        aria-hidden="true"
        dir="ltr"
        // One box for every glyph — ½ is wider than 1 — so a column of marks lines up.
        sx={{ display: "inline-block", minWidth: "1.1em", textAlign: "center", color: TONES[outcome], ...(outcome === "win" && { fontWeight: 700 }) }}
      >
        {glyph ?? RESULT_GLYPHS[outcome]}
      </Box>
      {legend ? (
        <>
          <span aria-hidden="true"> = </span>
          {label}
        </>
      ) : (
        <Box component="span" sx={visuallyHidden}>
          {label}
        </Box>
      )}
    </Box>
  );
}

export default ResultMark;
