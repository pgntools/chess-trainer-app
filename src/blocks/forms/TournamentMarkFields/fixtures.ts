import type { CollectionTournament } from "../../../lib/libraryCollections";
import type { TournamentGuess } from "../../../lib/tournamentKind";

/*
  The tournament mark fields' samples (CTA-142). Imported only by the
  block's gallery and its test.
*/

export const OFF: CollectionTournament = { enabled: false, type: "swiss" };
export const KNOCKOUT: CollectionTournament = { enabled: true, type: "knockout" };

/** What a team event's games look like. */
export const TEAM_GUESS: TournamentGuess = {
  kind: "teamSwiss",
  reason: "48 teams, 12 rounds, each meeting a few of the others: a team event",
  facts: { games: 1650, competitors: 48, teams: true, rounds: 12 },
};
