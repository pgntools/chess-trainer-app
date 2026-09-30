import type { RepertoireReading } from "../../../lib/savedRepertoires";

/*
  The merge-or-split choice's sample readings (CTA-113), typed with
  `src/lib/`'s own reading of a text of several games — what the choice
  shows is its count, its skipped games and whether they merge. Imported only
  by the block's gallery and its test.
*/

/** The part of a successful reading the choice shows. */
export type ChoiceFixture = Pick<Extract<RepertoireReading, { ok: true }>, "skipped" | "mergeable"> & { count: number };

export const FOURTEEN: ChoiceFixture = { count: 14, skipped: 0, mergeable: true };

export const SOME_SKIPPED: ChoiceFixture = { count: 12, skipped: 2, mergeable: true };

/** Games from different start positions — no one tree can hold them. */
export const UNMERGEABLE: ChoiceFixture = { count: 3, skipped: 0, mergeable: false };
