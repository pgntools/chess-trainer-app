import { gameTag, type GameHeaders } from "./gameModel";
import { playerOf, POINTS, tournamentOf, type TournamentPlayer } from "./tournament";

/**
 * **A tournament's participants, each one's record** (CTA-142) — what the
 * Library's tournament view lists on its Participants tab: every player's
 * score, games, wins, draws and losses, performance and longest unbeaten
 * run, read from the games' tags alone over {@link tournamentOf} (so a
 * player is told apart, titled and rated exactly as the tables tell them),
 * whatever the format: a knockout's or a team event's players are players
 * too. Pure; it replays no move.
 */

export type Participant = {
  player: TournamentPlayer;
  /** The team a team event's player played for — the first their games name. */
  team?: string;
  /** Game points: a win 1, a draw ½. */
  points: number;
  /** Every game of theirs in the file, unfinished ones too. */
  games: number;
  wins: number;
  draws: number;
  losses: number;
  /** Games still `*` — counted in `games`, scoring nothing. */
  unfinished: number;
  /**
   * The rating their results were worth against their rated opponents:
   * the opponents' average plus the Elo difference the score stands for
   * (`400·log10(p / (1 − p))`, held to ±800 for a perfect or a zero score).
   * `undefined` where no finished game was against a rated opponent.
   */
  performance?: number;
  /** The most finished games in a row without a loss, in round order. */
  unbeatenRun: number;
};

/** The Elo difference a score `p` (0–1) stands for — ±800 at the ends, FIDE's cap. */
const ratingDifferenceOf = (p: number): number => {
  if (p >= 1) return 800;
  if (p <= 0) return -800;
  return Math.max(-800, Math.min(800, 400 * Math.log10(p / (1 - p))));
};

/** Every participant, in the standings' order (points, then the tie-breaks, the rating, the name). */
export const participantsOf = (headers: readonly GameHeaders[]): Participant[] => {
  const { standings } = tournamentOf(headers);
  const ratingOf = new Map(standings.map(({ player }) => [player.id, player.rating]));

  // A team event's players: the team each first played for.
  const teamOf = new Map<string, string>();
  for (const game of headers) {
    for (const side of ["White", "Black"] as const) {
      const player = playerOf(game, side);
      const team = gameTag(game, `${side}Team`);
      if (player !== undefined && team !== undefined && !teamOf.has(player.id)) teamOf.set(player.id, team);
    }
  }

  return standings.map(({ player, points, games }) => {
    const count = (outcome: string) => games.filter((game) => game.outcome === outcome).length;
    const rated = games.filter((game) => game.outcome !== "unfinished" && ratingOf.get(game.opponent) !== undefined);
    const performance =
      rated.length === 0
        ? undefined
        : Math.round(
            rated.reduce((sum, game) => sum + (ratingOf.get(game.opponent) ?? 0), 0) / rated.length +
              ratingDifferenceOf(rated.reduce((sum, game) => sum + POINTS[game.outcome], 0) / rated.length),
          );
    let run = 0;
    let unbeatenRun = 0;
    for (const game of games) {
      if (game.outcome === "unfinished") continue;
      run = game.outcome === "loss" ? 0 : run + 1;
      unbeatenRun = Math.max(unbeatenRun, run);
    }
    return {
      player,
      ...(teamOf.has(player.id) && { team: teamOf.get(player.id) }),
      points,
      games: games.length,
      wins: count("win"),
      draws: count("draw"),
      losses: count("loss"),
      unfinished: count("unfinished"),
      ...(performance !== undefined && { performance }),
      unbeatenRun,
    };
  });
};

/** The standouts a summary names — each the first participant (in the standings' order) to reach the best of it. */
export type TopPlayers = {
  /** The best score. */
  score?: Participant;
  /** The best performance, of those with one. */
  performance?: Participant;
  /** The most wins — none where no game was won. */
  wins?: Participant;
  /** The longest unbeaten run — none where no game was finished without a loss. */
  unbeaten?: Participant;
};

/** The participants' standouts (CTA-142's "top players"). */
export const topPlayersOf = (participants: readonly Participant[]): TopPlayers => {
  const best = (value: (participant: Participant) => number | undefined): Participant | undefined => {
    let top: Participant | undefined;
    for (const participant of participants) {
      const own = value(participant);
      if (own === undefined || own <= 0) continue;
      const leader = top === undefined ? undefined : value(top);
      if (leader === undefined || own > leader) top = participant;
    }
    return top;
  };
  return {
    score: best((participant) => (participant.games > 0 ? participant.points : undefined)),
    performance: best((participant) => participant.performance),
    wins: best((participant) => participant.wins),
    unbeaten: best((participant) => participant.unbeatenRun),
  };
};
