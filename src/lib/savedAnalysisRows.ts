import { mainlineGame, type GameTree } from "./gameTree";
import { collectionRowOf, compareValues, type SortDirection } from "./libraryCollections";
import { readPgnTags } from "./pgn";
import { SAVED_ANALYSIS_EVENT, SAVED_ANALYSIS_PLAYER, savedAnalysisDerivedName, type SavedAnalysis } from "./savedAnalyses";

/**
 * **A saved analysis as a games-table row** (CTA-144) — the Saved analyses
 * table, where most records are imported games (a PGN's games saved into a
 * folder, CTA-141, or the Library's Analyse) and a folder of them is put in
 * order by any column.
 *
 * - **The game's fields are its PGN tags, read without parsing the tree** —
 *   the Library's `collectionRowOf` (`lib/libraryCollections.ts`), so a row
 *   costs a tag scan and a move count, never `chess.js`, and a folder of
 *   thousands sorts and filters whole.
 * - **The placeholders an analysis is written with read as absent**:
 *   White / Black {@link SAVED_ANALYSIS_PLAYER}, Event
 *   {@link SAVED_ANALYSIS_EVENT}, Result `*` (and the spec's `?` / `-`, which
 *   `gameTag` already drops) — an empty cell, never a player or an event.
 * - **What only a parse can say is added afterwards**
 *   ({@link savedAnalysisRowWith}): that the record will not read, and the
 *   opening the book names over the mainline where the tags name none.
 * - Sorted by {@link sortedAnalysisRows} (the Library's rule: missing values
 *   last either way) and narrowed by {@link filteredAnalysisRows}.
 */

/** The table's columns, left to right — every one a sort header. */
export const SAVED_ANALYSIS_COLUMNS = [
  "name",
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

export type SavedAnalysisColumn = (typeof SAVED_ANALYSIS_COLUMNS)[number];

/** One analysis as the table shows it. A tag the game does not carry (or carries as a placeholder) is `undefined`. */
export type SavedAnalysisRow = {
  /** The record's id — the row's key, its pick, its link. */
  id: string;
  /** The reader's name, else the one its tags give it (players, else event); `""` for neither — shown as the generic. */
  name: string;
  /** The reader's notes. May be empty. */
  description: string;
  white?: string;
  whiteElo?: number;
  black?: string;
  blackElo?: number;
  /** `1-0`, `0-1`, `1/2-1/2` — never `*`, which an analysis is written with. */
  result?: string;
  /** The `Date` tag, its unknown parts dropped: `1848.??.??` is `1848`. */
  date?: string;
  event?: string;
  round?: string;
  eco?: string;
  /** `Opening`, and `, Variation` when there is one — or the book's name for the mainline. */
  opening?: string;
  /** Full moves in the mainline, counted from the text. */
  moves: number;
  /** ISO 8601, when it was last worked on — the Updated column, and how ties are ordered. */
  updated: string;
  /** The record will not parse — known only once it has been read. */
  unreadable?: boolean;
};

/** A placeholder an analysis is written with, read as nothing. */
const real = (value: string | undefined, placeholder: string): string | undefined =>
  value === placeholder ? undefined : value;

/** An analysis' row from its tags — no `chess.js`. */
export const savedAnalysisRowOf = (saved: SavedAnalysis): SavedAnalysisRow => {
  const { white, whiteElo, black, blackElo, result, date, event, round, eco, opening, moves } = collectionRowOf(saved.pgn, 0);
  return {
    id: saved.id,
    name: saved.name || savedAnalysisDerivedName(readPgnTags(saved.pgn)),
    description: saved.description,
    white: real(white, SAVED_ANALYSIS_PLAYER),
    whiteElo,
    black: real(black, SAVED_ANALYSIS_PLAYER),
    blackElo,
    result: real(result, "*"),
    date,
    event: real(event, SAVED_ANALYSIS_EVENT),
    round,
    eco,
    opening,
    moves,
    updated: saved.updatedAt,
  };
};

/** The opening a mainline (its positions, in order) reached — `openingOfLine` over a loaded book. */
export type AnalysisOpeningLookup = (fens: readonly string[]) => { eco: string; name: string } | undefined;

/**
 * A row with what its parsed tree says: `unreadable` when there is none, and
 * — given the book — the ECO and the opening its mainline reached, each only
 * where the tags name none (a tag always wins, as in the Library's index).
 * The same row back when there is nothing to add.
 */
export const savedAnalysisRowWith = (
  row: SavedAnalysisRow,
  tree: GameTree | undefined,
  lookup?: AnalysisOpeningLookup,
): SavedAnalysisRow => {
  if (tree === undefined) return { ...row, unreadable: true };
  if (lookup === undefined || (row.eco !== undefined && row.opening !== undefined)) return row;
  const found = lookup(mainlineGame(tree).moves.map((move) => move.fen));
  if (found === undefined) return row;
  return { ...row, eco: row.eco ?? found.eco, opening: row.opening ?? found.name };
};

/** The sort a folder opens with: newest updated first — the order the screen always had. */
export const SAVED_ANALYSES_DEFAULT_SORT: SavedAnalysisColumn = "updated";

/** Which way a column opens: the dates and the numbers high first, the words A to Z. */
export const savedAnalysisFirstDirection = (column: SavedAnalysisColumn): SortDirection =>
  column === "updated" || column === "date" || column === "whiteElo" || column === "blackElo" || column === "moves"
    ? "desc"
    : "asc";

/** Newest updated first — how rows a column cannot tell apart are ordered, in either direction. */
const newestFirst = (a: SavedAnalysisRow, b: SavedAnalysisRow): number =>
  a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : 0;

/**
 * The rows sorted by one column — the Library's `sortedRows` rule: numbers
 * numerically, text numeric-aware, **a missing value last in either
 * direction**; ties keep the newest-updated order whichever way the column
 * runs. A new array, stable.
 */
export const sortedAnalysisRows = (
  rows: readonly SavedAnalysisRow[],
  column: SavedAnalysisColumn,
  direction: SortDirection,
): SavedAnalysisRow[] => {
  const sign = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = a[column];
    const right = b[column];
    const leftMissing = left === undefined || left === "";
    const rightMissing = right === undefined || right === "";
    if (leftMissing || rightMissing) {
      if (leftMissing === rightMissing) return newestFirst(a, b);
      return leftMissing ? 1 : -1;
    }
    return sign * compareValues(left, right) || newestFirst(a, b);
  });
};

/** The words a row is found by: its name and notes, the players and their Elos, the event, round, date and opening. */
const searchTextOf = (row: SavedAnalysisRow): string =>
  [row.name, row.description, row.white, row.black, row.whiteElo, row.blackElo, row.event, row.round, row.date, row.eco, row.opening]
    .filter((value) => value !== undefined && value !== "")
    .join(" ")
    .toLowerCase();

/** The rows holding every word of `text`, case aside — all of them for no words. */
export const filteredAnalysisRows = (rows: readonly SavedAnalysisRow[], text: string): readonly SavedAnalysisRow[] => {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return rows;
  return rows.filter((row) => {
    const haystack = searchTextOf(row);
    return words.every((word) => haystack.includes(word));
  });
};
