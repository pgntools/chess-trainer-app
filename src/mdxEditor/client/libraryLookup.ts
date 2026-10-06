import { libraryGameReference, loadReferencedGames, resolveGameReference } from "../../lib/gameReference";
import { loadUploadedCollections, loadUploadedGames } from "../../lib/libraryCollectionStore";
import type { CollectionSummary, TournamentFormat } from "../../lib/libraryCollections";
import { readPgnTags } from "../../lib/pgn";
import { findShippedCollection } from "../../lib/shippedCollections";
import { guessTournamentKind, type TournamentGuess } from "./tournamentKind";

/**
 * **The Library, as the MDX editor looks a game up in it** (CTA-137) — a
 * collection's summary, one game's PGN, all of a collection's games, and
 * the kind of tournament they look like: what Components' Add a component
 * and the Components gallery (CTA-140) read an address with.
 */

/** A tournament format, for a sentence. */
export const FORMAT_WORDS: Record<TournamentFormat, string> = { swiss: "a Swiss", roundRobin: "a round robin", knockout: "a knockout", arena: "an arena", match: "a match" };

/** A collection's summary — a shipped one's, or an upload's once the Library's list is read. */
export const collectionSummaryOf = async (id: string): Promise<CollectionSummary | undefined> =>
  findShippedCollection(id) ?? (await loadUploadedCollections()).find((candidate) => candidate.id === id);

/** A Library game's PGN, read — `undefined` for no such game. */
export const libraryPgnOf = async (collection: string, number: number): Promise<{ name: string; pgn: string } | undefined> => {
  const reference = libraryGameReference(collection, number);
  await loadReferencedGames(reference);
  return resolveGameReference(reference);
};

/** A Library collection's games, each its PGN — a shipped one's or an upload's; `undefined` where it cannot be read. */
export const collectionGamesOf = async (collection: string): Promise<readonly string[] | undefined> => {
  try {
    const shipped = findShippedCollection(collection);
    return (shipped === undefined ? await loadUploadedGames(collection) : await shipped.loadGames()) ?? undefined;
  } catch {
    return undefined;
  }
};

/** The kind of tournament a set of games looks like — from their tags alone. */
export const guessOf = (games: readonly string[]): TournamentGuess | undefined => guessTournamentKind(games.map(readPgnTags));
