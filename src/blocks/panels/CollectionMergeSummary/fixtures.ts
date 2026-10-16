import { MAX_COLLECTION_CHARS } from "../../../lib/libraryCollections";
import type { CollectionMergeSummary } from "../../../lib/jobs/kinds/collectionMerge/core";

/*
  The collection merge summary's samples (CTA-220), typed with
  `lib/jobs/kinds/collectionMerge/core.ts`'s own — each a summary as
  `summaryOf` writes it. Imported only by the block's gallery and its test.
*/

/** Two shipped collections, exact copies dropped, added to the Library. */
export const ADDED: CollectionMergeSummary = {
  name: "Tal + Petrosian",
  dedupe: "identical-pgn",
  sources: [
    { id: "tal", name: "Mikhail Tal", read: 2636, written: 2636, duplicates: 0, unreadable: 0 },
    { id: "petrosian", name: "Tigran Petrosian", read: 2017, written: 1979, duplicates: 37, unreadable: 1 },
  ],
  totals: { read: 4653, written: 4615, duplicates: 37, unreadable: 1 },
  chars: 2_904_118,
  collection: { status: "added", id: "ug1abc", name: "Tal + Petrosian" },
};

/** Four sources over the most a collection holds: the file alone, and why. */
export const TOO_LARGE: CollectionMergeSummary = {
  name: "Everything",
  dedupe: "same-game",
  sources: [
    { id: "u1", name: "Online blitz 2019–2026", read: 61_204, written: 60_011, duplicates: 1_180, unreadable: 13 },
    { id: "u2", name: "Club archive", read: 48_310, written: 47_002, duplicates: 1_308, unreadable: 0 },
    { id: "tal", name: "Mikhail Tal", read: 2636, written: 2610, duplicates: 26, unreadable: 0 },
    { id: "fischer", name: "Bobby Fischer", read: 1063, written: 1063, duplicates: 0, unreadable: 0 },
  ],
  totals: { read: 113_213, written: 110_686, duplicates: 2_514, unreadable: 13 },
  chars: MAX_COLLECTION_CHARS + 4_212_007,
  collection: { status: "too-large", chars: MAX_COLLECTION_CHARS + 4_212_007, limit: MAX_COLLECTION_CHARS },
};

/** Nothing readable: no game written, so no collection. */
export const EMPTY: CollectionMergeSummary = {
  name: "Broken + 1 more",
  dedupe: "none",
  sources: [
    { id: "u3", name: "Broken export", read: 4, written: 0, duplicates: 0, unreadable: 4 },
    { id: "u4", name: "Empty folder", read: 0, written: 0, duplicates: 0, unreadable: 0 },
  ],
  totals: { read: 4, written: 0, duplicates: 0, unreadable: 4 },
  chars: 0,
  collection: { status: "empty" },
};

/** No collection asked for; long and Hebrew names. */
export const FILE_ONLY: CollectionMergeSummary = {
  name: "משחקי המועדון",
  dedupe: "identical-pgn",
  sources: [
    { id: "u5", name: "משחקי המועדון של תל אביב, עונת 2025–2026", read: 312, written: 312, duplicates: 0, unreadable: 0 },
    { id: "u6", name: "The complete correspondence games of the 1987–1994 national championship cycles, annotated", read: 12_450, written: 12_101, duplicates: 349, unreadable: 0 },
  ],
  totals: { read: 12_762, written: 12_413, duplicates: 349, unreadable: 0 },
  chars: 9_870_412,
  collection: { status: "not-requested" },
};
