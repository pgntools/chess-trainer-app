import type { PlayedGameRow } from "../../../lib/playedGames";

/*
  The Lobby table's sample games (CTA-109), typed with `src/lib/`'s own row,
  so a change to the row breaks them at compile time. Their names are what
  the screen localizes the summary to ("Human", "Stockfish level N").
  Imported only by the block's gallery and its test.
*/

const row = (id: string, fields: Partial<PlayedGameRow>): PlayedGameRow => ({
  id,
  white: "Human",
  whiteElo: undefined,
  black: "Stockfish level 5",
  blackElo: 1500,
  result: "*",
  opening: undefined,
  moves: 0,
  variations: 0,
  masked: false,
  savedAt: "2026-09-01T10:00:00.000Z",
  readable: true,
  ...fields,
});

/** One of every kind of row: on, won, resigned, side lines, masked, from the book, and one that will not parse. */
export const PLAYED_ROWS: readonly PlayedGameRow[] = [
  row("live", { moves: 12, opening: "Italian Game", savedAt: "2026-09-20T18:30:00.000Z" }),
  row("mated", { white: "Stockfish level 3", whiteElo: 1350, black: "Human", blackElo: undefined, result: "0-1", moves: 4, opening: "Bird Opening", savedAt: "2026-09-18T09:15:00.000Z" }),
  row("lines", { moves: 31, variations: 3, opening: "Sicilian Defense", result: "1/2-1/2", savedAt: "2026-09-12T20:00:00.000Z" }),
  row("masked", { masked: true, moves: 22, savedAt: "2026-09-10T08:00:00.000Z" }),
  row("resigned", { black: "Stockfish level 20", blackElo: 2850, result: "0-1", moves: 17, opening: "Queen's Gambit Declined", savedAt: "2026-09-05T12:00:00.000Z" }),
  row("bad", { readable: false, savedAt: "2026-09-02T12:00:00.000Z" }),
];

/** An opening name long enough to wrap, beside names at their longest. */
export const LONG_ROWS: readonly PlayedGameRow[] = [
  row("long", {
    black: "Stockfish level 20",
    blackElo: 2850,
    moves: 84,
    variations: 12,
    opening: "Queen's Gambit Declined, Semi-Tarrasch Defense, Pillsbury Variation, with a very long sub-variation name",
    savedAt: "2026-09-21T10:00:00.000Z",
  }),
  PLAYED_ROWS[0],
];

/** The names as the Lobby shows them under Hebrew — for the gallery's RTL switch. */
export const HEBREW_ROWS: readonly PlayedGameRow[] = [
  row("h1", { white: "אדם", black: "Stockfish רמה 5", moves: 12, opening: "הגנה סיציליאנית", savedAt: "2026-09-20T18:30:00.000Z" }),
  row("h2", { white: "Stockfish רמה 3", whiteElo: 1350, black: "אדם", result: "1-0", moves: 30, masked: true, savedAt: "2026-09-19T18:30:00.000Z" }),
];

const OPENINGS = ["Italian Game", "Sicilian Defense", undefined, "French Defense", "Caro-Kann Defense", "English Opening"];
const RESULTS = ["*", "1-0", "0-1", "1/2-1/2"];

/** `count` generated games, deterministic — the 10,000-row demo's and test's. */
export const manyRows = (count: number): PlayedGameRow[] =>
  Array.from({ length: count }, (_, index) =>
    row(`g${index}`, {
      white: index % 2 === 0 ? "Human" : `Stockfish level ${index % 21}`,
      whiteElo: index % 2 === 0 ? undefined : 1100 + (index % 21) * 85,
      black: index % 2 === 0 ? `Stockfish level ${index % 21}` : "Human",
      blackElo: index % 2 === 0 ? 1100 + (index % 21) * 85 : undefined,
      result: RESULTS[index % RESULTS.length],
      opening: OPENINGS[index % OPENINGS.length],
      moves: 10 + ((index * 13) % 70),
      variations: index % 7 === 0 ? index % 4 : 0,
      masked: index % 9 === 0,
      savedAt: new Date(Date.parse("2026-01-01T09:00:00.000Z") + index * 3_600_000).toISOString(),
      readable: index % 97 !== 5,
    }),
  );
