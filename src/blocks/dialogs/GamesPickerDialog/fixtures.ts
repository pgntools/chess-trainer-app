/*
  The games picker's sample games (CTA-208): rows as `collectionRowOf` makes
  them from a file's games. Imported only by the block's gallery and its test.
*/
import type { CollectionRow } from "../../../lib/libraryCollections";

const PLAYERS = ["Carlsen", "Caruana", "Ding", "Nepomniachtchi", "Nakamura", "Firouzja", "Gukesh", "Praggnanandhaa"] as const;
const RESULTS = ["1-0", "0-1", "1/2-1/2"] as const;

/** 120 games of a made-up Smith-Morra file — three pages at 50 a page. */
export const GAMES: readonly CollectionRow[] = Array.from({ length: 120 }, (_, index) => ({
  number: index + 1,
  white: PLAYERS[index % PLAYERS.length],
  whiteElo: 2700 + ((index * 7) % 90),
  black: PLAYERS[(index + 3) % PLAYERS.length],
  blackElo: 2690 + ((index * 11) % 95),
  result: RESULTS[index % RESULTS.length],
  date: `20${String(10 + (index % 15))}.0${1 + (index % 9)}.1${index % 10}`,
  round: String(1 + (index % 9)),
  event: index % 2 === 0 ? "Smith-Morra Open" : "Morra Gambit Masters",
  eco: "B21",
  opening: "Sicilian Defense, Smith-Morra Gambit",
  moves: 20 + (index % 40),
}));
