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
  /** Its place among the texts' games, 1-based — what a problem with it is numbered by. */
  number: number;
  /** The game's own text, tags and moves — what `parsePgnTree` reads. */
  text: string;
  headers: GameHeaders;
};

/** Every game of the texts — a pasted PGN, a file, a zip's `.pgn`s — in order, by its tags alone. A text with no game adds none. */
export const indexPgnGames = (texts: readonly string[]): PgnGameEntry[] => {
  const entries: PgnGameEntry[] = [];
  for (const text of texts) {
    for (const chunk of splitPgnGames(text)) entries.push({ number: entries.length + 1, text: chunk, headers: readPgnTags(chunk) });
  }
  return entries;
};

export type SlicedWorkOptions = {
  /** After each slice: how many items are done, of how many. */
  onProgress?: (done: number, total: number) => void;
  /** Aborted, the work stops at the next slice and rejects with the signal's reason. */
  signal?: AbortSignal;
  /** How long one slice may hold the page, in ms. */
  sliceMs?: number;
};

export type ParseGamesOptions = SlicedWorkOptions & {
  /**
   * A game that will not read: present, it is told here and **left out**
   * (the others parsed on); absent, the parse rejects on it.
   */
  onUnreadable?: (entry: PgnGameEntry, error: unknown) => void;
};

/** Let the page paint and take input before the next slice. */
const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * **Work over many items without holding the page** (CTA-208) — `work` on
 * each in order, in slices of about `sliceMs` (50), the page given back
 * between them, `onProgress` told after each; an abort rejects with the
 * signal's reason at the next slice. `work` answering `undefined` leaves the
 * item out of the result.
 */
export const mapInSlices = async <T, R>(
  items: readonly T[],
  work: (item: T, index: number) => R | undefined,
  { onProgress, signal, sliceMs = 50 }: SlicedWorkOptions = {},
): Promise<R[]> => {
  const results: R[] = [];
  let done = 0;
  while (done < items.length) {
    signal?.throwIfAborted();
    const sliceEnd = performance.now() + sliceMs;
    do {
      const result = work(items[done], done);
      if (result !== undefined) results.push(result);
      done += 1;
    } while (done < items.length && performance.now() < sliceEnd);
    onProgress?.(done, items.length);
    if (done < items.length) await nextTask();
  }
  return results;
};

/**
 * Every entry's tree, in order — parsed in slices ({@link mapInSlices}), one
 * move cache across the batch (`PgnMoveCache`), so the games' shared start
 * is worked out once. A game that will not read rejects with its
 * `PgnParseError`, numbered by its place among the texts' games (`number` —
 * a few games picked out of many keep theirs) — or, with `onUnreadable`, is
 * left out. An abort rejects with the signal's reason.
 */
export const parsePgnGameEntries = (
  entries: readonly PgnGameEntry[],
  { onUnreadable, ...sliced }: ParseGamesOptions = {},
): Promise<GameTree[]> => {
  const cache: PgnMoveCache = new Map();
  return mapInSlices(
    entries,
    (entry) => {
      // One game alone, as it came, is not numbered — as `parsePgnTrees` does not number it.
      const numbered = entries.length > 1 || entry.number > 1;
      if (onUnreadable === undefined) return parsePgnTree(entry.text, numbered ? entry.number : undefined, cache);
      try {
        return parsePgnTree(entry.text, numbered ? entry.number : undefined, cache);
      } catch (error) {
        onUnreadable(entry, error);
        return undefined;
      }
    },
    sliced,
  );
};
