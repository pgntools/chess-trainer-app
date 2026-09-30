import type { GameHeaders } from "../../lib/gameModel";
import { readPgnTags, splitPgnGames } from "../../lib/pgn";
import candidatesPgn from "./pgn/wchcand26.pgn?raw";
import sofiaPgn from "./pgn/sofiacuprap26.pgn?raw";

/*
  The tournament fixtures (CTA-120), as `lib/tournament.ts` is meant to be
  fed — the games' tags alone, no move replayed. For the helper's test and
  the two tournament blocks' fixtures; nothing shipped imports this.

    - sofiacuprap26.pgn — Sofia Cup Rapid 2026, a nine-round Swiss, PARTIAL:
      about twenty top boards a round, so 99 players of whom 38 have one game,
      and 8 of its 178 games unfinished. Its standings are those of the games
      in the file, not the official ones.
    - wchcand26.pgn — the FIDE Candidates 2026: 8 players, a complete
      14-round double round robin (56 games), no `EventRounds` and no country
      tags.
*/

const headersOf = (pgn: string): GameHeaders[] => splitPgnGames(pgn).map(readPgnTags);

export const SOFIA_GAMES: readonly GameHeaders[] = headersOf(sofiaPgn);
export const CANDIDATES_GAMES: readonly GameHeaders[] = headersOf(candidatesPgn);

/** A hand-made player: the tags a game carries for one side. */
export type FixturePlayer = { name: string; title?: string; elo?: number; country?: string; fideId?: string };

const sideTags = (side: "White" | "Black", player: FixturePlayer): GameHeaders => ({
  [side]: player.name,
  ...(player.title !== undefined && { [`${side}Title`]: player.title }),
  ...(player.elo !== undefined && { [`${side}Elo`]: String(player.elo) }),
  ...(player.country !== undefined && { [`${side}Country`]: player.country }),
  ...(player.fideId !== undefined && { [`${side}FideId`]: player.fideId }),
});

/** A hand-made game's tags: the round, White, Black and the result (`1-0`, `0-1`, `1/2-1/2`, `*`). */
export const fixtureGame = (round: number, white: FixturePlayer, black: FixturePlayer, result: string): GameHeaders => ({
  Round: String(round),
  ...sideTags("White", white),
  ...sideTags("Black", black),
  Result: result,
});
