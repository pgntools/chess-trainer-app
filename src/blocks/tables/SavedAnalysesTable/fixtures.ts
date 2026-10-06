import type { SavedAnalysisRow } from "../../../lib/savedAnalysisRows";

/*
  A folder's sample analyses (CTA-144), typed with `src/lib/`'s own row, so a
  change to the row breaks them at compile time. Imported only by the block's
  gallery and its test.
*/

const row = (id: string, fields: Partial<SavedAnalysisRow>): SavedAnalysisRow => ({
  id,
  name: "",
  description: "",
  moves: 0,
  updated: "2026-09-01T10:00:00.000Z",
  ...fields,
});

/** One of every kind of row: an imported game, a board's own analysis, a long opening, one that will not read. */
export const ANALYSIS_ROWS: readonly SavedAnalysisRow[] = [
  row("tal", {
    name: "Tal, Mikhail – Botvinnik, Mikhail",
    white: "Tal, Mikhail",
    whiteElo: 2700,
    black: "Botvinnik, Mikhail",
    blackElo: 2720,
    result: "1-0",
    date: "1960.03.15",
    event: "World Championship",
    round: "6",
    eco: "E69",
    opening: "King's Indian, fianchetto, classical main line",
    moves: 41,
    updated: "2026-09-05T10:00:00.000Z",
  }),
  row("prep", {
    name: "My Berlin prep",
    description: "The 4.O-O line, with the endgame after 9...Ke8 worked through to move 30",
    eco: "C67",
    opening: "Ruy Lopez, Berlin Defence",
    date: "2026.08.30",
    moves: 18,
    updated: "2026-09-04T10:00:00.000Z",
  }),
  row("board", { moves: 7, date: "2026.09.03", updated: "2026-09-03T10:00:00.000Z" }),
  row("broken", { name: "Broken record", unreadable: true, updated: "2026-09-02T10:00:00.000Z" }),
];

/** Hebrew names and events, for the RTL pass. */
export const HEBREW_ROWS: readonly SavedAnalysisRow[] = [
  row("h1", { name: "טל – בוטבינניק", white: "טל, מיכאל", black: "בוטבינניק, מיכאל", result: "1-0", date: "1960.03.15", event: "אליפות העולם", moves: 41 }),
  row("h2", { name: "ההכנה שלי", description: "הקו הראשי עם 4.O-O", eco: "C67", opening: "Ruy Lopez, Berlin Defence", moves: 18 }),
];

/** `count` analyses — a Library batch is a folder of thousands. */
export const manyRows = (count: number): SavedAnalysisRow[] =>
  Array.from({ length: count }, (_, index) =>
    row(`r${index}`, {
      name: `White ${index % 97} – Black ${index % 89}`,
      white: `White ${index % 97}`,
      black: `Black ${index % 89}`,
      result: ["1-0", "0-1", "1/2-1/2"][index % 3],
      date: `${1950 + (index % 70)}.01.01`,
      moves: 20 + (index % 60),
      updated: new Date(Date.UTC(2026, 0, 1) - index * 60_000).toISOString(),
    }),
  );
