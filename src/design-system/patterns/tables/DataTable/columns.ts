import type { ReactNode } from "react";

import type { SortDirection, SortValue } from "../../../components/tables";

/**
 * **One column of a `DataTable`** (CTA-110). Define a table's columns once,
 * outside its render (or memoised): the table sorts again only when the
 * sorted column's `sortValue` changes.
 */
export type DataTableColumn<R, C extends string = string> = {
  id: C;
  /** The header's words. */
  header: ReactNode;
  /** The header is a sort button. Needs `sortValue` unless the caller sorts the rows (`sorted`). */
  sortable?: boolean;
  /** `end` for a number: the cell and its header end-aligned, in tabular figures. Default `start`. */
  align?: "start" | "end";
  /** Which way the column opens on its first click. Default ascending; numbers and dates usually open high first. */
  firstDirection?: SortDirection;
  width?: number | string;
  /** The cell's content. The cell itself — its alignment, direction and wrapping — is the table's. */
  render: (row: R) => ReactNode;
  /** The value the sort reads. A missing value (`undefined`, `null`, `""`, `NaN`) sorts last either way. */
  sortValue?: (row: R) => SortValue;
  /** `ltr` for a token that must not turn under RTL (a number, a date, a result); `auto` for a reader's words. */
  dir?: "ltr" | "auto";
  /** Let the text wrap. By default a cell keeps to one line and a long one scrolls the table sideways. */
  wrap?: boolean;
};

/** The sort a table shows: the column and which way. */
export type DataTableSort<C extends string = string> = { column: C; direction: SortDirection };

/**
 * **The columns' first directions, as `useTableUrlState` takes them** —
 * so a table whose sort lives in the URL declares each column's direction
 * once, on the column:
 *
 * ```ts
 * useTableUrlState({ columns: ids, defaultSort: "date", firstDirection: firstDirectionOf(COLUMNS) });
 * ```
 */
export const firstDirectionOf =
  <C extends string>(columns: readonly { id: C; firstDirection?: SortDirection }[]) =>
  (column: C): SortDirection =>
    columns.find((candidate) => candidate.id === column)?.firstDirection ?? "asc";

/** The direction a click on `column`'s header asks for: a new column opens its own way, the same one turns. */
export const nextSort = <C extends string>(
  sort: DataTableSort<C> | undefined,
  column: C,
  firstDirection: SortDirection = "asc",
): DataTableSort<C> =>
  sort?.column === column
    ? { column, direction: sort.direction === "asc" ? "desc" : "asc" }
    : { column, direction: firstDirection };
