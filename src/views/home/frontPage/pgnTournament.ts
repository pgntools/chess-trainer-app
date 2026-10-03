import { useCallback, useMemo } from "react";

import { gameTag, type GameHeaders } from "../../../lib/gameModel";
import { readPgnTags, splitPgnGames } from "../../../lib/pgn";
import { slugify } from "../../../lib/pgnText";
import { tournamentOf, type TieBreak, type Tournament } from "../../../lib/tournament";

/** An event's PGN, read for its tags: the games' headers, the event's name, and the slug the embed's ids are made of. */
export type PgnEvent = { headers: GameHeaders[]; event: string | undefined; slug: string };

/**
 * **An event from an article's PGN** (CTA-128) — what every tournament
 * embed draws from: the games' tags alone (`splitPgnGames` → `readPgnTags`,
 * no move replayed), and the event's name, the first `Event` tag. A PGN with
 * no game in it is an error.
 */
export const pgnEventOf = (pgn: string): PgnEvent | { error: string } => {
  try {
    const headers = splitPgnGames(pgn).map(readPgnTags);
    if (headers.length === 0) return { error: "no game in the PGN" };
    const event = headers.map((game) => gameTag(game, "Event")).find((name) => name !== undefined);
    return { headers, event, slug: slugify(event ?? "") || "tournament" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
};

/**
 * What an embed made of its PGN: the event and its `made` (a tournament, a
 * knockout, a match) — or why it has none.
 */
export type PgnMade<T> = { made: T; event: string | undefined; slug: string; error?: undefined } | { error: string; made?: undefined };

/**
 * {@link pgnEventOf}, then `make` over its headers — read again only when the
 * PGN or `make` changes, so pass a stable `make` (a module-level function, or
 * a `useCallback`). `make` answering `undefined` is an error (`notMade`).
 */
export const usePgnEvent = <T,>(pgn: string, make: (headers: GameHeaders[]) => T | undefined, notMade = "not this kind of event"): PgnMade<T> =>
  useMemo(() => {
    const read = pgnEventOf(pgn);
    if ("error" in read) return { error: read.error };
    const made = make(read.headers);
    return made === undefined ? { error: notMade } : { made, event: read.event, slug: read.slug };
  }, [pgn, make, notMade]);

/** A tournament read from a PGN of its games — the Swiss standings' and the crosstable's. */
export type PgnTournament = PgnMade<Tournament>;

/** {@link usePgnEvent} for `tournamentOf`, ranked by `tieBreaks`. */
export const usePgnTournament = (pgn: string, tieBreaks: readonly TieBreak[]): PgnTournament =>
  usePgnEvent(
    pgn,
    useCallback((headers: GameHeaders[]) => tournamentOf(headers, tieBreaks), [tieBreaks]),
  );
