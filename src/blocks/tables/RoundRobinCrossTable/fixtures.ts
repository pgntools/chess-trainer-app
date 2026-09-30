import { ROUND_ROBIN_TIE_BREAKS, tournamentOf, type Tournament } from "../../../lib/tournament";
import { CANDIDATES_GAMES, fixtureGame, type FixturePlayer } from "../../../test/fixtures/tournamentGames";

/*
  Sample round robins (CTA-120), each a `Tournament` made by
  `lib/tournament.ts`'s own `tournamentOf` with the round robin's tie-break
  order — so a change to the helper's shape breaks them at compile time.
  Imported only by the block's gallery and its test.
*/

const roundRobin = (games: Parameters<typeof tournamentOf>[0]): Tournament => tournamentOf(games, ROUND_ROBIN_TIE_BREAKS);

/** The FIDE Candidates 2026, the real file: 8 players, a complete 14-round double round robin. */
export const CANDIDATES: Tournament = roundRobin(CANDIDATES_GAMES);

const TAL: FixturePlayer = { name: "Tal, Mikhail", title: "GM", elo: 2705, country: "LAT", fideId: "1001" };
const BOTVINNIK: FixturePlayer = { name: "Botvinnik, Mikhail", title: "GM", elo: 2720, country: "RUS", fideId: "1002" };
const SMYSLOV: FixturePlayer = { name: "Smyslov, Vasily", title: "GM", elo: 2690, fideId: "1003" };
/** No title, no rating, no federation, no FIDE id — told apart by the name. */
const NEWCOMER: FixturePlayer = { name: "Newcomer, Nina" };

/** Four players, everyone against everyone once. */
const FIRST_CYCLE = [
  fixtureGame(1, TAL, NEWCOMER, "1-0"),
  fixtureGame(1, BOTVINNIK, SMYSLOV, "1/2-1/2"),
  fixtureGame(2, NEWCOMER, SMYSLOV, "0-1"),
  fixtureGame(2, TAL, BOTVINNIK, "1/2-1/2"),
  fixtureGame(3, BOTVINNIK, NEWCOMER, "1-0"),
  fixtureGame(3, SMYSLOV, TAL, "1/2-1/2"),
];

/** A single round robin, complete: one result a cell. */
export const SINGLE: Tournament = roundRobin(FIRST_CYCLE);

/**
 * A double round robin four rounds in: the first cycle, then a round of the
 * second with one game still going — cells with two results, cells with one.
 */
export const UNFINISHED: Tournament = roundRobin([
  ...FIRST_CYCLE,
  fixtureGame(4, NEWCOMER, TAL, "1/2-1/2"),
  fixtureGame(4, SMYSLOV, BOTVINNIK, "*"),
]);

/** A single round robin whose file lacks a game (Smyslov – Tal): that pair's cells read "no game in the file". */
export const MISSING_GAME: Tournament = roundRobin(FIRST_CYCLE.slice(0, 5));

const HEBREW_PLAYERS: FixturePlayer[] = [
  { name: "טל, מיכאל", title: "GM", elo: 2705, country: "ISR" },
  { name: "כהן, דנה", title: "WIM", elo: 2310, country: "ISR" },
  { name: "לוי, יואב", elo: 2150 },
];

/** Hebrew names, for the RTL pass — a double round robin of three. */
export const HEBREW: Tournament = roundRobin([
  fixtureGame(1, HEBREW_PLAYERS[0], HEBREW_PLAYERS[1], "1-0"),
  fixtureGame(2, HEBREW_PLAYERS[1], HEBREW_PLAYERS[2], "1/2-1/2"),
  fixtureGame(3, HEBREW_PLAYERS[2], HEBREW_PLAYERS[0], "0-1"),
  fixtureGame(4, HEBREW_PLAYERS[1], HEBREW_PLAYERS[0], "1/2-1/2"),
  fixtureGame(5, HEBREW_PLAYERS[2], HEBREW_PLAYERS[1], "1-0"),
  fixtureGame(6, HEBREW_PLAYERS[0], HEBREW_PLAYERS[2], "1-0"),
]);

/** Names that do not fit — each stays on one line, and the frame scrolls sideways. */
export const LONG_NAMES: Tournament = roundRobin([
  fixtureGame(
    1,
    { name: "Kourkoulos-Arditis, Stamatis Konstantinos Alexandros of the Thessaloniki Chess Academy", title: "GM", elo: 2540, country: "GRE" },
    { name: "Praggnanandhaa, Rameshbabu, of Chennai, Tamil Nadu — the youngest of his country's grandmasters", title: "GM", elo: 2741, country: "IND" },
    "1/2-1/2",
  ),
]);

/** A file with no game in it. */
export const EMPTY: Tournament = roundRobin([]);
