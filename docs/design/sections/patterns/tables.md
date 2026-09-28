# Tables patterns — `src/design-system/patterns/tables/`

The first pattern (CTA-110), built from the [Tables section's
parts](../tables.md). Import from `patterns/tables`. Where a pattern belongs
in the hierarchy: [`hierarchy.md`](../../hierarchy.md).

Gallery: `/dev/design/patterns/tables/DataTable`.

## DataTable

- **Purpose** — a whole multi-column table, every piece of state controlled:
  what `PlayedGames`, `CollectionTable` and the Library's tree each wrote
  from `TableContainer` up. It fills its parent's flex column (`flex: 1;
  minHeight: 0`): toolbar, filters, the one scrolling frame with a sticky
  header, the pager pinned under it.
- **Columns** — data, defined once outside the render (the table re-sorts
  only when the sorted column's `sortValue` changes):
  `DataTableColumn<R, C> = { id, header, sortable?, align?: "start" | "end",
  firstDirection?, width?, render(row), sortValue?(row), dir?: "ltr" | "auto",
  wrap? }`. `render` returns the cell's **content**; the cell (alignment,
  tabular figures for `end`, direction, one line unless `wrap`) is the
  table's.
- **Props** — `columns`, `rows` (every row the filters leave, all pages),
  `rowId`, `sort?: { column, direction }`, `onSort?(column, direction)` (the
  direction the click asks for: a new column's `firstDirection`, the same
  column turned), `sorted?` (the rows arrive in order; the table only pages),
  `tieBreak?`, `paging?: { page, rowsPerPage, onPageChange,
  onRowsPerPageChange, labelRowsPerPage, labelDisplayedRows? }` (absent: every
  row, no pager), `picks?: { picked, onChange, selectAllLabel, pickLabel(row) }`,
  `rowActions?(row)` + `actionsLabel` (required with them, CTA-111),
  `onRowClick?(row)`, `rowLink?(row)` + `linkColumn?`, `loading?` +
  `loadingLabel?`, `emptyLabel`, `noMatchLabel?` + `filtered?`, `filters?`,
  `toolbar?`, `density?`, `stickyHeader?`, a name — `ariaLabel` or `caption`
  (`TableName`, required) — and `testId`. A column's `header` is required
  words (`VisibleLabel`).
- **Keyboard** (CTA-111) — the sort headers are buttons, the picks
  checkboxes (each named by its row, select-all mixed when some are picked),
  a row's link a real link, its actions buttons, the pager's arrows buttons.
  A row with an `onRowClick` and no `rowLink` is a tab stop of its own, opened
  with Enter or Space (never from a key meant for its pick or an action). The
  table is `aria-busy` while `loading`.
- **Test ids** — `testId` (the root), `-frame` (its table `-frame-table`),
  `-sort-<column>`, `-select-all`, `-row-<id>`, `-pick-<id>`, `-link-<id>`,
  `-actions-<id>`, `-loading`, `-empty`, `-no-match`, `-pager`.
- **Also exports** `firstDirectionOf(columns)` — the columns' first
  directions as `useTableUrlState`'s `firstDirection`.

### The decisions it settles

| Question | Answer |
| --- | --- |
| Who sorts | the table, by the column's `sortValue` through `sortRows` (missing values last either way) — unless the rows arrive `sorted` |
| Sort and paging state | the caller's: `useTableUrlState` (`onSort={(column) => table.sortBy(column)}`) or any other source (`onSort={(column, direction) => setSort(…)}`) |
| Select-all | in the pick column's header, over **every row the filters leave, on every page**; unticked, it removes just those rows and keeps picks the filters hide |
| Row actions | **always visible** (the CTA-109 decision) — `RowActionsCell reveal="always"`, a click there never reaching the row |
| Row click and row link | `onRowClick` for a click anywhere but the picks and actions; `rowLink` makes `linkColumn`'s content (default: the first column) a real link for the keyboard, a middle click and a new tab — and, with no `onRowClick`, a click anywhere on the row follows it |
| Empty states | one row under the kept header: `loading` → busy; no rows → `emptyLabel`, or `noMatchLabel` while `filtered` |
| A page past the last | shows the last |
| 10,000 rows | the only work over every row is the sort (memoised on the rows and the sort) and the picks' count (on the rows and the picks); a page is sliced, so a page turn renders one page and sorts nothing |

- **Variations** (one demo each) — sort and pages; picks, row actions, a row
  click and a toolbar; a filters slot with no match; sort and pages in the URL
  through `useTableUrlState`; a row link; loading; empty; no match; one row;
  dense; header not sticky; no paging; long cell text (one line and a
  sideways scroll, a wrapping column); Hebrew names (RTL); 10,000 rows.
- **Replaces** — `PlayedGames`' and `CollectionTable`'s own tables, as their
  modules migrate: each becomes a block (`PlayedGamesTable`,
  `CollectionGamesTable`) over `DataTable`.
