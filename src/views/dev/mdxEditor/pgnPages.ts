import { parsePgnGames, splitPgnGames } from "../../../lib/pgn";

/**
 * **A big PGN, seen a page at a time** (CTA-137) — the Add PGN dialog shows
 * an uploaded file this size only in part, enough to see how it is written,
 * and adds it whole. A page is a run of whole games.
 */

/** Above this many characters an uploaded PGN is shown cut. */
export const HUGE_PGN_CHARS = 100_000;

/** How many games make a page. */
export const GAMES_PER_PAGE = 10;

/** The PGN's games, each its tags and its moves — split where a blank line comes before a tag. */
export const pgnGamesOf = (text: string): string[] =>
  text
    .trim()
    .split(/\r?\n[ \t]*\r?\n(?=\[)/)
    .filter((game) => game.trim() !== "");

/** The PGN as pages of `GAMES_PER_PAGE` games, each page its games' text. */
export const pgnPagesOf = (text: string): { pages: string[]; games: number } => {
  const games = pgnGamesOf(text);
  const pages: string[] = [];
  for (let start = 0; start < games.length; start += GAMES_PER_PAGE) pages.push(games.slice(start, start + GAMES_PER_PAGE).join("\n\n"));
  return { pages, games: games.length };
};

/**
 * The first `plies` moves of a PGN's first game as one line of SAN —
 * `1. e4 e5 2. Nf3 Nc6` — and where a board opens at their end (`"2..."`):
 * a position by its moves alone, with no game behind it (the Add PGN
 * dialog's Position examples). `undefined` for a PGN that will not parse.
 */
export const movesLineOf = (text: string, plies = 8): { line: string; start: string } | undefined => {
  try {
    const first = splitPgnGames(text)[0];
    if (first === undefined) return undefined;
    const moves = (parsePgnGames(first)[0]?.moves ?? []).slice(0, plies);
    if (moves.length === 0) return undefined;
    const line = moves.map((move, index) => (index % 2 === 0 ? `${index / 2 + 1}. ${move.san}` : move.san)).join(" ");
    return { line, start: moves.length % 2 === 1 ? `${(moves.length + 1) / 2}` : `${moves.length / 2}...` };
  } catch {
    return undefined;
  }
};
