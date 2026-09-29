import type { CollectionRow } from "../../../lib/libraryCollections";

/*
  A collection's sample games (CTA-113), typed with `src/lib/`'s own row, so
  a change to the row breaks them at compile time. Imported only by the
  block's gallery and its test.
*/

const row = (number: number, fields: Partial<CollectionRow>): CollectionRow => ({
  number,
  result: "*",
  moves: 0,
  ...fields,
});

/** One of every kind of row: full tags, missing tags, a long opening, one that will not read. */
export const COLLECTION_ROWS: readonly CollectionRow[] = [
  row(1, {
    white: "Tal, Mikhail",
    whiteElo: 2700,
    black: "Botvinnik, Mikhail",
    blackElo: 2720,
    result: "1-0",
    date: "1960.03.15",
    round: "1",
    event: "World Championship",
    eco: "E69",
    opening: "King's Indian, fianchetto, classical main line",
    moves: 41,
  }),
  row(2, { white: "Tal, Mikhail", black: "Smyslov, Vasily", result: "1/2-1/2", date: "1959", round: "1.10", event: "Candidates", eco: "B10", opening: "Caro-Kann", moves: 30 }),
  row(3, { white: "Unknown", black: "Tal, Mikhail", result: "0-1", moves: 22 }),
  row(4, { white: "Broken", black: "Game", unreadable: true, moves: 1 }),
];

/** Hebrew names and events, for the RTL pass. */
export const HEBREW_ROWS: readonly CollectionRow[] = [
  row(1, { white: "טל, מיכאל", black: "בוטבינניק, מיכאל", result: "1-0", date: "1960.03.15", event: "אליפות העולם", moves: 41 }),
  row(2, { white: "כהן", black: "לוי", result: "0-1", date: "2026.09.01", event: "אליפות המועדון", moves: 30 }),
];

/** `count` games — the Tal file is 2,636. */
export const manyRows = (count: number): CollectionRow[] =>
  Array.from({ length: count }, (_, index) =>
    row(index + 1, {
      white: `White ${index % 97}`,
      black: `Black ${index % 89}`,
      result: ["1-0", "0-1", "1/2-1/2"][index % 3],
      date: `${1950 + (index % 70)}.01.01`,
      moves: 20 + (index % 60),
    }),
  );
