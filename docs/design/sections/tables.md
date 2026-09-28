# Tables — `src/design-system/components/tables/`

The parts every table was writing for itself (CTA-108), from
[Shared.md → The four tables](../Shared.md#the-four-tables). A table is still
the screen's own `TableHead` / `TableBody`; these are its frame, its standard
cells and rows, its pager and its URL state. Import from `components/tables`.

Gallery: `/dev/design/tables` — each part, and a whole table composed of all
of them over `useTableUrlState` (its URL state shows in the address bar).

## The decisions it settles

The comparison ended on five open questions; each has one answer here.

| Question | Answer |
| --- | --- |
| Where select-all lives | **in the pick column's header** (`PickHeaderCell`), the Lobby's rule — covering the rows the filters leave, on every page |
| How row actions show | a prop: `RowActionsCell reveal="always" \| "hover"` |
| One page-size set | `TABLE_PAGE_SIZES` = **25 / 50 / 100 / 250**, default 50 |
| Number alignment | **end-aligned**, tabular figures, `dir="ltr"` (`NumberCell`, `SortHeaderCell align="end"`) |
| Date format | **`YYYY-MM-DD`**, the reader's day, `dir="ltr"` in a `<time>` (`DateCell`); a PGN's partial date as given |

## TableFrame

- **Purpose** — the one region that scrolls, both ways (`flex: 1; minHeight:
  0`), around a small table with a sticky header set in 600, never wrapping.
- **Props** — `children`, `density?: "normal" | "dense"` (dense: body cells
  `py: 0.25`), `stickyHeader?` (default true), `ariaLabel?`, `after?`
  (inside the scroll region, after the table), `testId` (the region; the
  table is `-table`).
- **Variations** — normal, dense, not sticky.
- **Replaces** — the `TableContainer` + `Table size="small" stickyHeader`
  frame of `PlayedGames`, `CollectionTable` and `FolderTreeTable`.

## SortHeaderCell

- **Purpose** — a sortable column's header: its label a `TableSortLabel`,
  `aria-sort` on the column in use.
- **Props** — `column`, `label`, `sort`, `direction`, `onSort(column)`,
  `align?: "start" | "end"`, `width?`, `testId` (the sort button).
- **Variations** — start-aligned; end-aligned (the arrow stays on the inner
  side, so the label lines up with its numbers in either direction).
- **Replaces** — the `TableCell sortDirection` + `TableSortLabel` pair the
  three sortable tables each wrote.

## PickHeaderCell / PickCell

- **Purpose** — the pick column: select-all in its header (ticked, some, none,
  off with nothing to pick), a checkbox per row whose click never reaches the
  row.
- **Props** — `PickHeaderCell`: `total`, `picked`, `onToggleAll`, `label`,
  `testId`. `PickCell`: `checked`, `onToggle`, `label` (the row's own name),
  `testId`.
- **Variations** — none / some (indeterminate) / all / nothing to pick.
- **Replaces** — the Lobby's header select-all and every table's pick column;
  the collection table's empty header cell (its select-all lived in
  `SavedListExportBar`).

## RowActionsCell

- **Purpose** — a row's actions in a cell of their own; a click there never
  reaches the row.
- **Props** — `children` (`IconAction`s), `reveal?: "always" | "hover"`
  (hover: shown on the hovered or focused row, always on a device that cannot
  hover), `testId`.
- **Replaces** — the Lobby's always-visible icon columns and
  `FolderTreeTable`'s hover-revealed actions.

## TablePager

- **Purpose** — the pagination pinned under the frame, with the one page-size
  set.
- **Props** — `count`, `page`, `rowsPerPage`, `onPageChange(page)`,
  `onRowsPerPageChange(rows)`, `labelRowsPerPage`, `labelDisplayedRows?`
  (absent: the theme's locale bundle words it, as MUI's arrows' names are),
  `testId`. Also exports `TABLE_PAGE_SIZES`, `DEFAULT_TABLE_PAGE_SIZE`.
- **Variations** — the locale's count words; the caller's.
- **Replaces** — the Lobby's 10 / 25 / 50 and the collection's 50 / 100 / 250
  `TablePagination`s.

## EmptyTableRow / LoadingTableRow

- **Purpose** — a table with nothing to show, or still reading: one row across
  every column, inside the table, the header kept.
- **Props** — `colSpan`, `children` (the words), `testId`. `LoadingTableRow`
  adds a spinner and `aria-busy`, its line a `status`.
- **Replaces** — the empty / no-match `Typography` inside (Lobby, collection)
  or outside (Library home) the container, and the loading line above the
  Lobby's table.

## NumberCell / DateCell

- **Purpose** — a number (end-aligned, tabular, `dir="ltr"`) and a date (the
  one format) in a table.
- **Props** — `NumberCell`: `value`, `format?`, `empty?` (default an en dash),
  `secondary?`, `testId?`. `DateCell`: `value` (a `Date`, a timestamp, an ISO
  string or a PGN partial date), `empty?`, `testId?`. `tableDate(value)` is
  the pure formatter.
- **Replaces** — left-aligned numbers (Lobby, collection) against
  right-aligned (Library home, Storage); `savedListDate`'s short month, the
  PGN's own date and `dateStyle: medium` — three date formats.

## useTableUrlState (+ `sortRows`)

- **Purpose** — a table's sort and paging in the URL: `?sort=`, `?dir=`,
  `?page=`, `?rows=`, written with **history replace**, keeping **only what
  differs from the default**.
- **Options** — `columns` (the whitelist `?sort=` is checked against),
  `defaultSort`, `firstDirection?(column)` (per-column first direction, and the
  default sort's own), `pageSizes?`, `defaultRowsPerPage?`, `count?` (clamps
  the page).
- **Returns** — `sort`, `direction`, `page`, `rowsPerPage`, `pageSizes`,
  `sortBy(column)` (a new column opens its own way; the same one turns),
  `setPage`, `setRowsPerPage`, `setParams(patch, { keepPage? })` (a filter;
  `null` removes a key; any change but a page turn starts at page 0),
  `pageOf(rows)`.
- **`sortRows(rows, column, direction, valueOf, tieBreak?)`** — **missing
  values last in either direction**, numbers numerically, text numeric-aware
  (`1.10` after `1.9`), ties by the caller's rule; stable, non-mutating.
- **Replaces** — `DEFAULT_SORT`, `defaultDirection`, `isColumn`, `setState`,
  `sortBy`, the page clamp and the three comparators, written inline in
  `PlayedGames`, `CollectionScreen` and `LibraryHome`.
