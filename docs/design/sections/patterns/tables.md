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
  wrap?, cellTestId?(row) }` (`cellTestId`, CTA-109: a test id on the cell
  itself, for a screen whose tests name its cells). `render` returns the cell's **content**; the cell (alignment,
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
  `onRowClick?(row)`, `rowLink?(row)` + `linkColumn?`, `rowNote?(row)` (a
  row that cannot fill its columns: its words in one cell across them, its
  pick and actions kept — CTA-109), `groupEnd?(row, next)` (a bolder line
  under a row that closes a section — CTA-109), `loading?` +
  `loadingLabel?`, `emptyLabel`, `noMatchLabel?` + `filtered?`, `filters?`,
  `toolbar?`, `density?`, `stickyHeader?`, a name — `ariaLabel` or `caption`
  (`TableName`, required) — a `hint` (**required with `onSort` or `picks`**,
  CTA-112: how they are worked, "Sort by a column from its header button.
  Tick a row's box to pick it." — read with the table, the region's and the
  table's `aria-describedby`, out of sight; the app's words are
  `hints.table.*`) and `testId`. A column's `header` is required
  words (`VisibleLabel`).
- **Keyboard** (CTA-111) — the sort headers are buttons, the picks
  checkboxes (each named by its row, select-all mixed when some are picked),
  a row's link a real link, its actions buttons, the pager's arrows buttons.
  A row with an `onRowClick` and no `rowLink` is a tab stop of its own, opened
  with Enter or Space (never from a key meant for its pick or an action). The
  table is `aria-busy` while `loading`.
- **Test ids** — `testId` (the root), `-frame` (its table `-frame-table`),
  `-sort-<column>`, `-select-all`, `-row-<id>`, `-pick-<id>`, `-link-<id>`,
  `-actions-<id>`, `-note-<id>`, `-loading`, `-empty`, `-no-match`, `-pager`,
  `-hint`.
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
  a row's note; sections; dense; header not sticky; no paging; long cell text (one line and a
  sideways scroll, a wrapping column); Hebrew names (RTL); 10,000 rows.
- **Replaces** — `PlayedGames`' own table (now the `PlayedGamesTable` block,
  CTA-109), Storage's report (`StorageTable`), and — as the Library
  migrates — `CollectionTable` (`CollectionGamesTable`).

## CTA-113 additions to `DataTable`

- **`tree`** — rows that are a tree, a file manager's details view: `depth(row)`
  sets the first cell in (`paddingInlineStart`, so it mirrors), `open(row)` is
  a branch's state (`undefined` for a leaf, which keeps the chevron's room),
  `onToggle`, `toggleLabel(row, open)` names the chevron (an `ExpandToggle`,
  `aria-expanded`, its click never the row's), `toggleTestId?`. The rows
  arrive walked (`lib/folderTreeRows.ts`) — pass `sorted`.
- `rowTestId(row)`, `linkTestId(row)` — a row's and its link's own ids.
- `rowLinkLabel(row)` — the row link's name, where the cell's words alone do
  not tell one row from another (a collection's White cell).
- `picks.selectAllTestId`, `picks.pickTestId(row)`.
- `rowLink` may answer `undefined` for a row with no destination (a folder).
- **An empty or no-match line is a table row** (`-empty`, `-no-match`): a
  test that counts rows skips it.
