import { DEFAULT_COLLECTION_MERGE_SETTINGS, type CollectionMergeSettings } from "../../../lib/jobs/kinds/collectionMerge/core";
import type { CollectionMergeFormSource } from "./CollectionMergeForm";

/*
  The collection merge form's samples (CTA-220), typed with
  `lib/jobs/kinds/collectionMerge/core.ts`'s own. Imported only by the block's
  gallery and its test.
*/

/** Two shipped collections — the fewest a merge takes. */
export const TWO: CollectionMergeFormSource[] = [
  { id: "tal", name: "Mikhail Tal", count: 2636 },
  { id: "petrosian", name: "Tigran Petrosian", count: 2017 },
];

/** Four, shipped and uploaded mixed. */
export const FOUR: CollectionMergeFormSource[] = [
  ...TWO,
  { id: "ug1abc", name: "My club games", count: 148 },
  { id: "fischer", name: "Bobby Fischer", count: 1063 },
];

/** Names that do not fit a line, and a Hebrew one. */
export const LONG_NAMES: CollectionMergeFormSource[] = [
  { id: "ulong1", name: "The complete correspondence games of the 1987–1994 national championship cycles, annotated", count: 12450 },
  { id: "ulong2", name: "משחקי המועדון של תל אביב, עונת 2025–2026", count: 1 },
  { id: "ulong3", name: "Openings — Sicilian Najdorf, English Attack, every game since 1990 with 6. Be3", count: 98213 },
];

/** As New job opens it: identical copies dropped, the default name, no collection. */
export const DEFAULTS: CollectionMergeSettings = DEFAULT_COLLECTION_MERGE_SETTINGS;

/** Same-game duplicates, a name of the reader's, a collection asked for. */
export const EVERYTHING: CollectionMergeSettings = {
  dedupe: "same-game",
  name: "Soviet champions",
  outputs: { collection: true },
};
