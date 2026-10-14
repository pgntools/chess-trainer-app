import { gameTag, type GameHeaders } from "./gameModel";
import { mainlinePlies } from "./libraryCollections";
import { readPgnParts } from "./pgn";
import { POINTS, positiveInteger, tournamentOf, type PlayerGame, type TournamentPlayer } from "./tournament";

/**
 * **An arena, read from its games' tags** (CTA-204) — Lichess's arena: no
 * rounds, every player paired again as soon as their game ends, so the
 * standings are each player's **score sheet** — every game in the order it
 * was played — and its total. What the Library's tournament view draws for
 * a collection marked as an Arena.
 *
 * Two scorings, one reader:
 *
 * - **Lichess arena points** — each player's games replayed in the order
 *   they began (`UTCDate` + `UTCTime`; a Lichess export lists them newest
 *   first): a win 2, a draw 1, a loss 0; after **two wins in a row** the
 *   player is **on fire** — a win 4, a draw 2 — until a game that is not a
 *   win; a **berserked** win (`WhiteBerserk` / `BlackBerserk "true"`) one
 *   more. Lichess's own edge cases, as far as a PGN tells them: a draw in
 *   fewer than 10 moves (20 plies) scores nothing; berserk earns its point
 *   only in a game of 7 moves (14 plies) or more; and in a **draw streak** —
 *   a draw after a draw, with no win between (a loss does not end one) —
 *   only a draw of 30 moves (60 plies) or more scores. Lengths come from the
 *   caller (`plies`, counted off the movetext — {@link pliesOfGames}); a
 *   game whose length is not given counts as long enough for every rule.
 * - **Game points** — 1, ½, 0, as the Swiss standings count them.
 *
 * Ranked by points, then **performance** — Lichess's tie-break, worked out
 * its way: over the finished games, the opponent's rating in each (its
 * `WhiteElo` / `BlackElo`) plus 500 for a win and less 500 for a loss,
 * averaged (within a point or two of Lichess's own figure, which reads the
 * ratings it held) — then the rating, then the name, so the order is total.
 *
 * **What a PGN cannot tell**, and so is not applied: a player withdrawn or
 * paused (Lichess still lists their score), a game Lichess did not count
 * (aborted games are not in its export), the tournament's own switches (an
 * arena with streaks or berserk turned off — scored here as one with both
 * on), and the version of the rules an old tournament was played under (the
 * draw-streak rule came later).
 *
 * Pure, and it reads **tags only** (and the lengths it is given) — no move
 * is replayed: a 4,000-game arena reads in milliseconds.
 */

/** How a table scores an arena: Lichess's arena points, or plain game points. */
export const ARENA_SCORINGS = ["lichess", "game"] as const;
export type ArenaScoring = (typeof ARENA_SCORINGS)[number];

/** Whether a word (a URL's `?scoring=`) is a scoring — anything else is ignored. */
export const isArenaScoring = (value: string | null | undefined): value is ArenaScoring => (ARENA_SCORINGS as readonly (string | null | undefined)[]).includes(value);

/** A draw in fewer plies than this scores nothing (Lichess: "within the first 10 moves"). */
export const QUICK_DRAW_PLIES = 20;
/** A berserked win earns its extra point in a game of at least this many plies (Lichess: 7 moves). */
export const BERSERK_PLIES = 14;
/** In a draw streak, a draw of at least this many plies still scores (Lichess: "more than 30 moves"). */
export const LONG_DRAW_PLIES = 60;

/** One game on a player's score sheet. */
export type ArenaGame = PlayerGame & {
  /** What it scored under the arena's scoring. */
  score: number;
  /** Lichess points: played on fire — the player's two games before it were wins — so a win 4, a draw 2. */
  fire: boolean;
  /** Lichess points: the player went berserk. Whether it earned its point is in {@link berserkScored}. */
  berserk: boolean;
  /** Lichess points: a berserked win long enough for the extra point. */
  berserkScored: boolean;
  /** Lichess points: why a draw scored nothing — too early, or in a draw streak. */
  voided?: "quickDraw" | "drawStreak";
  /** When the game began (`UTCDate` + `UTCTime`), in milliseconds; absent where the tags do not say. */
  startedAt?: number;
};

export type ArenaStanding = {
  /** 1-based, no two alike. */
  rank: number;
  player: TournamentPlayer;
  points: number;
  /** Every game of the player's in the order played — the score sheet. */
  games: readonly ArenaGame[];
  wins: number;
  draws: number;
  losses: number;
  /** Lichess's way: the opponents' ratings in the finished games, ±500 a win or a loss, averaged; `undefined` with no finished game against a rated opponent. */
  performance?: number;
  /** Lichess points: the last two games were wins — the next would be on fire. */
  onFire: boolean;
};

export type Arena = {
  scoring: ArenaScoring;
  /** How many games were read, and how many of them are unfinished. */
  games: number;
  unfinished: number;
  standings: readonly ArenaStanding[];
};

export type ArenaOptions = {
  scoring: ArenaScoring;
  /** Each game's length in plies, by its index in the headers — absent or `undefined` where not known. */
  plies?: readonly (number | undefined)[];
};

/** `UTCDate "2026.06.27"` and `UTCTime "20:59:17"` as milliseconds — `undefined` unless both read. */
export const startOf = (headers: GameHeaders): number | undefined => {
  const date = /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(gameTag(headers, "UTCDate") ?? "");
  const time = /^(\d{2}):(\d{2}):(\d{2})$/.exec(gameTag(headers, "UTCTime") ?? "");
  if (date === null || time === null) return undefined;
  const [, year, month, day] = date.map(Number);
  const [, hours, minutes, seconds] = time.map(Number);
  const at = Date.UTC(year, month - 1, day, hours, minutes, seconds);
  return Number.isNaN(at) ? undefined : at;
};

const LICHESS_SITE = /^https?:\/\/(?:www\.)?lichess\.org\//i;

/**
 * Whether the games are a **Lichess export** — every one played on
 * lichess.org (`Site`) and timed (`UTCDate`, `UTCTime`): what makes Lichess
 * points the table's first scoring.
 */
export const isLichessExport = (headers: readonly GameHeaders[]): boolean =>
  headers.length > 0 && headers.every((game) => LICHESS_SITE.test(gameTag(game, "Site") ?? "") && startOf(game) !== undefined);

/** The scoring a table opens with: Lichess points for a Lichess export, game points for anything else. */
export const defaultArenaScoring = (headers: readonly GameHeaders[]): ArenaScoring => (isLichessExport(headers) ? "lichess" : "game");

/** Each game's length in plies, counted off its movetext as text (the Library's own count) — no move replayed. */
export const pliesOfGames = (games: readonly string[]): number[] => games.map((pgn) => mainlinePlies(readPgnParts(pgn).movetext));

/** The order a player's games were played: by when each began, a game with no time after the timed ones, then the file's order. */
const byStart = (a: ArenaGame, b: ArenaGame): number =>
  (a.startedAt ?? Infinity) - (b.startedAt ?? Infinity) || a.game - b.game;

/** One player's sheet scored Lichess's way — the games in the order played; `pliesOf` a game's length, where known. */
const lichessSheet = (games: readonly ArenaGame[], berserkOf: (game: ArenaGame) => boolean, pliesOf: (game: number) => number | undefined) => {
  let winsInARow = 0;
  // In a draw streak: the last game that was not a loss (or unfinished) was a draw — only a win ends one.
  let drawStreak = false;
  const sheet = games.map((game): ArenaGame => {
    const fire = winsInARow >= 2;
    const plies = pliesOf(game.game);
    const atLeast = (count: number) => plies === undefined || plies >= count;
    const berserk = berserkOf(game);
    let scored: ArenaGame;
    if (game.outcome === "win") {
      const berserkScored = berserk && atLeast(BERSERK_PLIES);
      scored = { ...game, score: (fire ? 4 : 2) + (berserkScored ? 1 : 0), fire, berserk, berserkScored };
      winsInARow += 1;
      drawStreak = false;
    } else if (game.outcome === "draw") {
      const voided = !atLeast(QUICK_DRAW_PLIES) ? "quickDraw" : !fire && drawStreak && !atLeast(LONG_DRAW_PLIES) ? "drawStreak" : undefined;
      scored = { ...game, score: voided !== undefined ? 0 : fire ? 2 : 1, fire, berserk, berserkScored: false, ...(voided !== undefined && { voided }) };
      winsInARow = 0;
      drawStreak = true;
    } else {
      scored = { ...game, score: 0, fire, berserk, berserkScored: false };
      winsInARow = 0;
    }
    return scored;
  });
  return { sheet, onFire: winsInARow >= 2 };
};

/** What a finished game adds to a performance: the opponent's rating then, ±500 a win or a loss. */
const PERFORMANCE_STEP: Readonly<Record<PlayerGame["outcome"], number>> = { win: 500, draw: 0, loss: -500, unfinished: 0 };

/** Lichess's performance over a player's games — `undefined` with no finished game against a rated opponent. */
const performanceOf = (games: readonly PlayerGame[], opponentRatingOf: (game: PlayerGame) => number | undefined): number | undefined => {
  let sum = 0;
  let count = 0;
  for (const game of games) {
    const rating = opponentRatingOf(game);
    if (game.outcome === "unfinished" || rating === undefined) continue;
    sum += rating + PERFORMANCE_STEP[game.outcome];
    count += 1;
  }
  return count === 0 ? undefined : Math.round(sum / count);
};

/** Higher first, a missing value last. */
const descending = (a: number | undefined, b: number | undefined): number => (b ?? -Infinity) - (a ?? -Infinity) || 0;

/** The arena the games make, scored as asked. A game naming no White or no Black, or the same player twice, is left out. */
export const arenaOf = (headers: readonly GameHeaders[], { scoring, plies }: ArenaOptions): Arena => {
  const tournament = tournamentOf(headers);
  const starts = headers.map(startOf);
  const berserkOf = (game: ArenaGame) => gameTag(headers[game.game], game.color === "white" ? "WhiteBerserk" : "BlackBerserk")?.toLowerCase() === "true";
  const pliesOf = (game: number) => plies?.[game];
  const opponentRatingOf = (game: PlayerGame) => positiveInteger(gameTag(headers[game.game], game.color === "white" ? "BlackElo" : "WhiteElo"));

  const unranked = tournament.standings.map(({ player, games }) => {
    const ordered = games
      .map((game): ArenaGame => {
        const startedAt = starts[game.game];
        return { ...game, score: POINTS[game.outcome], fire: false, berserk: false, berserkScored: false, ...(startedAt !== undefined && { startedAt }) };
      })
      .sort(byStart);
    const { sheet, onFire } = scoring === "lichess" ? lichessSheet(ordered, berserkOf, pliesOf) : { sheet: ordered, onFire: false };
    const count = (outcome: PlayerGame["outcome"]) => games.filter((game) => game.outcome === outcome).length;
    const performance = performanceOf(games, opponentRatingOf);
    return {
      player,
      points: sheet.reduce((sum, game) => sum + game.score, 0),
      games: sheet,
      wins: count("win"),
      draws: count("draw"),
      losses: count("loss"),
      ...(performance !== undefined && { performance }),
      onFire,
    };
  });

  unranked.sort(
    (a, b) =>
      b.points - a.points ||
      descending(a.performance, b.performance) ||
      (b.player.rating ?? 0) - (a.player.rating ?? 0) ||
      a.player.name.localeCompare(b.player.name) ||
      a.player.id.localeCompare(b.player.id),
  );

  return {
    scoring,
    games: tournament.games,
    unfinished: tournament.unfinished,
    standings: unranked.map((standing, index) => ({ rank: index + 1, ...standing })),
  };
};
