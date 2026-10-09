import type { ComputerAnalysisReport } from "../../../lib/computerAnalysis";

/*
  A computer analysis's reports (CTA-173), typed with `lib/computerAnalysis.ts`'s
  own. Imported only by the block's gallery and its test.
*/

/** Both sides analysed. */
export const BOTH: ComputerAnalysisReport = {
  w: { moves: 31, inaccuracies: 2, mistakes: 1, blunders: 0, missedMates: 1, acpl: 24, accuracy: 89.7 },
  b: { moves: 30, inaccuracies: 3, mistakes: 2, blunders: 2, missedMates: 0, acpl: 61, accuracy: 74.2 },
};

/** An eval-only side: White's moves alone. */
export const WHITE_ONLY: ComputerAnalysisReport = { w: BOTH.w, b: null };

/** A lichess export's first move has no eval before it: moves counted, no ACPL. */
export const NO_LOSS: ComputerAnalysisReport = {
  w: { moves: 1, inaccuracies: 0, mistakes: 0, blunders: 0, missedMates: 0, acpl: null, accuracy: null },
  b: null,
};
