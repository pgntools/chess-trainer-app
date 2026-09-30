import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZES } from "../TablePager/pageSizes";
import type { SortDirection } from "./sortRows";

export type TableUrlStateOptions<C extends string> = {
  /** The columns `?sort=` may name — anything else reads as the default. */
  columns: readonly C[];
  /** The column the table opens sorted by. */
  defaultSort: C;
  /** Which way a column opens on its first click (and the default sort's own direction). Default: ascending. */
  firstDirection?: (column: C) => SortDirection;
  /** The page sizes `?rows=` may name. Default: the one shared set. */
  pageSizes?: readonly number[];
  /** The page size when `?rows=` names none. */
  defaultRowsPerPage?: number;
  /** How many rows there are to page through — clamps `?page=` to the last page. */
  count?: number;
};

export type TableUrlState<C extends string> = {
  sort: C;
  direction: SortDirection;
  /** The zero-based page, clamped to the rows there are when `count` is given. */
  page: number;
  rowsPerPage: number;
  pageSizes: readonly number[];
  /** A new column opens its own way; the same column turns. */
  sortBy: (column: C) => void;
  setPage: (page: number) => void;
  setRowsPerPage: (rows: number) => void;
  /**
   * Any other URL state (a filter): `null` removes a key. A change starts at
   * the first page unless `keepPage`.
   */
  setParams: (patch: Record<string, string | null>, options?: { keepPage?: boolean }) => void;
  /** The rows of the current page. */
  pageOf: <R>(rows: readonly R[]) => R[];
};

const ascending = (): SortDirection => "asc";

/**
 * **A table's sort and paging, in the URL** (CTA-108) — `?sort=`, `?dir=`,
 * `?page=` and `?rows=`, the ~40 lines the Lobby, a collection and the
 * Library's tree each wrote:
 *
 * - **Written with history replace**, so moving through a table is not a trail
 *   of back-button stops, and **only what differs from the default** is kept:
 *   the default sort, its own direction, page 0 and the default size leave
 *   their keys out.
 * - `?sort=` is checked against the **column whitelist**; `?dir=` is `asc` or
 *   `desc` or the column's own first direction; `?rows=` must be one of the
 *   page sizes. Anything else reads as the default, never an error.
 * - A new sort, a new size or any `setParams` change starts at the first page.
 *
 * The order itself is {@link sortRows} (missing values last); the rows are
 * the caller's.
 */
export function useTableUrlState<C extends string>({
  columns,
  defaultSort,
  firstDirection = ascending,
  pageSizes = TABLE_PAGE_SIZES,
  defaultRowsPerPage = DEFAULT_TABLE_PAGE_SIZE,
  count,
}: TableUrlStateOptions<C>): TableUrlState<C> {
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedSort = searchParams.get("sort");
  const sort = (columns as readonly string[]).includes(requestedSort ?? "") ? (requestedSort as C) : defaultSort;
  const requestedDirection = searchParams.get("dir");
  const direction: SortDirection =
    requestedDirection === "asc" || requestedDirection === "desc" ? requestedDirection : firstDirection(sort);
  const requestedRows = Number(searchParams.get("rows"));
  const rowsPerPage = pageSizes.includes(requestedRows) ? requestedRows : defaultRowsPerPage;
  const requestedPage = Math.max(0, Math.floor(Number(searchParams.get("page")) || 0));
  const lastPage = count === undefined ? Infinity : Math.max(0, Math.ceil(count / rowsPerPage) - 1);
  const page = Math.min(requestedPage, lastPage);

  const setParams = useCallback(
    (patch: Record<string, string | null>, options: { keepPage?: boolean } = {}) =>
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(patch)) {
            if (value === null) next.delete(key);
            else next.set(key, value);
          }
          if (options.keepPage !== true) next.delete("page");
          return next;
        },
        { replace: true },
      ),
    [setSearchParams],
  );

  const sortBy = useCallback(
    (column: C) => {
      if (column !== sort) {
        setParams({ sort: column === defaultSort ? null : column, dir: null });
        return;
      }
      const turned: SortDirection = direction === "asc" ? "desc" : "asc";
      setParams({ dir: turned === firstDirection(column) ? null : turned });
    },
    [sort, direction, defaultSort, firstDirection, setParams],
  );

  const setPage = useCallback(
    (next: number) => setParams({ page: next <= 0 ? null : String(next) }, { keepPage: true }),
    [setParams],
  );

  const setRowsPerPage = useCallback(
    (rows: number) => setParams({ rows: rows === defaultRowsPerPage ? null : String(rows) }),
    [setParams, defaultRowsPerPage],
  );

  const pageOf = useMemo(
    () =>
      <R>(rows: readonly R[]): R[] =>
        rows.slice(page * rowsPerPage, (page + 1) * rowsPerPage),
    [page, rowsPerPage],
  );

  return { sort, direction, page, rowsPerPage, pageSizes, sortBy, setPage, setRowsPerPage, setParams, pageOf };
}
