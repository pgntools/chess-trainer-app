# Tables patterns — `src/design-system/patterns/tables/`

`DataTable`, the first pattern (CTA-110), and the two competition tables,
`StandingsTable` and `CrossTable` (CTA-120) — each built from the [Tables
section's parts](../tables.md). Import from `patterns/tables`. Where a
pattern belongs in the hierarchy: [`hierarchy.md`](../../hierarchy.md).

**Every table takes paging** (CTA-128): each table pattern — `DataTable`,
`StandingsTable`, `CrossTable`, and any table pattern to come — takes the
optional `paging` prop, one shape for all (`TablePaging`,
`patterns/tables/paging.ts`: `{ page, rowsPerPage, onPageChange,
onRowsPerPageChange, labelRowsPerPage, labelDisplayedRows? }`, controlled,
`rowsPerPage` one of `TABLE_PAGE_SIZES`). Absent, every row shows; present,
the rows are cut into pages and `TablePager` sits under the frame. The
patterns' conventions test fails a `…Table` pattern that does not declare it.

Gallery: `/dev/design/patterns/tables/DataTable`,
`/dev/design/patterns/tables/StandingsTable`,
`/dev/design/patterns/tables/CrossTable`,
`/dev/design/patterns/tables/Bracket`.

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

## StandingsTable

- **Purpose** (CTA-120) — a Swiss tournament's standings: a row per
  competitor in rank order with the rank, the name, an optional rating,
  **one cell per round**, the points and the tie-break columns. Generic — a
  competitor is anything ranked by points; it knows no chess. Every row
  shows (no paging): the one frame scrolls both ways, so many rows scroll
  under a sticky header and many rounds sideways. It fills its parent's flex
  column (`flex: 1; minHeight: 0`).
- **A round's cell shows the result only** — lichess's Swiss standings: `1`,
  `½`, `0`, toned by its outcome, `*` for an unfinished game, a dash for no
  game ([`ResultMark`](../tables.md#resultmark)). Who it was against is in
  the mark's `label`, read in the glyph's place.
- **Rows** — `StandingsRow = Competitor & { rounds }`: `Competitor = { id,
  rank, name, prefix?, suffix?, rating?, points, tieBreaks? }` (a `prefix` is
  a few muted words before the name — a title; a `suffix` after it — where
  from; `tieBreaks` the tie-break columns' values by column id), and `rounds`
  one entry per round, each **every result of that round** as `ResultEntry =
  { outcome, label }` (one, as a rule). A round with no game is the caller's
  own `none` entry, so its words say so; an entry left out is an empty cell.
  The rows come ranked — the table orders nothing.
- **The tie-breaks are data** — `tieBreaks?: TieBreakColumn[]`, each `{ id,
  header, name?, format? }`: a caller adds or removes one without changing
  the table.
- **Props** — `rows`, `rounds` (how many round columns), `labels: { rank,
  name, rating?, points, round(n) }` (`rank`, `rating` and `points` a
  `ColumnHeading = { header, name? }` — an abbreviation in view, its full
  `name` read in its place and shown on hover; no `rating` heading, no rating
  column; `round(n)` a round column's full name, its header the number
  alone), `tieBreaks?`, `formatPoints?`, `legend?: ResultEntry[]` (under the
  table, out of its scroll, while it has rows: "* = unfinished game"),
  `loading?` +
  `loadingLabel?`, `emptyLabel`, `density?`, `stickyHeader?`, `paging?`
  (CTA-128: a page of rows, the pager under the frame; each row keeps its
  own rank), a name — `ariaLabel` or `caption` (`TableName`, **required**)
  — and `testId`.
- **Accessible** — named by an `ariaLabel` or a `caption`; `aria-busy` while
  `loading`; the name is its **row's header** (`th scope="row"`) and every
  column has one; a result is read by its words and never told by its colour
  alone; the scrolling frame takes the keyboard focus (`TableFrame`), the
  table holding nothing else to focus. Names are `dir="auto"`, numbers and
  results `dir="ltr"`; the table mirrors under RTL.
- **Test ids** — `testId` (the root), `-frame` (its table `-frame-table`),
  `-row-<id>` (`-name`, `-points`, `-<tie-break id>`), a round's cell
  `-round-<id>-<round>`, `-loading`, `-empty`, `-legend`, `-pager`.
- **Variations** (one demo each) — every kind of cell with titles, ratings
  and two tie-breaks; the bare table (no rating, no tie-breaks, no legend);
  loading; empty; one row; ninety-nine rows; ninety-nine rows paged;
  thirty rounds (a sideways scroll); long names; Hebrew names under a caption (RTL); the header not
  sticky.

## CrossTable

- **Purpose** (CTA-120) — a round robin's crosstable, a **separate
  component** from `StandingsTable`: a row **and** a column per competitor in
  rank order, the cell where two meet holding **every result between them**
  (one in a single round robin, two in a double), the diagonal blank; then
  the points and the tie-break columns. Generic, as `StandingsTable` is, and
  sharing its `Competitor`, `ResultEntry`, `TieBreakColumn` and
  `CompetitorLabels` (`patterns/tables/competitors.ts`) and its cells
  (`competitorCells.tsx`).
- **A cell shows the results only** — the same glyphs and tones as
  `StandingsTable`'s ([`ResultMark`](../tables.md#resultmark)), a space
  between two; the round and the opponent are in each mark's `label`. An
  unfinished tournament is cells with fewer results than the rest.
- **Rows** — `CrossTableRow = Competitor & { results }`: `results` every
  result against another competitor, by that competitor's `id`, in order. A
  pair with no game yet is an empty cell, or the caller's own `none` entry.
  A competitor's column is headed by its **rank**, as a printed crosstable's
  is, and read by its name. The columns follow the rows' order.
- **Props** — `rows`, `labels: { rank, name, rating?, points }`,
  `tieBreaks?`, `formatPoints?`, `legend?`, `loading?` + `loadingLabel?`
  (while loading there are no competitors' columns), `emptyLabel`,
  `density?`, `stickyHeader?`, `paging?` (CTA-128: the rows are paged,
  every competitor keeps its column), a name — `ariaLabel` or `caption`
  (`TableName`, **required**) — and `testId`.
- **Accessible** — as `StandingsTable`; the rows' and the columns' headers
  are real ones (`th` with `scope="row"` / `scope="col"`), so a screen reader
  names **both** competitors of a cell.
- **Test ids** — `testId` (the root), `-frame` (its table `-frame-table`),
  `-row-<id>` (`-name`, `-points`, `-<tie-break id>`), a competitor's column
  `-column-<id>`, the cell of a row against a column
  `-cell-<row id>-<column id>` (the diagonal's too), `-loading`, `-empty`,
  `-legend`, `-pager`.
- **Variations** (one demo each) — a double round robin; a single one; an
  unfinished double one; the bare table; loading; empty; long names; Hebrew
  names under a caption (RTL); thirty members paged; dense with the header
  not sticky.

## Bracket

- **Purpose** (CTA-128) — a knockout's bracket: a **column per round**, left
  to right, each a list of its matches; a match a box of two lines — a
  side's name (a muted `prefix` before it), its score and a muted `detail`
  after it (a team's board points) — the side that went through **bold and
  marked** with a bar at its start (`borderInlineStart`, so it mirrors). The
  columns stretch to one height and space their matches evenly, so a later
  round's match sits between the two that fed it — the caller sends each
  round **in bracket order**. Generic — a competitor is anything with a
  score; it knows no chess. A double elimination is two of them, one per
  bracket.
- **Data** — `BracketRound = { id, title, matches }`, `BracketMatch = { id,
  sides: [BracketSide, BracketSide], label, caption? }` (`caption`: a few
  muted words over the box — "Match for third place" — said in `label`
  too), `BracketSide = { id, name,
  prefix?, score, detail?, winner? }`. The scores are written by the caller
  ("2½"); `label` is the match in words ("Burg, Twan 1½, Sokolov, Ivan 2½:
  Sokolov, Ivan goes through").
- **Props** — `rounds`, `ariaLabel` (**required**), `emptyLabel`,
  `loading?` + `loadingLabel?`, `density?`, `testId`.
- **Accessible** — a named `region` that takes the keyboard focus and
  scrolls sideways (a bracket is two-dimensional: WCAG 1.4.10 allows it), its
  ring the theme's; each round a `list` named by its title (`aria-labelledby`
  — no heading, so an article's outline is its own); each match a list item
  read by its `label` in place of its two lines, which are `aria-hidden` — so
  who went through is said in words, never told by the weight or the bar
  alone. `aria-busy` and a `status` while `loading`. Names `dir="auto"`,
  scores `dir="ltr"`; the columns run right to left under RTL.
- **Test ids** — `testId` (the region), `-round-<id>` (`-title`),
  `-match-<id>`, a side's line `-match-<id>-<side id>` (`data-winner`),
  `-loading`, `-empty`.
- **Variations** (one demo each) — a knockout of eight; a team knockout with
  details; a final round with a captioned match for third place; unfinished
  (a level final); loading; empty; long names; Hebrew
  names (RTL); dense.
