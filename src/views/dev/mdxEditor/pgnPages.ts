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
