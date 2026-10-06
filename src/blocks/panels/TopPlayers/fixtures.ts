import type { GameHeaders } from "../../../lib/gameModel";
import { participantsOf, topPlayersOf, type TopPlayers } from "../../../lib/tournamentParticipants";

/*
  The top players' samples (CTA-142): hand-made games read by `src/lib/`'s
  own `participantsOf` and `topPlayersOf`. Imported only by the block's
  gallery and its test.
*/

const game = (round: number, white: string, black: string, result: string, whiteElo?: number, blackElo?: number): GameHeaders => ({
  Event: "Club championship",
  Round: String(round),
  White: white,
  Black: black,
  ...(whiteElo !== undefined && { WhiteElo: String(whiteElo) }),
  ...(blackElo !== undefined && { BlackElo: String(blackElo) }),
  ...(white === "Carlsen, Magnus" && { WhiteTitle: "GM", WhiteCountry: "NOR" }),
  Result: result,
});

/** One player leads everything. */
export const ONE_LEADER: TopPlayers = topPlayersOf(
  participantsOf([
    game(1, "Carlsen, Magnus", "Nakamura, Hikaru", "1-0", 2830, 2800),
    game(2, "Carlsen, Magnus", "Caruana, Fabiano", "1-0", 2830, 2790),
    game(3, "Nakamura, Hikaru", "Caruana, Fabiano", "1/2-1/2", 2800, 2790),
  ]),
);

/** Different players lead: a draw-heavy unbeaten run against a win-heavy score. */
export const SPREAD: TopPlayers = topPlayersOf(
  participantsOf([
    game(1, "Ann", "Bea", "1-0", 2100, 2000),
    game(2, "Ann", "Cid", "0-1", 2100, 2300),
    game(3, "Bea", "Cid", "1/2-1/2", 2000, 2300),
    game(4, "Bea", "Ann", "1/2-1/2", 2000, 2100),
    game(5, "Cid", "Ann", "1-0", 2300, 2100),
  ]),
);

/** Games with no result yet: no standout. */
export const NONE: TopPlayers = topPlayersOf(participantsOf([game(1, "Ann", "Bea", "*")]));
