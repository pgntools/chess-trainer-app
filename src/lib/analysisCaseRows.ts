import { DEFAULT_POSITION } from "chess.js";

import type { AnalysisCase, AnalysisCaseType } from "./analysisProjects";
import { mainline } from "./gameTree";
import { collectionRowOf } from "./libraryCollections";
import { parsePgnTree } from "./pgn";

/**
 * **A Case as a table row** (CTA-186) — a Project's Cases table: its place in
 * the Project's order (`#`, CTA-203), the Case's name and type, the game's own
 * fields read off its tags (the Library's `collectionRowOf`, no `chess.js`),
 * and when it last changed. A **Position**
 * fills none of the game's columns — they are blank, and sort last. Pure.
 */

/** The table's columns, in order — every one a sort header. */
export const CASE_COLUMNS = [
  "order",
  "name",
  "type",
  "white",
  "whiteElo",
  "black",
  "blackElo",
  "result",
  "date",
  "event",
  "round",
  "eco",
  "opening",
  "moves",
  "updated",
] as const;

export type CaseColumn = (typeof CASE_COLUMNS)[number];

/** One Case as the table shows it. A field the game does not carry — or a Position's — is `undefined`. */
export type CaseRow = {
  /** The Case's id — the row's key and its link. */
  id: string;
  record: AnalysisCase;
  /** Its place in the Project's order (CTA-203) — the `#` column. */
  order: number;
  /** The name the reader reads — its own, else derived (`caseDisplayName`, in the reader's language). */
  name: string;
  type: AnalysisCaseType;
  white?: string;
  whiteElo?: number;
  black?: string;
  blackElo?: number;
  /** `1-0`, `0-1`, `1/2-1/2`; an unfinished `*` is none. */
  result?: string;
  date?: string;
  event?: string;
  round?: string;
  eco?: string;
  opening?: string;
  /** Full moves in the analysis' mainline. */
  moves?: number;
  /** ISO 8601. */
  updated: string;
};

/** A Case's row, named as the screen names it. */
export const caseRowOf = (record: AnalysisCase, name: string): CaseRow => {
  const base: CaseRow = { id: record.id, record, order: record.order, name, type: record.type, updated: record.updatedAt };
  if (record.type !== "game") return base;
  const game = collectionRowOf(record.pgn, 1);
  return {
    ...base,
    white: game.white,
    whiteElo: game.whiteElo,
    black: game.black,
    blackElo: game.blackElo,
    result: game.result === "*" ? undefined : game.result,
    date: game.date,
    event: game.event,
    round: game.round,
    eco: game.eco,
    opening: game.opening,
    moves: game.moves,
  };
};

/** Which way a column opens: dates, ratings and lengths high first; the order from 1, words A first. */
export const caseFirstDirection = (column: CaseColumn): "asc" | "desc" =>
  column === "updated" || column === "date" || column === "whiteElo" || column === "blackElo" || column === "moves"
    ? "desc"
    : "asc";

/** What a column sorts by. */
export const caseSortValue = (row: CaseRow, column: CaseColumn): string | number | undefined =>
  column === "updated" ? row.updated : row[column];

/** Rows a column cannot tell apart: the newest changed first. */
export const newestCaseFirst = (a: CaseRow, b: CaseRow): number =>
  a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : 0;

/**
 * **The words box** — a row stays when it holds **every** word typed
 * (case-insensitive, anywhere): its name, its type's words (`typeWords`, the
 * screen's — "Game", "Position" in the reader's language) and a Game's
 * players, Elos, result, date, event, round, ECO and opening. Blank text
 * keeps every row (the same array).
 */
export const filteredCaseRows = (
  rows: readonly CaseRow[],
  text: string,
  typeWords: (type: CaseRow["type"]) => string = (type) => type,
): readonly CaseRow[] => {
  const words = text.toLocaleLowerCase().split(/\s+/).filter((word) => word !== "");
  if (words.length === 0) return rows;
  return rows.filter((row) => {
    const haystack = [
      row.name,
      typeWords(row.type),
      row.white,
      row.whiteElo,
      row.black,
      row.blackElo,
      row.result,
      row.date,
      row.event,
      row.round,
      row.eco,
      row.opening,
    ]
      .filter((part) => part !== undefined && part !== "")
      .join(" ")
      .toLocaleLowerCase();
    return words.every((word) => haystack.includes(word));
  });
};

/** Each Case's line, by id, with the PGN it was read from — re-read only when that changes. */
const lines = new Map<string, { pgn: string; line: readonly string[] | undefined }>();

/**
 * **A Case's opening line** (CTA-214) — a Game's mainline as SAN from the
 * standard start, what a Project's Games tree merges (`openingTreeOf`) and
 * its `?line=` filters by, as the Library's index keeps a game's `line`
 * (`lib/collectionIndex.ts`). `undefined` for a Position, a game from a
 * set-up position, one with no moves and a PGN that does not read.
 *
 * Parsed once per Case and kept while its PGN is the same — an edit on its
 * board, a job merged in — so a Project's screen re-rendering parses nothing.
 */
export const caseLineOf = (record: AnalysisCase): readonly string[] | undefined => {
  if (record.type !== "game") return undefined;
  const kept = lines.get(record.id);
  if (kept !== undefined && kept.pgn === record.pgn) return kept.line;
  let line: readonly string[] | undefined;
  try {
    const tree = parsePgnTree(record.pgn);
    const nodes = mainline(tree);
    if (tree.startFen === DEFAULT_POSITION && nodes.length > 0) line = nodes.map((node) => node.san);
  } catch {
    line = undefined;
  }
  lines.set(record.id, { pgn: record.pgn, line });
  return line;
};

/** A row as the opening tree reads it: its line, and its result (`*` for none). */
export const caseTreeRowOf = (row: CaseRow): { line?: readonly string[]; result: string } => ({
  line: caseLineOf(row.record),
  result: row.result ?? "*",
});

/**
 * **The Games tree's filter** (CTA-214) — the rows whose line begins with
 * `line`, as the Library's `filteredRows` keeps a game: a row with no line is
 * out once one is set. An empty line keeps every row (the same array).
 */
export const caseRowsOnLine = (rows: readonly CaseRow[], line: readonly string[]): readonly CaseRow[] => {
  if (line.length === 0) return rows;
  return rows.filter((row) => {
    const own = caseLineOf(row.record);
    return own !== undefined && own.length >= line.length && line.every((san, index) => own[index] === san);
  });
};
