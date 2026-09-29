# Shared — `views/shared/`, the panel skeleton, the explorer chrome, the shell

The pieces more than one module renders, and the app shell around every
screen. The module docs link here rather than describe these again. The
template and families are [`README.md`](./README.md)'s. The **cross-module
comparisons** — the four tables first, then every family — are at the end
of this file.

**Migrated onto the design system by CTA-113**: each entry below is marked
with what replaced it, and describes the component as it was. What is left
of `views/shared/` is the board's pieces and hooks — the move list, the eval
bar, the captured strips, the plates, the promotion picker, the board
controls, the next-moves bar, the position editor, `useCurrentOpening`,
`useStoreRead`; everything generic moved into the design system and every
chess-aware composition into `src/blocks/` ([`migration.md`](./migration.md)).

- [`views/shared/`](#viewsshared)
- [`views/shared/folders/`](#viewssharedfolders)
- [`views/shared/positionEditor/` — the chrome](#viewssharedpositioneditor--the-chrome)
- [The board panel — `views/board/core/`](#the-board-panel--viewsboardcore)
- [The explorer's chrome — `views/explorer/`](#the-explorers-chrome--viewsexplorer)
- [The app shell — `views/main/`, `views/home/`, `theme/`](#the-app-shell--viewsmain-viewshome-theme)
- [Left out, and why](#left-out-and-why)
- [Consistency notes](#consistency-notes)
- [Cross-module comparisons](#cross-module-comparisons)

---

## `views/shared/`

### OptionSlider

> **Migrated (CTA-113)** — the `AnalysisEngineForm` block over `SliderField` and `engineOptionState`; deleted.

- **Name and location** — `OptionSlider`, `src/views/shared/OptionSlider.tsx`
- **Family** — form / settings group
- **MUI atoms** — Box, Typography, Slider
- **What it does** — One UCI option as a slider, rendered from what the running engine declared: live with the engine's own bounds, disabled with "this build has no such option" when absent, disabled with "fixed at N" when `min === max`. Before the handshake it stays live within fallback bounds. `maxOffered` can narrow the top (MultiPV's 500 → 10).
- **API** — `optionName`, `option: EngineOption | undefined`, `label`, `value`, `fallbackMin`, `fallbackMax`, `maxOffered?`, `step? = 1`, `onChange(next)`, `valueLabel?` (replaces the number beside the label). Test id derived from the option name: `engine-setting-<kebab name>` (+ `-value`, `-unsupported`, `-fixed`).
- **Used by** — `EngineSettings` (skill, MultiPV, threads, hash), `AnalysisSettings` (MultiPV).
- **Tests** — `engine/play/EngineSettings.test.tsx`, `engine/play/PlayWithEngine.test.tsx`, `engine/games/PlayedGames.test.tsx` (the Lobby form).
- **Styling** — header row `display: flex; alignItems: baseline; justifyContent: space-between; gap: 1`; label `body2` 600; value `body2` `text.secondary` with `dir="ltr"`; `Slider size="small"`; the whole block at `opacity: 0.6` when disabled; notices `caption` in `warning.main`.
- **Similar elsewhere** — The same label-and-value header is written out by hand **four more times**: depth and move time in `EngineSettings.tsx:80-150` and again in `AnalysisSettings.tsx:68-146` (the latter also dims to 0.6 while the engine is off). Only the option-backed rows go through this component.
- **Verdict** — already shared — split out a plain `LabeledSlider` (header + slider) under it so the four `go`-argument sliders stop copying its header.

### CopyableValue

> **Migrated (CTA-113)** — `CopyField` (`components/forms/`); deleted.

- **Name and location** — `CopyableValue`, `src/views/shared/CopyableValue.tsx`
- **Family** — form / settings group
- **MUI atoms** — Box, Typography, Tooltip, IconButton, TextField
- **What it does** — A read-only notation field (FEN, PGN) with a copy button; the clipboard write is guarded and reports "copied" or "failed". Can be disabled (an illegal position's FEN) with a hint in the copy state's place.
- **API** — `label`, `value`, `testId` (root of `-copy`, `-copy-state`, `-copy-disabled`), `disabled? = false`, `disabledHint?`.
- **Used by** — `AnalysisExport` (FEN and PGN), `FenSetup` (the editor's current FEN). (`MoveContextMenu` only cites its clipboard rule.)
- **Tests** — `tools/analysis/AnalysisBoard.test.tsx` (`analysis-export-fen`), `shared/positionEditor/PositionEditor.test.tsx` (`-current-fen-copy`). The copied / failed states have no test of their own.
- **Styling** — label `body2` 600; `TextField multiline size="small" maxRows={6}`, input `dir="ltr"`, monospace stack `ui-monospace, SFMono-Regular, Menlo, monospace` at `0.75rem` (inline `style`); copied `success.main`, failed / disabled `warning.main` captions. Disabled copy button wrapped in a `Box component="span" display: inline-flex` for its tooltip.
- **Similar elsewhere** — `MoveContextMenu`'s *Copy variation PGN* reports the same outcome through a `Snackbar` instead of a caption. Monospace notation is written three other ways (`fontFamily: "monospace"` in `NewGameForm` and `IncompatibleImportDialog`, the same stack in `PlayChanceDialog`, `AnnotationsBar`, `NagDialog`, `BestVariations`).
- **Verdict** — already shared — the copy-feedback style (caption vs snackbar) and the monospace token want one definition.

### GameInfo

> **Migrated (CTA-113)** — the `GameInfo` block (`blocks/panels/`) over `KeyValueList`.

- **Name and location** — `GameInfo`, `src/views/shared/GameInfo.tsx`
- **Family** — list
- **MUI atoms** — Box (`component="dl"`), Typography (`dt` / `dd`)
- **What it does** — A game's PGN tag pairs as a two-column definition list: the named tags first (translated labels, spec order), then any other tag under its raw name. Placeholder values (`?`, `????.??.??`) read as absent; nothing → an empty line.
- **API** — `game: Game | undefined`.
- **Used by** — `LibraryGameBoard` (Info tab).
- **Tests** — none asserts its content (`library/Library.test.tsx` only checks the Info tab exists).
- **Styling** — grid `auto 1fr`, `columnGap: 1.5`, `rowGap: 0.5`, baseline; labels `body2 text.secondary nowrap`; values `body2`, `dir="ltr"`, `unicodeBidi: isolate`, `overflowWrap: anywhere`. Empty state `body2 text.secondary`.
- **Similar elsewhere** — The import popup's metadata summary (`ImportOptionsDialog`), the Storage tab's two-column browser table, and `PgnSetup`'s game list subtitle all show key/value facts about games, each differently.
- **Verdict** — already shared — untested; a generic `KeyValueList` would also serve the Storage tab's browser figures.

### MergeSplitChoice

> **Migrated (CTA-113)** — the `MergeSplitChoice` block (`blocks/forms/`).

- **Name and location** — `MergeSplitChoice`, `src/views/shared/MergeSplitChoice.tsx`
- **Family** — form / settings group
- **MUI atoms** — Box, Typography, Button, Alert
- **What it does** — The choice a text of several games offers: the count and the skipped games, **Merge** (disabled with a reason when the games do not share a start) and optionally **Split** (how many it makes), then the caller's worded problem.
- **API** — `labelKey` (locale block: `title`, `explain`, `skipped`, `merge`, `mergeHelp`, `mergeUnavailable`, `split`, `splitHelp`), `testIdPrefix`, `count`, `skipped`, `mergeable`, `onMerge`, `onSplit?` (absent: no Split), `problem: string | null`.
- **Used by** — `RepertoireMergeSplit` (merge + split), `AnalysisLoad` (the Openings explorer's inline merge-only choice).
- **Tests** — `repertoires/RepertoireUpload.test.tsx`, `repertoires/RepertoireBoard.test.tsx`, `openings/OpeningsBoard.test.tsx` (`analysis-choice`).
- **Styling** — column `gap: 1.5`; title `subtitle2` 700; each action a `Button` (Merge `contained`, Split `outlined`, with merge / split icons) over a `caption text.secondary` help line (`mt: 0.5`).
- **Similar elsewhere** — `MultiGameDialog` (Analyses) is the same choice laid out again inside a dialog — the same button-over-help-caption blocks, a second action (Save as games collection) in Split's place.
- **Verdict** — already shared — `MultiGameDialog` should render this body inside its dialog rather than repeat it.

### SavedListExportBar

> **Migrated (CTA-113)** — `SelectionBar` (`components/toolbars/`); deleted.

- **Name and location** — `SavedListExportBar`, `src/views/shared/SavedListExportBar.tsx`
- **Family** — toolbar / action bar
- **MUI atoms** — Box, Checkbox, Chip, Tooltip, IconButton
- **What it does** — The picks' bar: a tri-state select-all, a chip counting the picks (its delete clears them), a download, and an optional bulk delete. The caller computes the tri-state (what select-all covers differs per screen).
- **API** — `checked`, `indeterminate`, `onToggleAll`, `selectedCount`, `onClearSelected`, `onDownload`, `onDelete?`, `labelKey` (`selectAll`, `selected`, `download`, `deleteSelected`), `testIdPrefix` (`-export`, `-select-all`, `-selected-count`, `-download`, `-delete`).
- **Used by** — `SavedAnalyses`, `Repertoires`, `CollectionScreen`.
- **Tests** — `tools/analysis/saved/SavedAnalyses.test.tsx`, `repertoires/Repertoires.test.tsx`, `library/Library.test.tsx`.
- **Styling** — row `gap: 0.5`, `flexShrink: 0`; `Checkbox size="small"` inside a `Tooltip`; icon buttons `size="small"` in inline-flex spans for their tooltips.
- **Similar elsewhere** — The Lobby (`PlayedGames`) does the same job without it: select-all in the table header, a text **Delete picked (N)** button, no chip, no download.
- **Verdict** — already shared — the Lobby table should use it too, or the bar should grow a "select-all in the header" mode (see [the four tables](#the-four-tables)).

### SavedListViewToggle

> **Migrated (CTA-113)** — `ViewToggle` (`components/toolbars/`); deleted.

- **Name and location** — `SavedListViewToggle`, `src/views/shared/SavedListViewToggle.tsx`
- **Family** — toolbar / action bar
- **MUI atoms** — ToggleButtonGroup, ToggleButton, Tooltip
- **What it does** — The three-way view switch: list, compact cards, comfortable cards. A click on the pressed button (MUI's `null`) is swallowed.
- **API** — `value: SavedListView`, `onChange(next)`, `labelKey` (`view.label`, `view.list`, `view.compact`, `view.comfortable`), `testIdPrefix` (`-view-<value>`).
- **Used by** — `SavedAnalyses`, `Repertoires`.
- **Tests** — `tools/analysis/saved/SavedAnalyses.test.tsx`, `repertoires/Repertoires.test.tsx`, `repertoires/RepertoireFolders.test.tsx`.
- **Styling** — `size="small"`, `flexShrink: 0`; icon-only buttons with `aria-label`; the `Tooltip` wraps the icon inside the button (elsewhere tooltips wrap the button).
- **Similar elsewhere** — none; the only icon-only `ToggleButtonGroup`.
- **Verdict** — already shared — fine as is.

### The saved-list grid (`savedList.ts`, `cardSize.ts`)

> **Migrated (CTA-113)** — `CardGrid` and `cardGridColumns`; `lib/savedListCaption.ts`; `blocks/lists/savedListView.ts`. Deleted.

- **Name and location** — `savedListGridSx`, `savedListDate`, `savedListLine`, `SAVED_LIST_DEFAULT_VIEW` in `src/views/shared/savedList.ts`; `cardSizeTrack` in `src/views/shared/cardSize.ts`
- **Family** — card grid
- **MUI atoms** — none (`CSSObject` values for a `Box`)
- **What it does** — The card grid's styles (the one scrolling region, `gridAutoRows: "max-content"` so rows overflow instead of squashing), the caption's date in the reader's locale, and the secondary caption line joined with ` · ` (empty facts dropped).
- **API** — `savedListGridSx(view: CardSize)`, `savedListDate(iso, language)`, `savedListLine(parts)`, `cardSizeTrack(size)` → `repeat(auto-fill, minmax(min(<160|260>px, 100%), 1fr))`.
- **Used by** — `SavedAnalyses`, `Repertoires`; `savedListDate` also by `PlayedGames`.
- **Tests** — through the two screens' tests.
- **Styling** — `gap: 2`, `pt: 1.5`, `alignContent: start`; compact 160px, comfortable 260px card minimum.
- **Similar elsewhere** — `Home`'s card grid (`minmax(220px, 1fr)`, `gap: 1.5`) and the `NagDialog`'s toggle grid (`minmax(13rem, 1fr)`) are the other `auto-fill` grids.
- **Verdict** — already shared — the one grid definition the card screens agree on; Home could take a size from it.

### BoardControls

> **Migrated (CTA-113)** — stays a board piece, built of `ActionBar` + `IconAction`s.

- **Name and location** — `BoardControls`, `src/views/shared/BoardControls.tsx`
- **Family** — toolbar / action bar
- **MUI atoms** — Box, Tooltip, IconButton
- **What it does** — First / previous / next / last, and flip at the trailing edge. Presentational over ply numbers.
- **API** — `ply`, `lastPly`, `onSelectPly(ply)`, `onFlip`. Test ids `board-controls`, `board-control-<first|previous|next|last|flip>`.
- **Used by** — `BoardPanel` (so every board).
- **Tests** — `board/boards.test.tsx` and every board screen's test (`PlayWithEngine`, `MaskedPlay`, `AnalysisBoard`, `Library`, `OpeningsBoard`, `RepertoirePlayer`, `RepertoireBoard`, `RepertoireGames`).
- **Styling** — `gap: 0.5`, `pt: 1`, `borderTop: 1px solid divider`; flip pushed with `marginInlineStart: auto`; the row mirrors under Hebrew, the chevrons keep their glyphs.
- **Similar elsewhere** — `OpeningFilterBoard`'s back / reset / flip row (Library) — the same three controls, different icons (`FirstPage`, `NavigateBefore`, `SwapVert`) and no top border.
- **Verdict** — already shared — the Library filter board's row could reuse it.

### BestVariations

> **Migrated (CTA-113)** — stays in the board core's panel; its targets 24 px, its motion the theme's.

- **Name and location** — `BestVariations`, `src/views/shared/BestVariations.tsx` (inner `PendingRow` at `:164`)
- **Family** — list
- **MUI atoms** — Box, Typography, FormControlLabel, Checkbox, Chip, ButtonBase, Skeleton
- **What it does** — The engine's top lines: a header checkbox (show / hide the lines — the block's own control), an "N of M lines" note, a depth chip; then one row per requested line — the score and the PV, one line with an ellipsis, a chevron that expands it. With `onSelectMove` each move is a button that plays the line up to it. Pending ranks keep their row's height (skeleton).
- **API** — `analysis`, `requested`, `mask?`, `onSelectMove?`, `initialShowLines?`, `onShowLinesChange?`.
- **Used by** — `BoardPanel` (the pinned block, every board with an engine).
- **Tests** — `shared/BestVariations.test.tsx`, `board/boards.test.tsx`, `engine/play/PlayWithEngine.test.tsx` (`variations-toggle`).
- **Styling** — header `FormControlLabel` with `subtitle2` 700 label; depth `Chip size="small" variant="outlined"`; rows `p: 0.75`, `borderRadius: 0.5`, `bgcolor: action.hover`; scores and SAN in the monospace stack at `0.8125rem`, `unicodeBidi: isolate`, `dir="ltr"`. `BoardPanel` wraps it in a bordered `background.paper` box capped at 40% height.
- **Similar elsewhere** — The move tokens reuse `moveSx` / `sanTokenSx` with `NextMovesBar` and the Library's continuation list.
- **Verdict** — already shared — one block, every board (the propagation guarantee).

### CurrentOpening

> **Migrated (CTA-113)** — the `CurrentOpening` block (`blocks/panels/`) and the `useCurrentOpening` hook (`views/shared/`).

- **Name and location** — `CurrentOpening`, `src/views/shared/CurrentOpening.tsx`
- **Family** — navigation
- **MUI atoms** — Box, Typography, Chip
- **What it does** — The opening at the position on screen, sticky past the book, with its ECO chip linking to `/openings?fen=`. Loading and unknown read differently.
- **API** — `fen`, `testId` (the chip is `<testId>-eco`).
- **Used by** — the panel headers of `PlayScreen`, `AnalysisBoard`, `LibraryGameBoard`, `OpeningsBoard`, `RepertoirePlayer`.
- **Tests** — `shared/CurrentOpening.test.tsx`.
- **Styling** — name `subtitle2` 700 `dir="ltr"` ellipsis; chip `size="small" dir="ltr" clickable` inside a `react-router` `Link` with an inline `style` (no `sx`); fallback `body2 text.secondary`.
- **Similar elsewhere** — `OpeningBookList` (Openings) and the saved-analysis cards print opening + ECO too: the Book tab as a `Chip`, the cards as `name · eco` text.
- **Verdict** — already shared — the ECO token has three renderings (chip link, chip, plain text).

---

## `views/shared/folders/`

### FolderTreeTable

> **Migrated (CTA-113)** — `DataTable`'s tree rows and the `CollectionsTreeTable` block; deleted.

- **Name and location** — `FolderTreeTable<T>`, `src/views/shared/folders/FolderTreeTable.tsx`
- **Family** — table
- **MUI atoms** — TableContainer, Table, TableHead, TableBody, TableRow, TableCell, TableSortLabel, IconButton, Box
- **What it does** — A file manager's details view: folders and items under a sticky header, indented by depth, chevron toggles (`aria-expanded`), the item's name a real link, the row click opening / toggling, a caller-supplied actions column revealed on hover and focus (always on no-hover devices). Sorting headers for Name and any `sortable` column.
- **API** — `testId`, `rows: FolderTreeRow<T>[]`, `nameLabel`, `columns: FolderTreeColumn<T>[]` (`id`, `label`, `sortable?`, `align?`, `width?`, `render`), `actionsLabel`, `sort`, `direction`, `onSort`, `folderName`, `itemName`, `hrefOf`, `onOpenItem`, `onToggle`, `toggleLabel`, `actionsOf`, `rowTestId`, `linkTestId`, `folderIcon?`, `itemIcon?`.
- **Used by** — `LibraryHome` only.
- **Tests** — `library/Library.test.tsx`.
- **Styling** — `size="small" stickyHeader`; header cells 600; body cells `py: 0.25` (denser than the other tables), values `text.secondary nowrap`; indent `paddingInlineStart: 1 + depth * 2.5`; chevron rotation set as an inline `style` so the RTL plugin leaves it (`scaleX(-1)` closed under RTL); actions `opacity` 0 → 1 over 120 ms; names `fontWeight: 500` ellipsis, `dir="auto"`. A local `visuallyHidden` object duplicates MUI's `@mui/utils` helper.
- **Similar elsewhere** — the other three tables ([comparison](#the-four-tables)); the Saved analyses / Repertoires lists show folders as rows and drill in instead of expanding.
- **Verdict** — already shared — presentational and generic; only the Library uses it, the saved lists could.

### SavedFolderRow / SavedFolderCard

> **Migrated (CTA-113)** — `FolderRow` / `FolderCard` with the `FolderActions` block; deleted.

- **Name and location** — `SavedFolderRow` (`:122`), `SavedFolderCard` (`:195`) and the inner `FolderActions` (`:35`), `src/views/shared/folders/SavedFolderViews.tsx`
- **Family** — list (row) / card grid (card)
- **MUI atoms** — ListItem, ListItemButton, ListItemText, Card, CardActionArea, Box, Typography, Tooltip, IconButton
- **What it does** — One folder in the list view (a drill-in button with the name and "N games" over the whole subtree) and in the card views (a big folder icon card), each with four actions: download (disabled when empty), rename, move, delete.
- **API** — `folder`, `labelKey` (`folder.*`), `testIdPrefix` (`-folder-<id>`, `-folder-open-`, `-folder-download-`, `-rename-`, `-move-`, `-delete-`), `count`, `onOpen(id)`, `onDownload`, `onRename`, `onMove`, `onDelete`.
- **Used by** — `SavedAnalyses`.
- **Tests** — `tools/analysis/saved/SavedAnalyses.test.tsx`.
- **Styling** — row: `ListItem disableGutters` `py: 1.25` bottom divider, button `borderRadius: 1`, icon `marginInlineEnd: 1.5`. Card: `variant="outlined"`, `p: 2`, `minHeight: 140`, icon `fontSize: 44`, name `subtitle2` 600, actions pushed with `marginInlineStart: auto`.
- **Similar elsewhere** — `RepertoireFolderRow` / `RepertoireFolderCard` (Repertoires) — the same job on the sister screen: three actions, `ListItem secondaryAction`, a **square** card with an `action.hover` fill and a `3rem` icon, `Link` navigation instead of `onOpen`. The doc comments still name `SavedGames.tsx` and a `LibraryFolderCard`, neither of which exists.
- **Verdict** — already shared — the repertoires' copies should become these (with an optional Move).

### SavedFolderBreadcrumb

> **Migrated (CTA-113)** — `Breadcrumbs` (`currentTestId`); deleted.

- **Name and location** — `SavedFolderBreadcrumb`, `src/views/shared/folders/SavedFolderBreadcrumb.tsx`
- **Family** — navigation
- **MUI atoms** — Box, Button, Typography
- **What it does** — The chain back up a nested folder tree: a root button, then each ancestor a button, the current folder as text.
- **API** — `crumbs: GameFolder[]`, `onOpen(id | null)`, `labelKey` (`folder.root`), `testIdPrefix` (`-breadcrumb`, `-breadcrumb-root`, `-breadcrumb-<id>`).
- **Used by** — `SavedAnalyses`.
- **Tests** — `tools/analysis/saved/SavedAnalyses.test.tsx`.
- **Styling** — wrapping row `gap: 0.5`, `py: 0.5`; crumbs `Button size="small"` `minWidth: 0`, `px: 1`, `textTransform: none`; separators a literal `/` in `body2 text.secondary`. As written the `/` is emitted only before the non-last crumbs, so the current folder follows the previous crumb with no separator; the last crumb also skips the `untitled` fallback.
- **Similar elsewhere** — MUI's `Breadcrumbs` is not used anywhere. Repertoires (one level) show a back arrow and the folder's name as the title instead; the Library expands in place.
- **Verdict** — already shared — worth rebuilding on MUI `Breadcrumbs`, which also fixes the separator.

### FolderNameDialog

> **Migrated (CTA-113)** — the `FolderNameDialog` block (`blocks/dialogs/`) over `FormDialog`.

- **Name and location** — `FolderNameDialog`, `src/views/shared/folders/FolderNameDialog.tsx`
- **Family** — dialog
- **MUI atoms** — Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button
- **What it does** — New / rename folder: one text field (Enter saves), Save disabled on an empty name, re-seeded on each open (adjusted during render).
- **API** — `open`, `labelKey` (`folder.name`, `folder.cancel`, `folder.save`), `idPrefix = "game-folder"` (`-name-input`, `-name-cancel`, `-name-save`), `title`, `initial`, `onSave(name)`, `onClose`.
- **Used by** — `SavedAnalyses` (`analysis-folder`), `LibraryHome` (`library-folder`).
- **Tests** — `tools/analysis/saved/SavedAnalyses.test.tsx`, `library/Library.test.tsx`.
- **Styling** — `fullWidth maxWidth="xs"`; `TextField autoFocus fullWidth` (no `margin`); Save `variant="contained"`. No test id on the dialog root.
- **Similar elsewhere** — `RepertoireFolderNameDialog` (Repertoires) — the same dialog with `margin="dense"` and its own test ids; `SaveAnalysisDialog` (Analyses) — the same name field plus a folder picker.
- **Verdict** — already shared — the repertoire copy should become this.

### FolderMoveDialog

> **Migrated (CTA-113)** — the `FolderMoveDialog` block over `BaseDialog` and `FolderPicker`.

- **Name and location** — `FolderMoveDialog`, `src/views/shared/folders/FolderMoveDialog.tsx`
- **Family** — dialog
- **MUI atoms** — Dialog, DialogTitle, DialogContent, DialogActions, Button (+ `FolderPicker`)
- **What it does** — Where a folder moves: every folder but its own subtree, or the top level. A pick moves at once; the only button is Cancel.
- **API** — `open`, `labelKey`, `idPrefix = "game-folder"` (`-move-top`, `-move-cancel`, the picker's ids), `folders`, `folder`, `currentParentName` (the "none" row's label), `onMove(parentId)`, `onClose`.
- **Used by** — `SavedAnalyses`, `LibraryHome`.
- **Tests** — `library/Library.test.tsx` (`library-folder-move`); the analyses' move is not exercised by id.
- **Styling** — `fullWidth maxWidth="xs"`.
- **Similar elsewhere** — `CollectionMoveDialog` (Library, `LibraryHome.tsx:130`) is the same dialog for a collection, written inline.
- **Verdict** — already shared — `CollectionMoveDialog` is this without the exclusion.

### FolderDeleteDialog

> **Migrated (CTA-113)** — the `FolderDeleteDialog` block over `ConfirmDialog`.

- **Name and location** — `FolderDeleteDialog`, `src/views/shared/folders/FolderDeleteDialog.tsx`
- **Family** — dialog
- **MUI atoms** — Dialog, DialogTitle, DialogContent, DialogActions, Typography, Button
- **What it does** — Confirms deleting a non-empty folder, saying the contents stay (with counts of games and sub-folders).
- **API** — `open`, `labelKey` (`folder.deleteFolder`, `deleteConfirm`, `deleteCounts`, `cancel`), `idPrefix = "game-folder"` (`-delete-counts`, `-delete-cancel`, `-delete-confirm`), `folder`, `games`, `subFolders`, `onConfirm`, `onClose`.
- **Used by** — `SavedAnalyses`, `LibraryHome`.
- **Tests** — `tools/analysis/saved/SavedAnalyses.test.tsx`, `library/Library.test.tsx`.
- **Styling** — `fullWidth maxWidth="xs"`; body `Typography body2` + counts `caption text.secondary` (not `DialogContentText`); confirm `color="error" variant="contained"`.
- **Similar elsewhere** — `RepertoireFolderDeleteDialog` (one count); every other confirm dialog — see [dialog](#dialog).
- **Verdict** — already shared — the reference shape for a destructive confirm.

### FolderPicker

> **Migrated (CTA-113)** — the `FolderPicker` block (`blocks/lists/`) over `PickerList`.

- **Name and location** — `FolderPicker`, `src/views/shared/folders/FolderPicker.tsx`
- **Family** — list
- **MUI atoms** — List, ListItemButton, ListItemText
- **What it does** — A folder tree flattened into one selectable list (parents before children, indented by depth), with a "none" row first (Unfiled / Top level) and an optional exclusion (a moved folder's subtree).
- **API** — `folders`, `labelKey`, `idPrefix = "game-folder"` (`-picker`, `-picker-<id>`), `value: string | null | undefined`, `onChange(id | null)`, `noneLabel`, `noneTestId`, `exclude?`.
- **Used by** — `FolderMoveDialog`, `SaveAnalysisDialog`, `AnalysisSettingsScreen`, `LibraryUpload`, `LibraryHome` (`CollectionMoveDialog`).
- **Tests** — `tools/analysis/saved/SavedAnalyses.test.tsx`, `tools/analysis/saved/AnalysisSettingsScreen.test.tsx`, `tools/analysis/AnalysisBoard.test.tsx`, `library/Library.test.tsx`.
- **Styling** — `List dense disablePadding`; rows `borderRadius: 0.5`, indent `paddingInlineStart: 2 + depth * 2.5`; icons with a **physical** `mr: 1.5` (the RTL stylis plugin flips it, but the codebase's rule is logical properties).
- **Similar elsewhere** — `FolderSection` (Repertoires' settings) — a hand-built `role="tree"` list for one level: `ListItemIcon minWidth: 32`, indent `1 + depth * 3`. `LibraryUpload` boxes this picker in a bordered scrolling frame; the dialogs do not.
- **Verdict** — already shared — the repertoire settings' tree should be this.

---

## `views/shared/positionEditor/` — the chrome

The board and the spare pieces are out of scope; the forms, the problem report
and the rows around the board are in. The contract is
[`.claude/rules/position-editor.md`](../../.claude/rules/position-editor.md).

### PositionEditor

> **Migrated (CTA-113)** — stays a board piece; its chrome `InlineAlert`, `ActionBar`, `PanelTabs`.

- **Name and location** — `PositionEditor`, `src/views/shared/positionEditor/PositionEditor.tsx`
- **Family** — form / settings group
- **MUI atoms** — Box, Alert, AlertTitle, Button, Tabs, Tab, Typography
- **What it does** — The editor's column: a problems `Alert` (legality report), the board with its two palettes (pinned LTR), the resets row (New board, Reset, Clear board, Flip — or the host's `controls`), a remove hint, and a tab strip over the Position / FEN / PGN forms. A `.pgn` dropped anywhere loads (dashed outline while dragging).
- **API** — `editor` (from `usePositionEditor`), `testId`, `boardMaxWidth?`, `forms?` (one form: no strip), `controls?`.
- **Used by** — `NewGameForm` (Engine), `NewAnalysisForm` (Analyses).
- **Tests** — `shared/positionEditor/PositionEditor.test.tsx`, `engine/games/PlayedGames.test.tsx`, `tools/analysis/saved/SavedAnalyses.test.tsx`.
- **Styling** — column `gap: 1.5`, drag outline `2px dashed` `outlineOffset: 2px` in `primary.main`; problems `Alert severity="warning" py: 0.5` with `AlertTitle mb: 0` and a `ul` `pl: 2`; resets `Button size="small" variant="outlined"` with icons, wrapping; tab strip the panel's compact sx (see [tabs](#tabs)).
- **Similar elsewhere** — Both hosts put a second warning `Alert` listing the same problems above their Start button; the tab strip sx is copied from `BoardPanel`.
- **Verdict** — already shared — the problems list is rendered three times (here and in both hosts' footers).

### PiecePalette

> **Migrated (CTA-113)** — stays a board piece; its trash an `IconAction`.

- **Name and location** — `PiecePalette`, `src/views/shared/positionEditor/PiecePalette.tsx`
- **Family** — toolbar / action bar
- **MUI atoms** — Box, Tooltip, IconButton
- **What it does** — One colour's six spare pieces (react-chessboard `SparePiece`, out of scope) and a trash that empties that colour.
- **API** — `testId`, `color: "w" | "b"`, `onClear`.
- **Used by** — `PositionEditor` (twice).
- **Tests** — `shared/positionEditor/PositionEditor.test.tsx`.
- **Styling** — squares `flex: 1 1 0` up to 44px, `aspectRatio: 1 / 1`; trash `marginInlineStart: 1`; the row is inside the editor's `ForceLTR`.
- **Similar elsewhere** — none.
- **Verdict** — already shared — module-free already.

### PositionFields

> **Migrated (CTA-113)** — the `PositionFields` block (`blocks/forms/`).

- **Name and location** — `PositionFields`, `src/views/shared/positionEditor/PositionFields.tsx`
- **Family** — form / settings group
- **MUI atoms** — Box, Typography, ToggleButtonGroup, ToggleButton, FormControl, FormLabel, FormGroup, FormControlLabel, Checkbox, TextField (select), MenuItem
- **What it does** — FEN fields 2–4: side to move, the four castling rights, the en-passant square (a picker over the legal squares).
- **API** — `testId` (`-position-fields`, `-turn-<w|b>`, `-castling-<flag>`, `-en-passant`), `fields`, `onTurnChange`, `onCastlingChange`, `onEnPassantChange`.
- **Used by** — `PositionEditor`.
- **Tests** — `shared/positionEditor/PositionEditor.test.tsx`.
- **Styling** — column `gap: 2`; "Side to move" `subtitle2` 700 `mb: 1` over a plain `ToggleButtonGroup size="small"`; castling as a `fieldset` with a `FormLabel` legend in `subtitle2` 700; castling labels `dir="ltr"`; en passant `TextField select size="small"`, items `dir="ltr"`.
- **Similar elsewhere** — the White / Black toggle ([form / settings group](#form--settings-group)); two label styles for one form (a `Typography` over the toggle, a `FormLabel` over the checkboxes).
- **Verdict** — already shared — its field-label styles should match the rest.

### FenSetup

> **Migrated (CTA-113)** — the `FenInput` block (`blocks/forms/`).

- **Name and location** — `FenSetup`, `src/views/shared/positionEditor/FenSetup.tsx`
- **Family** — form / settings group
- **MUI atoms** — Box, Typography, TextField, Button, Alert (+ `CopyableValue`)
- **What it does** — A FEN in (a form, Enter or Load submits), the parse error, and the board's FEN out with a copy gated on legality.
- **API** — `testId` (`-fen-setup`, `-fen-input`, `-fen-error`, `-current-fen`), `fenText`, `onFenTextChange`, `onLoadFen(event)`, `error`, `currentFen`, `canCopy`.
- **Used by** — `PositionEditor`.
- **Tests** — `shared/positionEditor/PositionEditor.test.tsx`.
- **Styling** — section titles `subtitle2` 700; input `dir="ltr"`; Load `Button size="small" variant="outlined" mt: 1` (no test id).
- **Similar elsewhere** — `AnalysisLoad`'s FEN section (Analyses) and `NewAnalysisForm`'s FEN field — three FEN inputs: here a `<form>` with a Load button under the field, `AnalysisLoad` Enter or a Load button (disabled while empty), `NewAnalysisForm` Enter only.
- **Verdict** — already shared — one `FenInput` would serve all three.

### PgnSetup

> **Migrated (CTA-113)** — the `PgnInput` block over the `UploadPanel` pattern.

- **Name and location** — `PgnSetup`, `src/views/shared/positionEditor/PgnSetup.tsx`
- **Family** — form / settings group
- **MUI atoms** — Box, Typography, Stack, Button, TextField, Alert, List, ListItemButton, ListItemText
- **What it does** — A game's final position into the editor: pick a `.pgn`, drop one, or paste and Load; for a file of several games, a picker list.
- **API** — `testId` (`-pgn-setup`, `-pgn-file-input`, `-pgn-input`, `-pgn-error`, `-game-picker`), `games`, `selected`, `onSelectGame`, `error`, `pgnText`, `onPgnTextChange`, `onSubmitPgn`, `onFileChosen`.
- **Used by** — `PositionEditor`.
- **Tests** — `shared/positionEditor/PositionEditor.test.tsx`.
- **Styling** — the file input is a **visually hidden** `Box component="input"` (`hiddenInputSx`) inside `Button component="label" variant="contained" size="small"` — every other picker uses `<input hidden>`; paste `multiline minRows={3} maxRows={10}`; the only `Stack` outside the header.
- **Similar elsewhere** — [upload / import flows](#upload--import-flows): five PGN inputs, three paste-box sizes.
- **Verdict** — already shared — a shared `PgnInput` would replace this and four module copies.

---

## The board panel — `views/board/core/`

`BoardShell` renders the square (out of scope) and portals `BoardPanel` into
the right-hand aside through `RightPanel`. The skeleton and its slots are
[`chessboard.md`](../../.claude/rules/chessboard.md) §9.3.

### BoardPanel

> **Migrated (CTA-113)** — stays the board core's panel; its strip `PanelTabs`, its pinned block a `FeedbackStrip`, hidden `h2`s for the lines and the open tab.

- **Name and location** — `BoardPanel`, `src/views/board/core/BoardPanel.tsx`
- **Family** — tabs
- **MUI atoms** — Box, Tabs, Tab, Typography, Chip (+ `BestVariations`, `BoardControls`)
- **What it does** — The panel skeleton of every board: header slot, the pinned best-variations block, the tab strip, the status row (engine label + score chip, hidden with the lines), the one scrolling tab region (kept-mounted tabs stay hidden and scroll their current move back into view), footer slot, `BoardControls`.
- **API** — `testId`, `header?`, `analysis?`, `requestedMultiPv?`, `engineOn?`, `onPlayVariation?`, `mask?`, `showVariations?`, `initialShowLines?`, `tabs` (`id`, `label`, `content`, `disabled?`), `keepMounted?`, `activeTab`, `onTabChange`, `footer?`, `ply`, `lastPly`, `onSelectPly`, `onFlip`. Ids `<testId>-header`, `-variations`, `-tab-<id>`, `-status`, `-status-score`, `-content-<id>`, `-footer`.
- **Used by** — `BoardShell`, so every board: `PlayScreen` (Play with Engine, Masked Pieces), `AnalysisBoard`, `LibraryGameBoard`, `OpeningsBoard`, `RepertoirePlayer`.
- **Tests** — `board/panelPropagation.test.tsx`, `board/boards.test.tsx`, `repertoires/RepertoirePropagation.test.tsx`, and every board's own test.
- **Styling** — column `gap: 1`; header row `gap: 1`, `alignItems: center`; variations box `maxHeight: 40%`, `bgcolor: background.paper`, 1px `divider` border, `borderRadius: 1`, `px: 1 pt: 0.75 pb: 0.5`; tabs `variant="fullWidth"`, `minHeight: 36`, `textTransform: none`, `minWidth: 0`, `px: 1`, bottom divider; status `body2 text.secondary` + `Chip size="small" dir="ltr"`.
- **Similar elsewhere** — The compact tab strip sx is copied verbatim into `NewGameForm` and `PositionEditor`; `SettingsScreen` has a near-copy. The bordered `background.paper` "raised strip" recurs in `NextMovesBar`, `AnnotationsBar` (info border) and `RepertoireChangesBar` (success border).
- **Verdict** — already shared — its tab-strip sx and the raised-strip box should be exported tokens.

---

## The explorer's chrome — `views/explorer/`

The list, tree and map drawing are out of scope; the menu, its dialogs, the
comment block and the map's toolbar are in. Every one is placed by
`useVariationsExplorer` ([`tree-views.md`](../../.claude/rules/tree-views.md)).

### MoveContextMenu

> **Migrated (CTA-113)** — `ContextMenu` (`open`), a destructive `ConfirmDialog`, `useSnackbar`.

- **Name and location** — `MoveContextMenu`, `src/views/explorer/MoveContextMenu.tsx`
- **Family** — menu
- **MUI atoms** — Menu, MenuItem, ListSubheader, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Snackbar
- **What it does** — The right-click menu on a move (list or map), at the pointer: promote variation and make main line (side lines only), delete from here (confirmed with a move / line count), add comment, add annotation, play chances (branches only, optional), copy variation PGN (snackbar outcome). Every edit is a pure tree edit through `onEditTree`.
- **API** — `tree`, `target: { nodeId, anchor } | null`, `open`, `onClose`, `onEditTree`, `playChances? = true`, `mask?`. Ids `move-menu`, `move-menu-<promote|mainline|delete|comment|annotate|chances|copy>`, `move-menu-delete-dialog`, `move-menu-copied`.
- **Used by** — `TreeMoveList`, `TreeMap` (so every board with editing).
- **Tests** — `explorer/useVariationsExplorer.test.tsx`, `tools/analysis/AnalysisBoard.test.tsx`, `repertoires/RepertoirePlayer.test.tsx`, `repertoires/RepertoireAnnotations.test.tsx`, `repertoires/RepertoirePlayChance.test.tsx`.
- **Styling** — `Menu` `anchorReference="anchorPosition"`, `slotProps.list.dense`; subheader `lineHeight: 2.5`, the move `dir="ltr"`; delete dialog without `maxWidth` / `fullWidth`, confirm `color="error" variant="contained"`; copy `Snackbar autoHideDuration={3000}` with a plain `message`.
- **Similar elsewhere** — `RepertoireGamesMenu` (the only other `Menu`, anchored to a button); copy feedback in `CopyableValue` is a caption.
- **Verdict** — already shared — its delete dialog should be the shared destructive confirm.

### CommentDialog

> **Migrated (CTA-113)** — `FormDialog`.

- **Name and location** — `CommentDialog` / `OpenCommentDialog`, `src/views/explorer/CommentDialog.tsx`
- **Family** — dialog
- **MUI atoms** — Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button
- **What it does** — Add or edit one comment: a multiline field (Ctrl/⌘ + Enter saves), Save disabled only when adding nothing; mounted only while open.
- **API** — `draft: { label, initial, onSave } | null`, `onClose`. Ids `comment-dialog`, `-text`, `-cancel`, `-save`.
- **Used by** — `MoveContextMenu`, `useVariationsExplorer` (the comment block's add / edit).
- **Tests** — `tools/analysis/AnalysisBoard.test.tsx`, `repertoires/RepertoireAnnotations.test.tsx`.
- **Styling** — `fullWidth maxWidth="sm"`; the move in the title `dir="ltr"`; field `minRows={3} maxRows={12}`, `dir="auto"`, `mt: 0.5`, placeholder and helper text.
- **Similar elsewhere** — the description fields of the two settings screens (Analyses, Repertoires) — `minRows 3 / maxRows 10`.
- **Verdict** — already shared — fine.

### NagDialog

> **Migrated (CTA-113)** — `BaseDialog` with a tall `PanelTabs`; the glyph toggles stay (§4.4).

- **Name and location** — `NagDialog` / `OpenNagDialog`, `src/views/explorer/NagDialog.tsx`
- **Family** — dialog
- **MUI atoms** — Dialog, DialogTitle, Tabs, Tab, DialogContent, DialogContentText, ToggleButton, Box, Button
- **What it does** — Annotate a move with NAG glyphs: three tabs (move assessment, position evaluation, features), each glyph a toggle with its meaning; each toggle is an immediate edit (no draft), so the only button is Close.
- **API** — `tree`, `target: { nodeId, label } | null`, `onClose`, `onEditTree`. Ids `nag-dialog`, `-move`, `-glyphs`, `-tab-<section>`, `-panel-<section>`, `-choice-<code>`, `-close`.
- **Used by** — `MoveContextMenu`.
- **Tests** — `explorer/NagDialog.test.tsx`, `explorer/useVariationsExplorer.test.tsx`.
- **Styling** — `fullWidth maxWidth="sm"`; `Tabs variant="fullWidth"` `px: 2`, tab `minHeight: 48` (the panel's are 36); choices a grid `repeat(auto-fill, minmax(13rem, 1fr))`, `gap: 1`, `ToggleButton size="small" color="primary"`, start-aligned, glyph monospace 700 `dir="ltr"`.
- **Similar elsewhere** — the only standalone `ToggleButton`s; the other dialog with tabs is none.
- **Verdict** — already shared — its tab height differs from every other strip.

### PlayChanceDialog

> **Migrated (CTA-113)** — `FormDialog` with a `StatusText` total; the chances grid stays (§4.4).

- **Name and location** — `PlayChanceDialog` / `OpenPlayChanceDialog`, `src/views/explorer/PlayChanceDialog.tsx`
- **Family** — dialog
- **MUI atoms** — Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, TextField, InputAdornment, Typography, Box, Button
- **What it does** — The play chances at one branch: per move a % field (empty = automatic), its line count and the live resulting chance; invalid input blocks Save.
- **API** — `tree`, `target: { parentId } | null`, `onClose`, `onEditTree`. Ids `play-chance-dialog`, `-after`, `-input-<san>`, `-result-<san>`, `-total`, `-cancel`, `-save`.
- **Used by** — `MoveContextMenu`.
- **Tests** — `repertoires/RepertoirePlayChance.test.tsx`.
- **Styling** — `fullWidth maxWidth="xs"`; a 4-column grid `auto 7rem auto auto` as a hand-made table (`caption` headers); SAN monospace `dir="ltr"`; `%` end adornment; error total in `error.main`.
- **Similar elsewhere** — the only editable grid; a small `Table` would give it header semantics.
- **Verdict** — already shared — fine; a table in all but name.

### AnnotationsBar

> **Migrated (CTA-113)** — an info `FeedbackStrip` with `IconAction`s.

- **Name and location** — `AnnotationsBar` and the inner `Comment` (`:158`), `src/views/explorer/AnnotationsBar.tsx`
- **Family** — feedback (alert / snackbar)
- **MUI atoms** — Box, Typography, Chip, Tooltip, IconButton
- **What it does** — The comment block at the position on screen: the move with its marks and assessments, the comment before the line (italic), the comments after it (`dir="auto"` paragraphs) and their `[%cmd]` attributes as chips; optional add / edit / delete controls.
- **API** — `testId`, `label`, `annotations`, `editing?: { onAdd, onEdit(kind, index), onDelete(kind, index) }`.
- **Used by** — `useVariationsExplorer` (the `annotations` part — every board's footer).
- **Tests** — `explorer/useVariationsExplorer.test.tsx`, `repertoires/RepertoireAnnotations.test.tsx`, `repertoires/RepertoirePlayChance.test.tsx`.
- **Styling** — a bordered strip: `border 1px info.main`, `borderRadius: 1`, `bgcolor: background.paper`, `mb: 1`, `px: 1 py: 0.75`, `maxHeight: 180` scrolling; attribute chips `size="small" variant="outlined"` with the value in a `bdi dir="ltr"`; edit / delete icons at `fontSize: 1rem` (every other icon is `small`).
- **Similar elsewhere** — `RepertoireChangesBar` (the same strip in `success.main`), `NextMovesBar` and the pinned variations (the same strip in `divider`).
- **Verdict** — already shared — the strip is a de-facto `Callout` with a colour; worth naming.

### TreeMap — the chrome

> **Migrated (CTA-113)** — `IconAction`, `ActionBar`, `ProgressLine`, `FullScreenDialog`.

- **Name and location** — `TreeMap` (header, progress and full-screen `Dialog`, `:410-531`), `MapViewport` (toolbar, `:674-736`) and `MapButton` (`:256`), `src/views/explorer/TreeMap.tsx`
- **Family** — toolbar / action bar
- **MUI atoms** — Box, Typography, LinearProgress, Dialog (`fullScreen`), Tooltip, IconButton
- **What it does** — Around the drawing: a coverage line and progress bar (Backtracking) or the size summary; a toolbar with a hint, show-moves toggle, zoom out / level / in, fit, locate, and full screen; the full-screen dialog repeats the header with a close button.
- **API** — `TreeMap`: `testId`, `tree`, `coverage?`, `nodeId`, `onSelectNode?`, `onEditTree?`, `playChances?`, `addedIds?`, `mask?`. `MapButton`: `label`, `testId`, `onClick`, `pressed?`, `children`.
- **Used by** — `useVariationsExplorer` (the `map` part), rendered in the Map tab of the Analysis Board, the Library game, the Openings explorer and the repertoire player / Backtracking.
- **Tests** — `repertoires/RepertoireGames.test.tsx` (full screen, zoom in / out, fit, locate, show moves), `repertoires/RepertoirePlayer.test.tsx`, `explorer/useVariationsExplorer.test.tsx`.
- **Styling** — `MapButton` = `Tooltip` + `IconButton size="small"`, `color="primary"` and `aria-pressed` when a toggle is on; toolbar `gap: 0.25`, wrapping; zoom level `caption dir="ltr" minWidth: 3.5em`; progress `color="success"`, `height: 6`, `borderRadius: 3`; the full-screen header `h6` 700, `px: 2 py: 1`, bottom divider.
- **Similar elsewhere** — `MapButton` is the only named `Tooltip`+`IconButton` helper besides the Library's `Action` (`LibraryHome.tsx:101`); every other one is written out.
- **Verdict** — already shared — `MapButton` / `Action` are the seed of a shared `IconAction`.

---

## The app shell — `views/main/`, `views/home/`, `theme/`

### DefaultLayout

> **Migrated (CTA-113)** — stays the shell (`Layout.tsx`) — the page structure of CTA-112.

- **Name and location** — `DefaultLayout` / `DefaultLayoutViewport`, `src/views/main/Layout.tsx:154`
- **Family** — other (the shell layout)
- **MUI atoms** — Box
- **What it does** — The whole-window shell: header, then a row of the sidebar (`LeftPanelOutlet`, falling back to `SideBar`), the measured board viewport (the square, `ForceLTR`) and the right-hand aside (`RightPanelOutlet`, falling back to the Analysis placeholder), then the footer. Squares the board from a `ResizeObserver` measurement.
- **API** — none (the router's layout route). Constants `BOARD_INSET_PX` 16, `BOARD_PANEL_GAP_PX` 16, `SIDEBAR_WIDTH_PX` 280, `PANEL_MIN_WIDTH_PX` 320, `PANEL_MAX_WIDTH_PX` 560.
- **Used by** — `routes.tsx`.
- **Tests** — `main/Layout.test.tsx`.
- **Styling** — `100vh × 100vw`, `overflow: hidden`; aside `p: 2`, `bgcolor: background.paper`, `borderInlineStart` divider, a non-scrolling column; the square sized by inline `style` (pixels), not `sx`.
- **Similar elsewhere** — n/a.
- **Verdict** — module-specific but needs design consistency — the shell; its paddings (aside `p: 2`, inset 16px) are the spacing the screens inside should agree with.

### Header

> **Migrated (CTA-113)** — stays the shell's `AppBar`; the colour-mode switch an `IconAction`.

- **Name and location** — `Header`, `src/views/main/Layout.tsx:71`
- **Family** — toolbar / action bar
- **MUI atoms** — AppBar, Toolbar, Box, Typography, Stack (+ `LanguageSwitch`, `ColorModeIconDropdown`)
- **What it does** — The app bar: the logo and brand linking home, then the language select and the colour-mode button.
- **API** — none.
- **Used by** — `DefaultLayoutViewport`.
- **Tests** — `main/Layout.test.tsx` (indirectly; `layout-header` is not asserted), `theme/ColorModeIconDropdown.test.tsx`, `theme/AppThemeWithLang.test.tsx`.
- **Styling** — `AppBar position="static" elevation={0}`, `bgcolor: background.translucent`, `backdropFilter: blur(8px)`, bottom divider; `Toolbar variant="dense" minHeight: 56 gap: 2`; brand `fontWeight: 800`, `letterSpacing: -0.01em`; logo 30px, `borderRadius: 3px`; brand pushes the rest with `marginInlineEnd: auto`. Uses single-quoted imports and 4-space indentation, unlike the rest of `views/`.
- **Similar elsewhere** — the `Footer` mirrors its translucent treatment.
- **Verdict** — module-specific but needs design consistency — the shell's own chrome.

### AnalysisPlaceholder

> **Migrated (CTA-113)** — stays the shell's fallback — one line of words.

- **Name and location** — `AnalysisPlaceholder`, `src/views/main/Layout.tsx:139`
- **Family** — empty / loading / error state
- **MUI atoms** — Typography
- **What it does** — What the aside shows when no route fills `RightPanel`.
- **API** — none.
- **Used by** — `DefaultLayoutViewport` (the outlet's fallback).
- **Tests** — `main/Layout.test.tsx`.
- **Styling** — `subtitle2` 700 title over `body2 text.secondary mt: 0.5`.
- **Similar elsewhere** — every screen that fills the aside with one `body2 text.secondary` note (`LibraryHome`, `LibraryUpload`, `CollectionScreen`'s foot note, the Settings tabs, the settings screens, `Repertoires`, `RepertoireUpload`).
- **Verdict** — module-specific but needs design consistency — the "panel note" is one pattern written ten times.

### SideBar

> **Migrated (CTA-113)** — stays hand-written (§4.4) — `TreeView`'s roving tab stop and single list would change its keys and its pinned foot.

- **Name and location** — `SideBar` (`:248`), `SidebarLinks` (`:150`), `TreeRow` (`:38`), `src/views/main/Sidebar.tsx`
- **Family** — navigation
- **MUI atoms** — Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Collapse, Divider
- **What it does** — The nav as a folder tree: folder rows toggle (`aria-expanded`), screen rows link (`aria-current="page"` on an exact match); one open chain, following the route; a pinned foot (Settings) under a divider.
- **API** — `SideBar({ tree? })` (injectable for tests).
- **Used by** — `DefaultLayoutViewport`.
- **Tests** — `main/Sidebar.test.tsx`, `main/navTree.test.ts`.
- **Styling** — `bgcolor: background.sunken`, `borderInlineEnd` divider, `p: 1`; rows `mb: 0.5`, `gap: 1`, indent `paddingInlineStart: 2 + depth * 2`; active: icon `primary.main`, label 700; folders' labels 700 `text.primary`; the foot `maxHeight: 50%` scrolling.
- **Similar elsewhere** — `FolderTreeTable`'s rows (another expanding tree, a chevron that rotates) and `FolderPicker` (another indented list).
- **Verdict** — module-specific but needs design consistency — three tree indents: 2 per level here, 2.5 in the two folder pieces, 3 in the repertoire settings.

### Footer

> **Migrated (CTA-113)** — stays the shell's — a line and a link.

- **Name and location** — `Footer`, `src/views/main/Footer.tsx`
- **Family** — other
- **MUI atoms** — Box, Typography, Link
- **What it does** — The version and a link to the source repository.
- **API** — none.
- **Used by** — `DefaultLayoutViewport`.
- **Tests** — `main/Layout.test.tsx`.
- **Styling** — `minHeight: 36`, `paddingInline: 2`, `fontSize: 13` (raw), translucent + blur + top divider; link `marginInlineStart: auto`.
- **Similar elsewhere** — `Header`.
- **Verdict** — module-specific but needs design consistency — the one raw font size in the shell.

### LanguageSwitch and ColorModeIconDropdown

> **Migrated (CTA-113)** — the colour-mode switch an `IconAction`; the language `Select` stays (§4.4).

- **Name and location** — `LanguageSwitch`, `src/theme/LanguageSwitch.tsx`; `ColorModeIconDropdown`, `src/theme/ColorModeIconDropdown.tsx`
- **Family** — form / settings group
- **MUI atoms** — FormControl, Select, MenuItem; IconButton, Box
- **What it does** — The language select (renders the icon and the language name) and the light / dark toggle (a same-size placeholder until the mode is known).
- **API** — `LanguageSwitch()`; `ColorModeIconDropdown(props: IconButtonOwnProps)`.
- **Used by** — `Header`.
- **Tests** — `theme/ColorModeIconDropdown.test.tsx`, `theme/AppThemeWithLang.test.tsx`.
- **Styling** — select `minWidth: 130`, outline `divider` (`text.secondary` on hover), icon with **physical** `mr: 1, ml: -0.5`; the toggle uses `title` rather than a `Tooltip` (every other icon button has one).
- **Similar elsewhere** — none. `ColorModeIconDropdown` is a toggle, not a dropdown — the name is from the MUI template it came from.
- **Verdict** — module-specific but needs design consistency — tooltip and naming conventions.

### Home

> **Migrated (CTA-113)** — `CardGrid` of `IconCard`s per section.

- **Name and location** — `Home`, `src/views/home/Home.tsx`
- **Family** — card grid
- **MUI atoms** — Box, Typography, Card, CardActionArea
- **What it does** — The landing page: one section per nav folder (an overline heading) with a card per screen, built from `navTree()`.
- **API** — none.
- **Used by** — `routes.tsx` (`/`, through `home/Main.tsx`).
- **Tests** — `home/Home.test.tsx`.
- **Styling** — `h4` 600 title, `body1 text.secondary` subtitle; section headings `overline`; grid `repeat(auto-fill, minmax(220px, 1fr))` `gap: 1.5`; cards `variant="outlined"`, action area a row `gap: 1.5 p: 1.5`, icon `color="primary"`, label `subtitle1` 500. The only `h4` page title — every other screen titles in `subtitle1` 700.
- **Similar elsewhere** — the saved lists' card grids ([card grid](#card-grid)).
- **Verdict** — module-specific but needs design consistency — its title scale is unlike any other screen.

---

## Left out, and why

| What | Why |
| --- | --- |
| `EngineBoardSquare`, `EvalBar`, `CapturedPieces`, `PlayerPlate`, `PromotionPicker`, `BoardShell`'s square | The board square — out of scope. |
| `MoveList`, `VariationLine`, `NagGlyphs`, `nagToneSx`, `moveTokenSx`, `moveSelection`, `TreeMoveList`, `useVariationsExplorer`, `ChanceArrows`, the map's SVG | Move list, tree and map rendering — out of scope. (`moveTokenSx` is the one style token they share with in-scope pieces.) |
| `rightPanel.tsx`, `leftPanel.tsx` | Slots and portals with no MUI of their own. |
| `useOpeningBook`, `useStoreRead`, `positionEditor/usePositionEditor.ts`, `playerResults.ts`, `moveContextMenu.ts`, `views/board/core/use*.ts`, `explorer/treeView.ts`, `explorer/chanceArrows.ts` | Hooks and pure helpers — no UI. |
| `views/main/navFolders.ts`, `navItems.ts`, `navTree.ts`, `service.ts` | The nav registries and the shell's state machine — data, rendered by `SideBar` and `Home`. |
| `boardTestHarness.tsx` | Test support. |
| `ForceLTR`, `AppThemeWithLang`, `themePrimitives.ts` | The theme itself, not a composition — the tokens the follow-up starts from. |

---

## Consistency notes

The shared pieces' own families, against each other. The comparisons with the
modules are the next section.

- **dialog** — the four shared dialogs (`FolderName`, `FolderMove`,
  `FolderDelete`, and the explorer's three) agree on `fullWidth`, but not on
  width (`xs` for the folder dialogs and play chances, `sm` for comment and
  annotation), on a root test id (the explorer's have one, the folder ones do
  not), or on a confirm style (`FolderDeleteDialog` and the move menu's delete:
  `error` + `contained`).
- **list** — `FolderPicker` (dense `ListItemButton`s, physical `mr`),
  `GameInfo` (a `dl` grid) and `BestVariations` (an `ol` of rows) — three
  unrelated list idioms; only `FolderPicker` uses MUI `List`.
- **toolbar / action bar** — `BoardControls`, `PiecePalette`, the map's toolbar
  and `SavedListExportBar` all wrap a disabled `IconButton` in a span for its
  tooltip, but three ways: `Box component="span" display: inline-flex`
  (`BoardControls`, `SavedListExportBar`, `CopyableValue`), a bare `<span>`
  (board headers), or not at all (`MapButton`, which is never disabled).
- **tabs** — `BoardPanel`, `PositionEditor` and `NewGameForm` (Engine) share
  one strip sx by copy; `NagDialog`'s is taller.
- **form / settings group** — field labels come in four styles across the
  shared forms alone: `body2` 600 (`OptionSlider`, `CopyableValue`),
  `subtitle2` 700 (`PositionFields`, `FenSetup`, `PgnSetup`), a `FormLabel`
  legend in `subtitle2` 700 (`PositionFields`' castling), and the header
  checkbox label of `BestVariations`.
- **navigation** — `SavedFolderBreadcrumb` hand-builds what MUI `Breadcrumbs`
  does; the sidebar and the folder table each rotate a chevron their own way
  (`ExpandLess` / `ExpandMore` swap vs. a rotated `KeyboardArrowRight`).
- **feedback** — the strip family (`AnnotationsBar` `info`, changes strip
  `success`, next-moves / variations `divider`) is consistent in shape and
  differs only by border colour — a good candidate to formalise.

---

## Cross-module comparisons

### The four tables

The Lobby's games (`engine/games/PlayedGames.tsx`), a Library collection
(`library/CollectionScreen.tsx`, `CollectionTable`), the Library's folder tree
(`shared/folders/FolderTreeTable.tsx`, laid out by `library/LibraryHome.tsx`)
and the Storage tab (`settings/StorageTab.tsx`). They stay separate
components; this is what a common table API would have to cover, and where
they differ today.

| | **PlayedGames** (Lobby) | **CollectionTable** (Library) | **FolderTreeTable** (Library home) | **StorageTab** (Settings) |
| --- | --- | --- | --- | --- |
| Component | inline in the screen | inner component of the screen | shared, presentational | inline, two tables |
| Rows | one per played game (≤ 500) | one per game (to ~10,000) | folders and collections, a tree | 2 browser figures; 4 data categories |
| Scroll region | `TableContainer flex: 1; minHeight: 0` | same | same (inside the component) | none — the Settings tab panel scrolls |
| `Table` | `size="small" stickyHeader` | same | same | `size="small"`, not sticky |
| Header cells | `fontWeight: 600`, `nowrap` | same | 600; Name wraps, others `nowrap` | default weight |
| Sorting | every data column, `TableSortLabel` | every column | Name, Games, Added | none |
| Default sort | Date ↓ | Date ↓ | Name ↑ | — |
| First click | Date and numbers ↓, text ↑ | Date, Elo, Moves ↓; `#` and text ↑ | Name ↑; Games, Added ↓ | — |
| Missing values | last, ties by date | last, ties by `#` following the direction | last, ties by name | — |
| Sort state | URL `?sort=` `?dir=` (replace, defaults omitted) | same | same | — |
| Sort code | `DEFAULT_SORT`, `defaultDirection`, `isColumn`, `setState`, `sortBy` written inline | the same five, again | the same, a third time (`byKey` comparator) | — |
| Pagination | `TablePagination`, 10 / 25 / **50**, default 25, `?page=` `?rows=` | `TablePagination`, **50** / 100 / 250, default 50 | none — whole tree | none |
| Filters | colour toggle + opening select in the **top bar** | words box over the table + a **right-panel** filter column | words box over the table | — |
| Selection | pick column; **select-all in the header cell** | pick column; header cell **empty**, select-all in the `SavedListExportBar` | none | none |
| Bulk actions | "Delete picked (N)" text button (`outlined`, `error`), appears with picks | the export bar (download, delete) + Analyse | none | none |
| Row click | none | whole row opens (`hover`, pointer) + a real link in the White cell | whole row toggles / opens + a real link on the name | none |
| Row actions | Analysis, Continue — icon links, **each in its own `padding="checkbox"` column**, always visible | none | caller's action column, **revealed on hover / focus** | none |
| Row density | MUI small | MUI small | `py: 0.25` (denser) | MUI small |
| Numbers | left-aligned | left-aligned | right-aligned (`align="right"`) | right-aligned |
| Dates | `savedListDate` (short month, locale) | the PGN's own date, `dir="ltr"` | `Intl.DateTimeFormat` `dateStyle: medium` | — |
| Bytes | — | — | — | `formatBytes`, `dir="ltr"` |
| Unreadable row | one cell spanning the columns, `text.secondary` | a warning icon + tooltip in the `#` cell | — | — |
| Loading | a line above the table (`played-games-loading`) | the whole screen (`library-loading`) | none — Built-in shows at once, uploads join when read | "…" in the cells |
| Empty / no match | `body2 text.secondary` centred `py: 4`, **inside** the container, two test ids | same, one test id | the same text **outside** the component, in `LibraryHome` | — |
| Count | caption under the title: "N games" / "N of M" | same | same ("N collections" / "N of M") | — |
| RTL | names `dir="auto"`, result / date `dir="ltr"` | same, plus `marginInlineStart` on the icon | indent `paddingInlineStart`, chevron flipped inline | bytes `dir="ltr"` |
| Tests | `engine/games/PlayedGames.test.tsx` (sort, pagination, picks) | `library/Library.test.tsx` (sort, filters, picks; **pagination untested**) | `library/Library.test.tsx` | `settings/StorageTab.test.tsx` |

What a shared table would need to reconcile: **where select-all lives**
(header vs. export bar), **how row actions show** (always-visible icon
columns vs. hover-revealed), **one page-size set** (three sets today, plus the
saved lists' `Pagination` of 48), **number alignment** and **date format**,
and the **URL-state helper** the three sortable tables each rewrite.

### Dialog

22 compositions in 19 files.

| Dialog | Module | Width | Root test id | Body | Confirm |
| --- | --- | --- | --- | --- | --- |
| Delete picked games | Engine | default | yes | `DialogContentText` | `error`, text |
| Replay / Resign | Engine | default | yes | `DialogContentText` | `error`, text |
| Delete collection | Library | default | yes | `DialogContentText` | `error`, text |
| Delete picked games | Library | default | yes | `DialogContentText` + error `Alert` | `error`, text |
| `CollectionMoveDialog` | Library | `xs` full | yes | picker | (pick = move) |
| `OpeningTreePgnDialog` | Library | `xs` full | yes | radios + checkboxes | `contained` |
| `ImportOptionsDialog` | Library | `sm` full | yes | summary, filters, progress | `contained` |
| `SaveAnalysisDialog` | Analyses | `xs` full | no | field + picker | `contained` |
| `MultiGameDialog` | Analyses | `xs` full | yes | two choices, progress | (the choices) |
| `RepertoireFolderNameDialog` | Repertoires | `xs` full | no | field (`dense`) | `contained` |
| `RepertoireFolderDeleteDialog` | Repertoires | `xs` full | no | `Typography body2` | `error` `contained` |
| `RepertoireBulkDeleteDialog` | Repertoires (+ Analyses) | `xs` full | title only | `Typography body2` | `error` `contained` |
| `ImportDialog` | Settings | `sm` full, `dividers` | yes | categories | `contained` |
| `IncompatibleImportDialog` | Settings | `sm` full | yes | `DialogContentText` + lists | (Close) |
| `FolderNameDialog` | Shared | `xs` full | no | field | `contained` |
| `FolderMoveDialog` | Shared | `xs` full | no | picker | (pick = move) |
| `FolderDeleteDialog` | Shared | `xs` full | no | `Typography body2` + caption | `error` `contained` |
| Move menu delete | Shared | default | yes | `DialogContentText` | `error` `contained` |
| `CommentDialog` | Shared | `sm` full | yes | field | `contained` |
| `NagDialog` | Shared | `sm` full | yes | tabs + toggles | (Close) |
| `PlayChanceDialog` | Shared | `xs` full | yes | grid | `contained` |
| Map full screen | Shared | `fullScreen` | yes | the map | (Close) |

- **The destructive confirm has two looks**: a text `error` button in the
  module screens that wrote their own (Engine, Library), a contained `error`
  button in the shared and repertoire ones. The body is `DialogContentText`
  in the first group, a `Typography body2` in the second.
- **Width**: every hand-written confirm leaves MUI's default width; everything
  else chooses `xs` or `sm` with `fullWidth`.
- **"Delete N picked"** exists three times (Lobby, collection table,
  `RepertoireBulkDeleteDialog`), and Saved analyses borrows the repertoires'
  one out of `views/repertoires/` — a cross-module import the shared folder is
  for.
- **Enter to submit**: the three name dialogs submit on Enter, the comment
  dialog on Ctrl / ⌘ + Enter; nothing else does.
- **Busy dialogs**: `ImportOptionsDialog` and `MultiGameDialog` share the
  abort-controller / determinate `LinearProgress` / "Cancel disabled while
  writing" logic line for line.

### Toolbar / action bar

- **The list screens' top bar** — title (`subtitle1` 700, `lineHeight: 1.3`),
  a `caption text.secondary` count under it, actions after, a bottom divider:

  | Screen | Spacing | Wrap | Title element | Back |
  | --- | --- | --- | --- | --- |
  | `PlayedGames` (Engine) | `pb: 1.5 mb: 0.5`, inner row `gap: 1` | no | `Typography` | — |
  | `LibraryHome` (Library) | `pb: 1.5 mb: 0.5 gap: 1` | no | `h1` | — |
  | `CollectionScreen` (Library) | `pb: 1 gap: 1`, no `mb` | no | `h1`, `noWrap`, `dir="auto"` | arrow first |
  | `SavedAnalyses` (Analyses) | `pb: 1.5 mb: 0.5 gap: 1.5` | yes | `Typography` | — |
  | `Repertoires` (Repertoires) | same as Saved analyses | yes | `Typography`, `noWrap` | arrow first, in a folder |

  One `ListScreenHeader` (back?, title, count, actions) would cover all five.
- **The board panels' header** — `CurrentOpening` in a growing box, then
  `size="small"` icon buttons with `flexShrink: 0`, then an engine
  `FormControlLabel` + small `Switch` with `marginInlineEnd: 0`. The **Save
  button** (a `Tooltip` over a span over an `IconButton` that turns `primary`
  and `aria-pressed` while there are changes) is written three times
  (`AnalysisBoard`, `LibraryGameBoard`, `RepertoirePlayer`). The **back
  arrow** is first on Play with Engine and the Library game and **last** on a
  repertoire game.
- **Action icons**: 56 tooltips on 52 icon buttons, all `size="small"` with
  `fontSize="small"` icons — consistent — but only `MapButton` and the
  Library's `Action` name the pair.

### Form / settings group

- **The switch with a help caption** (`FormControlLabel` + `Switch`, a
  `caption text.secondary` line under it) — six copies:

  | Where | Switch size | Test id on | `FormControlLabel` |
  | --- | --- | --- | --- |
  | `SwitchOption` (Repertoires settings) | default | the input (`slotProps`) | `m: 0` |
  | `SwitchSetting` (Repertoire player) | `small` | the root | `m: 0` |
  | Arrows tab (Analyses) | `small` | the root | `m: 0` |
  | Analysis settings screen (Analyses) | default | the input (`slotProps`) | `m: 0` |
  | Masking tab — notation (Engine) | default | the root | default margins |
  | Masking tab — engine lines (Engine) | default | the root | default margins |

  And the same switch **without** a caption appears twelve more times (the
  eval bar ×2, default size; the next-move arrows switch on Play with Engine,
  the Library game and Openings, small; the three export toggles, small; the
  engine switch in four board headers, small).
- **The White / Black toggle** — eight `ToggleButtonGroup`s:
  `NewGameForm` (`fullWidth`), `PlayScreen` header (buttons `py: 0.25 px: 1`),
  the two settings screens (`textTransform: none`, `px: 2`), the repertoire
  player (`my: 0.5`), `PositionFields` (w / b, plain), and two filters with an
  "all" button — the Lobby (plain) and the collection filters (`fullWidth`).
- **Field labels** — `body2` 600 (engine sliders, the Lobby's side, the
  settings screens' colour), `subtitle2` 700 (the position editor, the Load and
  Export tabs), `subtitle2` 600 (the repertoire player's side, the save
  dialog's folder), a `FormLabel` legend in `body2` 600 (the arrow fields) or
  `subtitle2` 700 (castling).
- **Settings screens** — `AnalysisSettingsScreen` and
  `RepertoireSettingsScreen` are one layout (an `overline` section heading
  over a `Divider`, a draft, Save `contained` + Cancel text), written twice;
  the analyses' `Section` component is the repertoires' inline map.

### Filter bar

- **Where filters live**: in the top bar (Lobby), in the right panel
  (collection table), in a row under the top bar (Library home's words box,
  the collection's words box), inside a dialog (the import popup).
- **The date range** (two `type="date"` `TextField`s in a `1fr 1fr` grid, the
  label shrunk, each bounding the other) is written twice —
  `CollectionFilters` and `ImportOptionsDialog`.
- **The player chips** (`Autocomplete multiple freeSolo`) twice — the collection
  filters (`limitTags={1}`) and the import popup (no limit, options refreshed
  on open).
- **Selects**: the Lobby's opening filter and the collection's result filter
  are `TextField select`; the Masking tab uses a `native` `Select`; the
  language switch a `Select` in a `FormControl`.
- **Clear**: only the collection filters have one.

### List

- **Saved-record rows**: `SavedAnalysisRow` (Analyses) and `RepertoireRow`
  (Repertoires) are the same row — `ListItem disableGutters`, `py: 1.25`,
  bottom divider, a `subtitle2` 600 name over a `caption` line and an italic
  description, then Open (`contained`), extra actions, a gear and a checkbox.
  Only the analyses' name carries `dir="auto"`.
- **Folder rows**: `SavedFolderRow` (`onClick`, actions in a `Box`) vs.
  `RepertoireFolderRow` (a `Link`, `secondaryAction`, a fixed
  `paddingInlineEnd: 8.5rem`).
- **Folder pickers**: `FolderPicker` vs. the repertoire settings' `FolderSection`.
- **Continuation lists** — three renderings of "the moves from here": the
  Openings Book tab (`ListItemButton`s, SAN over the opening name, an ECO
  chip), the Library filter board's list (a grid of SAN tokens, counts and a
  result bar), and `NextMovesBar` (SAN tokens two per row).

### Card grid

- `SavedAnalysisCard` and `RepertoireCard`: the same card — outlined, the
  preview board as the action area (`p: 1`, square), a caption row with the
  name, a line, the actions.
- Folder cards differ between the two sister screens:
  `SavedFolderCard` (`p: 2`, `minHeight: 140`, a 44px icon centred) vs.
  `RepertoireFolderCard` (a square with an `action.hover` fill, a `3rem` icon)
  — so in a grid of boards the analyses' folders are shorter than their
  neighbours and the repertoires' line up.
- `Home` is the only other card grid (icon-and-label cards).

### Tabs

- The panel strip (`fullWidth`, `minHeight: 36`, `textTransform: none`,
  `minWidth: 0`, `px: 1`, a bottom divider) — `BoardPanel`, `NewGameForm`,
  `PositionEditor`, by copy; `SettingsScreen` the same minus `fullWidth` and
  with router-link tabs; `NagDialog` `minHeight: 48`.

### Menu

- `MoveContextMenu` (at the pointer, dense, a subheader, icons) and
  `RepertoireGamesMenu` (anchored, links, no icons). The language switch is a
  `Select`.

### Empty / loading / error state

- **The reading line** — `Typography sx={{ color: "text.secondary", p: 2 }}`
  with a `*-loading` test id — written eight times (`PlayedGameRead`,
  `PlayedGames`, `CollectionScreen`, `LibraryUploadRoute`,
  `LibraryGameScreen`, `SavedAnalyses`, `AnalysisBoardRoute`,
  `AnalysisSettingsScreen`, plus `ReadingRepertoires`, the only one named).
- **The miss** has two looks: `LibraryMiss` (left-aligned, `body1`, a medium
  outlined button, `p: 2`) vs. the repertoires' and the analysis settings'
  (centred, `py: 4`, `body2 text.secondary`, a small outlined button).
- **Empty lists** agree (`body2 text.secondary`, centred, `py: 4`).
- **Spinners**: `CircularProgress size={16}` beside a `body2` line (repertoire
  upload, player), `size={16}` in a button (Analyse), a 30px ring round Play;
  bars are `LinearProgress` (indexing, import, coverage).

### Feedback (alert / snackbar)

- Inline errors are `Alert severity="error"` nearly everywhere; the board
  screens' save problems are a `caption` in `error.main` with `role="alert"`
  instead (`PlayScreen`, `AnalysisBoard`, `RepertoireChangesBar`).
- Two snackbars, two styles: the collection's Analyse notice (`Snackbar` +
  filled `Alert`, an action button, 10 s) and the move menu's copy (a plain
  `message`, 3 s).
- Success: `Alert severity="success"` (Export), a `caption` in `success.main`
  (the Load tab, `CopyableValue`).

### Navigation

- Back: an `ArrowBack` icon button with a tooltip everywhere (collection table,
  Library game, Play with Engine, a repertoire folder, a repertoire game).
- Paging: `TablePagination` (the two tables) vs. MUI `Pagination` (Saved
  analyses) vs. none (Repertoires lists everything).
- Folder position: breadcrumbs (Saved analyses), a back arrow and the folder as
  title (Repertoires), expanding rows (Library).

### Upload / import flows

Five PGN inputs, one zip input:

| Screen | Module | File input | Paste box | Read button | Busy | Error |
| --- | --- | --- | --- | --- | --- | --- |
| `LibraryUpload` | Library | `<input hidden>` in a `contained` label button | `minRows 6 / maxRows 14`, a "N games read" helper | `outlined` | the popup's bar | `Alert` |
| `RepertoireUpload` | Repertoires | same | `6 / 14` | `outlined` | a 16px spinner + "Reading…" | `Alert` + LTR detail |
| `AnalysisLoad` | Analyses | `<input hidden>` in an `outlined small` label button | `4 / 10` `small` | `contained small` | — | `Alert` |
| `NewAnalysisForm` | Analyses | same as `AnalysisLoad` | `4 / 10` `small` | `contained small` | — | `Alert` |
| `PgnSetup` | Shared | a visually hidden `Box` input in a `contained small` label button | `3 / 10` `small` | `outlined small` (`type="submit"`) | — | `Alert` |
| `ImportTab` (zip) | Settings | `<input hidden>` in a `contained` label button | — | — | `LinearProgress` + a line | report `Alert` |

The `accept` lists differ too (`.pgn,…` with `.zip` for the Library, `.pgn`
alone for `PgnSetup`).
