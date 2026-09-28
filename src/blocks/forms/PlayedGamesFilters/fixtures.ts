/*
  The Lobby filters' sample openings (CTA-109) — names as eco.json gives
  them (`lib/openings.ts`). Imported only by the block's gallery and its test.
*/

export const OPENINGS: readonly string[] = ["Italian Game", "King's Pawn Game", "Queen's Gambit Declined", "Sicilian Defense"];

/** Names long enough to test the select's width. */
export const LONG_OPENINGS: readonly string[] = [
  "Queen's Gambit Declined, Semi-Tarrasch Defense, Pillsbury Variation",
  "Sicilian Defense, Najdorf Variation, English Attack, Anti-English",
];

/** Names in Hebrew, for the gallery's RTL switch. */
export const HEBREW_OPENINGS: readonly string[] = ["הגנה סיציליאנית", "פתיחת המלך"];
