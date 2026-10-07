import type { SortDirection } from "./libraryCollections";
import type { SavedAnalysis } from "./savedAnalyses";
import {
  SAVED_ANALYSES_DEFAULT_SORT,
  SAVED_ANALYSIS_COLUMNS,
  savedAnalysisFirstDirection,
  savedAnalysisRowOf,
  sortedAnalysisRows,
  type SavedAnalysisColumn,
} from "./savedAnalysisRows";

/**
 * **Where an analysis was opened from — the Saved analyses list** (CTA-145).
 * An analysis opened from the list opens the board as a **workspace**: the
 * list's own tree of folders and analyses beside it (to walk a tutorial's
 * positions in order), and a Close that goes back to the list. Pure: the board
 * reads the store, this reads and writes the URL and puts what it read in
 * order.
 *
 * - **The context rides in the URL**, beside `?analysis=<id>`: `?folder=<id>`
 *   — the folder the list stands in, empty for the top level — and the
 *   table's own `?sort=` / `?dir=`, the order the reader had. Only what
 *   differs from the table's defaults is written (Updated, newest first leaves
 *   both out), as `useTableUrlState` writes them. An analysis opened with none
 *   of it — from a link, an embed, a hand-off — is the plain board.
 * - **The order is the table's**: the same column whitelist, the same
 *   direction rule, the same comparison (`sortedAnalysisRows` — missing values
 *   last, ties newest updated first), over the **tags** of each record alone,
 *   so a folder of thousands is put in order without parsing one. (The
 *   table's ECO and Opening columns may add the book's name to a record whose
 *   tags name none; those two columns can order a folder differently here.)
 * - **Previous / next** walk the analyses filed in the open one's own folder
 *   in that order ({@link siblingAnalysesOf}); the tree shows them all, nested.
 */

/** The query parameter naming the folder the list stands in. */
export const LIST_FOLDER_PARAM = "folder";

/** The URL parameters that carry the context — kept whenever the board points its URL at another record. */
export const LIST_CONTEXT_PARAMS = [LIST_FOLDER_PARAM, "sort", "dir"] as const;

/** The order the analyses are listed in. */
export type ListSort = { column: SavedAnalysisColumn; direction: SortDirection };

/** The table's default: Updated, newest first. */
export const DEFAULT_LIST_SORT: ListSort = {
  column: SAVED_ANALYSES_DEFAULT_SORT,
  direction: savedAnalysisFirstDirection(SAVED_ANALYSES_DEFAULT_SORT),
};

/** Where the list stood: its folder (`null`: the top level), and the order of its analyses. */
export type ListContext = { folderId: string | null; sort: ListSort };

/**
 * The context a URL carries — `null` when there is none (no `?folder=`).
 * `?sort=` / `?dir=` are read as `useTableUrlState` reads them: a column off
 * the whitelist is the default, a direction other than `asc` / `desc` is the
 * column's own first.
 */
export const listContextOf = (params: URLSearchParams): ListContext | null => {
  const folder = params.get(LIST_FOLDER_PARAM);
  if (folder === null) return null;
  const requested = params.get("sort");
  const column = (SAVED_ANALYSIS_COLUMNS as readonly string[]).includes(requested ?? "")
    ? (requested as SavedAnalysisColumn)
    : SAVED_ANALYSES_DEFAULT_SORT;
  const requestedDirection = params.get("dir");
  const direction: SortDirection =
    requestedDirection === "asc" || requestedDirection === "desc" ? requestedDirection : savedAnalysisFirstDirection(column);
  return { folderId: folder === "" ? null : folder, sort: { column, direction } };
};

/** The context as query parameters — the folder, and the sort that differs from the default. */
const contextParams = (params: URLSearchParams, { folderId, sort }: ListContext): URLSearchParams => {
  params.set(LIST_FOLDER_PARAM, folderId ?? "");
  if (sort.column !== SAVED_ANALYSES_DEFAULT_SORT) params.set("sort", sort.column);
  if (sort.direction !== savedAnalysisFirstDirection(sort.column)) params.set("dir", sort.direction);
  return params;
};

/**
 * The URL of an analysis on the board — `/tools/analysis?analysis=<id>`, and,
 * given the context it is opened from, `&folder=<id>` and the sort that
 * differs from the default.
 */
export const analysisBoardPath = (id: string, context?: ListContext): string => {
  const params = new URLSearchParams({ analysis: id });
  return `/tools/analysis?${(context === undefined ? params : contextParams(params, context)).toString()}`;
};

/**
 * The saved analyses list, on the folder and in the order the board was opened
 * from — the same parameters the list itself writes — where the board's Close
 * goes.
 */
export const analysesListPath = (context: ListContext): string => {
  const params = contextParams(new URLSearchParams(), context);
  // The list reads no `?folder=` as its top level.
  if (context.folderId === null) params.delete(LIST_FOLDER_PARAM);
  const search = params.toString();
  return `/tools/analysis/saved${search === "" ? "" : `?${search}`}`;
};

/**
 * The analyses filed directly in `folderId` (`null`: Unfiled), in the sort's
 * order. A new array; the records themselves are the store's.
 */
export const siblingAnalysesOf = (
  analyses: readonly SavedAnalysis[],
  folderId: string | null,
  sort: ListSort,
): SavedAnalysis[] => {
  const here = analyses.filter((saved) => saved.folderId === folderId);
  const byId = new Map(here.map((saved) => [saved.id, saved]));
  return sortedAnalysisRows(here.map(savedAnalysisRowOf), sort.column, sort.direction).flatMap((row) => {
    const saved = byId.get(row.id);
    return saved === undefined ? [] : [saved];
  });
};

/** Where `id` stands among the ordered siblings, and the ones either side of it. */
export type SiblingPlace = {
  previous: SavedAnalysis | undefined;
  next: SavedAnalysis | undefined;
};

export const siblingPlaceOf = (ordered: readonly SavedAnalysis[], id: string): SiblingPlace => {
  const index = ordered.findIndex((saved) => saved.id === id);
  return {
    previous: index > 0 ? ordered[index - 1] : undefined,
    next: index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : undefined,
  };
};
