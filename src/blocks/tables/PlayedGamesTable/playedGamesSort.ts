import type { SortDirection } from "../../../design-system/components/tables";
import { PLAYED_GAME_COLUMNS, type PlayedGameColumn } from "../../../lib/playedGames";

/** The columns whose values are numbers or dates — opened high first. */
const HIGH_FIRST: ReadonlySet<PlayedGameColumn> = new Set(["date", "whiteElo", "blackElo", "moves"]);

/** The Lobby's columns, in order — the whitelist `?sort=` is read against. */
export const PLAYED_GAMES_COLUMNS: readonly PlayedGameColumn[] = PLAYED_GAME_COLUMNS;

/** The sort the Lobby opens with: the day each game was begun, newest first. */
export const PLAYED_GAMES_DEFAULT_SORT: PlayedGameColumn = "date";

/**
 * **Which way a Lobby column opens** (CTA-100, CTA-109) — the date and the
 * numbers high first, the words A to Z. `useTableUrlState`'s
 * `firstDirection`, and the table's own.
 */
export const playedGamesFirstDirection = (column: PlayedGameColumn): SortDirection =>
  HIGH_FIRST.has(column) ? "desc" : "asc";
