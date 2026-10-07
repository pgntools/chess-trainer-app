import type { TournamentGuess } from "../../../lib/tournamentKind";

/*
  The tournament suggestion's sample guesses (CTA-142) — as
  `guessTournamentKind` reads the shipped TWIC files. Imported only by the
  block's gallery and its test.
*/

/** The Candidates 2026: a double round robin. */
export const ROUND_ROBIN_GUESS: TournamentGuess = {
  kind: "roundRobin",
  reason: "8 players, every pair met twice: a double round robin",
  facts: { games: 56, competitors: 8, teams: false, rounds: 14, twice: true },
};

/** The Dutch championship: a knockout. */
export const KNOCKOUT_GUESS: TournamentGuess = {
  kind: "knockout",
  reason: "16 players, fewer each round (16 → 8 → 4 → 2): a knockout",
  facts: { games: 46, competitors: 16, teams: false, rounds: 4, sizes: [16, 8, 4, 2] },
};

/** The World Rapid Team: a team event. */
export const TEAM_SWISS_GUESS: TournamentGuess = {
  kind: "teamSwiss",
  reason: "48 teams, 12 rounds, each meeting a few of the others: a team event",
  facts: { games: 1650, competitors: 48, teams: true, rounds: 12 },
};

/** A guess made by hand, with no facts — its English reason shown as it is. */
export const BARE_GUESS: TournamentGuess = { kind: "match", reason: "12 games between two players" };
