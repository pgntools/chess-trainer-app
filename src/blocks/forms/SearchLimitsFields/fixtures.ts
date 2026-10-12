import { DEFAULT_ENGINE_SEARCH_SETTINGS } from "../../../lib/engineSearchSettings";
import { MOVE_TIME_INSTANT_MS } from "../../../lib/engineSettings";

/*
  Where a search stops — sample limits (CTA-185), typed with `src/lib/`'s own.
  Imported only by the block's gallery and its test.
*/

/** The defaults: depth 20, no time limit — the move time's box off. */
export const DEFAULTS = { depth: DEFAULT_ENGINE_SEARCH_SETTINGS.depth, moveTimeMs: DEFAULT_ENGINE_SEARCH_SETTINGS.moveTimeMs } as const;

/** A deep search: depth 34, a minute a move. */
export const DEEP = { depth: 34, moveTimeMs: 60000 } as const;

/** A move time typed off the marks: 7.5 s, between 5 and 10. */
export const OFF_THE_MARKS = { depth: 18, moveTimeMs: 7500 } as const;

/** The instant reply: 0 s, shown on the first mark. */
export const INSTANT = { depth: 12, moveTimeMs: MOVE_TIME_INSTANT_MS } as const;
