import type { Analysis } from "../../../lib/engineAnalysis";

/*
  Play's status line's sample searches (CTA-113), typed with `src/lib/`'s own
  analysis. Imported only by the block's gallery and its test.
*/

/** A search just begun — no depth yet. */
export const STARTING: Pick<Analysis, "depth"> = { depth: 0 };

/** A search well under way. */
export const DEEP: Pick<Analysis, "depth"> = { depth: 18 };
