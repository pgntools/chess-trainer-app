import type { CollectionMergeDone } from "./CollectionMergeDialog";

/*
  The merge dialog's samples (CTA-232) — the form's own are
  `forms/CollectionMergeForm/fixtures.ts`. Imported only by the block's
  gallery and its test.
*/

export { CANDIDATES, DEFAULTS, EVERYTHING, FOUR, ONE, TWO } from "../../forms/CollectionMergeForm/fixtures";

/** A merge done: thousands of games, some left out as duplicates. */
export const DONE: CollectionMergeDone = {
  name: "Mikhail Tal + 1 more",
  games: 4_589,
  duplicates: 64,
  link: { href: "/library/u1" },
};

/** A merge done with no duplicate. */
export const DONE_NO_DUPLICATES: CollectionMergeDone = { name: "Soviet champions", games: 1, duplicates: 0, link: { href: "/library/u2" } };

/** The upload's own refusal — a merge over the Library's limit. */
export const TOO_LARGE = "That is too large — a collection can be up to about 100 million characters (some 100,000 games).";
