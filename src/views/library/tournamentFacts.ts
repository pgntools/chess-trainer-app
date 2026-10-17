import type { TournamentFacts } from "../../blocks/cards";
import { gameTag, type GameHeaders } from "../../lib/gameModel";
import { collectionMetadataOf, sharedEventOf, type CollectionRow, type CollectionSummary } from "../../lib/libraryCollections";
import { teamPlayersOf } from "../../lib/teamTournament";
import { roundPartsOf } from "../../lib/tournament";

/**
 * **A tournament's facts** (CTA-142; the collection page's left panel's
 * General since CTA-231) — from the rows at once, the games' own tags (the
 * site, the teams) once read.
 */
export const tournamentFactsOf = (
  summary: CollectionSummary,
  rows: readonly CollectionRow[],
  headers: readonly GameHeaders[] | undefined,
): TournamentFacts => {
  const metadata = collectionMetadataOf(rows);
  const rounds = new Set(rows.map((row) => roundPartsOf(row.round)[0]).filter((round) => round !== undefined));
  const sites = new Set(headers?.map((game) => gameTag(game, "Site")));
  const [site] = sites;
  const type = summary.tournament?.type ?? "swiss";
  const teams = headers === undefined || (type !== "teamSwiss" && type !== "teamKnockout") ? undefined : teamPlayersOf(headers).size;
  return {
    type,
    event: sharedEventOf(rows),
    ...(sites.size === 1 && site !== undefined && { site }),
    ...(metadata.dates !== undefined && { dates: metadata.dates }),
    rounds: rounds.size,
    players: metadata.players,
    ...(teams !== undefined && teams > 0 && { teams }),
    games: rows.length,
    unfinished: rows.filter((row) => row.result === "*").length,
  };
};
