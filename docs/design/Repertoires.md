# Repertoires — the list, the upload, the player, the settings

`src/views/repertoires/`: the list and its one-level folders (`/repertoires`),
the upload and the merge-or-split choice (`/repertoires/new`), the player and
its games (`/repertoires/<id>`, `/…/games/<game>`) and a repertoire's settings
(`/repertoires/<id>/settings`). The module's reference is
[`.claude/rules/repertoires.md`](../../.claude/rules/repertoires.md). Template
and families: [`README.md`](./README.md).

**Migrated onto the design system by CTA-113**: each entry below is marked
with what replaced it, and describes the component as it was. The binding
decisions, the order of work and the findings are
[`migration.md`](./migration.md).

**Documented in [`Shared.md`](./Shared.md), not here**: `SavedListExportBar`,
`SavedListViewToggle`, the saved-list grid, `MergeSplitChoice`, `BoardPanel`,
`CurrentOpening` and the explorer's chrome (the Moves list, the Map, the
comment block, the move menu and its dialogs). **In
[`Analyses.md`](./Analyses.md)**: `AnalysisSettings` (the player's Engine tab)
and `NextMovesBar`.

**Exported to other modules from here**: `RepertoireChangesBar` (the Analysis
Board and the Library game use it) and `RepertoireBulkDeleteDialog` (Saved
analyses uses it) — shared in practice, filed under one module.

---

## The list — `Repertoires.tsx`

### RepertoiresList

> **Migrated (CTA-113)** — the `RepertoiresList` block (`blocks/lists/`).

- **Name and location** — `RepertoiresList`, `src/views/repertoires/Repertoires.tsx:292` (the route `Repertoires` at `:285`)
- **Family** — list
- **MUI atoms** — Box, List, Typography (+ the rows, cards, top bar and dialogs below)
- **What it does** — The repertoires, newest first: at the top level the folders then the Unfiled repertoires, inside a folder (`?folder=`) its repertoires; as rows or preview cards at two sizes; picks kept across views and cleared on a change of folder; bulk download and delete; folder create, rename, delete (its repertoires back to Unfiled), download.
- **API** — `repertoires`, `folders` (the route passes both once read).
- **Used by** — `RepertoiresMain.tsx` (`/repertoires`).
- **Tests** — `repertoires/Repertoires.test.tsx`, `repertoires/RepertoireFolders.test.tsx`.
- **Styling** — a flex column; the body the one scrolling region; the grid `savedListGridSx(view)`; no paging.
- **Similar elsewhere** — `SavedAnalysesList` (Analyses) is this screen for analyses, with nested folders, a breadcrumb and pages of 48.
- **Verdict** — module-specific but needs design consistency — one list screen written twice; the differences (one-level folders, the Games menu, no paging) are slots.

### Repertoires top bar

> **Migrated (CTA-113)** — `ListScreenHeader`, `SelectionBar`, `ViewToggle`, `Breadcrumbs`.

- **Name and location** — inline in `RepertoiresList`, `src/views/repertoires/Repertoires.tsx:398-521`
- **Family** — toolbar / action bar
- **MUI atoms** — Box, Tooltip, IconButton, Typography, Button (+ `SavedListExportBar`, `SavedListViewToggle`)
- **What it does** — At the top level: the title and count, **New folder**, **Add repertoire**, the export bar (when there are repertoires), the view toggle. Inside a folder: back, the folder's name and count, its rename and delete in place of New folder.
- **API** — inline in `RepertoiresList`.
- **Used by** — `RepertoiresList`.
- **Tests** — `repertoires/Repertoires.test.tsx`, `repertoires/RepertoireFolders.test.tsx` (`repertoires-title`, `-count`, `-new-folder`, `-add`, `-folder-back`, `-folder-rename`, `-folder-delete`, `-select-all`, `-view-*`).
- **Styling** — the saved analyses' bar exactly: wrapping, `gap: 1.5 pb: 1.5 mb: 0.5`, a bottom divider, the title block `marginInlineEnd: auto`, title `subtitle1` 700 `noWrap`, count `caption text.secondary`; outlined small buttons with small icons; the folder's rename / delete `IconButton size="small"` with tooltips.
- **Similar elsewhere** — [toolbar / action bar](./Shared.md#toolbar--action-bar); the only list bar that changes its actions by where the reader stands.
- **Verdict** — share candidate — `ListScreenHeader` with a back slot.

### RepertoireRow

> **Migrated (CTA-113)** — `RecordRow` inside the `RepertoiresList` block.

- **Name and location** — `RepertoireRow`, `src/views/repertoires/Repertoires.tsx:187` (caption hook `useCaption` at `:130`)
- **Family** — list
- **MUI atoms** — ListItem, Box, Typography, Button (+ `RepertoireGamesMenu`)
- **What it does** — One repertoire: its name, "N moves · N side lines · date" (or "needs a choice" for a record from before the one-game rule), its description; **Open**, the Games menu, the settings gear, the pick.
- **API** — `saved`, `checked`, `onToggle`.
- **Used by** — `RepertoiresList` (list view).
- **Tests** — `repertoires/Repertoires.test.tsx` (`repertoires-item-`, `-open-`, `-select-`), `repertoires/RepertoireSettings.test.tsx` (`repertoires-description-`).
- **Styling** — `SavedAnalysisRow`'s `sx` exactly (`ListItem disableGutters`, wrapping, `gap: 1.5 py: 1.25`, bottom divider; `subtitle2` 600 name; ellipsis captions; italic description `dir="auto"`); the name has **no** `dir="auto"`.
- **Similar elsewhere** — `SavedAnalysisRow` (Analyses).
- **Verdict** — share candidate — one `SavedRecordRow` with an actions slot.

### RepertoireCard

> **Migrated (CTA-113)** — `RecordCard` inside the `RepertoiresList` block.

- **Name and location** — `RepertoireCard`, `src/views/repertoires/Repertoires.tsx:242`
- **Family** — card grid
- **MUI atoms** — Card, CardActionArea, Box, Typography (+ a read-only `Chessboard`, out of scope; `RepertoireGamesMenu`)
- **What it does** — One repertoire as a preview board (where it first branches, facing its main colour) that opens it; its name and line; the Games menu, the gear, the pick.
- **API** — `saved`, `checked`, `onToggle`.
- **Used by** — `RepertoiresList` (card views).
- **Tests** — `repertoires/Repertoires.test.tsx` (`repertoires-grid`, `repertoires-preview-`).
- **Styling** — `SavedAnalysisCard`'s layout (outlined, the board `p: 1` square, `caption` rows with ellipsis); no opening line; the name without `dir="auto"`.
- **Similar elsewhere** — `SavedAnalysisCard` (Analyses).
- **Verdict** — share candidate — one `SavedRecordCard`.

### SettingsLink and SelectBox

> **Migrated (CTA-113)** — `RecordRow` / `RecordCard`'s settings `RowAction` and pick.

- **Name and location** — `SettingsLink` (`:109`) and `SelectBox` (`:153`), `src/views/repertoires/Repertoires.tsx`
- **Family** — toolbar / action bar
- **MUI atoms** — Tooltip, IconButton; Checkbox
- **What it does** — The settings gear (handing the list back as `from`) and the pick checkbox.
- **API** — `{ saved }`; `{ saved, checked, onToggle }`.
- **Used by** — `RepertoireRow`, `RepertoireCard`.
- **Tests** — `repertoires/Repertoires.test.tsx`, `repertoires/RepertoireSettings.test.tsx` (`repertoires-settings-`, `-select-`).
- **Styling** — `IconButton size="small"`; `Checkbox size="small"` with an `aria-label`.
- **Similar elsewhere** — `SavedAnalyses.tsx` defines the same two (`:220`, `:240`).
- **Verdict** — share candidate — duplicated word for word.

### Repertoires body states

> **Migrated (CTA-113)** — `LoadingLine`; empty states the block's.

- **Name and location** — inline in `RepertoiresList`, `src/views/repertoires/Repertoires.tsx:523-532`; `ReadingRepertoires`, `src/views/repertoires/RepertoireBoard.tsx:95`
- **Family** — empty / loading / error state
- **MUI atoms** — Box, Typography
- **What it does** — "No repertoires yet" / "this folder is empty"; "Reading…" until both stores are read (the one named reading component in the app, reused by four routes).
- **API** — inline; `ReadingRepertoires()`.
- **Used by** — `RepertoiresList`; `Repertoires`, `RepertoireBoard`, `RepertoireGame`, `RepertoireSettingsScreen`.
- **Tests** — `repertoires/Repertoires.test.tsx` (`repertoires-empty`, `repertoires-loading`), `repertoires/RepertoireFolders.test.tsx`.
- **Styling** — empty `body2 text.secondary` centred `py: 4`; reading `text.secondary p: 2`.
- **Similar elsewhere** — every module's ([empty / loading / error state](./Shared.md#empty--loading--error-state)).
- **Verdict** — share candidate — `ReadingRepertoires` is already the shape of a shared `LoadingLine`.

---

## Folders — `RepertoireFolderViews.tsx`, `RepertoireFolderDialogs.tsx`

### RepertoireFolderRow / RepertoireFolderCard

> **Migrated (CTA-113)** — `FolderRow` / `FolderCard` with the `FolderActions` block; `RepertoireFolderViews` is deleted.

- **Name and location** — `RepertoireFolderRow` (`:99`), `RepertoireFolderCard` (`:122`), and the inner `FolderActions` (`:42`) and `FolderCaption` (`:85`), `src/views/repertoires/RepertoireFolderViews.tsx`
- **Family** — list (row) / card grid (card)
- **MUI atoms** — ListItem, ListItemButton, Card, CardActionArea, Box, Typography, Tooltip, IconButton
- **What it does** — A folder in the list and card views, both linking into it (`/repertoires?folder=`), with three actions: download (off when empty), rename, delete.
- **API** — `folder`, `count`, `onRename`, `onDelete`, `onDownload`.
- **Used by** — `RepertoiresList`.
- **Tests** — `repertoires/RepertoireFolders.test.tsx` (`repertoire-folder-`, `-open-`, `-download-`, `-delete-`; the row's rename is not asserted).
- **Styling** — row: `ListItem disableGutters disablePadding` with `secondaryAction`, a bottom divider, the button a `Link` with `gap: 1.5 py: 1` and a fixed `paddingInlineEnd: 8.5rem` to clear the actions; card: a **square** `m: 1` box with `bgcolor: action.hover`, `borderRadius: 1`, a `3rem` icon; captions `subtitle2` 600 / `caption`, both `noWrap`.
- **Similar elsewhere** — `SavedFolderRow` / `SavedFolderCard` (Shared), their model: four actions (with Move), `onOpen` rather than a link, a `minHeight: 140` card with a 44px icon. The folder square here is `SavedAnalysisCard`'s unreadable square.
- **Verdict** — share candidate — the shared pair with an optional Move and a link mode would replace these.

### RepertoireFolderNameDialog

> **Migrated (CTA-113)** — the `FolderNameDialog` block.

- **Name and location** — `RepertoireFolderNameDialog`, `src/views/repertoires/RepertoireFolderDialogs.tsx:25`
- **Family** — dialog
- **MUI atoms** — Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button
- **What it does** — New / rename a folder: one field (Enter saves), Save off for an empty name, re-seeded on open.
- **API** — `open`, `title`, `initial`, `onSave(name)`, `onClose`. Ids `repertoire-folder-name-input`, `-cancel`, `-save`.
- **Used by** — `RepertoiresList`.
- **Tests** — `repertoires/RepertoireFolders.test.tsx`.
- **Styling** — `fullWidth maxWidth="xs"`; the field `autoFocus fullWidth margin="dense"`; Save `contained`.
- **Similar elsewhere** — `FolderNameDialog` (Shared): the same dialog without `margin="dense"`, with a `labelKey` and an `idPrefix`.
- **Verdict** — share candidate — `FolderNameDialog` with `labelKey="repertoires"`.

### RepertoireFolderDeleteDialog

> **Migrated (CTA-113)** — the `FolderDeleteDialog` block.

- **Name and location** — `RepertoireFolderDeleteDialog`, `src/views/repertoires/RepertoireFolderDialogs.tsx:93`
- **Family** — dialog
- **MUI atoms** — Dialog, DialogTitle, DialogContent, DialogActions, Typography, Button
- **What it does** — Confirms deleting a folder with repertoires in it (they go back to Unfiled).
- **API** — `folder` (`null` closes it), `count`, `onConfirm`, `onClose`.
- **Used by** — `RepertoiresList`.
- **Tests** — `repertoires/RepertoireFolders.test.tsx` (`repertoire-folder-delete-confirm`).
- **Styling** — `fullWidth maxWidth="xs"`; body `Typography body2`; confirm `color="error" variant="contained"`.
- **Similar elsewhere** — `FolderDeleteDialog` (Shared) — the same, with a counts caption.
- **Verdict** — share candidate — `FolderDeleteDialog` with no sub-folder count.

### RepertoireBulkDeleteDialog

> **Migrated (CTA-113)** — `DeleteManyDialog`.

- **Name and location** — `RepertoireBulkDeleteDialog`, `src/views/repertoires/RepertoireFolderDialogs.tsx:144`
- **Family** — dialog
- **MUI atoms** — Dialog, DialogTitle, DialogContent, DialogActions, Typography, Button
- **What it does** — Confirms deleting the picked records.
- **API** — `open`, `count`, `onConfirm`, `onClose`, `labelKey = "repertoires"` (`bulkDelete.*`, `folder.cancel`), `testIdPrefix = "repertoires"` (`-delete-title`, `-delete-cancel`, `-delete-confirm`).
- **Used by** — `RepertoiresList`, `SavedAnalysesList` (Analyses, `labelKey="savedAnalyses"`).
- **Tests** — `repertoires/Repertoires.test.tsx`, `tools/analysis/saved/SavedAnalyses.test.tsx`.
- **Styling** — `fullWidth maxWidth="xs"`; body `Typography body2`; confirm `color="error" variant="contained"`; the test id on the title, not the dialog.
- **Similar elsewhere** — the Lobby's and the collection table's delete-picked dialogs (default width, text `error` button) — [dialog](./Shared.md#dialog).
- **Verdict** — share candidate — already reused across modules; belongs in `views/shared/`.

---

## Bringing one in — `RepertoireUpload.tsx`, `RepertoireMergeSplit.tsx`

### RepertoireUpload

> **Migrated (CTA-113)** — the `PgnInput` block; the page's own `h1`, a panel `h2`.

- **Name and location** — `RepertoireUpload`, `src/views/repertoires/RepertoireUpload.tsx`
- **Family** — form / settings group
- **MUI atoms** — Box, Typography, TextField, Button, CircularProgress, Alert
- **What it does** — A name (optional), a `.pgn` pick or a paste, one route for both; the read waits for a paint and says "Reading…"; one game opens on its board, several open the merge-or-split choice below.
- **API** — none.
- **Used by** — `RepertoireUploadMain.tsx` (`/repertoires/new`).
- **Tests** — `repertoires/RepertoireUpload.test.tsx` (`repertoire-upload-name`, `-paste`, `-save`, `-input`, `-problem`, `repertoire-choice-*`; the busy line is not asserted).
- **Styling** — a scrolling column `gap: 2`; title `subtitle1` 700 (no `h1`); name `TextField size="small"` with a helper; pick `contained` over `<input hidden>`; paste `minRows={6} maxRows={14}`, `dir="ltr"`; **Add** `outlined` beside a `CircularProgress size={16}` + `body2` "Reading…"; problem `Alert severity="error"` with the detail as an LTR `caption`. The right panel has the storage note and a text link back to the list.
- **Similar elsewhere** — `LibraryUpload` (Library) — the same layout and paste size, a popup instead of an inline choice ([upload / import flows](./Shared.md#upload--import-flows)).
- **Verdict** — share candidate — a shared `PgnInput` under both upload screens.

### RepertoireMergeSplit

> **Migrated (CTA-113)** — the `MergeSplitChoice` block.

- **Name and location** — `RepertoireMergeSplit`, `src/views/repertoires/RepertoireMergeSplit.tsx`
- **Family** — form / settings group
- **MUI atoms** — none of its own (renders `MergeSplitChoice`)
- **What it does** — What merge and split do for repertoires: merge into one record (keeping a replaced record's id), or split into one each in a new folder named after the text (the folder taken back if the records cannot be written); the problem worded.
- **API** — `reading`, `typedName`, `replacing?`, `settings?`, `onDone(path)`.
- **Used by** — `RepertoireUpload`, `MultiGameRepertoire`.
- **Tests** — `repertoires/RepertoireUpload.test.tsx`, `repertoires/RepertoireBoard.test.tsx` (`repertoire-choice-merge`, `-split`).
- **Styling** — `MergeSplitChoice`'s.
- **Similar elsewhere** — the Analysis module's `MultiGameDialog`, the same choice as a dialog with Save-as-collection in Split's place.
- **Verdict** — already shared — the layout is shared; only the behaviour is here.

### MultiGameRepertoire

> **Migrated (CTA-113)** — `LoadingSpinnerLine` while the text is read, then the `MergeSplitChoice` block (through `RepertoireMergeSplit`).

- **Name and location** — `MultiGameRepertoire`, `src/views/repertoires/RepertoireBoard.tsx:54`
- **Family** — empty / loading / error state
- **MUI atoms** — Box, Typography, CircularProgress (+ `RepertoireMergeSplit`)
- **What it does** — A record saved before the one-game rule: its name, why it needs a choice, a spinner while the text is read, then the merge-or-split choice (or "cannot be read").
- **API** — `saved`.
- **Used by** — `RepertoireBoard`, `RepertoireGame`.
- **Tests** — `repertoires/RepertoireBoard.test.tsx`, `repertoires/RepertoireGames.test.tsx` (`repertoire-board-multi`, `repertoire-board-reading`).
- **Styling** — a scrolling box; name `subtitle1` 700; explanation `body2 text.secondary mb: 2`; a bare `CircularProgress size={16}`.
- **Similar elsewhere** — the only screen that is a choice in the board's square.
- **Verdict** — module-specific but needs design consistency — its bare spinner has no label, unlike every other reading state.

### MissingRepertoire

> **Migrated (CTA-113)** — `MissState`; reading `LoadingLine`.

- **Name and location** — `MissingRepertoire`, `src/views/repertoires/RepertoireBoard.tsx:105`
- **Family** — empty / loading / error state
- **MUI atoms** — Box, Typography, Button
- **What it does** — An id this browser does not hold; a link back to the list.
- **API** — none.
- **Used by** — `RepertoireBoard`, `RepertoireGame`.
- **Tests** — `repertoires/RepertoireBoard.test.tsx`, `repertoires/RepertoireGames.test.tsx` (`repertoire-board-missing`).
- **Styling** — centred, `py: 4`; `body2 text.secondary mb: 2`; `Button variant="outlined" size="small"`.
- **Similar elsewhere** — the settings screen's own miss (`repertoire-settings-missing`, identical, inline) and the analysis settings' (identical); `LibraryMiss` (left-aligned, `body1`, a medium button).
- **Verdict** — share candidate — one `NotFound`; this screen's look is the majority's.

---

## The player — `RepertoirePlayer.tsx`

### RepertoirePlayer header

> **Migrated (CTA-113)** — `BackButton`, `IconAction`s, `ToggleIconAction` (Save, Autoplay).

- **Name and location** — inline in `RepertoirePlayer`, `src/views/repertoires/RepertoirePlayer.tsx:577-723`
- **Family** — toolbar / action bar
- **MUI atoms** — Box, Typography, CircularProgress, Tooltip, IconButton (+ `CurrentOpening`, `RepertoireGamesMenu`)
- **What it does** — The name, then the game's title (in a game) or the description, the opening; a reading spinner; the Games menu, **Save** (lights with changes, opens the strip), **Play** (Autoplay — the player only), **Restart**, **Download** (the session tree), and the settings gear — or, in a game, **back** to the player, last.
- **API** — inline (the `header` slot). Ids `repertoire-board-*` / `repertoire-game-*`.
- **Used by** — `RepertoirePlayer` (`RepertoireBoard`, `RepertoireGame`).
- **Tests** — `repertoires/RepertoirePlayer.test.tsx`, `repertoires/RepertoireGames.test.tsx`, `repertoires/RepertoireSettings.test.tsx`, `repertoires/RepertoirePropagation.test.tsx` (`-name`, `-description`, `-reading`, `-games`, `-save`, `-play`, `-restart`, `-download`, `-settings`).
- **Styling** — name `subtitle2` 700 `noWrap`, title / description `caption text.secondary noWrap` (description `dir="auto"` with a `title`); icon buttons `small`, `flexShrink: 0`; Save and Play `primary` with `aria-pressed`; Download in a bare span; the reading spinner `size={16}` with an `aria-label`.
- **Similar elsewhere** — the other board headers; Save is `AnalysisBoard`'s and the Library game's button; Play here is its own button with `PlayToggleButton`'s icons and no thinking ring; the back arrow is **last** here and first on Play with Engine and the Library game; the only header with Download and Restart ([toolbar / action bar](./Shared.md#toolbar--action-bar)).
- **Verdict** — share candidate — `SaveChangesButton`; a back slot that always comes first.

### Player reading and status lines

> **Migrated (CTA-113)** — `LoadingLine`, `LoadingSpinnerLine`, `StatusText`.

- **Name and location** — inline in `RepertoirePlayer`, `src/views/repertoires/RepertoirePlayer.tsx:540-559`
- **Family** — feedback (alert / snackbar)
- **MUI atoms** — Box, CircularProgress, Typography
- **What it does** — The Moves / Map tabs' "Reading the repertoire…" while a big tree parses; the trainer's status line in the footer (your move, the trainer thinking, right, try again, a line finished, a required move…), coloured by status.
- **API** — inline.
- **Used by** — `RepertoirePlayer`.
- **Tests** — `repertoires/RepertoirePlayer.test.tsx`, `repertoires/RepertoireGames.test.tsx` (`-status`; the tab's reading line is not asserted by id).
- **Styling** — reading: row `gap: 1 p: 1 text.secondary`, `CircularProgress size={16}`, `body2`; status `body2 px: 1 py: 0.5`, colour from a `STATUS_COLOR` map (else `text.secondary`), `data-status`.
- **Similar elsewhere** — `EngineThinking` (Analyses) and Play with Engine's game-over line — the other footer statuses; `RepertoireUpload`'s reading line (the same spinner + `body2`).
- **Verdict** — share candidate — one `StatusLine` (with an optional spinner) for the four footer statuses.

### PlaySettings and SwitchSetting

> **Migrated (CTA-113)** — `SwitchField`, `SideToggle`.

- **Name and location** — `PlaySettings` (`:910`) and `SwitchSetting` (`:870`), `src/views/repertoires/RepertoirePlayer.tsx`
- **Family** — form / settings group
- **MUI atoms** — Box, Typography, ToggleButtonGroup, ToggleButton, FormControlLabel, Switch
- **What it does** — The Settings tab: the side (a change restarts), Autoplay (player only), next-move arrows, play-chance arrows (player only), the engine — each switch with a line on what it does.
- **API** — `PlaySettings`: `id`, `side`, `onSideChange`, `autoplay?`, `onAutoplayChange`, `showArrows`, `onShowArrowsChange`, `chanceArrows?`, `onChanceArrowsChange`, `engineOn`, `onEngineOnChange`. `SwitchSetting`: `testId`, `checked`, `onChange`, `label`, `help`.
- **Used by** — `RepertoirePlayer` (Settings tab).
- **Tests** — `repertoires/RepertoirePlayer.test.tsx`, `repertoires/RepertoireGames.test.tsx`, `repertoires/RepertoirePlayChance.test.tsx` (`-side-*`, `-setting-autoplay`, `-arrows`, `-chance-arrows`, `-setting-engine`).
- **Styling** — column `gap: 2 p: 1`; the side label `subtitle2` 600 (`aria-labelledby`), the group `small my: 0.5`, its help `caption`; `SwitchSetting` = `FormControlLabel m: 0` + `Switch size="small"` (test id on the root) + a `caption text.secondary` block.
- **Similar elsewhere** — `SwitchOption` in this module's settings screen is the same component at the default size with its test id on the input; the other four switch-with-help copies ([form / settings group](./Shared.md#form--settings-group)); the engine switch lives in the header on every other board.
- **Verdict** — share candidate — `SwitchOption` and `SwitchSetting` are one component twice in one module.

### PlayScore

> **Migrated (CTA-113)** — stays hand-written (§4.4) — a game's score board, no generic job.

- **Name and location** — `PlayScore`, `src/views/repertoires/RepertoirePlayer.tsx:1007`
- **Family** — other (a stat panel)
- **MUI atoms** — Box, Typography, Button
- **What it does** — A game's Score tab: the lines finished or covered, three figures (right, wrong, accuracy), a help line, Reset and (Backtracking) Start over.
- **API** — `id`, `score`, `onReset`, `lines`, `onStartOver?`.
- **Used by** — `RepertoirePlayer` (games only).
- **Tests** — `repertoires/RepertoireGames.test.tsx` (`-score-*`).
- **Styling** — column `gap: 2 p: 1`; figures `h4` 700 `dir="ltr"` in `success.main` / `error.main` / `text.primary` over a `caption`, three equal columns; buttons `outlined small`.
- **Similar elsewhere** — none; the only stat figures in the app (and the only `h4` besides the home page title).
- **Verdict** — module-specific but needs design consistency — a `StatFigure` would be the design system's first data display.

### RepertoireGamesMenu

> **Migrated (CTA-113)** — `IconAction` (`popupOpen`) + `AnchoredMenu`.

- **Name and location** — `RepertoireGamesMenu`, `src/views/repertoires/RepertoireGamesMenu.tsx`
- **Family** — menu
- **MUI atoms** — Tooltip, IconButton, Menu, MenuItem
- **What it does** — A button that opens the list of games a repertoire can be played as; each item a link.
- **API** — `id` (the repertoire), `testId` (`<testId>-<game>` per item).
- **Used by** — `RepertoireRow`, `RepertoireCard`, the player's header.
- **Tests** — `repertoires/RepertoireGames.test.tsx`, `repertoires/RepertoireBoard.test.tsx`.
- **Styling** — `IconButton size="small" flexShrink: 0` with `aria-haspopup="menu"`; `Menu` anchored to it, plain `MenuItem component={RouterLink}` items, no icons, no dense.
- **Similar elsewhere** — `MoveContextMenu` (Shared) — dense, with icons and a subheader.
- **Verdict** — module-specific but needs design consistency — the app's two menus have different densities and item styles.

### RepertoireChangesBar

> **Migrated (CTA-113)** — the `ChangesStrip` block (`blocks/panels/`), shared with the Analysis Board and the Library; deleted.

- **Name and location** — `RepertoireChangesBar`, `src/views/repertoires/RepertoireChangesBar.tsx`
- **Family** — toolbar / action bar
- **MUI atoms** — Box, Typography, Tooltip, Button
- **What it does** — The strip above the footer while a session differs from its record: the title and a summary; **Update** (or, protected, a link to the settings), **Save as copy**, **Discard**; a read-only mode (no Update, a note); the last problem.
- **API** — `testId`, `labelKey = "repertoires.changes"`, `summary`, `problem`, `protectedBy?: { settingsPath, from }`, `readOnly? = false`, `onUpdate?`, `onCopy`, `onDiscard`. Ids `-summary`, `-read-only`, `-protected`, `-update`, `-settings`, `-copy`, `-discard`, `-problem`.
- **Used by** — `RepertoirePlayer`, `AnalysisBoard` (`analysis.changes`), `LibraryGameBoard` (`library.changes` / `library.shippedChanges`, read-only for a shipped collection).
- **Tests** — `repertoires/RepertoirePlayer.test.tsx`, `repertoires/RepertoireAnnotations.test.tsx`, `tools/analysis/AnalysisBoard.test.tsx`, `library/Library.test.tsx`.
- **Styling** — the raised strip with a `success.main` border (`mb: 1 px: 1 py: 0.75`, `borderRadius: 1`, `background.paper`), `role="region"`; title `body2` 600 with the summary inline `text.secondary`; notes `caption`; Update `contained small color="success"`, copy `outlined small`, discard text small, wrapping `gap: 1 mt: 0.75`; the problem a `caption error.main role="alert"`.
- **Similar elsewhere** — `AnnotationsBar` (the same strip, `info`), `NextMovesBar` and the pinned variations (`divider`).
- **Verdict** — already shared — used by three modules; its name and folder should stop saying "repertoire".

---

## A repertoire's settings — `RepertoireSettingsScreen.tsx`, `RepertoireSettingsSections.tsx`

### RepertoireSettingsScreen

> **Migrated (CTA-113)** — `SettingsFrame`, `MissState`.

- **Name and location** — `RepertoireSettingsScreen` (`:52`) and `SettingsForm` (`:77`), `src/views/repertoires/RepertoireSettingsScreen.tsx`
- **Family** — form / settings group
- **MUI atoms** — Box, Typography, Divider, Alert, Button
- **What it does** — One draft over the sections in `SECTIONS` (General, Board, Folder), written on Save (settings, then the folder); Cancel drops it; both go back where the reader came from. A miss for an unknown id.
- **API** — none (the route).
- **Used by** — `RepertoireSettingsScreenMain.tsx`.
- **Tests** — `repertoires/RepertoireSettings.test.tsx`, `repertoires/RepertoireFolders.test.tsx` (`repertoire-settings-save`, `-cancel`, `-missing`, `-folder`; the save-failure `Alert` is not exercised).
- **Styling** — `AnalysisSettingsScreen`'s layout exactly: a scrolling column `gap: 2`, heading `subtitle1` 700 over the name `body2 text.secondary noWrap`, sections an `overline` heading with a `Divider mb: 2` above all but the first, Save `contained` and Cancel a text link, the miss centred `py: 4`.
- **Similar elsewhere** — `AnalysisSettingsScreen` (Analyses) — the same screen with a `Section` component.
- **Verdict** — share candidate — one `SettingsScreen` with sections.

### SwitchOption

> **Migrated (CTA-113)** — `SwitchField`.

- **Name and location** — `SwitchOption`, `src/views/repertoires/RepertoireSettingsSections.tsx:58`
- **Family** — form / settings group
- **MUI atoms** — Box, FormControlLabel, Switch, Typography
- **What it does** — One on / off option with a line on what it does.
- **API** — `checked`, `onChange`, `label`, `help`, `testId` (on the input).
- **Used by** — `GeneralSection` (protected), `BoardSection` (arrows, chance arrows).
- **Tests** — `repertoires/RepertoireSettings.test.tsx`.
- **Styling** — `FormControlLabel m: 0`, `Switch` at the default size, the test id through `slotProps.input` (`as object`); help `caption text.secondary` block.
- **Similar elsewhere** — `SwitchSetting` in this module's player (small, test id on the root); four more copies elsewhere ([form / settings group](./Shared.md#form--settings-group)).
- **Verdict** — share candidate — the strongest duplication in the inventory.

### GeneralSection, BoardSection and FolderSection

> **Migrated (CTA-113)** — `SettingsSection`s; `SideToggle`, `SwitchField`; the folder a `PickerList` (a list, `aria-current` — was a tree).

- **Name and location** — `GeneralSection` (`:92`), `BoardSection` (`:135`), `FolderSection` (`:197`), `src/views/repertoires/RepertoireSettingsSections.tsx`
- **Family** — form / settings group
- **MUI atoms** — Box, TextField, Typography, ToggleButtonGroup, ToggleButton, List, ListItemButton, ListItemIcon, ListItemText (+ `SwitchOption`)
- **What it does** — General: title, description, protected. Board: the main colour, next-move arrows, play-chance arrows. Folder: Unfiled or one of the folders, as a one-level tree select.
- **API** — each `{ draft, onChange(patch) }` (`RepertoireSettingsSectionProps`).
- **Used by** — `RepertoireSettingsScreen` (`SECTIONS`).
- **Tests** — `repertoires/RepertoireSettings.test.tsx`, `repertoires/RepertoireFolders.test.tsx` (`repertoire-settings-name`, `-description`, `-protected`, `-color-*`, `-show-arrows`, `-chance-arrows`, `-folder-*`).
- **Styling** — sections a `gap: 2` column; title `size="small"` with a helper and placeholder, description `multiline 3 / 10` with a max length, `dir="auto"`; the colour label `body2` 600 `mb: 0.75`, buttons `textTransform: none px: 2`, a help caption `mt: 0.75`; the folder tree `List dense disablePadding` with `role="tree"` / `treeitem` / `group`, items `borderRadius: 0.5`, indent `1 + depth * 3`, `ListItemIcon minWidth: 32`.
- **Similar elsewhere** — `AnalysisSettingsScreen`'s General and Board sections (the same fields); its Folder section uses the shared `FolderPicker` (indent `2 + depth * 2.5`, an icon with a physical `mr`) where this one builds its own tree.
- **Verdict** — share candidate — `FolderSection` should be `FolderPicker`; the General and Board fields match the analyses' and could be one set.

---

## Left out, and why

| What | Why |
| --- | --- |
| `RepertoireGame.tsx` | The route: resolves the record and the game; no MUI. |
| `repertoires/*Main.tsx` | Layout-only wrappers. |
| `useRepertoireGame.ts`, `useSavedRepertoires.ts`, `useRepertoireFolders.ts`, `repertoireTestKit.tsx` | Hooks and test support — no UI. |
| The list's right-panel hint and storage note (`Repertoires.tsx:589-598`) | Two `Typography`s — the panel-note pattern ([`Shared.md`](./Shared.md#analysisplaceholder)); `repertoires-storage-note` is not asserted. |
| The player's Moves, Map, comment block, next-moves bar; the square and the arrows | The explorer and the board — [`Shared.md`](./Shared.md#the-explorers-chrome--viewsexplorer), out of scope. |
| The player's Engine tab | `AnalysisSettings` — [`Analyses.md`](./Analyses.md#analysissettings). |

---

## Consistency notes

- **list** — `RepertoireRow` is `SavedAnalysisRow` minus `dir="auto"` on the
  name; the folder row is a different component from the analyses' (a `Link`
  and `secondaryAction` with a hard-coded `8.5rem` inset, three actions not
  four, a different rename icon).
- **card grid** — `RepertoireCard` matches `SavedAnalysisCard`; this module's
  folder card is square (it lines up with the boards), the shared one is not.
- **dialog** — the three dialogs here are the shared folder dialogs "reduced"
  (their own words) rather than reused: `margin="dense"` on the name field, no
  sub-folder count, test ids on the title rather than the root. The bulk
  delete is imported by Saved analyses. All confirm with a contained `error`
  button — unlike the Lobby's and the Library's hand-written ones.
- **form / settings group** — two switch-with-help components in one module
  (`SwitchOption` default size, test id on the input; `SwitchSetting` small,
  test id on the root); the folder select is a hand-built tree where the
  analyses use `FolderPicker`; the settings screen is the analyses' layout,
  copied.
- **toolbar / action bar** — the list bar matches Saved analyses'; the player
  header is the busiest board header (six actions), its back arrow is last,
  and its Play is not `PlayToggleButton`. `RepertoireChangesBar` is used by
  three modules from here.
- **menu** — `RepertoireGamesMenu` is plain (no dense, no icons) beside the
  explorer's dense, iconed move menu.
- **empty / loading / error state** — `ReadingRepertoires` and
  `MissingRepertoire` are the only named reading and miss components in the
  app; the miss is centred and small (as the analysis settings'), where
  `LibraryMiss` is left-aligned and medium. `MultiGameRepertoire`'s spinner is
  the only unlabelled reading state.
- **feedback** — the trainer's status line is one of four footer statuses; the
  changes strip's problem is a caption, the settings screen's an `Alert`.
- **other** — `PlayScore` is the only stat display.
- **upload / import** — `RepertoireUpload` matches `LibraryUpload` (6 / 14
  paste, `contained` pick) and shows its reading state inline with a spinner.
