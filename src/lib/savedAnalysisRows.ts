import { folderTreeRows, type FolderTreeRow, type FolderTreeRows } from "./folderTreeRows";
import { mainlineGame, type GameTree } from "./gameTree";
import { collectionRowOf, compareValues, type SortDirection } from "./libraryCollections";
import { readPgnTags } from "./pgn";
import { SAVED_ANALYSIS_EVENT, SAVED_ANALYSIS_PLAYER, savedAnalysisDerivedName, type SavedAnalysis } from "./savedAnalyses";
import type { GameFolder } from "./savedGameFolders";

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
 *   last either way) and narrowed by {@link filteredAnalysisRows} — or,
 *   with the folders, walked into one tree table by {@link analysisTreeRows}.
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
  /** The folder it is filed under, `null` for Unfiled — where the tree table puts it. */
  folderId: string | null;
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
    folderId: saved.folderId,
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
 * Two rows in one column's order — the Library's `sortedRows` rule: numbers
 * numerically, text numeric-aware, **a missing value last in either
 * direction**; ties keep the newest-updated order whichever way the column
 * runs.
 */
export const compareAnalysisRows =
  (column: SavedAnalysisColumn, direction: SortDirection) =>
  (a: SavedAnalysisRow, b: SavedAnalysisRow): number => {
    const left = a[column];
    const right = b[column];
    const leftMissing = left === undefined || left === "";
    const rightMissing = right === undefined || right === "";
    if (leftMissing || rightMissing) {
      if (leftMissing === rightMissing) return newestFirst(a, b);
      return leftMissing ? 1 : -1;
    }
    return (direction === "asc" ? 1 : -1) * compareValues(left, right) || newestFirst(a, b);
  };

/** The rows sorted by one column ({@link compareAnalysisRows}). A new array, stable. */
export const sortedAnalysisRows = (
  rows: readonly SavedAnalysisRow[],
  column: SavedAnalysisColumn,
  direction: SortDirection,
): SavedAnalysisRow[] => [...rows].sort(compareAnalysisRows(column, direction));

/**
 * Two folders in the table's order: by name under the Name column, by when
 * they were last changed under Updated — each the way the column runs — and
 * by name, A to Z, under any other (a folder has no players or openings). An
 * untitled folder's name is missing, so last.
 */
export const compareAnalysisFolders =
  (column: SavedAnalysisColumn, direction: SortDirection) =>
  (a: GameFolder, b: GameFolder): number => {
    if (column === "updated") {
      const order = a.updatedAt < b.updatedAt ? -1 : a.updatedAt > b.updatedAt ? 1 : 0;
      return (direction === "asc" ? 1 : -1) * order;
    }
    if (a.name === "" || b.name === "") return a.name === b.name ? 0 : a.name === "" ? 1 : -1;
    return (column === "name" && direction === "desc" ? -1 : 1) * compareValues(a.name, b.name);
  };

/** The words a row is found by: its name and notes, the players and their Elos, the event, round, date and opening. */
const searchTextOf = (row: SavedAnalysisRow): string =>
  [row.name, row.description, row.white, row.black, row.whiteElo, row.blackElo, row.event, row.round, row.date, row.eco, row.opening]
    .filter((value) => value !== undefined && value !== "")
    .join(" ")
    .toLowerCase();

const wordsOf = (text: string): string[] => text.toLowerCase().split(/\s+/).filter(Boolean);

/** The rows holding every word of `text`, case aside — all of them for no words. */
export const filteredAnalysisRows = (rows: readonly SavedAnalysisRow[], text: string): readonly SavedAnalysisRow[] => {
  const words = wordsOf(text);
  if (words.length === 0) return rows;
  return rows.filter((row) => {
    const haystack = searchTextOf(row);
    return words.every((word) => haystack.includes(word));
  });
};

/**
 * What the words keep, as the tree table and the Analysis Board's tree both
 * read them: the analyses holding every word ({@link filteredAnalysisRows}'
 * rule) and the folders whose name does (their whole contents with them).
 * `undefined` for no words — nothing is filtered.
 */
export const analysisMatcherOf = (
  text: string,
): { folder: (folder: GameFolder) => boolean; item: (row: SavedAnalysisRow) => boolean } | undefined => {
  const words = wordsOf(text);
  if (words.length === 0) return undefined;
  return {
    folder: (folder) => words.every((word) => folder.name.toLowerCase().includes(word)),
    item: (row) => {
      const haystack = searchTextOf(row);
      return words.every((word) => haystack.includes(word));
    },
  };
};

/** One row of the tree table: a folder, or an analysis. */
export type AnalysisTreeRow = FolderTreeRow<SavedAnalysisRow>;

/**
 * **The folders and analyses as the rows of one tree table** (CTA-144) —
 * `folderTreeRows`, the Library's walk: folders before analyses at every
 * level, each at its depth, an open folder's contents under it. The folders
 * in {@link compareAnalysisFolders}' order, the analyses in
 * {@link compareAnalysisRows}'; a folder's size is how many analyses its
 * whole subtree holds. The words keep the analyses holding every one and the
 * folders whose name does (with everything in them), and **open the folders
 * above a matching analysis** by themselves.
 *
 * `folders` and `rows` are the ones in view: a folder whose parent is not
 * among them, and an analysis whose folder is not, sit at the top level — so
 * a folder's subtree, without the folder, is that folder seen from inside.
 */
export const analysisTreeRows = ({
  folders,
  rows,
  isOpen,
  column,
  direction,
  text,
}: {
  folders: readonly GameFolder[];
  rows: readonly SavedAnalysisRow[];
  /** Whether a folder shows its contents; `auto`, whether the words open it. */
  isOpen: (folderId: string, auto: boolean) => boolean;
  column: SavedAnalysisColumn;
  direction: SortDirection;
  text: string;
}): FolderTreeRows<SavedAnalysisRow> => {
  const match = analysisMatcherOf(text);
  return folderTreeRows({
    folders,
    items: rows,
    isOpen,
    compareFolders: compareAnalysisFolders(column, direction),
    compareItems: compareAnalysisRows(column, direction),
    sizeOf: () => 1,
    ...(match !== undefined && { match }),
  });
};
