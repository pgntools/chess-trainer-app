# Engine — Play with Engine, Masked Pieces, the Lobby

`src/views/engine/`: the Lobby (`/engine/games` — the played games' table and
the new-game form), Play with Engine (`/engine/play`) and Masked Pieces
(`/engine/masked`, the same screen in a costume). The module's reference is
[`.claude/rules/play-with-engine.md`](../../.claude/rules/play-with-engine.md)
and [`masked-pieces.md`](../../.claude/rules/masked-pieces.md). Template and
families: [`README.md`](./README.md).

**Migrated onto the design system by CTA-109** (the pilot): each entry below
is marked with what replaced it, and describes the component as it was.
The binding decisions, the order of work and the pilot's findings are
[`migration.md`](./migration.md).

**Documented in [`Shared.md`](./Shared.md), not here**: `BoardPanel` (the
panel skeleton the game screen fills), `OptionSlider`, `CurrentOpening`, the
`PositionEditor` hosted by the new-game form, and the explorer's chrome.
**In [`Analyses.md`](./Analyses.md)**: `PlayToggleButton` and `EngineThinking`,
which live in `views/tools/analysis/` and are rendered here.

---

## The Lobby — `views/engine/games/`

### PlayedGames

> **Migrated (CTA-109)** — the `PlayedGamesTable` block (`blocks/tables/`) over `DataTable`, its sort and page `useTableUrlState`'s; page sizes 25 / 50 / 100 / 250, 50 by default; dates `YYYY-MM-DD`; the row actions one always-visible column at the row's end.

- **Name and location** — `PlayedGames`, `src/views/engine/games/PlayedGames.tsx:251`
- **Family** — table
- **MUI atoms** — Box, TableContainer, Table, TableHead, TableBody, TableRow, TableCell, TableSortLabel, TablePagination, Checkbox, Typography (+ the top bar, filters and dialog below)
- **What it does** — The played games of Play with Engine and Masked Pieces as a sortable, paginated table: a pick column (select-all in its header, over the rows the filters leave, on every page), Analysis and Continue icon columns, then White, White Elo, Black, Black Elo, Result, Opening, Moves (side lines as secondary text), Masked, Date. Sort, direction, page and rows per page are the URL's (`?sort=`, `?dir=`, `?page=`, `?rows=`, replace, defaults omitted); a new sort or filter resets the page. Opens Date ↓; a second click turns a column; missing values last.
- **API** — none (a route screen). Renders `NewGameForm` into the right panel.
- **Used by** — `engine/games/Main.tsx` (`/engine/games`).
- **Tests** — `engine/games/PlayedGames.test.tsx` (columns, sort click, pagination, picks and select-all, delete, the icon links, an unreadable row, filters); the sort orders in `src/lib/playedGames.test.ts`.
- **Styling** — `TableContainer flex: 1; minHeight: 0` (the one scrolling region), `Table size="small" stickyHeader`; header cells `nowrap` 600; pick and icon columns `padding="checkbox"`; names `dir="auto" nowrap`, result and date `dir="ltr" nowrap`, opening `minWidth: 160`; `TablePagination component="div" flexShrink: 0`, 10 / 25 / 50 rows, 25 by default.
- **Similar elsewhere** — `CollectionTable` (Library) is the pattern this was built from; `FolderTreeTable` and `StorageTab` are the other two tables — [the four tables](./Shared.md#the-four-tables). Its sort / URL helpers (`DEFAULT_SORT`, `defaultDirection`, `isColumn`, `setState`, `sortBy`) are copies of the collection table's.
- **Verdict** — module-specific but needs design consistency — the select-all placement, the always-visible icon columns and the page sizes differ from the collection table it copies.

### PlayedGameRow

> **Migrated (CTA-109)** — `PlayedGamesTable`'s columns and row actions (`IconAction`s, each named by its row); the unreadable row is `DataTable`'s `rowNote`.

- **Name and location** — `PlayedGameRow`, `src/views/engine/games/PlayedGames.tsx:130`
- **Family** — table
- **MUI atoms** — TableRow, TableCell, Checkbox, Tooltip, IconButton, Typography, Chip
- **What it does** — One game: the pick checkbox (labelled by the players), the Analysis link (`/tools/analysis?game=play/games/<id>`), the Continue link (only while the game is on; `/engine/masked` for a masked game), the cells, a *Masked* chip. An unreadable record says so in one cell across the columns and can only be picked.
- **API** — `row: PlayedGameRow`, `picked`, `onTogglePicked(id)`.
- **Used by** — `PlayedGames`.
- **Tests** — `engine/games/PlayedGames.test.tsx` (`played-games-row-`, `-pick-`, `-analysis-`, `-continue-`, `-masked-`).
- **Styling** — each control its own `padding="checkbox"` cell, so a missing Continue leaves its cell empty; icon links `IconButton size="small" component={RouterLink}` with tooltips and `aria-label`s; the Masked chip `size="small" variant="outlined" height: 20` with an icon; variations `caption text.secondary` as a block under the move count.
- **Similar elsewhere** — `CollectionTable`'s rows open the game on a row click and carry no action icons; `FolderTreeTable`'s actions are hover-revealed in one column.
- **Verdict** — module-specific but needs design consistency — row actions should follow one rule across the tables.

### Lobby top bar

> **Migrated (CTA-109)** — `ListScreenHeader`, Delete picked in its actions.

- **Name and location** — inline in `PlayedGames`, `src/views/engine/games/PlayedGames.tsx:417-458`
- **Family** — toolbar / action bar
- **MUI atoms** — Box, Typography, Button
- **What it does** — The title, the count ("N games", or "N of M" under a filter), and **Delete picked (N)** once something is picked.
- **API** — inline in `PlayedGames`.
- **Used by** — `PlayedGames`.
- **Tests** — `engine/games/PlayedGames.test.tsx` (`played-games-count`, `played-games-delete-picked`).
- **Styling** — outer `pb: 1.5 mb: 0.5`, bottom divider; row `gap: 1`; title `subtitle1` 700 `lineHeight: 1.3`; count `caption text.secondary`; delete `Button size="small" color="error" variant="outlined"` with a delete icon.
- **Similar elsewhere** — the other list screens' top bars ([toolbar / action bar](./Shared.md#toolbar--action-bar)); `SavedListExportBar` does the picks' job in the three other picking screens.
- **Verdict** — share candidate — one `ListScreenHeader` with the export bar in its actions.

### Lobby filter bar

> **Migrated (CTA-109)** — the `PlayedGamesFilters` block (`SideToggle` with "all", `SelectField`), in the table's filters slot.

- **Name and location** — inline in `PlayedGames`, `src/views/engine/games/PlayedGames.tsx:459-511`
- **Family** — filter bar
- **MUI atoms** — Box, ToggleButtonGroup, ToggleButton, TextField (`select`), MenuItem
- **What it does** — The side the reader played (All / White / Black, `?color=`) and the opening each game reached (`?opening=`, offered from the games' own openings, off until the ~3 MB book lands, a URL value no game reached still shown as chosen).
- **API** — inline in `PlayedGames`.
- **Used by** — `PlayedGames`.
- **Tests** — `engine/games/PlayedGames.test.tsx` (`played-games-filter-color-*`; the opening select through its combobox role, including off while the book loads).
- **Styling** — wrapping row `gap: 1.5 mt: 1.25`; plain `ToggleButtonGroup size="small"`; the select `size="small"`, label always shrunk, `displayEmpty`, `minWidth: 220`, `flex: 1 1 220px`, `maxWidth: 360`, a "loading" helper text while the book loads.
- **Similar elsewhere** — `CollectionFilters` (Library) — its side filter is the same three-way toggle (`fullWidth`, "Any colour / As white / As black"), in the right panel rather than the top bar.
- **Verdict** — module-specific but needs design consistency — filters live in the top bar here and in the panel on the collection table.

### Lobby loading and empty states

> **Migrated (CTA-109)** — `DataTable`'s loading, empty and no-match rows.

- **Name and location** — inline in `PlayedGames`, `src/views/engine/games/PlayedGames.tsx:513` (loading) and `:568` (empty / no match)
- **Family** — empty / loading / error state
- **MUI atoms** — Typography
- **What it does** — "Reading…" until the store's first read; under the table, "no games yet" or "no game matches" (two test ids).
- **API** — inline in `PlayedGames`.
- **Used by** — `PlayedGames`.
- **Tests** — `engine/games/PlayedGames.test.tsx` (`played-games-loading`, `-empty`, `-no-match`).
- **Styling** — loading `text.secondary p: 2`; empty `body2 text.secondary` centred `py: 4`, inside the table container.
- **Similar elsewhere** — the reading line and the empty line are the same in every list screen ([empty / loading / error state](./Shared.md#empty--loading--error-state)).
- **Verdict** — share candidate — `LoadingLine` and `EmptyState`.

### Delete picked games dialog

> **Migrated (CTA-109)** — `DeleteManyDialog` — the contained red confirm.

- **Name and location** — inline in `PlayedGames`, `src/views/engine/games/PlayedGames.tsx:602`
- **Family** — dialog
- **MUI atoms** — Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button
- **What it does** — "Delete N games?" for the picks; confirm removes them and clears the picks.
- **API** — inline in `PlayedGames`.
- **Used by** — `PlayedGames`.
- **Tests** — `engine/games/PlayedGames.test.tsx` (`played-games-delete-dialog`, `-delete-confirm`).
- **Styling** — default width; confirm `color="error"`, text variant.
- **Similar elsewhere** — the collection table's delete-picked dialog and `RepertoireBulkDeleteDialog` (contained error button, `xs`) — [dialog](./Shared.md#dialog).
- **Verdict** — share candidate — the third "delete N picked" dialog.

### NewGameForm

> **Migrated (CTA-109)** — stays a screen (it hosts the position editor), composed of `PanelTabs`, `SideToggle`, `CheckboxField`, `InlineAlert` and the `EngineSettingsForm` block.

- **Name and location** — `NewGameForm`, `src/views/engine/games/NewGameForm.tsx`
- **Family** — form / settings group
- **MUI atoms** — Box, Typography, Tabs, Tab, Alert, Button, ToggleButtonGroup, ToggleButton, FormControlLabel, Checkbox (+ `EngineSettings`, `PositionEditor`)
- **What it does** — The Lobby's right panel: two tabs — **Game** (the side, `EngineSettings` over an engine that handshakes but never searches, a Variations checkbox) and **Board editor** (the shared `PositionEditor`, its state the form's, the board facing the chosen side) — then a full-width **Start** to `/engine/play?…` (a custom position rides as `fen`). Defaults on every visit.
- **API** — none.
- **Used by** — `PlayedGames` (in `RightPanel`).
- **Tests** — `engine/games/PlayedGames.test.tsx` (the form, both tabs, Start's link, Start off and why).
- **Styling** — column `height: 100%`, `gap: 1.5`; title `subtitle1` 700; the tab strip copies `BoardPanel`'s sx (`fullWidth`, `minHeight: 36`, `textTransform: none`); the tab body the panel's one scrolling region (`overflowY: auto`, `pr: 0.5`); editor board capped at 360px.
- **Similar elsewhere** — `NewAnalysisForm` (Analyses), the other Lobby form: the same title, scrolling body and Start footer, no tabs.
- **Verdict** — module-specific but needs design consistency — the two Lobby forms should share their frame (title, body, footer).

### Custom-position notice

> **Migrated (CTA-109)** — `InlineAlert` (info), the FEN its `detail`.

- **Name and location** — inline in `NewGameForm`, `src/views/engine/games/NewGameForm.tsx:169-201`
- **Family** — feedback (alert / snackbar)
- **MUI atoms** — Alert, Typography, Box, Button
- **What it does** — On the Game tab, when the editor holds a position other than the standard start: says so, prints the FEN, and offers *Edit* (switches tab) and *Use the standard start*.
- **API** — inline in `NewGameForm`.
- **Used by** — `NewGameForm`.
- **Tests** — `engine/games/PlayedGames.test.tsx` (`new-game-custom-position`, `-reset`; *Edit* is not exercised).
- **Styling** — `Alert severity="info" mb: 2`, `& .MuiAlert-message { minWidth: 0 }`; the FEN `caption` in `fontFamily: "monospace"`, `wordBreak: break-all`, `dir="ltr"`; two `Button size="small"` text buttons.
- **Similar elsewhere** — the only `info` Alert with actions; the other Alerts with actions are the snackbar notice (Library).
- **Verdict** — module-specific but needs design consistency — the FEN's monospace is a different stack from every other notation token.

### Side choice

> **Migrated (CTA-109)** — `SideToggle fullWidth` under a `FieldLabel`.

- **Name and location** — inline in `NewGameForm`, `src/views/engine/games/NewGameForm.tsx:202-224`
- **Family** — form / settings group
- **MUI atoms** — Box, Typography, ToggleButtonGroup, ToggleButton
- **What it does** — The side the reader will play (White / Black).
- **API** — inline in `NewGameForm`.
- **Used by** — `NewGameForm`.
- **Tests** — `engine/games/PlayedGames.test.tsx` (`new-game-side-*`).
- **Styling** — label `body2` 600 `mb: 0.75`; group `fullWidth size="small"`.
- **Similar elsewhere** — seven other White / Black toggles, five `sx` variants — [form / settings group](./Shared.md#form--settings-group).
- **Verdict** — share candidate — a `SideToggle`.

### Start footer

> **Migrated (CTA-109)** — its warning an `InlineAlert`; Start and the note unchanged.

- **Name and location** — inline in `NewGameForm`, `src/views/engine/games/NewGameForm.tsx:255-287`
- **Family** — toolbar / action bar
- **MUI atoms** — Box, Alert, Button, Typography
- **What it does** — Below both tabs: a warning listing the position's problems while it cannot be played from, **Start** (a link, or a plain disabled button when off), and the storage note.
- **API** — inline in `NewGameForm`.
- **Used by** — `NewGameForm`.
- **Tests** — `engine/games/PlayedGames.test.tsx` (`new-game-illegal`, `new-game-start`, `played-games-storage-note`).
- **Styling** — `display: grid gap: 1 flexShrink: 0`; `Alert severity="warning" py: 0.5` with a `ul` `pl: 2`; Start `variant="contained" size="large" fullWidth`, `py: 1.25`, 700, a play icon; note `caption text.secondary`.
- **Similar elsewhere** — `NewAnalysisForm`'s footer (Analyses) is this block again, down to the `sx`; the problems list is also the `PositionEditor`'s own `Alert`.
- **Verdict** — share candidate — one `StartFooter` for both Lobby forms.

---

## The game screen — `views/engine/play/`

### EngineSettings

> **Migrated (CTA-109)** — the `EngineSettingsForm` block (`blocks/forms/`: `SliderField`s, the absent / pinned / adjustable rule as `engineOptionState`, a `SwitchField`); `EngineSettings.tsx` is its one-line adapter under the module's ids.

- **Name and location** — `EngineSettings`, `src/views/engine/play/EngineSettings.tsx`
- **Family** — form / settings group
- **MUI atoms** — Box, Typography, Slider, FormControlLabel, Switch (+ `OptionSlider`)
- **What it does** — The Engine tab: strength (Skill Level, with an Elo estimate), depth, move time, lines, threads, hash (each option-backed one rendered from what the engine declared) and the eval bar switch.
- **API** — `settings`, `onChange(patch)`, `engineOptions`, `showEvalBar`, `onShowEvalBarChange`.
- **Used by** — `PlayScreen` (Engine tab), `NewGameForm` (Game tab).
- **Tests** — `engine/play/EngineSettings.test.tsx`, `engine/play/PlayWithEngine.test.tsx`, `engine/games/PlayedGames.test.tsx`.
- **Styling** — `display: grid gap: 2`; depth and move time hand-copy `OptionSlider`'s header (label `body2` 600, value `body2 text.secondary dir="ltr"`, baseline row); `Slider size="small"`; the eval-bar `Switch` at the default size.
- **Similar elsewhere** — `AnalysisSettings` (Analyses) — the analysis boards' Engine tab: the same depth and move-time rows (dimmed while the engine is off), MultiPV, the eval bar, plus Clear.
- **Verdict** — module-specific but needs design consistency — the two Engine tabs share their rows by copy; a `LabeledSlider` would join them.

### PlayScreen header

> **Migrated (CTA-109)** — `BackButton`, `SideToggle`, `IconAction`s (Replay, Resign), a small `SwitchField` for the engine.

- **Name and location** — inline in `PlayScreen`, `src/views/engine/play/PlayScreen.tsx:205-302`
- **Family** — toolbar / action bar
- **MUI atoms** — Tooltip, IconButton, Box, ToggleButtonGroup, ToggleButton, FormControlLabel, Switch (+ `CurrentOpening`, `PlayToggleButton`)
- **What it does** — The game's controls: back to the Lobby, the current opening, the reader's side (a change pauses Play), Play, Replay (asks first when there is anything to lose), Resign (asks first; off when there is nothing to resign), the engine switch.
- **API** — inline in `PlayScreen` (the `header` slot of `BoardPanel`). Ids prefixed by the screen's `id` — `play-with-engine-*` or `masked-play-*`.
- **Used by** — `PlayScreen` (Play with Engine, Masked Pieces).
- **Tests** — `engine/play/PlayWithEngine.test.tsx`, `engine/masked/MaskedPlay.test.tsx`, `board/boards.test.tsx`, `board/panelPropagation.test.tsx`.
- **Styling** — every control `size="small"`, `flexShrink: 0`; side buttons `py: 0.25 px: 1`; Resign in a bare `<span>` for its disabled tooltip; the engine switch `FormControlLabel` `marginInlineEnd: 0`.
- **Similar elsewhere** — the other board headers (`AnalysisBoard`, `LibraryGameBoard`, `OpeningsBoard`, `RepertoirePlayer`) — [toolbar / action bar](./Shared.md#toolbar--action-bar). This one alone has a side toggle in the header (the repertoire player keeps its side in a Settings tab).
- **Verdict** — module-specific but needs design consistency — the back / engine-switch placement should match the other boards'.

### Engine tab body

> **Migrated (CTA-109)** — a small `SwitchField` over `EngineSettingsForm`.

- **Name and location** — inline in `PlayScreen`, `src/views/engine/play/PlayScreen.tsx:326-347`
- **Family** — form / settings group
- **MUI atoms** — Box, FormControlLabel, Switch (+ `EngineSettings`)
- **What it does** — The next-move arrows switch above `EngineSettings`.
- **API** — inline in `PlayScreen`.
- **Used by** — `PlayScreen`.
- **Tests** — none asserts the switch (`play-with-engine-arrows`); `engine/play/PlayWithEngine.test.tsx` and `EngineSettings.test.tsx` cover the settings below it.
- **Styling** — column `gap: 1`; switch `size="small"`, `FormControlLabel m: 0` (the eval-bar switch below it is default size).
- **Similar elsewhere** — the same arrows switch sits at the top of the Moves tab on the Library game and the Openings explorer, and has its own tab (with a caption) on the Analysis Board.
- **Verdict** — module-specific but needs design consistency — one arrows setting, three placements and two switch sizes in one tab.

### Game-over treatment

> **Migrated (CTA-109)** — `StatusText` (neutral, emphasised — a `status`); the button unchanged.

- **Name and location** — inline in `PlayScreen`, `src/views/engine/play/PlayScreen.tsx:373-409`
- **Family** — feedback (alert / snackbar)
- **MUI atoms** — Typography, Button
- **What it does** — Once the game is decided: the result stated (resigned, or mate / stalemate / a draw by rule) and, once the autosave has named a record, **Open in analysis**.
- **API** — inline in `PlayScreen` (the footer slot).
- **Used by** — `PlayScreen`.
- **Tests** — `engine/play/PlayWithEngine.test.tsx` (`-ended`, `-resigned`, `-open-analysis`).
- **Styling** — `body2` 600 `px: 1 py: 0.5` with `role="status"`; the button `size="small" variant="contained" mx: 1 mb: 0.5`.
- **Similar elsewhere** — `EngineThinking` (Play's status line) and the repertoire player's status line are the other footer status lines.
- **Verdict** — module-specific but needs design consistency — a footer status is written three ways.

### Save-problem line

> **Migrated (CTA-109)** — `StatusText` (error — an `alert`).

- **Name and location** — inline in `PlayScreen`, `src/views/engine/play/PlayScreen.tsx:355-364`
- **Family** — feedback (alert / snackbar)
- **MUI atoms** — Typography
- **What it does** — "The game could not be saved" under the comment block.
- **API** — inline in `PlayScreen`.
- **Used by** — `PlayScreen`.
- **Tests** — none (`-save-problem` is not asserted).
- **Styling** — `caption` in `error.main`, `px: 1`, `role="alert"`.
- **Similar elsewhere** — `AnalysisBoard`'s save problem is the same line; `RepertoireChangesBar`'s problem is a caption too; every non-board screen uses `Alert severity="error"`.
- **Verdict** — module-specific but needs design consistency — board footers and screens report errors differently.

### Replay / Resign confirm

> **Migrated (CTA-109)** — `ConfirmDialog tone="destructive"` — the contained red confirm.

- **Name and location** — inline in `PlayScreen`, `src/views/engine/play/PlayScreen.tsx:423-451`
- **Family** — dialog
- **MUI atoms** — Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button
- **What it does** — One dialog for both game-ending actions, worded by which was asked.
- **API** — inline in `PlayScreen`.
- **Used by** — `PlayScreen`.
- **Tests** — `engine/play/PlayWithEngine.test.tsx` (`-confirm`, `-confirm-ok`).
- **Styling** — default width; confirm `color="error"`, text variant.
- **Similar elsewhere** — [dialog](./Shared.md#dialog): the destructive confirms.
- **Verdict** — share candidate — the shared destructive confirm.

### PlayedGameRead

> **Migrated (CTA-109)** — `LoadingLine`.

- **Name and location** — `PlayedGameRead`, `src/views/engine/play/PlayedGameRead.tsx`
- **Family** — empty / loading / error state
- **MUI atoms** — Typography
- **What it does** — The play routes' wait for the played games' first read when the URL names one (`?saved=`); renders its children after.
- **API** — `testId` (`<testId>-loading`), `children`.
- **Used by** — `PlayWithEngine`, `MaskedPlay`.
- **Tests** — `engine/play/PlayWithEngine.test.tsx` (`play-with-engine-loading`); Masked Pieces' wait is not asserted.
- **Styling** — `text.secondary p: 2`.
- **Similar elsewhere** — the reading line of every other route ([empty / loading / error state](./Shared.md#empty--loading--error-state)).
- **Verdict** — share candidate — a wrapper around the shared `LoadingLine`.

---

## Masked Pieces — `views/engine/masked/`

### MaskEditor

> **Migrated (CTA-109)** — the `MaskEditor` block (`blocks/forms/`): `FieldLabel`, `SelectField`s in two fieldsets, captioned `SwitchField`s; the presets stay a vertical toggle group ([`migration.md`](./migration.md#44-left-hand-written-and-why)).

- **Name and location** — `MaskEditor` and the inner `ColorColumn` (`:53`), `src/views/engine/masked/MaskEditor.tsx`
- **Family** — form / settings group
- **MUI atoms** — Box, Typography, ToggleButtonGroup, ToggleButton, InputLabel, Select (`native`), FormControlLabel, Switch
- **What it does** — The mask: three presets (a vertical toggle group; none selected for a custom mask), then twelve per-type selects in two colour columns, each offering only its own colour's six types; then the notation switch with a hint.
- **API** — `mask`, `onMaskChange`, `maskNotation`, `onMaskNotationChange`. Ids `mask-editor`, `mask-presets`, `mask-preset-<id>`, `mask-column-<w|b>`, `mask-select-<type>`, `mask-setting-notation`.
- **Used by** — `MaskedPlay` (the Masking tab).
- **Tests** — `engine/masked/MaskedPlay.test.tsx` (`mask-preset-*`, `mask-setting-notation`); the per-type selects have no test by id.
- **Styling** — `grid gap: 2`; section labels `body2` 600 `mb: 0.5`; presets `orientation="vertical" fullWidth size="small"`; columns `repeat(2, minmax(0, 1fr)) gap: 2`, column titles `body2` 700; row labels an `InputLabel` at a raw `fontSize: 0.8125rem` in `text.primary`; the only `native` select in the app; the notation switch at the default size with a `caption` hint.
- **Similar elsewhere** — the switch-and-caption pattern ([form / settings group](./Shared.md#form--settings-group)); every other select is a `TextField select`.
- **Verdict** — module-specific but needs design consistency — the native select and the raw font size are unique to it.

### Masking tab

> **Migrated (CTA-109)** — part of the `MaskEditor` block (the engine-lines switch a captioned `SwitchField`).

- **Name and location** — inline in `MaskedPlayArrival`, `src/views/engine/masked/MaskedPlay.tsx:85-110`
- **Family** — form / settings group
- **MUI atoms** — Box, Divider, FormControlLabel, Switch, Typography (+ `MaskEditor`)
- **What it does** — The fourth tab of Masked Pieces: the mask editor, a divider, then the engine-lines switch (off by default) with its hint.
- **API** — inline in `MaskedPlay` (handed to `PlayScreen` as `masking.tab`).
- **Used by** — `PlayScreen` (Masked Pieces only).
- **Tests** — `engine/masked/MaskedPlay.test.tsx` (`mask-setting-lines`, `masked-play-panel-tab-masking`).
- **Styling** — `grid gap: 2`; the switch default size, no `FormControlLabel` margin reset; hint `caption text.secondary` block.
- **Similar elsewhere** — `SwitchOption` / `SwitchSetting` (Repertoires) and the Arrows tab (Analyses).
- **Verdict** — share candidate — the switch-with-help pattern.

---

## Left out, and why

| What | Why |
| --- | --- |
| `play/PlayWithEngine.tsx` | The route: reads the arrival and redirects; no MUI. |
| `engine/*/Main.tsx` | Layout-only wrappers (`Box height: 100%`). |
| `play/usePlayGame.ts`, `games/usePlayedGames.ts` | Hooks — no UI. |
| `PlayScreen`'s `BoardShell` props (square, captured strips, masked pieces, eval bar) | The board square — out of scope. |
| The Moves tab (`explorer.moves`), the next-moves bar, the comment block | The explorer's parts — [`Shared.md`](./Shared.md#the-explorers-chrome--viewsexplorer) and [`Analyses.md`](./Analyses.md#nextmovesbar). |
| The Lobby's right-panel note (`played-games-storage-note`) | Part of the Start footer above. |

---

## Consistency notes

- **table** — `PlayedGames` copies the collection table's URL state and sort
  rules but puts select-all in the header cell, always shows its row actions as
  icon columns, pages by 10 / 25 / 50 (the collection by 50 / 100 / 250), and
  formats dates with `savedListDate`. Full comparison:
  [the four tables](./Shared.md#the-four-tables).
- **toolbar / action bar** — the Lobby's top bar matches Library home's spacing
  (`pb: 1.5 mb: 0.5 gap: 1`) but not the saved lists' (`gap: 1.5`, wrapping);
  its picks' action is a text "Delete picked (N)" button where the three other
  picking screens use `SavedListExportBar`. The game header is the only board
  header with a side toggle.
- **filter bar** — top-bar filters here, right-panel filters on the collection
  table; the side filter is the same three-way toggle as the collection's,
  without `fullWidth`.
- **dialog** — both dialogs (delete picked, replay / resign) are the
  hand-written kind: default width and a text `error` button, where the shared
  and repertoire confirms are `xs` with a contained `error` button.
- **form / settings group** — `EngineSettings` and the analysis Engine tab
  share rows by copy; the White / Black side appears twice in the module
  (`fullWidth` in the form, `py: 0.25 px: 1` in the header); the Masking tab's
  switches are default-sized with a caption, the Engine tab's are small and
  bare.
- **feedback** — the game-over status, the custom-position `info` Alert, and
  the save-problem caption are three different styles of "the screen tells you
  something".
- **empty / loading / error state** — the reading line (`text.secondary p: 2`)
  and the empty line (`body2 text.secondary` centred `py: 4`) match every
  other module.
- **tabs** — `NewGameForm`'s strip is `BoardPanel`'s sx, copied.
