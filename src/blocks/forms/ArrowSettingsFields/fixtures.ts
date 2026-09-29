import type { ArrowWidthSource } from "../../../lib/arrowSettings";

/*
  The arrow fields' sample trees' sources (CTA-113), typed with `src/lib/`'s
  own width source. Imported only by the block's gallery and its test.
*/

/** A tree with evaluations and game counts, but no play chances. */
export const EVAL_AND_GAMES: ReadonlySet<ArrowWidthSource> = new Set(["none", "eval", "games", "lines"]);

/** A tree with no tags at all — only None and Lines ahead. */
export const UNTAGGED: ReadonlySet<ArrowWidthSource> = new Set(["none", "lines"]);
