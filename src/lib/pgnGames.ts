import type { GameHeaders } from "./gameModel";
import type { GameTree } from "./gameTree";
import { parsePgnTree, readPgnTags, splitPgnGames, type PgnMoveCache } from "./pgn";

/**
 * **A file of many games, read in two steps** (CTA-208) — Analysis's New case
 * on a PGN of thousands of games. Building a game's tree asks chess.js about
 * every move (~60 µs each), so a 15,905-game file took ~110 s in one go and
 * froze the page; reading its tags takes milliseconds. So a file is first
 * **indexed** — each game's text and its tags, no move read
 * ({@link indexPgnGames}) — which is all a list of the games and their names
 * need; and only the games a choice needs are **parsed**: the one picked
 * (`parsePgnTree`), or all of them for a Case each
 * ({@link parsePgnGameEntries}), in slices that give the page back
 * between them, with progress and a way to stop.
 */

/** One game of a PGN text, read as far as its tags. */
export type PgnGameEntry = {
  /** The game's own text, tags and moves — what `parsePgnTree` reads. */
  text: string;
  headers: GameHeaders;
};

/** Every game of the texts — a pasted PGN, a file, a zip's `.pgn`s — in order, by its tags alone. A text with no game adds none. */
export const indexPgnGames = (texts: readonly string[]): PgnGameEntry[] => {
  const entries: PgnGameEntry[] = [];
  for (const text of texts) {
    for (const chunk of splitPgnGames(text)) entries.push({ text: chunk, headers: readPgnTags(chunk) });
  }
  return entries;
};

export type ParseGamesOptions = {
  /** After each slice: how many games are read, of how many. */
  onProgress?: (done: number, total: number) => void;
  /** Aborted, the parse stops at the next slice and rejects with the signal's reason. */
  signal?: AbortSignal;
  /** How long one slice may hold the page, in ms. */
  sliceMs?: number;
};

/** Let the page paint and take input before the next slice. */
const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Every entry's tree, in order — parsed in slices of about `sliceMs` (50),
 * the page given back between them, `onProgress` told after each. One move
 * cache spans the batch (`PgnMoveCache`), so the games' shared start is
 * worked out once. A game that will not read rejects with its
 * `PgnParseError`, numbered by its place in the list; an abort rejects with
 * the signal's reason.
 */
export const parsePgnGameEntries = async (
  entries: readonly PgnGameEntry[],
  { onProgress, signal, sliceMs = 50 }: ParseGamesOptions = {},
): Promise<GameTree[]> => {
  const trees: GameTree[] = [];
  const cache: PgnMoveCache = new Map();
  const numbered = entries.length > 1;
  while (trees.length < entries.length) {
    signal?.throwIfAborted();
    const sliceEnd = performance.now() + sliceMs;
    do {
      const index = trees.length;
      trees.push(parsePgnTree(entries[index].text, numbered ? index + 1 : undefined, cache));
    } while (trees.length < entries.length && performance.now() < sliceEnd);
    onProgress?.(trees.length, entries.length);
    if (trees.length < entries.length) await nextTask();
  }
  return trees;
};
