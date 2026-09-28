import type { CollectionRow } from "../../../lib/libraryCollections";
import type { ExampleGamesTableLabels } from "./ExampleGamesTable";

/*
  The placeholder block's sample data (CTA-110), typed with `src/lib/`'s own
  row, so a change to the row type breaks the fixtures at compile time.
  Imported only by the block's gallery and its test — never by the block or a
  screen.
*/

/** English words for every label, as a screen's `t(…)` would give them. */
export const EXAMPLE_LABELS: ExampleGamesTableLabels = {
  columns: { number: "#", white: "White", black: "Black", result: "Result", date: "Date", opening: "Opening", moves: "Moves" },
  table: "Games",
  empty: "No games yet",
  noMatch: "No game matches the filters",
  loading: "Reading the games…",
  rowsPerPage: "Rows per page",
  unreadable: "This game will not parse",
};

/** A handful of games, one of every kind of row: missing tags, an unreadable game, a partial date. */
export const EXAMPLE_ROWS: readonly CollectionRow[] = [
  { number: 1, white: "Tal, Mikhail", black: "Fischer, Robert James", whiteElo: 2700, result: "1-0", date: "1960-05-12", eco: "B90", opening: "Sicilian Defense, Najdorf Variation", moves: 41 },
  { number: 2, white: "Capablanca, José Raúl", black: "Alekhine, Alexander", result: "0-1", date: "1927.11", eco: "D51", moves: 82 },
  { number: 3, white: "Petrosian, Tigran", black: "Spassky, Boris", result: "1/2-1/2", moves: 27 },
  { number: 4, white: "Smyslov, Vasily", black: "Botvinnik, Mikhail", result: "*", date: "1961-03-20", moves: 0, unreadable: true },
  { number: 5, result: "*", moves: 12 },
];

/** Names long enough to scroll the table sideways, and an opening long enough to wrap. */
export const LONG_ROWS: readonly CollectionRow[] = [
  {
    number: 1,
    white: "Capablanca y Graupera, José Raúl — World Champion 1921–1927, Havana",
    black: "Alekhine, Alexander Alexandrovich — World Champion 1927–1935 and 1937–1946",
    result: "1/2-1/2",
    date: "1927-11-29",
    eco: "D51",
    opening: "Queen's Gambit Declined, Cambridge Springs Defense, Capablanca Variation, with a very long sub-variation name",
    moves: 82,
  },
];

/** Hebrew names, for the gallery's RTL switch. */
export const HEBREW_ROWS: readonly CollectionRow[] = [
  { number: 1, white: "טל, מיכאל", black: "פישר, בובי", result: "1-0", date: "1960-05-12", eco: "B90", opening: "הגנה סיציליאנית", moves: 41 },
  { number: 2, white: "גלפנד, בוריס", black: "אנאנד, ויסואנתן", result: "1/2-1/2", date: "2012-05-11", eco: "D45", moves: 24 },
];

const PLAYERS = ["Tal", "Fischer", "Capablanca", "Alekhine", "Petrosian", "Spassky", "Smyslov", "Botvinnik", "Carlsen", "Kasparov"];
const RESULTS = ["1-0", "0-1", "1/2-1/2", "*"];

/** `count` generated games, deterministic — the 10,000-row demo's and test's. */
export const manyRows = (count: number): CollectionRow[] =>
  Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    white: `${PLAYERS[index % PLAYERS.length]}, ${index}`,
    black: `${PLAYERS[(index * 7 + 3) % PLAYERS.length]}, ${index}`,
    result: RESULTS[index % RESULTS.length],
    date: `${1900 + (index % 120)}-${String((index % 12) + 1).padStart(2, "0")}-${String((index % 28) + 1).padStart(2, "0")}`,
    moves: 20 + ((index * 13) % 80),
  }));
