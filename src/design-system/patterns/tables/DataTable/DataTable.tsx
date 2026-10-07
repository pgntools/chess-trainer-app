import { useId, useMemo, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import Box from "@mui/material/Box";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import { visuallyHidden, type VisibleLabel } from "../../../components/a11y";
import { linkProps, type LinkTarget } from "../../../components/link";
import { ExpandToggle } from "../../../components/navigation";
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
  type TableName,
} from "../../../components/tables";
import { type TablePaging } from "../paging";
import { nextSort, type DataTableColumn, type DataTableSort } from "./columns";

/** Controlled paging — the table patterns' one shape (`../paging.ts`). */
export type DataTablePaging = TablePaging;

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
  /**
   * The select-all's and a row checkbox's own test ids (CTA-113), for a
   * screen whose tests named them before it moved onto this table (a
   * collection's `library-picks-select-all`, `library-picks-row-<n>`).
   * Absent, `-select-all` and `-pick-<id>` under the table's `testId`.
   */
  selectAllTestId?: string;
  pickTestId?: (row: R) => string;
  /**
   * Whether a row can be picked (CTA-144: a folder row among the analyses
   * of a tree table). A row it turns down has an empty pick cell and is left
   * out of select-all and its count. Absent, every row can.
   */
  canPick?: (row: R) => boolean;
};

/**
 * A row's actions and the name of their column — together or not at all
 * (CTA-111), so the actions column is never a nameless header.
 */
export type DataTableRowActions<R> =
  | { rowActions?: undefined; actionsLabel?: undefined }
  | {
      /** A row's actions — `IconAction`s — in a column of their own at the row's end, always visible. */
      rowActions: (row: R) => ReactNode;
      /** The actions column's accessible name ("Actions"). */
      actionsLabel: string;
    };

/**
 * **The table's keys, and the words that tell of them** (CTA-112) — a sort or
 * picks come with a `hint`, a short instruction a screen reader reads with the
 * table ("Sort by a column from its header; tick a row to pick it"), its
 * `aria-describedby`. A table with neither has nothing to explain, and may
 * leave it out.
 */
type DataTableInteraction<R, C extends string = string> =
  | { onSort?: undefined; picks?: undefined; hint?: VisibleLabel }
  | {
      /**
       * A header was clicked: the column, and the direction the click asks for (a
       * new column opens its `firstDirection`, the same one turns). A caller on
       * `useTableUrlState` passes `(column) => table.sortBy(column)`.
       */
      onSort: (column: C, direction: SortDirection) => void;
      /** Absent, there is no pick column. */
      picks?: DataTablePicks<R>;
      /** How the sort and the picks are worked — read with the table, not shown. */
      hint: VisibleLabel;
    }
  | { onSort?: undefined; picks: DataTablePicks<R>; hint: VisibleLabel };

/**
 * **Rows that are a tree** (CTA-113) — a file manager's details view: each
 * row set in by its depth in the first column, a branch with an
 * `ExpandToggle` (its own button, `aria-expanded`; a click on it never
 * reaches the row), a leaf with the toggle's room so the names line up. The
 * rows arrive already walked (only the open branches' children, in order);
 * the table only draws them — pass `sorted`, and sort the walk yourself.
 */
export type DataTableTree<R> = {
  /** How deep the row sits — 0 at the top. */
  depth: (row: R) => number;
  /** A branch's state — open or not; `undefined` for a leaf. */
  open: (row: R) => boolean | undefined;
  onToggle: (row: R) => void;
  /** The chevron's accessible name — the row's ("Open Openings", "Close Openings"). */
  toggleLabel: (row: R, open: boolean) => string;
  /** The chevron's test id. Absent, the row's own test id with `-toggle`. */
  toggleTestId?: (row: R) => string;
};

/** Everything a `DataTable` takes but its name, its row actions and its keys — see {@link DataTableProps}. */
export type DataTableBaseProps<R, C extends string = string> = {
  columns: readonly DataTableColumn<R, C>[];
  /** Every row there is to show — the rows the filters leave, on every page. */
  rows: readonly R[];
  /** A row's id, unique in the table: its React key, its test ids, its pick. */
  rowId: (row: R) => string;
  /** The sort shown. Absent, the rows are shown as they come and no header shows an arrow. */
  sort?: DataTableSort<C>;
  /** The rows arrive in order already; the table only pages them. Default: it sorts by the column's `sortValue`. */
  sorted?: boolean;
  /** How rows the sorted column cannot tell apart are ordered. */
  tieBreak?: (a: R, b: R) => number;
  /** Absent, every row shows and there is no pager. */
  paging?: DataTablePaging;
  /**
   * A click anywhere on the row but its picks and actions — and, without a
   * `rowLink`, Enter or Space on the row, which then takes the keyboard focus.
   */
  onRowClick?: (row: R) => void;
  /**
   * Where a row goes: `linkColumn`'s content becomes a real link (for the
   * keyboard, a middle click, a new tab), and — with no `onRowClick` — a
   * click anywhere on the row follows it.
   */
  rowLink?: (row: R) => LinkTarget | undefined;
  /** The column whose content is the row's link. Default: the first. */
  linkColumn?: C;
  /**
   * A row that cannot fill its columns (a record that will not read): its
   * words, in one cell across every column, the row's pick and actions kept.
   * `undefined` for an ordinary row. Absent, every row fills its columns.
   */
  rowNote?: (row: R) => ReactNode | undefined;
  /**
   * The row closes a group — a bolder line under it, for a report whose rows
   * fall into sections. Asked of each row shown with the one after it on the
   * page (`undefined` for the last). Absent, no row does.
   */
  groupEnd?: (row: R, next: R | undefined) => boolean;
  /** Rows that are a tree (CTA-113): a depth indent and a chevron in the first column. Absent, a flat table. */
  tree?: DataTableTree<R>;
  /**
   * A row's own test id, and its link's, for a screen whose tests named them
   * before it moved onto this table (CTA-113: the Library's
   * `library-folder-<id>` / `library-row-<id>`). Absent, derived from `testId`.
   */
  rowTestId?: (row: R) => string;
  linkTestId?: (row: R) => string;
  /**
   * The row link's accessible name, where the cell's words alone would not
   * tell one row from another (CTA-113: a collection's White cell, named by
   * the whole game). Absent, the link is named by its content.
   */
  rowLinkLabel?: (row: R) => string;
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
  /**
   * The root. The parts: `-frame` (the scrolling region; its table
   * `-frame-table`), `-sort-<column>`, `-select-all`, `-row-<id>`,
   * `-pick-<id>`, `-link-<id>`, `-actions-<id>`, `-note-<id>` (a row's
   * note), `-loading`, `-empty`, `-no-match`, `-pager`.
   */
  testId: string;
};

/**
 * A data table's props: the base, a name (an `ariaLabel` or a `caption`), row
 * actions with their column's name, and a sort or picks with their hint.
 */
export type DataTableProps<R, C extends string = string> = DataTableBaseProps<R, C> &
  TableName &
  DataTableRowActions<R> &
  DataTableInteraction<R, C>;

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
 * - **Tree rows** (`tree`, CTA-113): a depth indent and a chevron per branch
 *   in the first column — the Library's folder table.
 * - A row that cannot fill its columns says why across them (`rowNote`, its
 *   pick and actions kept); a report's sections end on a bolder line
 *   (`groupEnd`); a cell can carry a test id of its own (`cellTestId`) —
 *   CTA-109, each optional.
 * - **10,000 rows**: the only work over every row is the sort (memoised on
 *   the rows and the sort) and the picks' count (on the rows and the picks);
 *   a page is sliced, so a page turn renders one page.
 *
 * **Accessible** (CTA-111): named by an `ariaLabel` or a `caption`, every
 * column by its header and the actions column by `actionsLabel`; busy while
 * `loading`; every part reachable by the keyboard — the sort buttons, the
 * picks, a row's link or the row itself, its actions and the pager; and a
 * sort or picks explained in a `hint` read with the table (CTA-112).
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
  rowNote,
  groupEnd,
  tree,
  rowTestId,
  linkTestId,
  rowLinkLabel,
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
  caption,
  hint,
  testId,
}: DataTableProps<R, C>) {
  const hintId = useId();
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
  const canPick = picks?.canPick;
  const pickable = useMemo(() => (canPick === undefined ? rows : rows.filter(canPick)), [rows, canPick]);
  const pickedCount = useMemo(
    () => (picked === undefined ? 0 : pickable.reduce((count, row) => (picked.has(rowId(row)) ? count + 1 : count), 0)),
    [pickable, picked, rowId],
  );

  const toggleAll = () => {
    if (picks === undefined) return;
    const next = new Set(picks.picked);
    const all = pickable.length > 0 && pickedCount >= pickable.length;
    for (const row of pickable) {
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
  // A row with a link is reached through its link; a row with only a click
  // is a stop of its own, opened by Enter or Space — never when the key was
  // meant for its pick or an action inside it.
  const keyed = onRowClick !== undefined && rowLink === undefined;
  const onRowKey = (row: R, event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onRowClick?.(row);
  };
  const name: TableName = caption !== undefined ? { caption } : { ariaLabel: ariaLabel ?? "" };

  /** A cell's content — as it is, or the row's real link (for the keyboard, a middle click, a new tab). */
  const cellContent = (content: ReactNode, link: LinkTarget | undefined, linkTest: string, linkLabel?: string) =>
    link === undefined ? (
      content
    ) : (
      <Box
        component="a"
        {...linkProps(link)}
        {...{ [DATA_ROW_LINK]: "" }}
        onClick={(event: MouseEvent) => event.stopPropagation()}
        data-testid={linkTest}
        aria-label={linkLabel}
        sx={(theme) => ({
          color: "inherit",
          textDecoration: "none",
          minWidth: 0,
          "&:hover": { textDecoration: "underline" },
          "&:focus-visible": { textDecoration: "underline", ...theme.mixins.focusRing },
        })}
      >
        {content}
      </Box>
    );

  const colSpan = columns.length + (picks === undefined ? 0 : 1) + (rowActions === undefined ? 0 : 1);
  const noMatch = filtered && noMatchLabel !== undefined;

  return (
    <Box data-testid={testId} sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 1 }}>
      {toolbar !== undefined && <Box sx={{ flexShrink: 0 }}>{toolbar}</Box>}
      {filters !== undefined && <Box sx={{ flexShrink: 0 }}>{filters}</Box>}
      {hint !== undefined && (
        <Box id={hintId} data-testid={`${testId}-hint`} sx={visuallyHidden}>
          {hint}
        </Box>
      )}
      <TableFrame
        testId={`${testId}-frame`}
        density={density}
        stickyHeader={stickyHeader}
        busy={loading}
        describedBy={hint === undefined ? undefined : hintId}
        {...name}
      >
        <TableHead>
          <TableRow>
            {picks !== undefined && (
              <PickHeaderCell
                total={pickable.length}
                picked={pickedCount}
                onToggleAll={toggleAll}
                label={picks.selectAllLabel}
                testId={picks.selectAllTestId ?? `${testId}-select-all`}
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
            shown.map((row, index) => {
              const id = rowId(row);
              const isPicked = picked?.has(id) ?? false;
              const note = rowNote?.(row);
              const closesGroup = groupEnd?.(row, shown[index + 1]) ?? false;
              const rowTest = rowTestId?.(row) ?? `${testId}-row-${id}`;
              return (
                <TableRow
                  key={id}
                  hover
                  selected={isPicked}
                  onClick={clickable ? (event) => onRow(row, event) : undefined}
                  tabIndex={keyed ? 0 : undefined}
                  onKeyDown={keyed ? (event) => onRowKey(row, event) : undefined}
                  data-testid={rowTest}
                  sx={(theme) => ({
                    ...(clickable && { cursor: "pointer", "&:focus-visible": { ...theme.mixins.focusRing, outlineOffset: -2 } }),
                    // A group ends: a bolder line than the rows within one.
                    ...(closesGroup && {
                      "& > .MuiTableCell-root": { borderBottomWidth: 2, borderBottomStyle: "solid", borderBottomColor: "divider" },
                    }),
                  })}
                >
                  {picks !== undefined && canPick?.(row) === false && <TableCell padding="checkbox" />}
                  {picks !== undefined && canPick?.(row) !== false && (
                    <PickCell
                      checked={isPicked}
                      onToggle={() => togglePick(id)}
                      label={picks.pickLabel(row)}
                      testId={picks.pickTestId?.(row) ?? `${testId}-pick-${id}`}
                    />
                  )}
                  {note !== undefined && (
                    <TableCell colSpan={columns.length} data-testid={`${testId}-note-${id}`} sx={{ color: "text.secondary" }}>
                      {note}
                    </TableCell>
                  )}
                  {note === undefined && columns.map((column, columnIndex) => {
                    const content = column.render(row);
                    const link = linked === column.id && rowLink !== undefined ? rowLink(row) : undefined;
                    const linkTest = linkTestId?.(row) ?? `${testId}-link-${id}`;
                    const linkLabel = link === undefined ? undefined : rowLinkLabel?.(row);
                    const open = tree?.open(row);
                    return (
                      <TableCell
                        key={column.id}
                        dir={column.dir}
                        data-testid={column.cellTestId?.(row)}
                        sx={{
                          width: column.width,
                          ...(column.wrap !== true && { whiteSpace: "nowrap" }),
                          ...(column.align === "end" && { textAlign: "end", fontVariantNumeric: "tabular-nums" }),
                        }}
                      >
                        {tree !== undefined && columnIndex === 0 ? (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0, paddingInlineStart: tree.depth(row) * 2.5 }}>
                            {open === undefined ? (
                              // A leaf keeps the chevron's room, so its name lines up with its sibling branches'.
                              <Box aria-hidden="true" sx={{ width: 24, flexShrink: 0 }} />
                            ) : (
                              <ExpandToggle
                                expanded={open}
                                onToggle={() => tree.onToggle(row)}
                                label={tree.toggleLabel(row, open)}
                                testId={tree.toggleTestId?.(row) ?? `${rowTest}-toggle`}
                              />
                            )}
                            {cellContent(content, link, linkTest, linkLabel)}
                          </Box>
                        ) : (
                          cellContent(content, link, linkTest, linkLabel)
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
