import { DEFAULT_COLLECTION_MERGE_SETTINGS, type CollectionMergeSettings } from "../../../lib/collectionMerge";
import type { CollectionMergeFormCandidate, CollectionMergeFormSource } from "./CollectionMergeForm";

/*
  The collection merge form's samples (CTA-220, the Library's since CTA-232),
  typed with `lib/collectionMerge.ts`'s own. Imported only by the block's
  gallery and its test, and by `CollectionMergeDialog`'s.
*/

/** One collection — a collection page's *Merge with…* as it opens. */
export const ONE: CollectionMergeFormSource[] = [{ id: "tal", name: "Mikhail Tal", count: 2636 }];

/** Two shipped collections — the fewest a merge takes. */
export const TWO: CollectionMergeFormSource[] = [...ONE, { id: "petrosian", name: "Tigran Petrosian", count: 2017 }];

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

/** The Library the picker offers: Built-in and the reader's own — those picked are left out by the form. */
export const CANDIDATES: CollectionMergeFormCandidate[] = [
  { id: "tal", name: "Mikhail Tal", count: 2636, builtIn: true },
  { id: "petrosian", name: "Tigran Petrosian", count: 2017, builtIn: true },
  { id: "fischer", name: "Bobby Fischer", count: 1063, builtIn: true },
  { id: "capablanca", name: "José Raúl Capablanca", count: 1035, builtIn: true },
  { id: "ug1abc", name: "My club games", count: 148, builtIn: false },
  { id: "ug2def", name: "Blitz, spring 2026", count: 412, builtIn: false },
];

/** As the dialog opens it: identical copies dropped, the default name. */
export const DEFAULTS: CollectionMergeSettings = DEFAULT_COLLECTION_MERGE_SETTINGS;

/** Same-game duplicates, a name of the reader's. */
export const EVERYTHING: CollectionMergeSettings = { dedupe: "same-game", name: "Soviet champions" };
