# Library — folders, collections, the upload, a game's board

`src/views/library/`: the folder tree of collections (`/library`), a
collection's table and filters (`/library/<c>`), the upload and its
import-options popup (`/library/new`), and a game's board (`/library/<c>/<n>`).
The module's reference is
[`.claude/rules/game-collections.md`](../../.claude/rules/game-collections.md).
Template and families: [`README.md`](./README.md).

**Documented in [`Shared.md`](./Shared.md), not here**: `FolderTreeTable`,
`FolderNameDialog`, `FolderMoveDialog`, `FolderDeleteDialog`, `FolderPicker`,
`SavedListExportBar`, `GameInfo`, `BoardPanel`, `CurrentOpening` and the
explorer's chrome. **In [`Analyses.md`](./Analyses.md)**: `AnalysisExport`,
`AnalysisSettings`, `PlayToggleButton`, `EngineThinking` — the game board's tab
bodies and header pieces. **In [`Repertoires.md`](./Repertoires.md)**:
`RepertoireChangesBar`, the game board's changes strip.

---

## `/library` — `LibraryHome.tsx`

### LibraryHome

- **Name and location** — `LibraryHome`, `src/views/library/LibraryHome.tsx:165`
- **Family** — table
- **MUI atoms** — Box, Typography (+ `FolderTreeTable`, the top bar, dialogs below)
- **What it does** — The Library as a file manager's details view: Built-in (the shipped collections, read-only, always first and open at the start), then the reader's folders nested to any depth and their uploads. Columns Name, Games (a folder's is its whole subtree's), Added, and the actions. Name, Games and Added sort (`?sort=`, `?dir=`, replace, defaults omitted; folders before collections at every level); the words box filters (`?q=`) and opens the folders above a match. Which folders are open is screen state.
- **API** — none (a route screen).
- **Used by** — `library/LibraryHomeMain.tsx` (`/library`).
- **Tests** — `library/Library.test.tsx`.
- **Styling** — the screen a flex column; the table's box `flex: 1; minHeight: 0`; the Games column `align="right"`, numbers with `toLocaleString`; dates `Intl.DateTimeFormat` `dateStyle: medium`, a dash when there is none; Built-in's icon `FolderSpecialRounded color="primary"`, collections `TableChartOutlined`.
- **Similar elsewhere** — Saved analyses and Repertoires show folders too but drill into them (rows and cards) instead of expanding a tree. [The four tables](./Shared.md#the-four-tables) compares it with the other tables. Its comparator (`byKey`, `defaultDirection`, `sortBy`, `setState`) is the third copy of the sortable tables' URL-state code.
- **Verdict** — module-specific but needs design consistency — the only screen using `FolderTreeTable`; the sort state helper is shared by copy.

### Library top bar

- **Name and location** — inline in `LibraryHome`, `src/views/library/LibraryHome.tsx:445-491`
- **Family** — toolbar / action bar
- **MUI atoms** — Box, Typography, Button
- **What it does** — The title, the count ("N collections", "N of M" under a filter), **New folder** (off until the folders are read) and **Add collection** (a link to `/library/new`).
- **API** — inline in `LibraryHome`.
- **Used by** — `LibraryHome`.
- **Tests** — `library/Library.test.tsx` (`library-count`, `library-new-folder`; `library-add` is not asserted by id).
- **Styling** — `gap: 1 pb: 1.5 mb: 0.5`, bottom divider; title `subtitle1` 700 as an `h1`; buttons `size="small" variant="outlined"` with icons.
- **Similar elsewhere** — [toolbar / action bar](./Shared.md#toolbar--action-bar); Saved analyses and Repertoires have the same two buttons (New, New folder) in a wrapping bar with `gap: 1.5`.
- **Verdict** — share candidate — `ListScreenHeader`.

### Library words box

- **Name and location** — inline in `LibraryHome`, `src/views/library/LibraryHome.tsx:492-501`
- **Family** — filter bar
- **MUI atoms** — Box, TextField
- **What it does** — Filters folders and collections by name (`?q=`).
- **API** — inline in `LibraryHome`.
- **Used by** — `LibraryHome`.
- **Tests** — `library/Library.test.tsx` (`library-filter`).
- **Styling** — `TextField size="small"`, `flex: 1`, in a `py: 1` row; a label, no search icon, no clear button.
- **Similar elsewhere** — the collection table's words box is the same field (`library-table-filter`).
- **Verdict** — share candidate — one `SearchField` for both words boxes.

### Action

- **Name and location** — `Action`, `src/views/library/LibraryHome.tsx:101`
- **Family** — toolbar / action bar
- **MUI atoms** — Tooltip, IconButton
- **What it does** — One row action: an icon button with its tooltip and `aria-label`, a click or a router link.
- **API** — `label`, `testId`, `onClick?`, `to?`, `children` (the icon).
- **Used by** — `LibraryHome`'s row actions.
- **Tests** — `library/Library.test.tsx`.
- **Styling** — `IconButton size="small"`.
- **Similar elsewhere** — `MapButton` (Shared) is the same helper with a pressed state; everywhere else the pair is written out (56 tooltips in 23 files).
- **Verdict** — share candidate — the seed of a shared `IconAction`.

### Row actions

- **Name and location** — `actionsOf`, `src/views/library/LibraryHome.tsx:342-434`
- **Family** — toolbar / action bar
- **MUI atoms** — Box (+ `Action`)
- **What it does** — A reader's folder: add a collection here, new sub-folder, download (the subtree as one `.pgn`), rename, move, delete. Built-in: download only. An upload: download, move, delete. A shipped collection: download.
- **API** — inline in `LibraryHome` (`FolderTreeTable`'s `actionsOf`).
- **Used by** — `LibraryHome`.
- **Tests** — `library/Library.test.tsx` (`library-folder-actions-`, `library-collection-actions-`, each action's id).
- **Styling** — `display: flex gap: 0.25`; shown on hover and focus by `FolderTreeTable`.
- **Similar elsewhere** — `SavedFolderViews`' `FolderActions` (Shared: download, rename, move, delete — always visible) and `RepertoireFolderViews`' (download, rename, delete). Rename is `EditRounded` in the shared one and `DriveFileRenameOutlineRounded` here and in Repertoires.
- **Verdict** — module-specific but needs design consistency — the folder actions' set, order and icons differ in each of the three folder screens.

### CollectionMoveDialog

- **Name and location** — `CollectionMoveDialog`, `src/views/library/LibraryHome.tsx:130`
- **Family** — dialog
- **MUI atoms** — Dialog, DialogTitle, DialogContent, DialogActions, Button (+ `FolderPicker`)
- **What it does** — Move a collection to a folder or the top level; a pick moves at once.
- **API** — `collection`, `folders`, `onMove(folderId)`, `onClose`.
- **Used by** — `LibraryHome`.
- **Tests** — `library/Library.test.tsx` (`library-collection-move-dialog`, a pick in its picker; the top-level row and Cancel are not exercised).
- **Styling** — `fullWidth maxWidth="xs"`.
- **Similar elsewhere** — `FolderMoveDialog` (Shared) is the same dialog for a folder.
- **Verdict** — share candidate — `FolderMoveDialog` with no exclusion is this.

### Delete collection dialog

- **Name and location** — inline in `LibraryHome`, `src/views/library/LibraryHome.tsx:605-633`
- **Family** — dialog
- **MUI atoms** — Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button
- **What it does** — "Delete ‹name›?" with its game count; confirm removes the upload.
- **API** — inline in `LibraryHome`.
- **Used by** — `LibraryHome`.
- **Tests** — `library/Library.test.tsx` (`library-delete-dialog`, `library-delete-confirm`).
- **Styling** — default width; confirm `color="error"` text.
- **Similar elsewhere** — the destructive confirms ([dialog](./Shared.md#dialog)); `FolderDeleteDialog` a few lines below it on the same screen looks different (`xs`, contained).
- **Verdict** — share candidate — two delete dialogs on one screen, two looks.

### Library no-matches state

- **Name and location** — inline in `LibraryHome`, `src/views/library/LibraryHome.tsx:535-543`
- **Family** — empty / loading / error state
- **MUI atoms** — Typography
- **What it does** — "No collection or folder matches" when the words box leaves nothing.
- **API** — inline in `LibraryHome`.
- **Used by** — `LibraryHome`.
- **Tests** — `library/Library.test.tsx` (`library-no-matches`).
- **Styling** — `body2 text.secondary` centred `py: 4`, outside the table component.
- **Similar elsewhere** — every list's empty line ([empty / loading / error state](./Shared.md#empty--loading--error-state)).
- **Verdict** — share candidate — `EmptyState`.

---

## `/library/<collection>` — `CollectionScreen.tsx`

### CollectionTable

- **Name and location** — `CollectionTable`, `src/views/library/CollectionScreen.tsx:156`
- **Family** — table
- **MUI atoms** — TableContainer, Table, TableHead, TableBody, TableRow, TableCell, TableSortLabel, TablePagination, Checkbox, Tooltip, Box, Typography
- **What it does** — A collection's games from its index, one row per game: `#` (with an unreadable mark), White, Elo, Black, Elo, Result, Date, Round, Event, ECO, Opening, Moves; every column sorts; words, panel filters and the opening line narrow it; paged; the row (and a real link in the White cell) opens the game with `state.from`; a pick checkbox per row. Sort, filters and page are the URL's; picks are not.
- **API** — `collection: CollectionSummary`, `rows: CollectionRow[]`.
- **Used by** — `CollectionScreen`.
- **Tests** — `library/Library.test.tsx` (sort, filters, picks, unreadable mark; `library-table-pagination` is not exercised).
- **Styling** — `TableContainer flex: 1; minHeight: 0`, `size="small" stickyHeader`, header cells `nowrap` 600; rows `hover`, `cursor: pointer`; the pick cell stops the row click; names and event `dir="auto"`, result / date / round `dir="ltr"`, opening `minWidth: 160`; unreadable `WarningAmberRounded` at `fontSize: 16` with `marginInlineStart: 0.5`; `TablePagination` 50 / 100 / 250, 50 by default.
- **Similar elsewhere** — `PlayedGames` (Engine) was built from this; [the four tables](./Shared.md#the-four-tables).
- **Verdict** — module-specific but needs design consistency — the reference table; its select-all lives in the export bar, not in its empty header checkbox cell.

### Collection top bar

- **Name and location** — inline in `CollectionTable`, `src/views/library/CollectionScreen.tsx:379-473`
- **Family** — toolbar / action bar
- **MUI atoms** — Box, Tooltip, IconButton, Typography, Button, CircularProgress (+ `SavedListExportBar`)
- **What it does** — Back to `/library`; the name and the count ("N games", "N of M"); **Add games** (uploads only — `contained` when the collection is empty); the export bar (select-all over every filtered row, download, delete for uploads); **Analyse** (the picks into a new Saved analyses folder, a spinner while it runs).
- **API** — inline in `CollectionTable`.
- **Used by** — `CollectionTable`.
- **Tests** — `library/Library.test.tsx` (`library-table-name`, `-count`, `-add-games`, `library-picks-*`, `library-picks-analyse`; the back button is not asserted).
- **Styling** — `gap: 1 pb: 1`, bottom divider, **no** `mb` and no wrap (the other list bars have `pb: 1.5 mb: 0.5`); title `subtitle1` 700 `h1` `noWrap dir="auto"`; Analyse `outlined small`, its icon swapped for `CircularProgress size={16}` and `aria-busy` while running, in a span for its disabled tooltip; Add games in a `Tooltip` with a hint.
- **Similar elsewhere** — [toolbar / action bar](./Shared.md#toolbar--action-bar).
- **Verdict** — share candidate — `ListScreenHeader`; the busy-button pattern (icon → spinner) is used only here.

### Collection words box

- **Name and location** — inline in `CollectionTable`, `src/views/library/CollectionScreen.tsx:475-484`
- **Family** — filter bar
- **MUI atoms** — Box, TextField
- **What it does** — Every word must appear in some text column (`?q=`).
- **API** — inline in `CollectionTable`.
- **Used by** — `CollectionTable`.
- **Tests** — `library/Library.test.tsx` (`library-table-filter`).
- **Styling** — `TextField size="small" flex: 1`, in a `py: 1` row.
- **Similar elsewhere** — Library home's words box.
- **Verdict** — share candidate — `SearchField`.

### Filters panel column

- **Name and location** — inline in `CollectionTable`, `src/views/library/CollectionScreen.tsx:606-630`
- **Family** — filter bar
- **MUI atoms** — Box, Typography (+ `CollectionFilters`)
- **What it does** — The right panel: the filters, then the shipped / uploaded note at the foot.
- **API** — inline in `CollectionTable` (in `RightPanel`).
- **Used by** — `CollectionTable`.
- **Tests** — `library/Library.test.tsx` (`library-table-note`).
- **Styling** — its own scrolling column (`flex: 1; minHeight: 0; overflowY: auto`), `display: grid alignContent: start gap: 3`.
- **Similar elsewhere** — the Lobby forms' panels scroll their tab body; the other list screens' panels hold a note only.
- **Verdict** — module-specific but needs design consistency — the one screen whose filters live in the panel.

### Analyse notice

- **Name and location** — inline in `CollectionTable`, `src/views/library/CollectionScreen.tsx:631-663`
- **Family** — feedback (alert / snackbar)
- **MUI atoms** — Snackbar, Alert, Button
- **What it does** — After Analyse: how many games went into which folder (and how many unreadable ones were left out), with **Open folder**; or the error.
- **API** — inline in `CollectionTable`.
- **Used by** — `CollectionTable`.
- **Tests** — `library/Library.test.tsx` (`library-picks-analyse-notice`, `-open`).
- **Styling** — `Snackbar` bottom-centre, 10 s for success, no auto-hide for an error, click-away ignored; `Alert variant="filled"`, `alignItems: center`, an inherit-coloured small action button.
- **Similar elsewhere** — `MoveContextMenu`'s copy snackbar (Shared) — a plain `message`, 3 s.
- **Verdict** — module-specific but needs design consistency — the two snackbars should share one style.

### Delete picked games dialog

- **Name and location** — inline in `CollectionTable`, `src/views/library/CollectionScreen.tsx:664-699`
- **Family** — dialog
- **MUI atoms** — Dialog, DialogTitle, DialogContent, DialogContentText, Alert, DialogActions, Button
- **What it does** — "Delete N games?" from an upload; confirm removes them (all or nothing) and clears the picks; a failed write shows an error in the dialog.
- **API** — inline in `CollectionTable`.
- **Used by** — `CollectionTable`.
- **Tests** — `library/Library.test.tsx` (`library-picks-delete-dialog`, `-delete-confirm`; the failure `Alert` is not exercised).
- **Styling** — default width; the problem `Alert severity="error" mt: 2`; confirm `color="error"` text.
- **Similar elsewhere** — the Lobby's delete-picked dialog and `RepertoireBulkDeleteDialog` ([dialog](./Shared.md#dialog)); the only one of the three that shows a failure.
- **Verdict** — share candidate — the shared "delete N picked" confirm, with an optional problem.

### Collection route states

- **Name and location** — `CollectionScreen`, `src/views/library/CollectionScreen.tsx:705-718`
- **Family** — empty / loading / error state
- **MUI atoms** — Typography (+ `LibraryMiss`)
- **What it does** — "Reading…" while the rows load; the miss for an unknown collection; else the table. Under the table, "no games yet" or "no game matches" (one test id, `library-table-empty`, `:579`).
- **API** — none (the route).
- **Used by** — `library/CollectionScreenMain.tsx`.
- **Tests** — `library/Library.test.tsx` (`library-not-found`, `library-table-empty`; the reading line is not asserted).
- **Styling** — reading `text.secondary p: 2`; empty `body2 text.secondary` centred `py: 4`.
- **Similar elsewhere** — [empty / loading / error state](./Shared.md#empty--loading--error-state).
- **Verdict** — share candidate — `LoadingLine`, `EmptyState`.

### CollectionFilters

- **Name and location** — `CollectionFilters`, `src/views/library/CollectionFilters.tsx`
- **Family** — filter bar
- **MUI atoms** — Box, Typography, Button, Autocomplete, TextField, ToggleButtonGroup, ToggleButton, MenuItem (+ `OpeningFilterBoard`)
- **What it does** — The table's filters, each shown only where the collection has its field: players (several names as chips, part of a name typed free), the side any of them had (off until a name is chosen), the opening-moves board, opening (ECO or name, typed free), event, a date range, result; **Clear** removes them all.
- **API** — `facets`, `values`, `onChange(patch)`, `onClear`, `openingTree`, `openingNode`, `line`, `onLine`, `collectionName`.
- **Used by** — `CollectionTable`.
- **Tests** — `library/Library.test.tsx` (`library-filter-player`, `-color`, `-opening`, `-event`, `-from` / `-to`, `library-table-result`, `library-filter-clear`).
- **Styling** — `grid gap: 2`; the title `subtitle2` 700 `h2` beside a small text Clear; players `Autocomplete multiple freeSolo limitTags={1} disableCloseOnSelect size="small"`; side `ToggleButtonGroup exclusive fullWidth size="small"`; dates two `type="date"` fields in `1fr 1fr`, labels shrunk, each bounding the other; result a `TextField select`.
- **Similar elsewhere** — `ImportOptionsDialog` (the same player chips and date range, in a dialog); the Lobby's filter bar (the side toggle and a select, in the top bar).
- **Verdict** — share candidate — `DateRangeField` and `PlayerChipsField` are each written twice.

### OpeningFilterBoard — the chrome

- **Name and location** — `OpeningFilterBoard`, `src/views/library/OpeningFilterBoard.tsx` (controls row `:186-226`, caption row `:248-268`)
- **Family** — toolbar / action bar
- **MUI atoms** — Box, Typography, Tooltip, IconButton, Link (`component="button"`)
- **What it does** — Around the small board (out of scope): a title with reset, back and flip; under it the moves played (or a start prompt) and **Save tree as PGN**; then the continuations list or an end message (no game, one game goes on, the games end here).
- **API** — `line`, `node`, `onLine(line)`, `collectionName`. Board `options.id` `library-filter-board`.
- **Used by** — `CollectionFilters`.
- **Tests** — `library/Library.test.tsx` (`library-filter-moves-reset`, `-back`, `-line`, `-end`, `-save`, `library-filter-move-*`; flip is not exercised).
- **Styling** — `grid gap: 1`; title `body2` 600 growing; icon buttons `small`, disabled ones in bare spans; the line `caption dir="ltr" unicodeBidi: isolate minHeight: 1.5em`; the save link `Link variant="caption"` at the row's inline end (the row mirrors, the line does not).
- **Similar elsewhere** — `BoardControls` (Shared) — the same back / reset / flip, as a footer strip with other icons; the only `Link component="button"` in the app.
- **Verdict** — module-specific but needs design consistency — board controls in a second style.

### Continuations list

- **Name and location** — inline in `OpeningFilterBoard`, `src/views/library/OpeningFilterBoard.tsx:281-307`, with the inner `ResultBar` (`:73`)
- **Family** — list
- **MUI atoms** — Box, ButtonBase, Typography
- **What it does** — The moves the filtered games played from here, lichess-explorer style: the SAN (click plays, hover draws its arrow), the games and share, a White / draw / Black bar.
- **API** — inline in `OpeningFilterBoard`; `ResultBar({ node })`.
- **Used by** — `OpeningFilterBoard`.
- **Tests** — `library/Library.test.tsx` (`library-filter-move-<san>`, `-count-<san>`).
- **Styling** — grid `auto auto 1fr`, `columnGap: 1 rowGap: 0.25`; SAN tokens `moveSx` + `sanTokenSx`; the bar `height: 14`, `borderRadius: 0.5`, a `divider` border, segments in **hard-coded greys** `#f5f5f5` / `#9e9e9e` / `#424242` with `#212121` / `#f5f5f5` text at `fontSize: 10`, a percentage shown from 15%.
- **Similar elsewhere** — the Openings Book tab (`OpeningBookList`) and `NextMovesBar` — three continuation lists ([list](./Shared.md#list)).
- **Verdict** — module-specific but needs design consistency — the result bar's colours are the only hard-coded palette in a list, and ignore dark mode's tokens.

### OpeningTreePgnDialog

- **Name and location** — `OpeningTreePgnDialog`, `src/views/library/OpeningTreePgnDialog.tsx`
- **Family** — dialog
- **MUI atoms** — Dialog, DialogTitle, DialogContent, DialogActions, RadioGroup, Radio, FormControlLabel, Checkbox, Box, Typography, Button
- **What it does** — *Save tree as PGN*'s choice: No (moves alone) or Add tags, then which tags (`games`, `prc`); the boxes are off under No, Save is off with no box ticked.
- **API** — `open`, `onClose`, `onSave(tags)`.
- **Used by** — `OpeningFilterBoard`.
- **Tests** — `library/Library.test.tsx` (`library-filter-moves-save-*`).
- **Styling** — `fullWidth maxWidth="xs"`; the checkboxes indented `paddingInlineStart: 4` under the radios, each label a `body2` over a `caption text.secondary` help line; test ids on the inputs through `slotProps` (`as object`).
- **Similar elsewhere** — `ImportDialog` (Settings) — the only other nested radio-then-options dialog; the label-over-help pattern is `ArrowWidthSourceField`'s (Analyses).
- **Verdict** — module-specific but needs design consistency — the "option with a help line" label is written here, in the arrow fields and in the export dialog each its own way.

---

## `/library/new` — the upload

### LibraryUpload

- **Name and location** — `LibraryUpload`, `src/views/library/LibraryUpload.tsx:61`
- **Family** — form / settings group
- **MUI atoms** — Box, Typography, TextField, Button, Alert (+ `FolderPicker`, `ImportOptionsDialog`)
- **What it does** — A new collection from a `.pgn` or `.zip` picked, a paste, or nothing (empty); filed in a folder. With `into`, adds games to an upload instead (no name, no empty). Everything read opens the import popup; the controls lock while it is open.
- **API** — `into?: CollectionSummary`, `folder?: string | null`.
- **Used by** — `LibraryUploadRoute` (`:322`).
- **Tests** — `library/Library.test.tsx` (`library-upload-*`).
- **Styling** — a scrolling column `gap: 2`; title `subtitle1` 700 `h1 dir="auto"`, intro `body2 text.secondary`; name `TextField size="small" minWidth: 200` beside **Create empty collection** (`outlined`); **Choose file** `contained` over `<input hidden>`; paste `multiline minRows={6} maxRows={14}` with a "N games read" helper, input `dir="ltr"`; **Add** `outlined`; problem `Alert severity="error"`.
- **Similar elsewhere** — `RepertoireUpload` (Repertoires) is the same screen for repertoires (same paste size, a spinner instead of a popup); the analysis Load tab and the new-analysis form are smaller versions ([upload / import flows](./Shared.md#upload--import-flows)).
- **Verdict** — share candidate — a shared `PgnInput` (pick + paste + read + problem) under both upload screens.

### Upload folder picker frame

- **Name and location** — inline in `LibraryUpload`, `src/views/library/LibraryUpload.tsx:211-239`
- **Family** — form / settings group
- **MUI atoms** — Box, Typography (+ `FolderPicker`)
- **What it does** — Where the new collection goes (shown once the reader has a folder); dims and stops taking clicks while the popup is open.
- **API** — inline in `LibraryUpload`.
- **Used by** — `LibraryUpload`.
- **Tests** — `library/Library.test.tsx` (`library-upload-folder-picker`, `-folder-top`).
- **Styling** — `caption text.secondary` label; a bordered box `maxHeight: 180`, scrolling, `borderRadius: 1`, `p: 0.5`; disabled by `opacity: 0.5` and `pointerEvents: none` (not by a disabled prop).
- **Similar elsewhere** — `FolderPicker` sits unframed in its dialogs and in the analysis settings screen.
- **Verdict** — module-specific but needs design consistency — the picker gets a frame in one place only, and its "disabled" state is a CSS trick.

### Upload route states

- **Name and location** — `LibraryUploadRoute`, `src/views/library/LibraryUpload.tsx:322`
- **Family** — empty / loading / error state
- **MUI atoms** — Typography (+ `LibraryMiss`)
- **What it does** — Waits for the folders (`?folder=`) or the target summary (`?into=`); a shipped or missing `into` is the miss.
- **API** — none (the route).
- **Used by** — `library/LibraryUploadMain.tsx`.
- **Tests** — `library/Library.test.tsx` (the miss for a shipped `into`; the reading line is not asserted).
- **Styling** — `text.secondary p: 2`.
- **Similar elsewhere** — [empty / loading / error state](./Shared.md#empty--loading--error-state).
- **Verdict** — share candidate — `LoadingLine`.

### ImportOptionsDialog

- **Name and location** — `ImportOptionsDialog`, `src/views/library/ImportOptionsDialog.tsx`
- **Family** — dialog
- **MUI atoms** — Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Slider (range), TextField (`type="date"`), Autocomplete, LinearProgress, Alert, Button
- **What it does** — What came in (name, size, games; each `.pgn` of a zip), the games' metadata (players, Elo span, date span, events), filters applied **before** the index pass — an Elo range slider, a date range, player chips (suggested from the games the Elo range leaves, worked out on open) — a live "N of M" count, then **Import**: one index pass with progress, then the writes (one collection per file, or appended with `into`), all or nothing. Cancel, Escape or the backdrop stop the pass; nothing closes during the write.
- **API** — `source`, `into?`, `typedName`, `folderId`, `onClose`, `onDone(path)`.
- **Used by** — `LibraryUpload`.
- **Tests** — `library/Library.test.tsx` (`library-import`, `-elo`, `-from` / `-to`, `-player`, `-count`, `-indexing`, `-cancel`, `-confirm`).
- **Styling** — `maxWidth="sm" fullWidth`; content column `gap: 2`; the source line `body2` 600 with the size `dir="ltr"`; zip files a list of `body2 text.secondary` rows; the summary a wrapping row of `caption`s (`columnGap: 2 rowGap: 0.5`); filters under a `subtitle2` 700 `h3`; the slider `size="small"` in a `px: 1.5` box, `disableSwap`, `valueLabelDisplay="auto"`, end marks, `shiftStep={50}`; the count `body2` 600; progress `LinearProgress determinate`.
- **Similar elsewhere** — `MultiGameDialog` (Analyses) has the same abort-controller, progress bar and "Cancel off while writing" logic; `CollectionFilters` the same date range and player chips (with `limitTags`); `GameInfo` another key/value summary.
- **Verdict** — share candidate — an `IndexingProgress` block (and a hook for the pass) shared with `MultiGameDialog`, and the two filter fields shared with the table.

---

## `/library/<collection>/<n>` — the game

### LibraryGameScreen

- **Name and location** — `LibraryGameScreen`, `src/views/library/LibraryGameScreen.tsx`
- **Family** — empty / loading / error state
- **MUI atoms** — Typography, Box, Button (+ `LibraryMiss`, `LibraryGameBoard`)
- **What it does** — Resolves the collection and the game number, parses the game with its side lines; reading, the miss (collection or game), or "this game cannot be read" with a way back.
- **API** — none (the route).
- **Used by** — `library/LibraryGameScreenMain.tsx`.
- **Tests** — `library/Library.test.tsx` (`library-not-found` for a game past the end; the reading line and the unreadable block are not asserted).
- **Styling** — reading `text.secondary p: 2`; the unreadable block is `LibraryMiss`'s layout inline (`p: 2 grid gap: 2 justifyItems: start`, an outlined button).
- **Similar elsewhere** — `LibraryMiss`, which it copies for the unreadable case.
- **Verdict** — share candidate — the unreadable block is `LibraryMiss` with another message.

### LibraryMiss

- **Name and location** — `LibraryMiss`, `src/views/library/LibraryMiss.tsx`
- **Family** — empty / loading / error state
- **MUI atoms** — Box, Typography, Button
- **What it does** — A Library path that names nothing (a collection or a game number); a link back to the Library.
- **API** — `what: "collection" | "game"`.
- **Used by** — `CollectionScreen`, `LibraryUploadRoute`, `LibraryGameScreen`.
- **Tests** — `library/Library.test.tsx` (`library-not-found`).
- **Styling** — `p: 2`, `grid gap: 2 justifyItems: start` (left-aligned); message a default `Typography` (`body1`); `Button variant="outlined"` at the default size.
- **Similar elsewhere** — `MissingRepertoire` (Repertoires) and the analysis settings screen's miss: centred, `py: 4`, `body2 text.secondary`, a **small** outlined button ([empty / loading / error state](./Shared.md#empty--loading--error-state)).
- **Verdict** — share candidate — one `NotFound` with a message and a way back.

### LibraryGameBoard header

- **Name and location** — inline in `LibraryGameBoard`, `src/views/library/LibraryGameBoard.tsx:235-330`
- **Family** — toolbar / action bar
- **MUI atoms** — Tooltip, IconButton, Box, Typography, FormControlLabel, Switch (+ `CurrentOpening`, `PlayToggleButton`)
- **What it does** — Back (to the table as it was left, `state.from`), "Game n of m · event · round · date · result", the current opening, previous / next game, Save (lights and opens the changes strip while the tree differs), Play, the engine switch.
- **API** — inline in `LibraryGameBoard` (the `header` slot).
- **Used by** — `LibraryGameBoard`.
- **Tests** — `library/Library.test.tsx` (`library-game-caption`, `-previous`, `-save`, `-play`; back, next and the engine switch are not asserted by id), `board/panelPropagation.test.tsx`.
- **Styling** — the caption `caption text.secondary noWrap dir="auto"` with a `title` for the full text; icon buttons `small`, disabled ones in bare spans; Save `color="primary"` and `aria-pressed` while changed; the engine switch `small`, `marginInlineEnd: 0`.
- **Similar elsewhere** — the other board headers; the Save button is the same as `AnalysisBoard`'s and `RepertoirePlayer`'s ([toolbar / action bar](./Shared.md#toolbar--action-bar)).
- **Verdict** — share candidate — `SaveChangesButton`, and the header order.

### Moves-tab arrows switch

- **Name and location** — inline in `LibraryGameBoard`, `src/views/library/LibraryGameBoard.tsx:345-356`
- **Family** — form / settings group
- **MUI atoms** — FormControlLabel, Switch
- **What it does** — The next-move arrows on / off, at the top of the Moves tab.
- **API** — inline in `LibraryGameBoard`.
- **Used by** — `LibraryGameBoard`.
- **Tests** — `library/Library.test.tsx` (`library-game-arrows`).
- **Styling** — `Switch size="small"`, `FormControlLabel m: 0 px: 1`.
- **Similar elsewhere** — the Openings explorer's Moves tab (identical), Play with Engine's Engine tab, the Analysis Board's Arrows tab.
- **Verdict** — module-specific but needs design consistency — one setting, three homes.

### Export tab — Open in analysis

- **Name and location** — inline in `LibraryGameBoard`, `src/views/library/LibraryGameBoard.tsx:371-395`
- **Family** — toolbar / action bar
- **MUI atoms** — Box, Button, Typography (+ `AnalysisExport`)
- **What it does** — A link to the game on the Analysis Board at the position on screen, and a caption that says unsaved changes stay behind; then the Analysis Board's Export tab.
- **API** — inline in `LibraryGameBoard`.
- **Used by** — `LibraryGameBoard`.
- **Tests** — `library/Library.test.tsx` (`library-game-open-analysis`).
- **Styling** — `grid gap: 0.5 justifyItems: start`; `Button size="small" variant="outlined"` with an open-in-new icon; `caption text.secondary`.
- **Similar elsewhere** — the button-over-help-caption block of `MergeSplitChoice` and `MultiGameDialog`; Play with Engine's *Open in analysis* is a `contained` button in its footer.
- **Verdict** — module-specific but needs design consistency — one hand-off, two button styles.

---

## Left out, and why

| What | Why |
| --- | --- |
| `library/*Main.tsx` | Layout-only wrappers. |
| `useLibraryCollections.ts`, `indexCollection.ts` | Hooks and the worker runner — no UI. |
| `OpeningFilterBoard`'s `Chessboard`, `ChanceArrows`, `PromotionPicker` | The board and what is drawn on it — out of scope. |
| `LibraryGameBoard`'s square and player plates | The board square — out of scope. |
| The right-panel notes of `LibraryHome` (`library.hint`) and `LibraryUpload` (`library.upload.storage`) | A lone `Typography` — trivial; see `AnalysisPlaceholder` in [`Shared.md`](./Shared.md#analysisplaceholder) for the pattern. |
| The changes strip | `RepertoireChangesBar` under `library.changes` / `library.shippedChanges` — [`Repertoires.md`](./Repertoires.md#repertoirechangesbar). |

---

## Consistency notes

- **table** — the Library owns two of the four tables. The collection table is
  the reference the Lobby copied; Library home's `FolderTreeTable` differs from
  both (denser rows, right-aligned numbers, a medium date, hover-revealed
  actions, no pagination, its empty line outside the component). Full
  comparison: [the four tables](./Shared.md#the-four-tables).
- **toolbar / action bar** — the collection's top bar is the tightest list bar
  (`pb: 1`, no `mb`) and the only one with a busy button; Library home's matches
  the Lobby's. The folder actions differ from Saved analyses' and Repertoires'
  in set, order, icons and visibility (hover here, always there). The Library
  and `TreeMap` are the only places that name their icon-button helper.
- **filter bar** — filters in the right panel (unique to the collection); the
  words boxes are plain labelled fields; the date range and the player chips
  are duplicated with the import popup; the side toggle is `fullWidth` here and
  not in the Lobby.
- **dialog** — five of the module's own: the two hand-written deletes (default
  width, text `error`) sit on screens that also open the shared
  `FolderDeleteDialog` (`xs`, contained `error`); `CollectionMoveDialog`
  re-writes `FolderMoveDialog`; the import popup and the tree-PGN choice are
  `sm` / `xs` with `fullWidth`.
- **list** — the continuation list is one of three renderings of "the moves
  from here", and its result bar is the only hard-coded grey palette.
- **feedback** — the Analyse snackbar (filled `Alert`, an action) is richer
  than the app's other snackbar; problems are `Alert`s on the upload and in
  the delete dialog.
- **empty / loading / error state** — `LibraryMiss` is left-aligned `body1`
  with a medium button where the other modules' misses are centred `body2`
  with a small one; the reading and empty lines match everyone else's.
- **form / settings group** — the upload screen matches the repertoire
  upload's paste size (6 / 14), not the Analysis Load tab's (4 / 10); the
  folder picker is framed only here.
