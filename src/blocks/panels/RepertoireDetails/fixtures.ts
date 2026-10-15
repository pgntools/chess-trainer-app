import type { OpeningEntry } from "../../../lib/openings";

/*
  A repertoire beside its board (CTA-206). Imported only by the block's
  gallery and its test.
*/

export const NAME = "Caro-Kann for Black";

export const DESCRIPTION =
  "My main line against 1. e4 — the Advance with 3...Bf5, the Exchange and the Panov, with the sidelines I meet online.";

export const HEBREW_NAME = "קארו-קאן לשחור";

export const HEBREW_DESCRIPTION = "הקו הראשי שלי נגד 1. e4, עם הסטיות שאני פוגש ברשת.";

export const CARO_KANN: OpeningEntry = { eco: "B12", name: "Caro-Kann Defense: Advance Variation", moves: "1. e4 c6 2. d4 d5 3. e5" };
