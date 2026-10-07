import { matchOf, type Match } from "../../../lib/match";
import { MATCH_GAMES } from "../../../test/fixtures/formatGames";

/*
  Sample matches (CTA-128), each made by `lib/match.ts`'s own `matchOf` —
  so a change to the helper's shape breaks them at compile time. Imported
  only by the block's gallery and its test.
*/

/** Clutch Chess: The Legends 2026, the real file — Topalov 8, Kasparov 4, twelve Chess960 games. */
export const CLUTCH: Match = matchOf(MATCH_GAMES)!;

/** Three games, the last unfinished: a title, a federation, and a player with no rating. */
export const UNFINISHED: Match = matchOf([
  { Round: "1", White: "Lovelace, Ada", Black: "Turing, Alan", Result: "1/2-1/2", WhiteTitle: "GM", WhiteElo: "2700", WhiteCountry: "ENG" },
  { Round: "2", White: "Turing, Alan", Black: "Lovelace, Ada", Result: "0-1" },
  { Round: "3", White: "Lovelace, Ada", Black: "Turing, Alan", Result: "*" },
])!;

/** Two Hebrew names, two games. */
export const HEBREW: Match = matchOf([
  { Round: "1", White: "כהן, דוד", Black: "לוי, שרה", Result: "0-1" },
  { Round: "2", White: "לוי, שרה", Black: "כהן, דוד", Result: "1/2-1/2" },
])!;
