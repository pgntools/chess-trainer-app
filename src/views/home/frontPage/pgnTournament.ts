import { useMemo } from "react";

import { gameTag } from "../../../lib/gameModel";
import { readPgnTags, splitPgnGames } from "../../../lib/pgn";
import { slugify } from "../../../lib/pgnText";
import { tournamentOf, type TieBreak, type Tournament } from "../../../lib/tournament";

/** A tournament read from a PGN of its games, its event's name, and the slug the embed's ids are made of. */
export type PgnTournament =
  | { tournament: Tournament; event: string | undefined; slug: string; error?: undefined }
  | { error: string; tournament?: undefined };

/**
 * **A tournament from an article's PGN** (CTA-128) — what the two table
 * embeds (`<SwissStandingsTable>`, `<RoundRobinCrossTable>`) draw: the
 * games' tags alone (`splitPgnGames` → `readPgnTags`, no move replayed) made
 * into a `Tournament` by `tournamentOf`, ranked by `tieBreaks`. The event is
 * the first game's `Event` tag. A PGN with no game in it is an error.
 */
export const pgnTournamentOf = (pgn: string, tieBreaks: readonly TieBreak[]): PgnTournament => {
  try {
    const headers = splitPgnGames(pgn).map(readPgnTags);
    if (headers.length === 0) return { error: "no game in the PGN" };
    const event = headers.map((game) => gameTag(game, "Event")).find((name) => name !== undefined);
    return { tournament: tournamentOf(headers, tieBreaks), event, slug: slugify(event ?? "") || "tournament" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
};

/** {@link pgnTournamentOf}, read once per PGN. */
export const usePgnTournament = (pgn: string, tieBreaks: readonly TieBreak[]): PgnTournament =>
  useMemo(() => pgnTournamentOf(pgn, tieBreaks), [pgn, tieBreaks]);
