import { gameTag, type GameHeaders } from "../../lib/gameModel";
import { readPgnTags, splitPgnGames } from "../../lib/pgn";
import { roundPartsOf } from "../../lib/tournament";
import { BIG_PGN_BYTES, pgnBytesOf } from "./pgnPages";
import { guessTournamentKind, type TournamentGuess } from "./tournamentKind";

/**
 * **What a PGN file holds, at a glance** (CTA-140) — what the Components
 * gallery shows of a heavy upload before asking where it goes: its games
 * and size, its events, dates, players, teams and rounds, its results,
 * how many games carry comments or side lines, and the kind of tournament
 * it looks like (`tournamentKind.ts`). From the tags and a glance at the
 * movetext alone — no game is played through.
 */

export type PgnStats = {
  games: number;
  bytes: number;
  /** The events named, most games first. */
  events: readonly { name: string; games: number }[];
  /** The first and last dates the games carry (`2026.09.11`) — `undefined` where none does. */
  dates?: { first: string; last: string };
  players: number;
  /** Teams named in `WhiteTeam` / `BlackTeam` — 0 for none. */
  teams: number;
  /** The highest round — `undefined` where no game numbers one. */
  rounds?: number;
  results: Readonly<Record<"1-0" | "0-1" | "1/2-1/2" | "*", number>>;
  /** Games with a `{ comment }` in their moves. */
  commented: number;
  /** Games with a `( side line )` in their moves. */
  withSideLines: number;
  guess?: TournamentGuess;
};

/** A game's moves — what follows its tag pairs. */
const movetextOf = (game: string): string => game.replace(/^(?:\s*\[[^\]\n]*\])*\s*/, "");

/** A `Date` tag that says something — `2026.09.??` kept, `????.??.??` not. */
const dateOf = (headers: GameHeaders): string | undefined => {
  const date = gameTag(headers, "Date");
  return date === undefined || date.startsWith("?") ? undefined : date;
};

/** The PGN's stats — `games`, its games already split, where the caller has them. */
export const pgnStatsOf = (text: string, games: readonly string[] = splitPgnGames(text)): PgnStats => {
  const headers = games.map(readPgnTags);
  const events = new Map<string, number>();
  const players = new Set<string>();
  const teams = new Set<string>();
  const results = { "1-0": 0, "0-1": 0, "1/2-1/2": 0, "*": 0 };
  let first: string | undefined;
  let last: string | undefined;
  let rounds: number | undefined;
  headers.forEach((tags) => {
    const event = gameTag(tags, "Event");
    if (event !== undefined) events.set(event, (events.get(event) ?? 0) + 1);
    for (const side of ["White", "Black"] as const) {
      const player = gameTag(tags, side);
      if (player !== undefined) players.add(player);
      const team = gameTag(tags, `${side}Team`);
      if (team !== undefined) teams.add(team);
    }
    const result = tags.Result?.trim();
    if (result === "1-0" || result === "0-1" || result === "1/2-1/2" || result === "*") results[result] += 1;
    const date = dateOf(tags);
    if (date !== undefined) {
      if (first === undefined || date < first) first = date;
      if (last === undefined || date > last) last = date;
    }
    const [round] = roundPartsOf(gameTag(tags, "Round"));
    if (round !== undefined && (rounds === undefined || round > rounds)) rounds = round;
  });
  const movetexts = games.map(movetextOf);
  return {
    games: games.length,
    bytes: pgnBytesOf(text),
    events: [...events].map(([name, count]) => ({ name, games: count })).sort((a, b) => b.games - a.games),
    dates: first === undefined || last === undefined ? undefined : { first, last },
    players: players.size,
    teams: teams.size,
    rounds,
    results,
    commented: movetexts.filter((moves) => moves.includes("{")).length,
    withSideLines: movetexts.filter((moves) => /\(\s*\d*\.*\s*[A-Za-z]/.test(moves.replace(/\{[^}]*\}/g, ""))).length,
    guess: guessTournamentKind(headers),
  };
};

/** Whether a PGN is heavy — more than `heavyGames` games, or over `BIG_PGN_BYTES` — from its count and size, before its stats are read. */
export const isHeavyPgn = (games: number, bytes: number, heavyGames: number): boolean => games > heavyGames || bytes > BIG_PGN_BYTES;
