import type { TournamentFacts } from "./TournamentInfo";

/*
  The tournament info card's sample events (CTA-142) — as the shipped TWIC
  files read. Imported only by the block's gallery and its test.
*/

/** The FIDE Candidates 2026: a double round robin. */
export const CANDIDATES: TournamentFacts = {
  type: "roundRobin",
  event: "FIDE Candidates 2026",
  site: "Cyprus CYP",
  dates: { first: "2026.03.29", last: "2026.04.15" },
  rounds: 14,
  players: 8,
  games: 56,
  unfinished: 0,
};

/** The World Rapid Team 2026: a team event, still being played. */
export const TEAM: TournamentFacts = {
  type: "teamSwiss",
  event: "FIDE World Rapid Team Ch 2026",
  dates: { first: "2026.08.01", last: "2026.08.04" },
  rounds: 12,
  players: 291,
  teams: 48,
  games: 1650,
  unfinished: 3,
};

/** A club event whose tags give little: no event's site, no dates, no rounds. */
export const SPARSE: TournamentFacts = { type: "swiss", players: 4, games: 3, unfinished: 0 };

export const DESCRIPTION = "Eight players, two cycles — the winner plays the world champion.";
