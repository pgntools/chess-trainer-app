import type { GameHeaders } from "../../../lib/gameModel";
import { knockoutOf, type Knockout } from "../../../lib/knockout";
import { DOUBLE_ELIMINATION_GAMES, FINAL_STAGE_GAMES, KNOCKOUT_GAMES, TEAM_KNOCKOUT_GAMES } from "../../../test/fixtures/formatGames";

/*
  Sample knockouts (CTA-128), each made by `lib/knockout.ts`'s own
  `knockoutOf` — so a change to the helper's shape breaks them at compile
  time. Imported only by the block's gallery and its test.
*/

/** The Dutch championship 2026, the real file: 16 players, four rounds, tiebreaks in the same rounds. */
export const DUTCH: Knockout = knockoutOf(KNOCKOUT_GAMES);

/** The Esports World Cup 2026's play-in, the real file: a double elimination of 8, the losers' bracket from round 51. */
export const ESPORTS: Knockout = knockoutOf(DOUBLE_ELIMINATION_GAMES, { losersFromRound: 51 });

/** The Esports World Cup 2026's final stage, the real file: a knockout of 8, the final and the match for third place in round 3. */
export const ESPORTS_FINAL: Knockout = knockoutOf(FINAL_STAGE_GAMES);

/** The World Blitz Team Championship 2026's final stage, the real file: 16 teams, legs of six boards. */
export const BLITZ_TEAMS: Knockout = knockoutOf(TEAM_KNOCKOUT_GAMES);

const game = (round: string, white: string, black: string, result: string, title?: string): GameHeaders => ({
  Round: round,
  White: white,
  Black: black,
  Result: result,
  ...(title !== undefined && { WhiteTitle: title }),
});

/** Four players: the semi-finals played, the final level after its two games — no winner yet. */
export const UNFINISHED: Knockout = knockoutOf([
  game("1.1", "Lovelace, Ada", "Turing, Alan", "1-0", "GM"),
  game("1.2", "Turing, Alan", "Lovelace, Ada", "1/2-1/2"),
  game("1.1", "Hopper, Grace", "Knuth, Donald", "0-1"),
  game("1.2", "Knuth, Donald", "Hopper, Grace", "1/2-1/2"),
  game("2.1", "Lovelace, Ada", "Knuth, Donald", "1-0", "GM"),
  game("2.2", "Knuth, Donald", "Lovelace, Ada", "1-0"),
]);

/** A final between two Hebrew names. */
export const HEBREW: Knockout = knockoutOf([game("1.1", "כהן, דוד", "לוי, שרה", "0-1"), game("1.2", "לוי, שרה", "כהן, דוד", "1/2-1/2")]);

/** A file with no game in it. */
export const EMPTY: Knockout = knockoutOf([]);
