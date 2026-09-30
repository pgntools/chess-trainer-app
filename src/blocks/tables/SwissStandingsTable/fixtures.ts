import { tournamentOf, type Tournament } from "../../../lib/tournament";
import { SOFIA_GAMES, fixtureGame, type FixturePlayer } from "../../../test/fixtures/tournamentGames";

/*
  Sample Swiss tournaments (CTA-120), each a `Tournament` made by
  `lib/tournament.ts`'s own `tournamentOf` — so a change to the helper's
  shape breaks them at compile time. Imported only by the block's gallery
  and its test.
*/

/** Sofia Cup Rapid 2026, the real file: 99 players, 9 rounds, the top boards only — 8 of its 178 games unfinished. */
export const SOFIA: Tournament = tournamentOf(SOFIA_GAMES);

const TAL: FixturePlayer = { name: "Tal, Mikhail", title: "GM", elo: 2705, country: "LAT", fideId: "1001" };
const BOTVINNIK: FixturePlayer = { name: "Botvinnik, Mikhail", title: "GM", elo: 2720, country: "RUS", fideId: "1002" };
const SMYSLOV: FixturePlayer = { name: "Smyslov, Vasily", title: "GM", elo: 2690, fideId: "1003" };
const KERES: FixturePlayer = { name: "Keres, Paul", title: "GM", elo: 2670, country: "EST", fideId: "1004" };
const PETROSIAN: FixturePlayer = { name: "Petrosian, Tigran", title: "IM", elo: 2650, country: "ARM", fideId: "1005" };
/** No title, no rating, no federation, no FIDE id — told apart by the name. */
const NEWCOMER: FixturePlayer = { name: "Newcomer, Nina" };

/**
 * Six players over three rounds, one of every kind of cell: wins, draws and
 * losses; an unfinished game (Tal – Smyslov, round 3); and a round the file
 * holds no game of (Keres and the newcomer, round 2).
 */
export const CLUB_OPEN: Tournament = tournamentOf([
  fixtureGame(1, TAL, KERES, "1-0"),
  fixtureGame(1, BOTVINNIK, PETROSIAN, "1/2-1/2"),
  fixtureGame(1, SMYSLOV, NEWCOMER, "1-0"),
  fixtureGame(2, PETROSIAN, TAL, "0-1"),
  fixtureGame(2, SMYSLOV, BOTVINNIK, "1/2-1/2"),
  fixtureGame(3, TAL, SMYSLOV, "*"),
  fixtureGame(3, BOTVINNIK, KERES, "1-0"),
  fixtureGame(3, NEWCOMER, PETROSIAN, "0-1"),
]);

const HEBREW_PLAYERS: FixturePlayer[] = [
  { name: "טל, מיכאל", title: "GM", elo: 2705, country: "ISR" },
  { name: "כהן, דנה", title: "WIM", elo: 2310, country: "ISR" },
  { name: "לוי, יואב", elo: 2150 },
  { name: "בוטבינניק, מיכאל", title: "GM", elo: 2720 },
];

/** Hebrew names, for the RTL pass — every game finished and every round played, so there is nothing for a legend to explain. */
export const HEBREW: Tournament = tournamentOf([
  fixtureGame(1, HEBREW_PLAYERS[0], HEBREW_PLAYERS[2], "1-0"),
  fixtureGame(1, HEBREW_PLAYERS[3], HEBREW_PLAYERS[1], "1/2-1/2"),
  fixtureGame(2, HEBREW_PLAYERS[1], HEBREW_PLAYERS[0], "0-1"),
  fixtureGame(2, HEBREW_PLAYERS[2], HEBREW_PLAYERS[3], "0-1"),
]);

/** One game: two rows, one round. */
export const ONE_GAME: Tournament = tournamentOf([fixtureGame(1, TAL, BOTVINNIK, "1/2-1/2")]);

/** Names that do not fit — each stays on one line, and the frame scrolls sideways. */
export const LONG_NAMES: Tournament = tournamentOf([
  fixtureGame(
    1,
    { name: "Kourkoulos-Arditis, Stamatis Konstantinos Alexandros of the Thessaloniki Chess Academy", title: "GM", elo: 2540, country: "GRE" },
    { name: "Praggnanandhaa, Rameshbabu, of Chennai, Tamil Nadu — the youngest of his country's grandmasters", title: "GM", elo: 2741, country: "IND" },
    "1/2-1/2",
  ),
]);

/** A file with no game in it. */
export const EMPTY: Tournament = tournamentOf([]);
