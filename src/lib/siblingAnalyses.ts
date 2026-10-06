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
 * **The siblings of a saved analysis** (CTA-145) — the other analyses filed in
 * the same folder, which a tutorial's positions are walked through in order.
 * Pure: the board reads the store, this puts what it read in order.
 *
 * - **The context rides in the URL**, beside `?analysis=<id>`: `?folder=<id>`
 *   (the folder the reader opened it from) and the folder table's own
 *   `?sort=` / `?dir=` — the order the reader had. Only what differs from the
 *   table's defaults is written (Updated, newest first, leaves both out), as
 *   `useTableUrlState` writes them. An analysis opened with none of it — or
 *   Unfiled — has no siblings, and the board is as it always was.
 * - **The order is the table's**: the same column whitelist, the same
 *   direction rule, the same comparison (`sortedAnalysisRows` — missing values
 *   last, ties newest updated first), over the **tags** of each record alone,
 *   so a folder of thousands is put in order without parsing one. (The
 *   table's ECO and Opening columns may add the book's name to a record whose
 *   tags name none; those two columns can order a folder differently here.)
 * - **Directly filed analyses only**: a sub-folder's belong to the sub-folder.
 */

/** The query parameter naming the folder the analysis was opened from. */
export const SIBLING_FOLDER_PARAM = "folder";

/** The order siblings are listed in. */
export type SiblingSort = { column: SavedAnalysisColumn; direction: SortDirection };

/** The table's default: Updated, newest first. */
export const DEFAULT_SIBLING_SORT: SiblingSort = {
  column: SAVED_ANALYSES_DEFAULT_SORT,
  direction: savedAnalysisFirstDirection(SAVED_ANALYSES_DEFAULT_SORT),
};

/** Where an analysis was opened from: its folder, and the order its siblings are in. */
export type SiblingContext = { folderId: string; sort: SiblingSort };

/**
 * The context a URL carries, for the analysis `record` it opens — `null`
 * when there is none: no `?folder=`, a record that is not filed under that
 * folder (a copy moved since, a stale link), or no record at all.
 * `?sort=` / `?dir=` are read as `useTableUrlState` reads them: a column off
 * the whitelist is the default, a direction other than `asc` / `desc` is the
 * column's own first.
 */
export const siblingContextOf = (
  params: URLSearchParams,
  record: Pick<SavedAnalysis, "folderId"> | null,
): SiblingContext | null => {
  const folderId = params.get(SIBLING_FOLDER_PARAM);
  if (folderId === null || folderId === "" || record === null || record.folderId !== folderId) return null;
  const requested = params.get("sort");
  const column = (SAVED_ANALYSIS_COLUMNS as readonly string[]).includes(requested ?? "")
    ? (requested as SavedAnalysisColumn)
    : SAVED_ANALYSES_DEFAULT_SORT;
  const requestedDirection = params.get("dir");
  const direction: SortDirection =
    requestedDirection === "asc" || requestedDirection === "desc" ? requestedDirection : savedAnalysisFirstDirection(column);
  return { folderId, sort: { column, direction } };
};

/**
 * The URL of an analysis on the board — `/tools/analysis?analysis=<id>`, and,
 * given the context it is opened from, `&folder=<id>` and the sort that
 * differs from the default.
 */
export const analysisBoardPath = (id: string, context?: SiblingContext): string => {
  const params = new URLSearchParams({ analysis: id });
  if (context !== undefined) {
    params.set(SIBLING_FOLDER_PARAM, context.folderId);
    const { column, direction } = context.sort;
    if (column !== SAVED_ANALYSES_DEFAULT_SORT) params.set("sort", column);
    if (direction !== savedAnalysisFirstDirection(column)) params.set("dir", direction);
  }
  return `/tools/analysis?${params.toString()}`;
};

/**
 * The analyses filed directly in `folderId`, in the context's order. A new
 * array; the records themselves are the store's.
 */
export const siblingAnalysesOf = (
  analyses: readonly SavedAnalysis[],
  { folderId, sort }: SiblingContext,
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
  /** Zero-based; `-1` when `id` is not among them. */
  index: number;
  previous: SavedAnalysis | undefined;
  next: SavedAnalysis | undefined;
};

export const siblingPlaceOf = (ordered: readonly SavedAnalysis[], id: string): SiblingPlace => {
  const index = ordered.findIndex((saved) => saved.id === id);
  return {
    index,
    previous: index > 0 ? ordered[index - 1] : undefined,
    next: index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : undefined,
  };
};
