import { gameTag, type GameHeaders } from "./gameModel";
import { outcomesOf, playerOf, POINTS, roundPartsOf, type GameOutcome, type PlayerColor, type TournamentPlayer } from "./tournament";

/**
 * **A match between two players, read from its games' tags** (CTA-128):
 * the two, every game in order — who had White, how it ended, its time
 * control — and the score. Pure, tags only, like `lib/tournament.ts`.
 *
 * Every game counts one point, as the PGN's `Result` says: an event that
 * weighs its games (a later day's worth more) keeps its own score, which no
 * tag carries.
 */

export type MatchGame = {
  /** The game's index in the headers given. */
  game: number;
  /** The `Round` tag's round — the game's number in the match, as the file numbers it. */
  round: number | undefined;
  /** The colour each of `players` had, in their order. */
  colors: readonly [PlayerColor, PlayerColor];
  /** What the game was worth to each of `players`. */
  outcomes: readonly [GameOutcome, GameOutcome];
  /** `TimeControl` — `"1500+10"`: seconds, and the increment. */
  timeControl?: string;
};

export type Match = {
  /** The two players, the one with more points first (then the higher rating, then the name). */
  players: readonly [TournamentPlayer, TournamentPlayer];
  /** Every game, in round order, a game with no round last. */
  games: readonly MatchGame[];
  /** Each player's points, in `players`' order. */
  points: readonly [number, number];
  unfinished: number;
};

/**
 * The match the games make — `undefined` unless every game is between the
 * same two players (a file of a tournament is not a match).
 */
export const matchOf = (games: readonly GameHeaders[]): Match | undefined => {
  const players = new Map<string, TournamentPlayer>();
  const read: { game: number; round: number | undefined; white: string; black: string; outcomes: readonly [GameOutcome, GameOutcome]; timeControl?: string }[] = [];

  games.forEach((headers, game) => {
    const white = playerOf(headers, "White");
    const black = playerOf(headers, "Black");
    if (white === undefined || black === undefined || white.id === black.id) return;
    for (const seen of [white, black]) {
      const known = players.get(seen.id);
      players.set(seen.id, {
        ...seen,
        title: known?.title ?? seen.title,
        rating: known?.rating ?? seen.rating,
        federation: known?.federation ?? seen.federation,
      });
    }
    read.push({
      game,
      round: roundPartsOf(gameTag(headers, "Round"))[0],
      white: white.id,
      black: black.id,
      outcomes: outcomesOf(headers.Result),
      timeControl: gameTag(headers, "TimeControl"),
    });
  });
  if (read.length === 0 || players.size !== 2) return undefined;

  const pointsOf = (id: string) =>
    read.reduce((sum, game) => sum + (game.white === id ? POINTS[game.outcomes[0]] : game.black === id ? POINTS[game.outcomes[1]] : 0), 0);
  const [first, second] = [...players.values()].sort(
    (a, b) =>
      pointsOf(b.id) - pointsOf(a.id) || (b.rating ?? 0) - (a.rating ?? 0) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  );
  const ordered = [...read].sort((a, b) => (a.round ?? Infinity) - (b.round ?? Infinity) || a.game - b.game);

  return {
    players: [first, second],
    games: ordered.map(({ game, round, white, outcomes, timeControl }) => {
      const firstIsWhite = white === first.id;
      return {
        game,
        round,
        colors: firstIsWhite ? ["white", "black"] : ["black", "white"],
        outcomes: firstIsWhite ? outcomes : [outcomes[1], outcomes[0]],
        ...(timeControl !== undefined && { timeControl }),
      };
    }),
    points: [pointsOf(first.id), pointsOf(second.id)],
    unfinished: read.filter((game) => game.outcomes[0] === "unfinished").length,
  };
};
