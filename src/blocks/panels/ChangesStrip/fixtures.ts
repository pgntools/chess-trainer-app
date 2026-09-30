import type { ChangesStripProps } from "./ChangesStrip";

/*
  The changes strip's sample summaries and problems (CTA-113). The problem is
  a key of the caller's catalog block — the stores' own outcome (`storage`,
  `too-many`), which a block may not import. Imported only by the block's
  gallery and its test.
*/

export const ADDED = "2 moves added";

export const EDITED = "Lines reordered or deleted";

export const STORAGE: NonNullable<ChangesStripProps["problem"]> = "storage";
