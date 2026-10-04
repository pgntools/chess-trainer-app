import { gameTag, type GameHeaders } from "./gameModel";

/**
 * **A tournament, read from its games' tags** (CTA-120): the players, the
 * rounds, each player's games round by round, and the standings — what a
 * Swiss standings table and a round-robin crosstable are drawn from.
 *
 * Pure, and it reads **tags only** (`GameHeaders[]`), so a caller that holds
 * an index replays no move: `splitPgnGames(pgn).map(readPgnTags)` is the
 * whole cost of a file.
 *
 * It shows **what the file holds**, nothing a PGN does not carry: no byes, no
 * forfeits, no official standings. A round with no game for a player is "no
 * game in the file" — not a bye, and worth no points — so a partial file (the
 * top boards of a Swiss) gives the standings of those games alone.
 */

/** What a game was worth to one of its players. `unfinished` is a `*`: kept and shown, scoring nothing. */
export type GameOutcome = "win" | "draw" | "loss" | "unfinished";

export type PlayerColor = "white" | "black";

/**
 * The tie-breaks, by their plain definitions over the games in the file:
 * **Buchholz** is the sum of the opponents' points; **Sonneborn-Berger** the
 * sum of the points of the opponents beaten plus half the points of those
 * drawn with. An unfinished game counts for neither.
 */
export type TieBreak = "buchholz" | "sonnebornBerger";

/** A Swiss: points, then Buchholz, then Sonneborn-Berger. */
export const SWISS_TIE_BREAKS: readonly TieBreak[] = ["buchholz", "sonnebornBerger"];

/** A round robin: points, then Sonneborn-Berger alone — Buchholz is near-constant when everyone plays everyone. */
export const ROUND_ROBIN_TIE_BREAKS: readonly TieBreak[] = ["sonnebornBerger"];

export type TournamentPlayer = {
  /** The FIDE id where the tags carry one, else the name — what tells two players apart. */
  id: string;
  name: string;
  /** `WhiteTitle` / `BlackTitle` — "GM". */
  title?: string;
  /** `WhiteElo` / `BlackElo`. */
  rating?: number;
  /** `WhiteCountry` / `BlackCountry` — "FRA". */
  federation?: string;
};

/** One game as one of its players sees it. */
export type PlayerGame = {
  /** The game's index in the headers given — what a caller's own list of games is keyed by. */
  game: number;
  /** The integer part of `Round` ("3.12" is round 3); `undefined` where the tag names none. */
  round: number | undefined;
  color: PlayerColor;
  /** The opponent's {@link TournamentPlayer.id}. */
  opponent: string;
  outcome: GameOutcome;
};

export type TournamentStanding = {
  /** 1-based, no two alike: the order is total (rating, then name, settle what the tie-breaks leave). */
  rank: number;
  player: TournamentPlayer;
  points: number;
  tieBreaks: Readonly<Record<TieBreak, number>>;
  /** Every game of the player's, in round order — a game with no round last. */
  games: readonly PlayerGame[];
  /**
   * The same games by round: `rounds[0]` is round 1, one entry per round of
   * the tournament. An empty round is "no game in the file".
   */
  rounds: readonly (readonly PlayerGame[])[];
};

export type Tournament = {
  /** `EventRounds` where a game carries it, and never fewer than the highest round seen. */
  rounds: number;
  /** How many games were read, and how many of them are unfinished. */
  games: number;
  unfinished: number;
  /** The order the standings were ranked by, after the points. */
  tieBreaks: readonly TieBreak[];
  /** Every player, ranked. */
  standings: readonly TournamentStanding[];
};

/** A `Result` tag as what it was worth to White and to Black — anything else is `unfinished` for both. */
const SCORES: Readonly<Record<string, readonly [GameOutcome, GameOutcome]>> = {
  "1-0": ["win", "loss"],
  "0-1": ["loss", "win"],
  "1/2-1/2": ["draw", "draw"],
};

/** What a game's `Result` tag was worth to White and to Black (CTA-128: the other formats' helpers read games the same way). */
export const outcomesOf = (result: string | undefined): readonly [GameOutcome, GameOutcome] =>
  SCORES[result?.trim() ?? ""] ?? ["unfinished", "unfinished"];

/** An outcome's points: a win 1, a draw ½, a loss or an unfinished game nothing. */
export const POINTS: Readonly<Record<GameOutcome, number>> = { win: 1, draw: 0.5, loss: 0, unfinished: 0 };

/** A tag's leading positive integer — `Round "3.12"` is round 3; anything else `undefined`. */
export const positiveInteger = (value: string | undefined): number | undefined => {
  const number = value === undefined ? Number.NaN : Number.parseInt(value, 10);
  return Number.isInteger(number) && number > 0 ? number : undefined;
};

/**
 * A `Round` tag's two parts (CTA-128): `"3.12"` is `[3, 12]` — a Swiss's
 * round and board, a knockout's round and the game of its match, a team
 * event's round and its running board or leg. Either is `undefined` where the
 * tag names none.
 */
export const roundPartsOf = (round: string | undefined): readonly [number | undefined, number | undefined] => {
  const [major, minor] = (round ?? "").trim().split(".");
  return [positiveInteger(major), positiveInteger(minor)];
};

/** One side of a game as a player — `undefined` where the tag names no one. */
export const playerOf = (headers: GameHeaders, side: "White" | "Black"): TournamentPlayer | undefined => {
  const name = gameTag(headers, side);
  if (name === undefined) return undefined;
  const fideId = gameTag(headers, `${side}FideId`);
  return {
    // A FideId of "0" is how some files say "none".
    id: fideId === undefined || fideId === "0" ? name : fideId,
    name,
    title: gameTag(headers, `${side}Title`),
    rating: positiveInteger(gameTag(headers, `${side}Elo`)),
    federation: gameTag(headers, `${side}Country`),
  };
};

type Entry = { player: TournamentPlayer; games: PlayerGame[] };

/**
 * The tournament the games make. `tieBreaks` is the order the standings are
 * ranked by after the points ({@link SWISS_TIE_BREAKS} by default,
 * {@link ROUND_ROBIN_TIE_BREAKS} for a crosstable); after them, in both, the
 * higher rating, then the name.
 *
 * A game that names no White or no Black, or the same player twice, is left
 * out: it has no place in a table of players.
 */
export const tournamentOf = (
  games: readonly GameHeaders[],
  tieBreaks: readonly TieBreak[] = SWISS_TIE_BREAKS,
): Tournament => {
  const entries = new Map<string, Entry>();
  let eventRounds = 0;
  let lastRound = 0;
  let read = 0;
  let unfinished = 0;

  const entryOf = (seen: TournamentPlayer): Entry => {
    const entry = entries.get(seen.id);
    if (entry === undefined) {
      const created = { player: seen, games: [] };
      entries.set(seen.id, created);
      return created;
    }
    // A tag one game leaves out is taken from the first game that has it.
    entry.player = {
      ...entry.player,
      title: entry.player.title ?? seen.title,
      rating: entry.player.rating ?? seen.rating,
      federation: entry.player.federation ?? seen.federation,
    };
    return entry;
  };

  games.forEach((headers, game) => {
    const white = playerOf(headers, "White");
    const black = playerOf(headers, "Black");
    if (white === undefined || black === undefined || white.id === black.id) return;

    const round = positiveInteger(gameTag(headers, "Round"));
    const [whiteOutcome, blackOutcome] = outcomesOf(headers.Result);
    read += 1;
    if (whiteOutcome === "unfinished") unfinished += 1;
    lastRound = Math.max(lastRound, round ?? 0);
    eventRounds = Math.max(eventRounds, positiveInteger(gameTag(headers, "EventRounds")) ?? 0);

    entryOf(white).games.push({ game, round, color: "white", opponent: black.id, outcome: whiteOutcome });
    entryOf(black).games.push({ game, round, color: "black", opponent: white.id, outcome: blackOutcome });
  });

  const rounds = Math.max(eventRounds, lastRound);
  const points = new Map<string, number>();
  for (const [id, entry] of entries) points.set(id, entry.games.reduce((sum, game) => sum + POINTS[game.outcome], 0));
  const pointsOf = (id: string) => points.get(id) ?? 0;

  const unranked = [...entries.values()].map(({ player, games: played }) => {
    // Round order, a game with no round last; the file's order within a round.
    const ordered = [...played].sort((a, b) => (a.round ?? Infinity) - (b.round ?? Infinity) || a.game - b.game);
    const finished = ordered.filter((game) => game.outcome !== "unfinished");
    return {
      player,
      points: pointsOf(player.id),
      tieBreaks: {
        buchholz: finished.reduce((sum, game) => sum + pointsOf(game.opponent), 0),
        sonnebornBerger: finished.reduce((sum, game) => sum + POINTS[game.outcome] * pointsOf(game.opponent), 0),
      },
      games: ordered,
      rounds: Array.from({ length: rounds }, (_, index) => ordered.filter((game) => game.round === index + 1)),
    };
  });

  unranked.sort(
    (a, b) =>
      b.points - a.points ||
      tieBreaks.reduce((order, tieBreak) => order || b.tieBreaks[tieBreak] - a.tieBreaks[tieBreak], 0) ||
      (b.player.rating ?? 0) - (a.player.rating ?? 0) ||
      a.player.name.localeCompare(b.player.name) ||
      a.player.id.localeCompare(b.player.id),
  );

  return {
    rounds,
    games: read,
    unfinished,
    tieBreaks,
    standings: unranked.map((standing, index) => ({ rank: index + 1, ...standing })),
  };
};

/**
 * Every game between a player and one opponent, in round order — a
 * crosstable's cell: two in a double round robin, one in a single, none
 * where the file holds no game between them.
 */
export const gamesBetween = (standing: TournamentStanding, opponent: string): readonly PlayerGame[] =>
  standing.games.filter((game) => game.opponent === opponent);
