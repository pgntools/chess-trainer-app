import type { BrowserStorageEstimate } from "../../../lib/storageDiagnostics";
import type { StorageCategory } from "./StorageTable";

/*
  The Storage tab's sample figures (CTA-109), the browser's estimate typed
  with `src/lib/storageDiagnostics.ts`'s own. Imported only by the block's
  gallery and its test.
*/

export const BROWSER: BrowserStorageEstimate = { usage: 48_734_208, quota: 10_737_418_240, indexedDB: 23_000_000 };

/** A browser that reports the origin's usage but no IndexedDB part. */
export const BROWSER_WITHOUT_INDEXEDDB: BrowserStorageEstimate = { usage: 1000, quota: null, indexedDB: null };

/** One section per database — each ends on a bolder line. */
export const CATEGORIES: readonly StorageCategory[] = [
  { id: "playedGames", section: "engine", records: 128, payload: 412_331 },
  { id: "analyses", section: "analyses", records: 42, payload: 96_004 },
  { id: "repertoires", section: "repertoires", records: 7, payload: 1_203_455 },
  { id: "collectionGames", section: "library", records: 12_904, payload: 23_551_873 },
];

/** Every store still being read. */
export const READING: readonly StorageCategory[] = CATEGORIES.map((category) => ({ ...category, records: undefined, payload: undefined }));

/** A fresh browser: nothing stored yet. */
export const EMPTY: readonly StorageCategory[] = CATEGORIES.map((category) => ({ ...category, records: 0, payload: 0 }));
