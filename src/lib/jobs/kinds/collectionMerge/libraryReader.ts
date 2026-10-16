import { loadUploadedGames } from "../../../libraryCollectionStore";
import { findShippedCollection } from "../../../shippedCollections";
import type { CollectionMergeReader } from "./core";

/**
 * **The Library, as the collection merge reads it** (CTA-220): a
 * {@link CollectionMergeReader} over both kinds of collection — a shipped one
 * through its manifest entry's loader (`lib/shippedCollections.ts`, the PGN
 * fetched and cut once) and the reader's own through the Library's store
 * (`loadUploadedGames`, read once and kept). Either is held whole once read,
 * so a merge's 500-game steps slice what is already in memory.
 *
 * A collection that is not there — no shipped entry by that id, no upload —
 * rejects with {@link LibraryCollectionGoneError}, which the kind's adapter
 * (CTA-221) reports as the job's `source` error. Any other failure (a
 * shipped chunk that would not load) rejects as it came.
 */

/** A collection the merge was given is not in the Library any more. */
export class LibraryCollectionGoneError extends Error {
  readonly code = "source";
  readonly collectionId: string;

  constructor(collectionId: string) {
    super(`The Library has no collection ${collectionId}.`);
    this.name = "LibraryCollectionGoneError";
    this.collectionId = collectionId;
  }
}

/** Where the games come from — the app's two sources by default; a test's own in their place. */
export type LibraryGameSources = {
  /** A shipped collection's games, or `undefined` for no shipped collection by that id. */
  shipped: (id: string) => Promise<readonly string[]> | undefined;
  /** An upload's games, `null` when it is not there. */
  uploaded: (id: string) => Promise<readonly string[] | null>;
};

const APP_SOURCES: LibraryGameSources = {
  shipped: (id) => findShippedCollection(id)?.loadGames(),
  uploaded: loadUploadedGames,
};

/** **A reader over `sources`** — the app's by default. */
export const libraryReaderOf = (sources: LibraryGameSources = APP_SOURCES): CollectionMergeReader => {
  const gamesOf = async (id: string): Promise<readonly string[]> => {
    const games = (await sources.shipped(id)) ?? (await sources.uploaded(id));
    if (games === null) throw new LibraryCollectionGoneError(id);
    return games;
  };
  return {
    count: async (id) => (await gamesOf(id)).length,
    read: async (id, from, n) => (await gamesOf(id)).slice(Math.max(0, from), Math.max(0, from) + Math.max(0, n)),
  };
};

/** The Library's reader. */
export const libraryReader: CollectionMergeReader = libraryReaderOf();
