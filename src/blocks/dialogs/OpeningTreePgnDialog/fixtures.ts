import type { OpeningTreePgnTags } from "../../../lib/openingTreePgn";

/*
  What the tree dialog hands back (CTA-113), typed with `src/lib/`'s own
  tags. Imported only by the block's gallery and its test.
*/

/** It opens on Add tags with `games` ticked. */
export const OPENING_TAGS: OpeningTreePgnTags = { games: true, prc: false };

/** No: the moves alone. */
export const NO_TAGS: OpeningTreePgnTags = { games: false, prc: false };

/** Both counts, in one comment. */
export const BOTH_TAGS: OpeningTreePgnTags = { games: true, prc: true };
