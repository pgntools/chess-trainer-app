import { useMemo, type MouseEvent, type ReactNode } from "react";
import Box from "@mui/material/Box";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import type { LabelDisplayedRowsArgs } from "@mui/material/TablePagination";

import { linkProps, type LinkTarget } from "../../../components/link";
import {
  EmptyTableRow,
  LoadingTableRow,
  PickCell,
  PickHeaderCell,
  RowActionsCell,
  SortHeaderCell,
  TableFrame,
  TablePager,
  sortRows,
  type SortDirection,
} from "../../../components/tables";
import { nextSort, type DataTableColumn, type DataTableSort } from "./columns";

/** Controlled paging — `useTableUrlState`'s, or any other source's. */
export type DataTablePaging = {
  /** Zero-based. A page past the last shows the last. */
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
  /** "Rows per page" in the reader's language. */
  labelRowsPerPage: ReactNode;
  /** "1–50 of 812" — absent, the theme's locale bundle words it. */
  labelDisplayedRows?: (args: LabelDisplayedRowsArgs) => ReactNode;
};

/** Controlled picks: a checkbox per row, select-all in the header. */
export type DataTablePicks<R> = {
  /** The picked rows' ids. May hold ids the filters hide: a pick outlives its row leaving the view. */
  picked: ReadonlySet<string>;
  /** The whole next set of picks. Select-all adds every row shown on any page; unticking it removes just those. */
  onChange: (picked: Set<string>) => void;
  /** The header checkbox's accessible name ("Select all"). */
  selectAllLabel: string;
  /** A row checkbox's accessible name — the row's own ("Pick game 12"). */
  pickLabel: (row: R) => string;
};

export type DataTableProps<R, C extends string = string> = {
  columns: readonly DataTableColumn<R, C>[];
  /** Every row there is to show — the rows the filters leave, on every page. */
  rows: readonly R[];
  /** A row's id, unique in the table: its React key, its test ids, its pick. */
  rowId: (row: R) => string;
  /** The sort shown. Absent, the rows are shown as they come and no header shows an arrow. */
  sort?: DataTableSort<C>;
  /**
   * A header was clicked: the column, and the direction the click asks for (a
   * new column opens its `firstDirection`, the same one turns). A caller on
   * `useTableUrlState` passes `(column) => table.sortBy(column)`.
   */
  onSort?: (column: C, direction: SortDirection) => void;
  /** The rows arrive in order already; the table only pages them. Default: it sorts by the column's `sortValue`. */
  sorted?: boolean;
  /** How rows the sorted column cannot tell apart are ordered. */
  tieBreak?: (a: R, b: R) => number;
  /** Absent, every row shows and there is no pager. */
  paging?: DataTablePaging;
  /** Absent, there is no pick column. */
  picks?: DataTablePicks<R>;
  /** A row's actions — `IconAction`s — in a column of their own at the row's end, always visible. */
  rowActions?: (row: R) => ReactNode;
  /** The actions column's accessible name ("Actions"). */
  actionsLabel?: string;
  /** A click anywhere on the row but its picks and actions. */
  onRowClick?: (row: R) => void;
  /**
   * Where a row goes: `linkColumn`'s content becomes a real link (for the
   * keyboard, a middle click, a new tab), and — with no `onRowClick` — a
   * click anywhere on the row follows it.
   */
  rowLink?: (row: R) => LinkTarget;
  /** The column whose content is the row's link. Default: the first. */
  linkColumn?: C;
  /** The rows are still being read: one busy row under the header, in place of the rows. */
  loading?: boolean;
  /** "Reading…". */
  loadingLabel?: ReactNode;
  /** No row at all ("No games yet"). */
  emptyLabel: ReactNode;
  /** The filters left no row ("No game matches the filters"). Shown while `filtered`. */
  noMatchLabel?: ReactNode;
  /** A filter is on, so no rows means no match rather than empty. */
  filtered?: boolean;
  /** Above the table: the filters' row (a `SearchField`, chips). */
  filters?: ReactNode;
  /** Above the filters: the table's actions (an `ActionBar` — delete picked, download). */
  toolbar?: ReactNode;
  /** `dense` tightens the rows. */
  density?: "normal" | "dense";
  /** The header stays in view while the body scrolls (the default). */
  stickyHeader?: boolean;
  /** The table's accessible name. */
  ariaLabel?: string;
  /**
   * The root. The parts: `-frame` (the scrolling region; its table
   * `-frame-table`), `-sort-<column>`, `-select-all`, `-row-<id>`,
   * `-pick-<id>`, `-link-<id>`, `-actions-<id>`, `-loading`, `-empty`,
   * `-no-match`, `-pager`.
   */
  testId: string;
};

const DATA_ROW_LINK = "data-row-link";

/**
 * **A data table** (CTA-110), the first pattern: a multi-column table built
 * from the Tables section's parts, every piece of state controlled.
 *
 * - **Columns** are data (`DataTableColumn`): a header, a sort, an alignment,
 *   a width, a direction and a `render` for the cell's content.
 * - **Sort and paging are the caller's** — `useTableUrlState` or any other
 *   source. The table sorts by the column's `sortValue` (missing values last,
 *   `sortRows`) unless the rows arrive `sorted`, then shows one page.
 * - **Picks** — a checkbox per row, select-all in the header over every row
 *   the filters leave; **row actions**, always visible; a **row click** and a
 *   **row link**; one **loading**, **empty** or **no-match** row under the
 *   header; a **filters** slot and a **toolbar** slot above; **density**; a
 *   sticky header in the one scrolling region, the pager pinned under it.
 * - **10,000 rows**: the only work over every row is the sort (memoised on
 *   the rows and the sort) and the picks' count (on the rows and the picks);
 *   a page is sliced, so a page turn renders one page.
 *
 * It fills its parent's flex column (`flex: 1; minHeight: 0`). It knows no
 * chess, no store and no route: its words arrive as props, a link as a
 * `LinkTarget`.
 */
function DataTable<R, C extends string = string>({
  columns,
  rows,
  rowId,
  sort,
  onSort,
  sorted = false,
  tieBreak,
  paging,
  picks,
  rowActions,
  actionsLabel,
  onRowClick,
  rowLink,
  linkColumn,
  loading = false,
  loadingLabel,
  emptyLabel,
  noMatchLabel,
  filtered = false,
  filters,
  toolbar,
  density = "normal",
  stickyHeader = true,
  ariaLabel,
  testId,
}: DataTableProps<R, C>) {
  const sortColumn = sort === undefined ? undefined : columns.find((column) => column.id === sort.column);
  const sortValue = sortColumn?.sortValue;
  const sortId = sort?.column;
  const direction = sort?.direction;

  const ordered = useMemo(() => {
    if (sorted || sortValue === undefined || sortId === undefined || direction === undefined) return rows;
    return sortRows(rows, sortId, direction, (row) => sortValue(row), tieBreak);
  }, [rows, sorted, sortValue, sortId, direction, tieBreak]);

  const lastPage = paging === undefined ? 0 : Math.max(0, Math.ceil(ordered.length / paging.rowsPerPage) - 1);
  const page = paging === undefined ? 0 : Math.min(Math.max(0, paging.page), lastPage);
  const shown = paging === undefined ? ordered : ordered.slice(page * paging.rowsPerPage, (page + 1) * paging.rowsPerPage);

  const picked = picks?.picked;
  const pickedCount = useMemo(
    () => (picked === undefined ? 0 : rows.reduce((count, row) => (picked.has(rowId(row)) ? count + 1 : count), 0)),
    [rows, picked, rowId],
  );

  const toggleAll = () => {
    if (picks === undefined) return;
    const next = new Set(picks.picked);
    const all = rows.length > 0 && pickedCount >= rows.length;
    for (const row of rows) {
      if (all) next.delete(rowId(row));
      else next.add(rowId(row));
    }
    picks.onChange(next);
  };

  const togglePick = (id: string) => {
    if (picks === undefined) return;
    const next = new Set(picks.picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    picks.onChange(next);
  };

  const linked = rowLink === undefined ? undefined : (linkColumn ?? columns[0]?.id);
  const clickable = onRowClick !== undefined || rowLink !== undefined;
  const onRow = (row: R, event: MouseEvent<HTMLTableRowElement>) => {
    if (onRowClick !== undefined) onRowClick(row);
    else event.currentTarget.querySelector<HTMLElement>(`[${DATA_ROW_LINK}]`)?.click();
  };

  const colSpan = columns.length + (picks === undefined ? 0 : 1) + (rowActions === undefined ? 0 : 1);
  const noMatch = filtered && noMatchLabel !== undefined;

  return (
    <Box data-testid={testId} sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 1 }}>
      {toolbar !== undefined && <Box sx={{ flexShrink: 0 }}>{toolbar}</Box>}
      {filters !== undefined && <Box sx={{ flexShrink: 0 }}>{filters}</Box>}
      <TableFrame testId={`${testId}-frame`} density={density} stickyHeader={stickyHeader} ariaLabel={ariaLabel}>
        <TableHead>
          <TableRow>
            {picks !== undefined && (
              <PickHeaderCell
                total={rows.length}
                picked={pickedCount}
                onToggleAll={toggleAll}
                label={picks.selectAllLabel}
                testId={`${testId}-select-all`}
              />
            )}
            {columns.map((column) =>
              column.sortable === true && onSort !== undefined ? (
                <SortHeaderCell
                  key={column.id}
                  column={column.id}
                  label={column.header}
                  sort={sort?.column ?? ("" as C)}
                  direction={sort?.direction ?? "asc"}
                  onSort={(id) => {
                    const next = nextSort(sort, id, column.firstDirection);
                    onSort(next.column, next.direction);
                  }}
                  align={column.align}
                  width={column.width}
                  testId={`${testId}-sort-${column.id}`}
                />
              ) : (
                <TableCell key={column.id} sx={{ width: column.width, ...(column.align === "end" && { textAlign: "end" }) }}>
                  {column.header}
                </TableCell>
              ),
            )}
            {rowActions !== undefined && <TableCell padding="none" aria-label={actionsLabel} sx={{ width: "1%" }} />}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <LoadingTableRow colSpan={colSpan} testId={`${testId}-loading`}>
              {loadingLabel}
            </LoadingTableRow>
          ) : ordered.length === 0 ? (
            <EmptyTableRow colSpan={colSpan} testId={`${testId}-${noMatch ? "no-match" : "empty"}`}>
              {noMatch ? noMatchLabel : emptyLabel}
            </EmptyTableRow>
          ) : (
            shown.map((row) => {
              const id = rowId(row);
              const isPicked = picked?.has(id) ?? false;
              return (
                <TableRow
                  key={id}
                  hover
                  selected={isPicked}
                  onClick={clickable ? (event) => onRow(row, event) : undefined}
                  data-testid={`${testId}-row-${id}`}
                  sx={clickable ? { cursor: "pointer" } : undefined}
                >
                  {picks !== undefined && (
                    <PickCell
                      checked={isPicked}
                      onToggle={() => togglePick(id)}
                      label={picks.pickLabel(row)}
                      testId={`${testId}-pick-${id}`}
                    />
                  )}
                  {columns.map((column) => {
                    const content = column.render(row);
                    const link = linked === column.id && rowLink !== undefined ? rowLink(row) : undefined;
                    return (
                      <TableCell
                        key={column.id}
                        dir={column.dir}
                        sx={{
                          width: column.width,
                          ...(column.wrap !== true && { whiteSpace: "nowrap" }),
                          ...(column.align === "end" && { textAlign: "end", fontVariantNumeric: "tabular-nums" }),
                        }}
                      >
                        {link === undefined ? (
                          content
                        ) : (
                          <Box
                            component="a"
                            {...linkProps(link)}
                            {...{ [DATA_ROW_LINK]: "" }}
                            onClick={(event: MouseEvent) => event.stopPropagation()}
                            data-testid={`${testId}-link-${id}`}
                            sx={{ color: "inherit", textDecoration: "none", "&:hover, &:focus-visible": { textDecoration: "underline" } }}
                          >
                            {content}
                          </Box>
                        )}
                      </TableCell>
                    );
                  })}
                  {rowActions !== undefined && (
                    <RowActionsCell reveal="always" testId={`${testId}-actions-${id}`}>
                      {rowActions(row)}
                    </RowActionsCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </TableFrame>
      {paging !== undefined && (
        <TablePager
          count={ordered.length}
          page={page}
          rowsPerPage={paging.rowsPerPage}
          onPageChange={paging.onPageChange}
          onRowsPerPageChange={paging.onRowsPerPageChange}
          labelRowsPerPage={paging.labelRowsPerPage}
          labelDisplayedRows={paging.labelDisplayedRows}
          testId={`${testId}-pager`}
        />
      )}
    </Box>
  );
}

export default DataTable;
