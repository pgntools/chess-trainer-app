import { gameReferenceOf, type SourceAddress } from "../../lib/embedSource";
import { libraryGameReference, loadReferencedGames, resolveGameReference } from "../../lib/gameReference";
import { loadUploadedCollections, loadUploadedGames } from "../../lib/libraryCollectionStore";
import type { CollectionSummary, TournamentFormat } from "../../lib/libraryCollections";
import { pgnFileOf } from "../../lib/pgnExport";
import { loadSavedAnalyses } from "../../lib/savedAnalysisStore";
import { loadSavedRepertoires, savedRepertoiresSnapshot } from "../../lib/savedRepertoireStore";
import { findShippedCollection } from "../../lib/shippedCollections";
import { guessTournamentKindOfGames, type TournamentGuess } from "../../lib/tournamentKind";

/**
 * **The Library, as the MDX editor looks a game up in it** (CTA-137) — a
 * collection's summary, one game's PGN, all of a collection's games, and
 * the kind of tournament they look like: what Components' Add a component
 * and the Components gallery (CTA-140) read an address with.
 */

/** A tournament format, for a sentence. */
export const FORMAT_WORDS: Record<TournamentFormat, string> = {
  swiss: "a Swiss",
  roundRobin: "a round robin",
  knockout: "a knockout",
  doubleElimination: "a double elimination",
  match: "a match",
  teamSwiss: "a team event",
  teamKnockout: "a team knockout",
  arena: "an arena",
};

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
export const guessOf = (games: readonly string[]): TournamentGuess | undefined => guessTournamentKindOfGames(games);

/**
 * **What an app address names, in words** (CTA-140) — the Components
 * gallery's "an address in the app": a Library collection or game, a saved
 * analysis, a played game or a repertoire, read from its store — or why it
 * is not here.
 */
export const describeAddress = async (address: SourceAddress): Promise<{ label: string } | { problem: string }> => {
  if (address.kind === "collection") {
    const summary = await collectionSummaryOf(address.collection);
    if (summary === undefined) return { problem: `The Library has no collection ${address.collection}.` };
    const format = summary.tournament?.enabled === true ? `, ${FORMAT_WORDS[summary.tournament.type]}` : "";
    return { label: `${summary.name} — ${summary.count.toLocaleString()} games${format}` };
  }
  if (address.kind === "libraryGame") {
    const game = await libraryPgnOf(address.collection, address.number);
    return game === undefined ? { problem: `The Library has no game ${address.number} in the collection ${address.collection}.` } : { label: game.name };
  }
  if (address.kind === "repertoire") {
    await loadSavedRepertoires();
    const saved = savedRepertoiresSnapshot()?.find((candidate) => candidate.id === address.id);
    return saved === undefined ? { problem: `This browser has no repertoire ${address.id}.` } : { label: saved.name.trim() || "An untitled repertoire" };
  }
  const reference = gameReferenceOf(address) ?? "";
  if (address.kind === "analysis") await loadSavedAnalyses();
  await loadReferencedGames(reference);
  const game = resolveGameReference(reference);
  if (game !== undefined) return { label: game.name };
  return { problem: `This browser has no ${address.kind === "analysis" ? "saved analysis" : "played game"} ${address.id}.` };
};

/**
 * **What an app address names, as PGN text** — the record as it is kept,
 * tags, comments, annotations and side lines and all: a collection's games
 * one after another, one game's, an analysis', a played game's or a
 * repertoire's. What the gallery's "paste inline" writes into the code in
 * place of the address. `undefined` where it is not here.
 */
export const pgnTextOf = async (address: SourceAddress): Promise<string | undefined> => {
  if (address.kind === "collection") {
    const games = await collectionGamesOf(address.collection);
    return games === undefined || games.length === 0 ? undefined : pgnFileOf(games);
  }
  if (address.kind === "libraryGame") {
    const game = await libraryPgnOf(address.collection, address.number);
    return game === undefined ? undefined : pgnFileOf([game.pgn]);
  }
  if (address.kind === "repertoire") {
    await loadSavedRepertoires();
    const saved = savedRepertoiresSnapshot()?.find((candidate) => candidate.id === address.id);
    return saved === undefined ? undefined : pgnFileOf([saved.pgn]);
  }
  const reference = gameReferenceOf(address) ?? "";
  if (address.kind === "analysis") await loadSavedAnalyses();
  await loadReferencedGames(reference);
  const game = resolveGameReference(reference);
  return game === undefined ? undefined : pgnFileOf([game.pgn]);
};
