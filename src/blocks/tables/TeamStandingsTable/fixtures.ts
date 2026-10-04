import type { GameHeaders } from "../../../lib/gameModel";
import { teamTournamentOf, type TeamTournament } from "../../../lib/teamTournament";

/*
  Sample team tournaments (CTA-128), each made by `lib/teamTournament.ts`'s
  own `teamTournamentOf` — so a change to the helper's shape breaks them at
  compile time. Imported only by the block's gallery and its test. (The
  real file, the World Rapid Team's 1,650 games, is the helper's own test's:
  too heavy for the gallery.)
*/

/** A match on four boards: White's team's results, board by board ("1-0", "1/2-1/2", …), colours alternating. */
const match = (round: number, home: string, away: string, results: readonly string[]): GameHeaders[] =>
  results.map((result, index) => {
    const homeWhite = index % 2 === 0;
    const flipped = result === "1-0" ? "0-1" : result === "0-1" ? "1-0" : result;
    return {
      Round: `${round}.${index + 1}`,
      White: `${homeWhite ? home : away} ${index + 1}`,
      Black: `${homeWhite ? away : home} ${index + 1}`,
      WhiteTeam: homeWhite ? home : away,
      BlackTeam: homeWhite ? away : home,
      Result: homeWhite ? result : flipped,
    };
  });

const W = "1-0";
const D = "1/2-1/2";
const L = "0-1";

/**
 * Six clubs over three rounds on four boards: wins, draws and losses of
 * matches; a match with a game unfinished (round 3, Hopper – Liskov); and a
 * pair of clubs the file has no match of in round 2 (Knuth, Liskov).
 */
export const CLUB_LEAGUE: TeamTournament = teamTournamentOf([
  ...match(1, "Lovelace Club", "Turing Club", [W, W, D, L]),
  ...match(1, "Hopper Club", "Knuth Club", [D, D, D, D]),
  ...match(1, "Liskov Club", "Dijkstra Club", [L, W, L, L]),
  ...match(2, "Lovelace Club", "Dijkstra Club", [W, D, W, W]),
  ...match(2, "Turing Club", "Hopper Club", [D, W, L, W]),
  ...match(3, "Lovelace Club", "Knuth Club", [D, D, W, D]),
  ...match(3, "Hopper Club", "Liskov Club", [W, "*", D, L]),
  ...match(3, "Dijkstra Club", "Turing Club", [L, L, D, W]),
]);

/** National teams carry their players' federation on every game (an Olympiad's file). */
const national = (games: GameHeaders[], federations: Readonly<Record<string, string>>): GameHeaders[] =>
  games.map((game) => ({ ...game, WhiteCountry: federations[game.WhiteTeam], BlackCountry: federations[game.BlackTeam] }));

/**
 * Four national teams over two rounds, each player tagged with the team's
 * federation — a flag after each name (CTA-128); and one team, "Mixed", of
 * two federations — no flag.
 */
export const NATIONS: TeamTournament = teamTournamentOf([
  ...national(match(1, "Uzbekistan", "Germany", [W, D, D, W]), { Uzbekistan: "UZB", Germany: "GER" }),
  ...national(match(1, "India", "England", [D, W, L, W]), { India: "IND", England: "ENG" }),
  ...national(match(2, "Uzbekistan", "India", [D, D, W, D]), { Uzbekistan: "UZB", India: "IND" }),
  ...national(match(2, "Germany", "England", [L, D, D, D]), { Germany: "GER", England: "ENG" }),
  // "Mixed": boards 1–2 French, 3–4 Spanish; "Nomads" all Dutch.
  ...match(2, "Mixed", "Nomads", [W, W, L, D]).map((game, index) => {
    const mixed = index < 2 ? "FRA" : "ESP";
    return game.WhiteTeam === "Mixed" ? { ...game, WhiteCountry: mixed, BlackCountry: "NED" } : { ...game, WhiteCountry: "NED", BlackCountry: mixed };
  }),
]);

/** Two Hebrew-named clubs, one match. */
export const HEBREW: TeamTournament = teamTournamentOf(match(1, "מכבי", "הפועל", [W, D, L, W]));

/** A file with no game in it. */
export const EMPTY: TeamTournament = teamTournamentOf([]);
