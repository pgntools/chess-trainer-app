# Analyses — the Analysis Board's panel and Saved analyses

`src/views/tools/analysis/` and `saved/`: the Analysis Board's right-hand
panel (`/tools/analysis`), Saved analyses (`/tools/analysis/saved`, with the
new-analysis form in its panel) and a saved analysis' settings
(`/tools/analysis/saved/<id>/settings`). The folder also holds the panel pieces
**Migrated onto the design system by CTA-113**: each entry below is marked
with what replaced it, and describes the component as it was. The binding
decisions, the order of work and the findings are
[`migration.md`](./migration.md).

**every board borrows** — the Load, Export and Engine tab bodies, Play's button
and status line, the next-moves bar — documented here, where they live. The
module's reference is
[`.claude/rules/analysis-board.md`](../../.claude/rules/analysis-board.md).
Template and families: [`README.md`](./README.md).

**Documented in [`Shared.md`](./Shared.md), not here**: `BoardPanel`,
`CurrentOpening`, `OptionSlider`, `CopyableValue`, `MergeSplitChoice`,
`SavedListExportBar`, `SavedListViewToggle`, the saved-list grid, the folder
pieces (`SavedFolderRow` / `Card`, `SavedFolderBreadcrumb`, `FolderNameDialog`,
`FolderMoveDialog`, `FolderDeleteDialog`, `FolderPicker`), `PositionEditor` and
the explorer's chrome. **In [`Repertoires.md`](./Repertoires.md)**:
`RepertoireChangesBar` (the board's changes strip) and
`RepertoireBulkDeleteDialog` (Saved analyses' bulk delete), both borrowed from
`views/repertoires/`.

---

## Saved analyses — `saved/SavedAnalyses.tsx`

### SavedAnalysesList

> **Migrated (CTA-113)** — the `SavedAnalysesList` block (`blocks/lists/`) over `RecordRow` / `RecordCard` / `FolderRow` / `FolderCard`, `CardGrid`.

- **Name and location** — `SavedAnalysesList`, `src/views/tools/analysis/saved/SavedAnalyses.tsx:410` (the route `SavedAnalyses` at `:396`)
- **Family** — list
- **MUI atoms** — Box, List, Pagination, Typography (+ the rows, cards, top bar and dialogs below)
- **What it does** — The saved analyses, newest first, in a nested folder tree (`?folder=` is where the reader stands): folders first, then the folder's analyses; as a list or as preview cards at two sizes; 48 a page, each record's tree parsed only when its page shows; picks kept across folders and views; folders created, renamed, moved, deleted (keeping their contents) and downloaded; the picks downloaded or deleted in bulk.
- **API** — `analyses`, `folders` (the route passes the two stores once read).
- **Used by** — `saved/Main.tsx` (`/tools/analysis/saved`).
- **Tests** — `tools/analysis/saved/SavedAnalyses.test.tsx`.
- **Styling** — a flex column; the body the one scrolling region (`flex: 1; minHeight: 0; overflowY: auto`); the grid `savedListGridSx(view)`; `Pagination size="small"`, centred, `pt: 1`, only when there is more than a page.
- **Similar elsewhere** — `RepertoiresList` (Repertoires) is the same screen: same bar, rows, cards and export bar, one-level folders, no paging. The other list screens are tables ([the four tables](./Shared.md#the-four-tables)).
- **Verdict** — module-specific but needs design consistency — the sister of `RepertoiresList`; the two should become one list screen with module slots.

### Saved analyses top bar

> **Migrated (CTA-113)** — `ListScreenHeader`, `SelectionBar`, `ViewToggle`, `Breadcrumbs`.

- **Name and location** — inline in `SavedAnalysesList`, `src/views/tools/analysis/saved/SavedAnalyses.tsx:585-665`
- **Family** — toolbar / action bar
- **MUI atoms** — Box, Typography, Button (+ `SavedListExportBar`, `SavedListViewToggle`)
- **What it does** — The title and count, **New** (a blank Analysis Board), **New folder** (inside the folder the reader is in), the export bar (select-all over this folder's rows; download; delete), the view toggle.
- **API** — inline in `SavedAnalysesList`.
- **Used by** — `SavedAnalysesList`.
- **Tests** — `tools/analysis/saved/SavedAnalyses.test.tsx` (`saved-analyses-count`, `-new`, `-new-folder`, `-select-all`, `-view-*`).
- **Styling** — wrapping row `gap: 1.5 pb: 1.5 mb: 0.5`, bottom divider; the title block pushes the rest with `marginInlineEnd: auto`; title `subtitle1` 700 `lineHeight: 1.3`, count `caption text.secondary`; buttons `size="small" variant="outlined"` with `fontSize="small"` icons.
- **Similar elsewhere** — `Repertoires`' bar is the same `sx`; the Lobby's and Library's are tighter and do not wrap ([toolbar / action bar](./Shared.md#toolbar--action-bar)).
- **Verdict** — share candidate — `ListScreenHeader`.

### SavedAnalysisRow

> **Migrated (CTA-113)** — `RecordRow` inside the `SavedAnalysesList` block.

- **Name and location** — `SavedAnalysisRow`, `src/views/tools/analysis/saved/SavedAnalyses.tsx:253` (caption hook `useCaption` at `:186`)
- **Family** — list
- **MUI atoms** — ListItem, Box, Typography, Button
- **What it does** — One analysis: its name, "N moves · N side lines · at move N · date", its description; **Open** (not for a record that will not parse), the settings gear, the pick.
- **API** — `saved`, `tree | undefined`, `checked`, `onToggle`.
- **Used by** — `SavedAnalysesList` (list view).
- **Tests** — `tools/analysis/saved/SavedAnalyses.test.tsx` (`saved-analyses-item-`, `-open-`; the description line is not asserted).
- **Styling** — `ListItem disableGutters`, wrapping, `gap: 1.5 py: 1.25`, bottom divider; name `subtitle2` 600 `dir="auto"`; the line `caption text.secondary` with an ellipsis; description the same, italic, `dir="auto"`; Open `Button size="small" variant="contained"`.
- **Similar elsewhere** — `RepertoireRow` (Repertoires) — the same row, whose name lacks `dir="auto"` and which adds the Games menu.
- **Verdict** — share candidate — one `SavedRecordRow`.

### SavedAnalysisCard

> **Migrated (CTA-113)** — `RecordCard` inside the `SavedAnalysesList` block.

- **Name and location** — `SavedAnalysisCard`, `src/views/tools/analysis/saved/SavedAnalyses.tsx:311`
- **Family** — card grid
- **MUI atoms** — Card, CardActionArea, Box, Typography (+ a read-only `Chessboard`, out of scope)
- **What it does** — One analysis as a preview board (where the reader was standing, facing the analysis' side) that opens it; below, the name, the line and the opening the mainline reached; the gear and the pick. An unreadable record gets its message in the board's square.
- **API** — `saved`, `tree | undefined`, `checked`, `onToggle`, `opening`.
- **Used by** — `SavedAnalysesList` (card views).
- **Tests** — `tools/analysis/saved/SavedAnalyses.test.tsx` (`saved-analyses-grid`, `-opening-`).
- **Styling** — `Card variant="outlined"`; the action area `p: 1` over a square; the unreadable square `m: 1 p: 1`, `borderRadius: 1`, `bgcolor: action.hover`; captions `caption` with ellipsis (name 600 `dir="auto"`); the opening `name · eco` in `dir="ltr"`; the actions outside the action area.
- **Similar elsewhere** — `RepertoireCard` (Repertoires) is the same card; the unreadable square is `RepertoireFolderCard`'s folder square.
- **Verdict** — share candidate — one `SavedRecordCard`.

### SettingsLink and SelectBox

> **Migrated (CTA-113)** — `RecordRow` / `RecordCard`'s settings `RowAction` and pick.

- **Name and location** — `SettingsLink` (`:220`) and `SelectBox` (`:240`), `src/views/tools/analysis/saved/SavedAnalyses.tsx`
- **Family** — toolbar / action bar
- **MUI atoms** — Tooltip, IconButton; Checkbox
- **What it does** — The settings gear (a link that hands the list back as `from`) and the pick checkbox, on the row and the card.
- **API** — `{ saved }`; `{ saved, checked, onToggle }`.
- **Used by** — `SavedAnalysisRow`, `SavedAnalysisCard`.
- **Tests** — `tools/analysis/saved/SavedAnalyses.test.tsx` (`saved-analyses-settings-`, `-select-`).
- **Styling** — `IconButton size="small"`; `Checkbox size="small"` with an `aria-label`.
- **Similar elsewhere** — `Repertoires.tsx` defines the same two components again (`:109`, `:153`).
- **Verdict** — share candidate — word for word the repertoires' pair.

### Saved analyses body states

> **Migrated (CTA-113)** — `LoadingLine`; empty and no-folder states the block's.

- **Name and location** — inline in `SavedAnalysesList`, `src/views/tools/analysis/saved/SavedAnalyses.tsx:681-697`; the route's reading line at `:400-406`
- **Family** — empty / loading / error state
- **MUI atoms** — Box, Typography
- **What it does** — "No saved analyses yet" at the top level, "this folder is empty" inside one; "Reading…" until both stores are read.
- **API** — inline.
- **Used by** — `SavedAnalyses`, `SavedAnalysesList`.
- **Tests** — `tools/analysis/saved/SavedAnalyses.test.tsx` (`saved-analyses-empty`; the folder-empty line and the reading line are not asserted).
- **Styling** — empty `body2 text.secondary` centred `py: 4` in the scrolling body; reading `text.secondary p: 2`.
- **Similar elsewhere** — [empty / loading / error state](./Shared.md#empty--loading--error-state).
- **Verdict** — share candidate — `EmptyState`, `LoadingLine`.

### Saved analyses pagination

> **Migrated (CTA-113)** — `TablePager` — 25 / 50 / 100 / 250, 50 by default, shown above 25 rows.

- **Name and location** — inline in `SavedAnalysesList`, `src/views/tools/analysis/saved/SavedAnalyses.tsx:734-743`
- **Family** — navigation
- **MUI atoms** — Pagination
- **What it does** — Pages of 48 in every view; back to the first page on a change of folder. The page is screen state, not the URL's.
- **API** — inline.
- **Used by** — `SavedAnalysesList`.
- **Tests** — `tools/analysis/saved/SavedAnalyses.test.tsx` (`saved-analyses-pagination`).
- **Styling** — `size="small"`, `flexShrink: 0`, centred, `pt: 1`.
- **Similar elsewhere** — the two tables use `TablePagination` with a rows-per-page choice and put the page in the URL; Repertoires does not page.
- **Verdict** — module-specific but needs design consistency — three paging behaviours across the list screens.

---

## The new-analysis form — `saved/NewAnalysisForm.tsx`

### NewAnalysisForm

> **Migrated (CTA-113)** — the `PgnInput` and `FenInput` blocks; `InlineAlert`.

- **Name and location** — `NewAnalysisForm`, `src/views/tools/analysis/saved/NewAnalysisForm.tsx`
- **Family** — form / settings group
- **MUI atoms** — Box, Typography, Button, TextField, Divider, Alert (+ `PositionEditor`, `MultiGameDialog`)
- **What it does** — The saved list's right panel: the shared position editor (fields always shown, no tabs), quick loads in the editor's controls row (a FEN field, a `.pgn` pick), a paste box below, and **Start** (`/tools/analysis`, the edited position as `?fen=`). A PGN of more than one move opens the board with the tree; several games open the popup; a position PGN or a FEN set the editor up.
- **API** — none.
- **Used by** — `SavedAnalysesList` (in `RightPanel`).
- **Tests** — `tools/analysis/saved/SavedAnalyses.test.tsx` (`new-analysis-*`).
- **Styling** — column `height: 100%`, `gap: 1.5`; the body the panel's scrolling region (`pr: 0.5`); editor board capped at 360px; a `Divider my: 2` before the paste section.
- **Similar elsewhere** — `NewGameForm` (Engine), the other Lobby form: the same frame and footer, with tabs.
- **Verdict** — module-specific but needs design consistency — share the Lobby-form frame with `NewGameForm`.

### New-analysis header resets

> **Migrated (CTA-113)** — unchanged buttons in the form's header row.

- **Name and location** — inline in `NewAnalysisForm`, `src/views/tools/analysis/saved/NewAnalysisForm.tsx:103-133`
- **Family** — toolbar / action bar
- **MUI atoms** — Box, Typography, Button
- **What it does** — The title beside the editor's resets — New, Clear, Flip — moved out of the editor so its row can hold the quick loads.
- **API** — inline.
- **Used by** — `NewAnalysisForm`.
- **Tests** — `tools/analysis/saved/SavedAnalyses.test.tsx` (`new-analysis-new`, `-clear`, `-flip`).
- **Styling** — row `gap: 1`; title `subtitle1` 700 growing; three `Button size="small" variant="outlined"` **without icons** — the editor's own resets carry icons.
- **Similar elsewhere** — `PositionEditor`'s built-in resets (Shared): the same actions with icons and different labels ("New board", "Clear board").
- **Verdict** — module-specific but needs design consistency — the same three actions look different in the two hosts.

### Quick loads row

> **Migrated (CTA-113)** — unchanged — a row of `Button`s.

- **Name and location** — inline in `NewAnalysisForm` (the editor's `controls`), `src/views/tools/analysis/saved/NewAnalysisForm.tsx:147-201`
- **Family** — form / settings group
- **MUI atoms** — Box, TextField, Button, Alert
- **What it does** — A FEN field (Enter applies it) beside a `.pgn` pick; a bad FEN's error under them.
- **API** — inline.
- **Used by** — `NewAnalysisForm`.
- **Tests** — `tools/analysis/saved/SavedAnalyses.test.tsx` (`new-analysis-fen-input`, `-pgn-input`, `-fen-problem`).
- **Styling** — row `gap: 1`; the field `size="small" flex: 1`, input `dir="ltr"`; the pick `Button component="label" size="small" variant="outlined"` over `<input hidden>`.
- **Similar elsewhere** — `AnalysisLoad`'s FEN section (a Load button too) and `FenSetup` (a form, a Load button) ([upload / import flows](./Shared.md#upload--import-flows)).
- **Verdict** — share candidate — `FenInput`, `PgnInput`.

### Paste section

> **Migrated (CTA-113)** — the `PgnInput` block.

- **Name and location** — inline in `NewAnalysisForm`, `src/views/tools/analysis/saved/NewAnalysisForm.tsx:210-262`
- **Family** — form / settings group
- **MUI atoms** — Box, Typography, TextField, Button, Alert (+ `MultiGameDialog`)
- **What it does** — The Load route's paste box: text, **Load**, the problem, a done line, and the several-games popup.
- **API** — inline.
- **Used by** — `NewAnalysisForm`.
- **Tests** — `tools/analysis/saved/SavedAnalyses.test.tsx` (`new-analysis-paste`, `-load-text`, `-problem`, `-done`, `new-analysis-choice-*`).
- **Styling** — column `gap: 1.5`; title `subtitle2` 700; paste `multiline minRows={4} maxRows={10} size="small"`, `dir="ltr"`; Load `contained small`; done `caption success.main role="status"`.
- **Similar elsewhere** — `AnalysisLoad`'s PGN section, rendered again from the same hook (`useAnalysisLoad`) by hand.
- **Verdict** — share candidate — `AnalysisLoad` split into pieces a host can place would remove the copy.

### New-analysis Start footer

> **Migrated (CTA-113)** — unchanged — the Start `Button`.

- **Name and location** — inline in `NewAnalysisForm`, `src/views/tools/analysis/saved/NewAnalysisForm.tsx:265-302`
- **Family** — toolbar / action bar
- **MUI atoms** — Box, Alert, Button, Typography
- **What it does** — A warning listing the position's problems while it cannot be analysed, **Start** (a link, or a disabled button), the panel's hint and storage note.
- **API** — inline.
- **Used by** — `NewAnalysisForm`.
- **Tests** — `tools/analysis/saved/SavedAnalyses.test.tsx` (`new-analysis-illegal`, `-start`, `saved-analyses-storage-note`).
- **Styling** — identical to the Lobby's Start footer: `grid gap: 1`, `Alert warning py: 0.5`, Start `contained large fullWidth py: 1.25` 700 with a play icon, `caption text.secondary` notes.
- **Similar elsewhere** — [Engine.md → Start footer](./Engine.md#start-footer).
- **Verdict** — share candidate — one `StartFooter`.

---

## A saved analysis' settings — `saved/AnalysisSettingsScreen.tsx`

### AnalysisSettingsScreen

> **Migrated (CTA-113)** — `SettingsFrame`, `SettingsSection`, `SideToggle`, `SwitchField`, `MissState`, `LoadingLine`.

- **Name and location** — `AnalysisSettingsScreen` (`:47`), `SettingsForm` (`:106`) and the inner `Section` (`:84`), `src/views/tools/analysis/saved/AnalysisSettingsScreen.tsx`
- **Family** — form / settings group
- **MUI atoms** — Box, Typography, Divider, TextField, ToggleButtonGroup, ToggleButton, FormControlLabel, Switch, Alert, Button (+ `ArrowWidthSourceField`, `ArrowPaletteField`, `FolderPicker`)
- **What it does** — One draft over three sections — General (title, description), Board (the side it opens facing, next-move arrows, their width source and palette), Folder — written in place on Save; Cancel drops it; both go back where the reader came from. Reading and missing states.
- **API** — none (the route); `Section({ id, label, first?, children })`.
- **Used by** — `saved/AnalysisSettingsScreenMain.tsx`.
- **Tests** — `tools/analysis/saved/AnalysisSettingsScreen.test.tsx` (`analysis-settings-name`, `-description`, `-color-*`, `-show-arrows`, `-arrows-*`, `-folder-*`, `-save`, `-cancel`, `-missing`, `-loading`; the save-failure `Alert` is not exercised).
- **Styling** — a scrolling column `gap: 2`; the heading `subtitle1` 700 over the record's name `body2 text.secondary noWrap`; each section an `overline text.secondary mb: 1` heading, a `Divider mb: 2` above all but the first, a `gap: 2` column; the side toggle's buttons `textTransform: none px: 2`; the arrows switch at the default size with a caption; Save `contained`, Cancel a text link; the missing state centred `py: 4`.
- **Similar elsewhere** — `RepertoireSettingsScreen` (Repertoires) — the same layout, its sections an inline map rather than a `Section` component, the same missing state.
- **Verdict** — share candidate — one `SettingsScreen` with sections, for analyses and repertoires alike.

---

## The Analysis Board's panel — `AnalysisBoard.tsx` and its tabs

### AnalysisBoard header

> **Migrated (CTA-113)** — `ToggleIconAction` (Save — `pressed` only when it opens the changes strip), `IconAction`s, `SwitchField`, `StatusText`.

- **Name and location** — inline in `AnalysisBoard`, `src/views/tools/analysis/AnalysisBoard.tsx:293-392`
- **Family** — toolbar / action bar
- **MUI atoms** — Box, Typography, Tooltip, IconButton, FormControlLabel, Switch (+ `CurrentOpening`, `PlayToggleButton`)
- **What it does** — The analysis' name and description (one line, the rest on hover), the current opening; **Save** (a new board opens the save dialog, a record opens the changes strip), Play, the saved list, the settings gear (records only; off while there are unsaved changes), the engine switch.
- **API** — inline (the `header` slot).
- **Used by** — `AnalysisBoard`.
- **Tests** — `tools/analysis/AnalysisBoard.test.tsx` (`analysis-name`, `-description`, `-save`, `-play`, `-settings`, `-setting-engine`; the saved-list link is not asserted).
- **Styling** — name `subtitle2` 700 `noWrap dir="auto"`, description `caption text.secondary noWrap` with a `title`; icon buttons `small`, `flexShrink: 0`, disabled ones in bare spans; Save `primary` and `aria-pressed` while changed; switch `small`, `marginInlineEnd: 0`.
- **Similar elsewhere** — the Library game's and the repertoire player's headers carry the same Save button; every board header is compared under [toolbar / action bar](./Shared.md#toolbar--action-bar).
- **Verdict** — share candidate — `SaveChangesButton`, `EngineSwitch`.

### Analysis save-problem line

> **Migrated (CTA-113)** — `StatusText`.

- **Name and location** — inline in `AnalysisBoard`, `src/views/tools/analysis/AnalysisBoard.tsx:486-495`
- **Family** — feedback (alert / snackbar)
- **MUI atoms** — Typography
- **What it does** — A new board's failed save, in the footer (a record's failure is in the changes strip).
- **API** — inline.
- **Used by** — `AnalysisBoard`.
- **Tests** — none (`analysis-save-problem` is not asserted).
- **Styling** — `caption error.main px: 1 role="alert"`.
- **Similar elsewhere** — Play with Engine's save-problem line is identical.
- **Verdict** — module-specific but needs design consistency — board footers report errors as captions, screens as `Alert`s.

### AnalysisBoardRoute

> **Migrated (CTA-113)** — `LoadingLine`, `MissState`.

- **Name and location** — `AnalysisBoardRoute`, `src/views/tools/analysis/AnalysisBoard.tsx:533`
- **Family** — empty / loading / error state
- **MUI atoms** — Typography
- **What it does** — Waits for the saved analyses or a referenced game's store when the URL names one, then mounts the board.
- **API** — none (the route).
- **Used by** — `tools/analysis/Main.tsx`.
- **Tests** — `tools/analysis/AnalysisBoard.test.tsx` (`analysis-loading`).
- **Styling** — `text.secondary p: 2`.
- **Similar elsewhere** — the reading line of every route.
- **Verdict** — share candidate — `LoadingLine`.

### AnalysisLoad

> **Migrated (CTA-113)** — the `PgnInput` and `FenInput` blocks.

- **Name and location** — `AnalysisLoad`, `src/views/tools/analysis/AnalysisLoad.tsx`
- **Family** — form / settings group
- **MUI atoms** — Box, Typography, Button, TextField, Alert (+ `MergeSplitChoice` or `MultiGameDialog`)
- **What it does** — The Load tab: a PGN by file or paste (one game onto the board; several → the popup, or with no `onCollectionSaved` an inline merge-only choice), then a FEN (turns the board).
- **API** — `onLoadTree`, `onLoadFen?`, `onLoadPosition?`, `onCollectionSaved?`, `choiceLabelKey = "openings.load.choice"`.
- **Used by** — `AnalysisBoard` (Load tab), `OpeningsBoard` (Load tab, no popup).
- **Tests** — `tools/analysis/AnalysisBoard.test.tsx`, `openings/OpeningsBoard.test.tsx` (`analysis-load-paste`, `-text`, `-problem`, `-fen-input`, `-fen`, `analysis-choice-*`; the done line and the FEN problem are not asserted).
- **Styling** — column `gap: 1.5 p: 1`; section titles `subtitle2` 700 (the FEN's `mt: 1`), help `caption text.secondary mt: -1`; pick `outlined small` over `<input hidden>`; paste `minRows 4 / maxRows 10 small`, `dir="ltr"`; Load `contained small`; FEN Load `outlined small`; errors `Alert severity="error"`; done `caption success.main`.
- **Similar elsewhere** — [upload / import flows](./Shared.md#upload--import-flows): `NewAnalysisForm` places the same pieces by hand; `LibraryUpload` and `RepertoireUpload` are larger versions; `FenSetup` another FEN input.
- **Verdict** — already shared — used by two boards; its pieces should be placeable separately so `NewAnalysisForm` stops copying them.

### MultiGameDialog

> **Migrated (CTA-113)** — `BaseDialog` for the choice; the job a `ProgressDialog` over `useCancellableJob`.

- **Name and location** — `MultiGameDialog`, `src/views/tools/analysis/MultiGameDialog.tsx`
- **Family** — dialog
- **MUI atoms** — Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Button, LinearProgress, Alert
- **What it does** — A PGN of several games: **Merge games** (off, saying why, when they do not share a start) or **Save as games collection** (reads, indexes with progress, writes a Library collection, lands on its table). Cancel, Escape and the backdrop stop the pass; nothing closes during the write.
- **API** — `testIdPrefix`, `choice`, `onMerge`, `onClose`, `onSaved(collectionId)`.
- **Used by** — `AnalysisLoad` (`analysis-choice`), `NewAnalysisForm` (`new-analysis-choice`).
- **Tests** — `tools/analysis/AnalysisBoard.test.tsx`, `tools/analysis/saved/SavedAnalyses.test.tsx` (`-merge`, `-collection`, `-cancel`, `-indexing`, `-problem`; the skipped line is not asserted).
- **Styling** — `maxWidth="xs" fullWidth`; content `gap: 2`; each choice a `Button` (`contained` merge, `outlined` collection, with icons) over a `caption text.secondary mt: 0.5` help line; progress `LinearProgress determinate` under a `body2` line.
- **Similar elsewhere** — `MergeSplitChoice` (Shared) is the same choice's body; `ImportOptionsDialog` (Library) the same indexing logic.
- **Verdict** — share candidate — render `MergeSplitChoice` inside, and share the indexing block with the Library.

### AnalysisExport

> **Migrated (CTA-113)** — the `PgnExportPanel` block (`blocks/panels/`).

- **Name and location** — `AnalysisExport`, `src/views/tools/analysis/AnalysisExport.tsx`
- **Family** — form / settings group
- **MUI atoms** — Box, Typography, FormGroup, FormControlLabel, Switch, Button (+ `CopyableValue`)
- **What it does** — The Export tab: the FEN to copy; switches for what the PGN keeps (comments, NAGs, side lines); the PGN to copy; a download.
- **API** — `fen`, `tree`, `fileStem`.
- **Used by** — `AnalysisBoard`, `LibraryGameBoard`, `OpeningsBoard`.
- **Tests** — `tools/analysis/AnalysisBoard.test.tsx` (`analysis-export-fen`, `-comments`, `-pgn`), `openings/OpeningsBoard.test.tsx`; the download is not asserted by id.
- **Styling** — column `gap: 2 p: 1`; "Include" `subtitle2` 700 over a `FormGroup` of `small` switches; download `outlined small` with an icon.
- **Similar elsewhere** — Settings' Export (a checkbox list, then a download) is the other export form.
- **Verdict** — already shared — used by three boards; fine.

### AnalysisSettings

> **Migrated (CTA-113)** — the `AnalysisEngineForm` block (`blocks/forms/`) over `SliderField` and `engineOptionState`; `OptionSlider` is deleted.

- **Name and location** — `AnalysisSettings` (imported as `AnalysisSettingsPanel`), `src/views/tools/analysis/AnalysisSettings.tsx`
- **Family** — form / settings group
- **MUI atoms** — Box, Typography, Slider, FormControlLabel, Switch, Button (+ `OptionSlider`)
- **What it does** — The analysis boards' Engine tab: depth, move time (both dimmed and disabled while the engine is off), lines (MultiPV), the eval bar, and an optional **Clear**.
- **API** — `settings`, `onChange`, `engineOptions`, `engineOn`, `showEvalBar`, `onShowEvalBarChange`, `onClear?`.
- **Used by** — `AnalysisBoard`, `LibraryGameBoard` (no Clear), `OpeningsBoard`, `RepertoirePlayer`.
- **Tests** — `tools/analysis/AnalysisBoard.test.tsx`, `repertoires/RepertoirePlayer.test.tsx` (`analysis-settings`, `analysis-clear`); the eval-bar switch is not asserted by id.
- **Styling** — `grid gap: 2`; depth and move time copy `OptionSlider`'s header by hand, with `opacity: 0.6` while off; the eval-bar switch default size; Clear `outlined` (default size) with a restart icon. Its doc comment still points at `AnalysisPanel.tsx`, which is gone.
- **Similar elsewhere** — `EngineSettings` (Engine) — the same two slider rows.
- **Verdict** — already shared — used by four boards; its slider rows should come from a `LabeledSlider`.

### AnalysisArrows

> **Migrated (CTA-113)** — the `ArrowSettingsFields` block; `SwitchField`.

- **Name and location** — `AnalysisArrows`, `src/views/tools/analysis/AnalysisArrows.tsx`
- **Family** — form / settings group
- **MUI atoms** — Box, FormControlLabel, Switch, Typography (+ the two arrow fields)
- **What it does** — The Arrows tab: the next-move arrows switch with a help line, what sizes them (sources the tree does not carry disabled), their colours — all the session's.
- **API** — `showArrows`, `onShowArrowsChange`, `widthSource`, `onWidthSourceChange`, `available`, `palette`, `onPaletteChange`.
- **Used by** — `AnalysisBoard`.
- **Tests** — `tools/analysis/AnalysisBoard.test.tsx` (`analysis-arrows`, `analysis-arrows-width-*`; the palette radios are not asserted here).
- **Styling** — column `gap: 2 px: 1 py: 1`; switch `small` in `FormControlLabel m: 0` over a `caption text.secondary`.
- **Similar elsewhere** — the arrows switch sits elsewhere on the other boards (Moves tab, Engine tab, Settings tab); the switch-with-help pattern ([form / settings group](./Shared.md#form--settings-group)).
- **Verdict** — module-specific but needs design consistency — the richest of the arrow settings; the others are one bare switch.

### ArrowWidthSourceField and ArrowPaletteField

> **Migrated (CTA-113)** — the `ArrowSettingsFields` block.

- **Name and location** — `ArrowWidthSourceField` (`:35`) and `ArrowPaletteField` (`:96`), `src/views/tools/analysis/ArrowSettingsFields.tsx`
- **Family** — form / settings group
- **MUI atoms** — FormControl (`fieldset`), FormLabel, RadioGroup, FormControlLabel, Radio, Box, Typography
- **What it does** — Two radio groups: the width source (each option with its help line, unavailable ones disabled with a note, a chosen-but-absent one flagged "drawn as None") and the palette (each with three colour swatches).
- **API** — `idPrefix`, `value`, `onChange`, `available?` (width source only). Ids `<idPrefix>-width`, `-width-<source>`, `-width-drawn-as-none`, `-palette`, `-palette-<id>`.
- **Used by** — `AnalysisArrows` (`analysis-arrows`), `AnalysisSettingsScreen` (`analysis-settings-arrows`).
- **Tests** — `tools/analysis/AnalysisBoard.test.tsx`, `tools/analysis/saved/AnalysisSettingsScreen.test.tsx`.
- **Styling** — legend `FormLabel` with `typography: body2` 600 `mb: 0.5`; options `alignItems: flex-start mx: 0 mb: 0.5`, the radio `pt: 0.25`, each label a `body2` over a `caption` (`lineHeight: 1.3`); swatches 14px squares `borderRadius: 0.5`, `aria-hidden`; the note `caption warning.main role="status"`.
- **Similar elsewhere** — `OpeningTreePgnDialog` (Library) and `ImportDialog` (Settings) are the other radio groups; the option-over-help label recurs in the tree-PGN dialog.
- **Verdict** — already shared — shared by the board and the settings screen; the legend style is one of five field-label styles.

### SaveAnalysisDialog

> **Migrated (CTA-113)** — `FormDialog` with the `FolderPicker` block.

- **Name and location** — `SaveAnalysisDialog`, `src/views/tools/analysis/SaveAnalysisDialog.tsx`
- **Family** — dialog
- **MUI atoms** — Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Button (+ `FolderPicker`)
- **What it does** — Saving a board that is not a record yet: a name (seeded from the tags, may stay empty, Enter saves) and a folder (Unfiled by default); re-seeded on each open.
- **API** — `open`, `initialName`, `onSave(name, folderId)`, `onClose`.
- **Used by** — `AnalysisBoard`.
- **Tests** — `tools/analysis/AnalysisBoard.test.tsx` (`analysis-save-name`, `-confirm`, `analysis-folder-picker-*`; Cancel is not asserted).
- **Styling** — `fullWidth maxWidth="xs"`; content `gap: 2`; the field `autoFocus fullWidth margin="dense"`, `dir="auto"`; the folder label `subtitle2` 600 in a plain `<div>`; Save `contained`.
- **Similar elsewhere** — `FolderNameDialog` (Shared) — the same name field and buttons; the one dialog whose Save is allowed with an empty name.
- **Verdict** — module-specific but needs design consistency — a `FolderNameDialog` plus a picker; its field margin and label style differ.

### PlayToggleButton

> **Migrated (CTA-113)** — the `PlayToggleButton` block (`blocks/panels/`); its spinner named.

- **Name and location** — `PlayToggleButton`, `src/views/tools/analysis/PlayToggleButton.tsx`
- **Family** — toolbar / action bar
- **MUI atoms** — Tooltip, IconButton, CircularProgress
- **What it does** — Play / Pause for the engine playing the other side: disabled while the engine is off (or for the screen's reason), `primary` and pressed while on, a ring while the engine thinks.
- **API** — `testId` (`-spinner`), `engineOn`, `playing`, `thinking`, `onToggle`, `disabled? = false`.
- **Used by** — `AnalysisBoard`, `PlayScreen` (Engine), `LibraryGameBoard`, `OpeningsBoard`.
- **Tests** — `tools/analysis/AnalysisBoard.test.tsx`, `engine/play/PlayWithEngine.test.tsx`, `library/Library.test.tsx`, `openings/OpeningsBoard.test.tsx`.
- **Styling** — `IconButton size="small"` in a bare span; the ring `CircularProgress size={30} thickness={3}`, absolute, no pointer events.
- **Similar elsewhere** — the repertoire player's own Play (Autoplay) button — the same icons and `primary` / pressed state, without the ring.
- **Verdict** — already shared — lives in `tools/analysis/` but is every board's; worth moving to `views/board/` or `shared/`.

### EngineThinking

> **Migrated (CTA-113)** — the `EngineThinking` block (`blocks/panels/`); a named, polite status.

- **Name and location** — `EngineThinking`, `src/views/tools/analysis/EngineThinking.tsx`
- **Family** — feedback (alert / snackbar)
- **MUI atoms** — Box, CircularProgress, Typography
- **What it does** — Play's status line: a spinner, "Engine is thinking" with moving dots and the depth so far; or "Your move".
- **API** — `thinking`, `depth`, `testId = "analysis-play"` (`-status`, `-depth`).
- **Used by** — `AnalysisBoard`, `PlayScreen`, `LibraryGameBoard`, `OpeningsBoard`.
- **Tests** — `tools/analysis/EngineThinking.test.tsx`, `tools/analysis/AnalysisBoard.test.tsx`.
- **Styling** — row `gap: 1 px: 1 py: 0.5`, `role="status" aria-live="polite"`; `primary.main` while thinking, `text.secondary` otherwise; spinner 14px; the dots in a fixed `1.5em` slot; the depth `caption` pushed with `marginInlineStart: auto`.
- **Similar elsewhere** — the repertoire player's trainer status line and Play with Engine's game-over line — the other footer statuses.
- **Verdict** — already shared — like `PlayToggleButton`, filed under one module.

### NextMovesBar

> **Migrated (CTA-113)** — moved to `views/shared/` — a board piece every board renders.

- **Name and location** — `NextMovesBar`, `src/views/tools/analysis/NextMovesBar.tsx`
- **Family** — list
- **MUI atoms** — Box, Typography, ButtonBase
- **What it does** — The continuations of the position on screen, two per row, the mainline first; a click selects, a hover draws its arrow; optional play-chance percentages; nothing at all unless there is a fork.
- **API** — `nodes`, `onSelect(id)`, `onHover(node | null)`, `chances?`, `mask?`.
- **Used by** — `useVariationsExplorer` (the `nextMoves` part — every board's footer).
- **Tests** — `explorer/useVariationsExplorer.test.tsx` (`next-move-*`), `repertoires/RepertoirePlayer.test.tsx`, `engine/masked/MaskedPlay.test.tsx` (`analysis-next-moves`).
- **Styling** — the raised strip (`background.paper`, a `divider` border, `borderRadius: 1`, `px: 1 pt: 0.75 pb: 0.5`); grid `repeat(2, minmax(0, 1fr))` `gap: 0.5`; tokens `moveSx` + `sanTokenSx`, `dir="ltr"`, the side lines `text.secondary`; the chance a `caption` with a **physical** `ml: 0.5`.
- **Similar elsewhere** — the Openings Book tab and the Library's continuation list ([list](./Shared.md#list)); its test id `analysis-next-moves` is the same on every board.
- **Verdict** — already shared — every board's; its test id and folder still say "analysis".

---

## Left out, and why

| What | Why |
| --- | --- |
| `tools/analysis/Main.tsx`, `saved/Main.tsx`, `saved/AnalysisSettingsScreenMain.tsx` | Layout-only wrappers. |
| `useAnalysisSession`, `useAnalysisBoard`, `useAnalysisLoad`, `useTreeNavigation`, `nextMoveArrows.ts`, `saved/useSavedAnalyses.ts`, `saved/useAnalysisFolders.ts` | Hooks and pure code — no UI. |
| The cards' `Chessboard` previews, the board square | The board — out of scope. |
| The Moves and Map tabs (`explorer.moves`, `explorer.map`), the comment block | The explorer — [`Shared.md`](./Shared.md#the-explorers-chrome--viewsexplorer). |
| The settings screen's right-panel note | A lone `Typography` — trivial. |

---

## Consistency notes

- **list** — `SavedAnalysisRow` is `RepertoireRow` with `dir="auto"` on the
  name; the folder rows are the shared `SavedFolderRow` here and a different
  component in Repertoires. `NextMovesBar` is one of three continuation lists.
- **card grid** — `SavedAnalysisCard` matches `RepertoireCard`; the folder
  card beside it (`SavedFolderCard`, `minHeight: 140`) is shorter than the
  square boards around it, where the repertoires' folder card is square.
- **toolbar / action bar** — the saved list's bar matches Repertoires'
  (wrapping, `gap: 1.5`); the board header's Save button is the same as the
  Library game's and the repertoire player's; `PlayToggleButton` is shared but
  the repertoire player's Play is not it.
- **form / settings group** — the Engine tab (`AnalysisSettings`) copies the
  engine sliders' header twice; the Arrows tab's switch is small with a
  caption, the settings screen's arrows switch default-sized with one; the
  settings screen and the repertoire settings screen are one layout written
  twice; the new-analysis form's resets have no icons where the editor's do.
- **dialog** — `SaveAnalysisDialog` is `FolderNameDialog` + a picker with a
  `dense` field; `MultiGameDialog` repeats `MergeSplitChoice`'s body and
  `ImportOptionsDialog`'s indexing; the bulk delete is borrowed from
  `views/repertoires/`.
- **navigation** — MUI `Pagination` here, `TablePagination` on the tables;
  a breadcrumb here, a back arrow in Repertoires.
- **feedback** — the board's save problem is a caption, the settings screen's
  an `Alert`; `EngineThinking` is one of three footer status lines.
- **empty / loading / error state** — the reading and empty lines match every
  module; the settings screen's miss matches the repertoires', not the
  Library's.
- **upload / import** — `AnalysisLoad` and `NewAnalysisForm` are the small
  (4 / 10) paste boxes; the two upload screens use 6 / 14, the editor's PGN
  tab 3 / 10.
