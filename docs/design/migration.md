# Migrating a module onto the design system

The guide every module migration follows, written from the **pilot**
(CTA-109: Engine and Settings). It records the decisions that bind every
later migration, the order of work, what each old pattern became, what the
pilot found — every design-system change, every mismatch, everything left
hand-written and why — and a checklist. Read
[`hierarchy.md`](./hierarchy.md) first: it says where a component goes; this
file says how a module gets there.

---

## 1. The decisions — binding for every migration

Taken with the product owner on 2026-09-28, before the pilot began.

| Question | Decision |
| --- | --- |
| Which modules first | The pilot is **Engine + Settings** only; Shared + shell, Library, Analyses, Repertoires and Openings follow, scoped by this file. |
| A destructive confirm | `ConfirmDialog tone="destructive"` with a **contained red** confirm; `DeleteManyDialog` for "Delete N picked". Never a red text button. |
| A table's row actions | **Always visible** — `DataTable`'s `rowActions`, one column at the row's end (`RowActionsCell reveal="always"`). |
| Select-all | In the **pick column's header**, over every row the filters leave, on every page. |
| Page sizes | **25 / 50 / 100 / 250**, default **50** (`TABLE_PAGE_SIZES`). A link naming another size reads as the default; a `?page=` past the end as the last page. |
| Numbers and dates | Numbers **end-aligned** in tabular figures, `dir="ltr"`; dates **`YYYY-MM-DD`** (`tableDate`). |
| Tables | **`DataTable` with column definitions** — never assembled from the table parts in a screen or a block. |

## 2. The order of work

1. **Inventory.** The module's design doc (`docs/design/<Module>.md`) lists
   every UI piece. Mark each with where it goes, by the decision rule of
   [`hierarchy.md`](./hierarchy.md#where-does-my-component-go).
2. **Blocks in the gallery first.** Each complex, domain-aware piece becomes
   a block in `src/blocks/<family>/<Block>/` — the component, its test, its
   gallery, `fixtures.ts` typed with `src/lib/`'s own types, `index.ts` —
   presentational: rows, state and callbacks as props, no store, no router.
   A demo for every state (loading, empty, no match, one row, 10,000 rows, an
   unreadable row, long names, Hebrew names) — the every-theme test then
   renders each under every theme, scheme and direction, with axe.
3. **A generic piece the tiers lack** is a pattern (or a base component)
   first, then the block uses it. **A component that does not fit is fixed in
   the design system backward compatibly** — an optional prop whose absence is
   today's behaviour — with its test and its demo. Never worked around in the
   screen.
4. **Then wire the screens.** The screen reads the stores and the route,
   holds the state (`useTableUrlState` for a table's sort and page), and
   composes blocks and base components.
5. **Test ids stay.** A block takes the screen's `testId` and keeps every id a
   test queries (§4 has the tools for it); only the tests of the deliberate
   changes are updated.
6. **Accessibility.** Each screen's test file renders it in its main states
   and calls `expectNoAxeViolations`; the keyboard walk of each interactive
   part is a `userEvent` test; a status change goes through a live region
   (`StatusText`, `InlineAlert`, an announced `ProgressLine`).
7. **Docs.** A row per block in [`hierarchy.md`](./hierarchy.md)'s Blocks
   table, the section docs for any design-system change, the module's design
   doc marked with what replaced each entry, and this file's findings.

## 3. What each old pattern became

| Old, hand-written | Now | Tier |
| --- | --- | --- |
| `TableContainer` + `Table` + `TableSortLabel` + `TablePagination` + URL helpers (`PlayedGames`) | `PlayedGamesTable` over `DataTable`, its sort and page `useTableUrlState`'s | block · pattern |
| The Lobby's filter row (`ToggleButtonGroup` + `TextField select`) | `PlayedGamesFilters` (`SideToggle withAll` + `SelectField`) | block |
| A read-only report `Table` (`StorageTab`) | `StorageTable` — two `DataTable`s, sections by `groupEnd` | block |
| `EngineSettings`' sliders and hand-copied slider headers | `EngineSettingsForm` (`SliderField` × 6, `SwitchField`; the absent / pinned / adjustable rule as `engineOptionState`) | block |
| `MaskEditor` (vertical toggle group, native selects, switch + caption) | `MaskEditor` (`FieldLabel`, `SelectField` × 12 in two fieldsets, two captioned `SwitchField`s) | block |
| Export's checkboxes with counts | `ExportCategoriesForm` (`CheckboxField`) | block |
| `ImportDialog` (`Dialog` stack, radios, chevrons, chips, `Alert`s) | `ImportDialog` (`BaseDialog`, `CheckboxField`, `RadioGroupField`, `ExpandToggle`, `InlineAlert`) | block |
| `IncompatibleImportDialog` | `IncompatibleImportDialog` (`BaseDialog`; its links `LinkTarget`s) | block |
| The import report `Alert` | `ImportReport` (`InlineAlert`) | block |
| A list screen's top bar | `ListScreenHeader` | base |
| "Delete N picked?" `Dialog` with a red text button | `DeleteManyDialog` | base |
| Replay / Resign `Dialog` with a red text button | `ConfirmDialog tone="destructive"` | base |
| `Tooltip` + `IconButton` (back, replay, resign) | `BackButton`, `IconAction` | base |
| A side `ToggleButtonGroup` | `SideToggle` | base |
| `FormControlLabel` + `Switch` / `Checkbox` | `SwitchField` / `CheckboxField` | base |
| A `Tabs` strip (a panel's, Settings' routed one) | `PanelTabs` (`link` tabs, `fullWidth={false}` for the routed strip) | base |
| The "Reading…" `Typography` | `LoadingLine`; inside a table, `DataTable`'s `loading` row | base |
| An `Alert` in the page's flow | `InlineAlert` (a FEN or path as its `detail`) | base |
| A caption with `role="alert"` / `role="status"` | `StatusText` | base |
| A line over a `LinearProgress` | `ProgressLine` (`announce` to read its caption out) | base |
| A label button over a hidden `<input type="file">` | `FileInputButton` | base |
| *CTA-113, the rest of the app:* | | |
| `FolderTreeTable` (a hand-built tree of table rows) | `CollectionsTreeTable` over `DataTable`'s `tree` rows | block · pattern |
| The collection's `Table` + `TablePagination` + select-all in the export bar | `CollectionGamesTable` over `DataTable`, select-all in the header | block · pattern |
| The saved lists' rows, cards, folder rows and grids (`SavedFolderViews`, `RepertoireFolderViews`, `savedList.ts`, `cardSize.ts`) | `SavedAnalysesList`, `RepertoiresList` over `RecordRow` / `RecordCard` / `FolderRow` / `FolderCard` / `CardGrid`; `FolderActions` | block · base |
| `SavedListExportBar`, `SavedListViewToggle`, `SavedFolderBreadcrumb` | `SelectionBar`, `ViewToggle`, `Breadcrumbs` | base |
| The folder dialogs and picker (`views/shared/folders/`) | `FolderNameDialog`, `FolderMoveDialog`, `FolderDeleteDialog`, `FolderPicker` | block |
| A file button + paste box + games picker (four copies) | `PgnInput` over the `UploadPanel` pattern; `FenInput` | block · pattern |
| The Engine and Export tabs, `GameInfo`, `CurrentOpening`, `MergeSplitChoice`, the position editor's fields | `AnalysisEngineForm`, `PgnExportPanel`, `GameInfo` (`KeyValueList`), `CurrentOpening`, `MergeSplitChoice`, `PositionFields` | block |
| `RepertoireChangesBar` (and its copies on the Analysis Board and the Library) | `ChangesStrip` | block |
| A snackbar kept in a screen's state | `useSnackbar()` — the one queue, in `AppThemeWithLang` since CTA-113 | base |
| A `Menu` opened from a right click | `ContextMenu` (`open`) | base |
| A dialog with a text field and Save (comment, play chances, folder name) | `FormDialog` (Enter submits) | base |
| A progress bar inside a choice dialog (`MultiGameDialog`, the import popup) | `ProgressDialog` in the choice's place over `useCancellableJob` | base |
| The collection's filters (`Autocomplete` × 3, date `TextField`s, a side `ToggleButtonGroup`, a select) | `CollectionFilters` (`ChipsAutocomplete`, `SideToggle withAll`, `SelectAutocomplete`, `DateRangeFields`, `SelectField`) | block |
| Home's `Card` + `CardActionArea` grid | `CardGrid` of `IconCard`s | base |
| *CTA-116, the loose ends:* | | |
| `Tooltip` + a text `Button`, the disabled one in a `span` (a collection's *Add games* and *Analyse*, the changes strip's *Update* and *Save as copy*) | `HintButton` | base |

## 4. The pilot's findings

### 4.1 Design-system changes — each backward compatible, tested and demoed

| Component | Added | Why |
| --- | --- | --- |
| `DataTable` (pattern) | `rowNote(row)` — a row's words in one cell across the columns, its pick and actions kept | The Lobby keeps a record whose PGN will not parse, saying so across the columns; the table had no row shape for it. |
| `DataTable` | `groupEnd(row, next)` — a bolder line under a row that closes a group | Storage's report separates each database's section. |
| `DataTableColumn` | `cellTestId(row)` — a test id on the cell itself | Storage's tests name its cells (and read their border). |
| `ConfirmDialog`, `DeleteManyDialog` | `confirmTestId` | The screens' tests named the confirm `…-confirm-ok` / `played-games-delete-confirm`, not `<testId>-confirm`. |
| `SwitchField`, `CheckboxField` | `testIdOn: "input" \| "control"` | The screens' tests reach the input *inside* the id's element (`querySelector("input")`, `within(…).getByRole("checkbox")`); the base tier puts the id on the input itself. |
| `FileInputButton` | `inputTestId` | Import's tests upload to `settings-import-input`, not `<testId>-input`. |
| `StatusText` | `tone: "neutral"` and `emphasis` | The game's result is a `status` in the text's colour, `body2` 600 — no tone fitted. |
| `ProgressLine` | `announce` — its caption a `status` live region | An import's progress had to be read out as it changes. |
| `buildTheme`'s accessibility overrides | `MuiToggleButton`: an unpressed button's words in `text.secondary` | The browser pass: MUI's `action.active` (an unmeasured 54 % black) read 4.4:1 on the default and brown pages — every `SideToggle`. |
| `SliderField` | Its notice is no longer dimmed with the slider | The browser pass: "fixed at 1" in `warning.main` at 60 % read 2.5:1. |
| **`RadioGroupField`** (new, forms) | A `fieldset` + legend, labelled radios, a help caption | The Import dialog's Merge / Override / Skip — per category and per folder — were two unnamed hand-built groups. |

The four test-id props (`confirmTestId`, `testIdOn`, `inputTestId`,
`cellTestId`) exist so a module's tests survive its migration unchanged. A
**new** screen does not need them: it takes the component's own derived ids.

**CTA-113** added, each the same way — optional, its absence today's behaviour:

| Component | Added | Why |
| --- | --- | --- |
| `DataTable` | `tree` (`depth`, `open`, `onToggle`, `toggleLabel`, `toggleTestId`) — a depth indent and a named `ExpandToggle` per branch in the first column | The Library's details view is a tree of folders and collections; the user chose to keep it a tree table. |
| `DataTable` | `rowTestId`, `linkTestId`, `rowLinkLabel`; `picks.selectAllTestId`, `picks.pickTestId`; `rowLink` may answer `undefined` | The Library's ids (`library-row-<id>`, `library-picks-row-<n>`); a collection's White cell named by the whole game. |
| `SelectionBar` (new, toolbars) | A select-all, a chip counting the picks that clears them, the actions — the select-all optional beside a table | The saved lists' export bar; the collection's, whose select-all moved into the table's header. |
| `ViewToggle`, `CopyField`, `KeyValueList`, `UploadPanel` (pattern, a new *forms* section) | new | The saved lists' view switch, `CopyableValue`, `GameInfo`'s tags, the four PGN inputs. |
| `RecordRow`, `RecordCard`, `FolderRow`, `FolderCard`, `CardShell` | `openTestId`, `pickTestId`, `nameTestId`, `descriptionTestId`; a card's `detail` line; a card with neither `onOpen` nor `link` is not a button; `RowAction.ariaLabel` | The saved lists' ids; each control named by its record. |
| `BaseDialog`, `ConfirmDialog`, `DeleteManyDialog`, `FormDialog` | `titleTestId`, `cancelTestId`, `submitTestId` | Ids that would otherwise collide with a screen's buttons (`analysis-save`). |
| `ProgressDialog` | `barTestId`, `captionTestId` | The Library's import reads its caption as `library-import-progress`, the bar's derived id. |
| `SnackbarProvider` | an action's `href` (a real link; a plain click runs `onClick`) and `testId` | The collection's *Open folder*: the snackbar sits outside the router, so a router link cannot render there. |
| `DateRangeFields` | `bounds` (`min`, `max`) and `inputTestIds` | The collection's and the import's dates stay inside the games' own span. |
| `RadioGroupField` | `optionTestId` | The tree dialog's radios are `library-filter-moves-save-no`; the group's derived prefix collided with the Save link. |
| `SelectField` | `testIdOn: "input" \| "display"` | Tests that click the visible combobox. |
| `SideToggle` | `buttonTestIds` | The position editor's `-turn-w`. |
| `PanelTabs` | `tabTestIdPrefix` | The board panel's `…-panel-tab-<id>`. |
| `IconAction` / `ToggleIconAction` | `popupOpen`; `pressed: boolean \| null` | A menu button; a Save that opens a dialog rather than toggling a strip. |
| `AnchoredMenu`, `ContextMenu`, `PickerList`, `Breadcrumbs`, `ProgressLine`, `FeedbackStrip`, `CardGrid` | `entryTestIdPrefix`; `open`; `noneTestId`; `currentTestId`; `barTestId`; `maxHeight` as a string; `cardGridColumns(size)` | Each one screen's ids or layout. |
| The theme | `typography.fontFamilyMonospace` (`MONOSPACE_FONT_FAMILY`, `monospaceOf`); brown dark `text.secondary` `#a19f9b` | One monospace token for notation and paths (§4.5's loose end); a raised row read 4.3:1. |

**CTA-116** added, the same way:

| Component | Added | Why |
| --- | --- | --- |
| `HintButton` (new, toolbars) | A small `Button` under a tooltip that **describes** it (`aria-describedby` a hidden copy of the hint), in a span so a disabled one keeps it; `link`, `busy` | Three hand-written copies of one composition — and the reason the MUI lock needs no `Tooltip` exception. |
| `SelectField` | Its 160 px floor is `min(160px, 100%)` | A half-panel column is narrower than 160 px; the mask editor's twelve selects overflowed it, and `fullWidth` only widened the box to the same floor. |
| `VariationLine` (the side lines' move token) | `minWidth` / `minHeight` `MIN_TARGET_PX` | The first browser pass's finding: a side line's move was 21.5 px tall, a short one 23.7 wide (`target-size`). |
| `BestVariations` | A collapsed line stops at the last move that fits **whole**, an ellipsis after it (`fitWholeMoves.ts`, measured after layout) | Its last move was cut by the panel's edge to 16–23 px of a button (§4.7) — and a move only half in sight was still a tab stop. A cut move leaves the layout, so it leaves the tab order too. |

### 4.2 New blocks

| Block | Family | Used by |
| --- | --- | --- |
| `PlayedGamesTable` | tables | the Lobby |
| `StorageTable` | tables | Settings → Storage |
| `PlayedGamesFilters` | forms | the Lobby (the table's filters slot) |
| `EngineSettingsForm` | forms | Play with Engine's and Masked Pieces' Engine tab, the Lobby's new-game form (through `views/engine/play/EngineSettings.tsx`, a one-line adapter under the module's ids) |
| `MaskEditor` | forms | Masked Pieces' Masking tab |
| `ExportCategoriesForm` | forms | Settings → Export |
| `ImportDialog`, `IncompatibleImportDialog` | dialogs | Settings → Import |
| `ImportReport` | panels | Settings → Import |
| *CTA-113:* | | |
| `CollectionsTreeTable`, `CollectionGamesTable` | tables | the Library's home, a collection |
| `SavedAnalysesList`, `RepertoiresList`, `FolderActions`, `FolderPicker`, `OpeningBookList` | lists | Saved analyses, Repertoires, the Library, the Openings explorer's Book tab |
| `FolderNameDialog`, `FolderMoveDialog`, `FolderDeleteDialog`, `CollectionImportDialog`, `OpeningTreePgnDialog` | dialogs | the three folder trees; the Library's import and tree export |
| `AnalysisEngineForm`, `ArrowSettingsFields`, `FenInput`, `PgnInput`, `PositionFields`, `MergeSplitChoice`, `CollectionFilters` | forms | every board's Engine tab; the Analysis Board's Arrows; the loads and uploads; the position editor; the repertoires' choice; a collection's panel |
| `PgnExportPanel`, `GameInfo`, `CurrentOpening`, `ChangesStrip`, `PlayToggleButton`, `EngineThinking` | panels | every board's Export and Info tabs, header and changes strip |

`ExampleGamesTable`, the placeholder that proved the layer, was deleted with
the first real table block, as [`hierarchy.md`](./hierarchy.md) promised.

**Test ids.** A **table** block takes the screen's `testId` as its root, as
`DataTable` does (`played-games` → `played-games-row-<id>`). A **form, panel
or dialog** block takes it as the **prefix** of every id it sets and names its
own root under it (`mask` → `mask-editor`, `mask-preset-<id>`,
`mask-setting-lines`; `engine` → `engine-settings`, `engine-setting-depth`;
`settings-import` → `settings-import-dialog`, `settings-import-run`) — which
is how the modules' existing ids fell out, and keeps two parts of one screen
from sharing a root id.

**Words.** Every pilot block is used by one module, so each reads its words
from the catalogs (`useTranslation`), as `hierarchy.md` allows; the gallery
shows them in English. CTA-113's blocks used by several modules take their
words as `labels` props or a `labelKey` (the folder dialogs, the saved lists,
`ChangesStrip`); a module's own reads its catalog.

**`src/views/shared/` after CTA-113** holds only the board's pieces and hooks
(the move list, eval bar, captured strips, plates, promotion picker, board
controls, next-moves bar, position editor, `useCurrentOpening`,
`useStoreRead`) — every generic part is in the design system and every
chess-aware composition a block.

### 4.3 The deliberate changes

Behaviour stayed as it was except for these, each with its tests updated:

- **The Lobby's page sizes** are 25 / 50 / 100 / 250, 50 by default (were
  10 / 25 / 50, 25). An older `?rows=10` link reads as the default; a `?page=`
  past the end is the last page. New tests cover both.
- **The Replay / Resign confirm and the Lobby's delete confirm** have a
  contained red confirm (was a red text button).
- **The Lobby's dates** are `YYYY-MM-DD` (were "Sep 1, 2026"); the Elo and
  move counts are end-aligned in tabular figures.
- **The Lobby's row actions** share one always-visible column at the row's end
  (were two columns after the pick): the rows lose two cells, the header gains
  a named, blank actions column, and an unreadable row is the pick, the note
  and the (empty) actions cell. `DataTable`'s own ids replaced two of the old
  table's: `played-games-table` → `played-games-frame-table`,
  `played-games-pagination` → `played-games-pager` — each queried only by a
  test rewritten for the column order and the page sizes.
- **Each row's controls are named by the row** (CTA-109's accessibility part)
  — "Continue the game Human – Stockfish level 5 of 2026-09-20 18:30", not
  "Continue" — to the minute, since two games of one day would otherwise read
  alike (`whenPlayed`). The tests that read "Continue" / "Analysis" ask for the
  new names.
- **An `IconAction` holds its button in a span** (so a disabled one keeps its
  tooltip): the two "the back button is first in the header" assertions ask
  whether the header's first child holds it.

**CTA-113's**, each with its tests updated:

- **Saved analyses' pager**: 25 / 50 / 100 / 250, 50 by default, shown once
  there are more than 25 rows (was a fixed page). `SavedAnalyses.test.tsx`.
- **A collection's page sizes**: 25 / 50 / 100 / 250, 50 by default (were
  50 / 100 / 250); its **select-all** is the table header's (was the export
  bar's) — its id, `library-picks-select-all`, kept. The empty and no-match
  line is a table row now, so the Library tests' `rowNumbers()` helper skips
  it.
- **The Library home's row actions** are always visible (were on hover and
  focus), and its dates `YYYY-MM-DD` (were "Sep 1, 2026").
- **A repertoire's folder choice** in its settings is a list, the chosen row
  `aria-current` (was a tree, `aria-selected`). `RepertoireSettings.test.tsx`,
  `RepertoireFolders.test.tsx`.
- **Every destructive confirm** (delete a collection, a folder, picked games,
  a move's line) has a contained red button.
- **Each row's controls are named by their record** ("Open Caro-Kann",
  "Games of Caro-Kann", "Select Amy – Bob").
- **`FormDialog` submits on Enter**: the folder name, a comment and the
  play-chance marks save on Enter in their field.
- **The Analysis Board's Save** carries no `aria-pressed` while it opens a
  dialog (a new board), only while it toggles the changes strip.
- **The collection's *Open folder*** is the app's snackbar's (one at a time,
  queued) — its id kept.
- **The Openings explorer's Book rows** are list items, and the keyboard's
  focus recolours a row's arrow as the pointer does.
- **The colour toggle and Home's cards** look as the design system draws them
  (`IconAction`'s tooltip and span, `CardGrid`'s gap).

Smaller visible changes, from the components' one look: the side toggles'
padding (`SideToggle`), the custom-position notice's order (the text, its two
buttons, then the FEN in the detail block), the import progress's caption
under its bar, a header row on Storage's browser table ("Measure", "Size" —
every column is named).

### 4.4 Left hand-written, and why

| What | Where | Why |
| --- | --- | --- |
| The theme cards (`Radio` + `FormControlLabel` with previews) | `settings/AppearanceTab.tsx` | Each option is a bordered card with three previews; `RadioGroupField`'s plain labels draw neither. A `RadioCardGroup` pattern when a second screen wants cards. The legend is `FieldLabel`. |
| The mask presets' vertical `ToggleButtonGroup` | `blocks/forms/MaskEditor` | No component is a list of named, exclusive choices — `SideToggle` is the sides alone. Candidate: a `ChoiceToggle` base component when a second one appears. |
| The import clash's effective-choice `Chip`, its `Collapse` | `blocks/dialogs/ImportDialog` | One-off parts inside a block, no generic job yet. |
| `NewGameForm` and `PlayScreen` | `views/engine/` | They host the position editor, `BoardShell` / `BoardPanel` and the explorer — pieces a block may not import — so they stay screen compositions, built of base components and blocks. |
| The Start button and the Open-in-analysis button | `NewGameForm`, `PlayScreen` | A single MUI `Button` each — no composition to replace. |
| ~~`EngineSettingsForm`'s three-state rule~~ | | Done by CTA-113: `OptionSlider` is gone; the Analysis Board's Engine tab is the `AnalysisEngineForm` block over `engineOptionState` + `SliderField`. |
| *CTA-113:* | | |
| **The sidebar** (`TreeRow`, folders as `aria-expanded` buttons, screens as links) | `views/main/Sidebar.tsx` | `TreeView` is a WAI-ARIA tree — one roving tab stop, the arrow keys to move — and one list. The sidebar is a `nav` of links, **each a Tab stop**, whose Settings folder is pinned in a foot that never scrolls and grows upwards. Moving it would change its keys and its layout, which the issue allows only if kept exactly; it stays, built of MUI's list atoms under the theme's focus ring. |
| The language `Select` | `theme/LanguageSwitch.tsx` | A compact header select with an icon in its value and no visible label (`aria-label`); `SelectField` draws a labelled outlined field. |
| The collection's opening box | `blocks/forms/CollectionFilters` | A free-text single `Autocomplete` (an ECO code's start) — `SelectAutocomplete` chooses one value, `ChipsAutocomplete` many. |
| The import popup's Elo range slider | `blocks/dialogs/CollectionImportDialog` | Two thumbs on one span; `SliderField` is one value. |
| The filter board's continuations (SAN buttons with result bars) and the board | `views/library/OpeningFilterBoard.tsx` | A board piece: it replays a line in `chess.js` and draws play-chance arrows. |
| `NagDialog`'s glyph toggles, `PlayChanceDialog`'s chances grid | `views/explorer/` | Move-annotation grids with no generic job; inside `BaseDialog` / `FormDialog`. |
| `PlayScore` (the repertoire game's score board) | `views/repertoires/RepertoirePlayer.tsx` | A game's own score and accuracy line. |
| The single `Button`s (Start, Open in analysis, the quick loads) | the screens | One MUI job each, nothing to compose. (*Add games* and *Analyse* had a tooltip too: `HintButton` since CTA-116.) |
| **ChoiceToggle / RadioCardGroup** | — | Not built: no second use appeared (the mask presets and the theme cards stay the only ones). |

#### The MUI lock's exceptions (CTA-116)

`yarn lint` fails an import of an MUI atom the design system wraps from
`src/views/` or `src/blocks/` ([`hierarchy.md`](./hierarchy.md#the-import-rules)).
The rows above that keep one are the exceptions, each a per-line
`eslint-disable-next-line no-restricted-imports -- migration.md §4.4: …` with its
reason, and **there are five, in four files**:

| File | Import | Why (§4.4 above) |
| --- | --- | --- |
| `views/explorer/NagDialog.tsx` | `ToggleButton` | The glyph toggles: a move-annotation grid with no generic job |
| `blocks/forms/MaskEditor/MaskEditor.tsx` | `ToggleButtonGroup`, `ToggleButton` | The presets: a vertical list of named, exclusive choices — `SideToggle` is the sides alone |
| `blocks/dialogs/CollectionImportDialog/CollectionImportDialog.tsx` | `Slider` | Two thumbs on one span; `SliderField` is one value |
| `blocks/forms/CollectionFilters/CollectionFilters.tsx` | `Autocomplete` | The opening box: free text, one value |

`src/views/boundary.test.ts` holds this table to the source — the files, the
count and the reason on each line — so a sixth is a deliberate edit of both.
Not exceptions, because not locked: the theme cards' `Radio` and the language
`Select` (MUI atoms the design system does not wrap), the sidebar's list atoms
and `DialogContentText`.

### 4.5 Mismatches and loose ends

- ~~**`lib/storageDiagnostics.ts` mixes a pure helper (`formatBytes`) with a
  store read**~~ — done by CTA-113: `lib/formatBytes.ts`, which
  `StorageTable` and `CollectionImportDialog` import.
- **`IconAction`'s span** changes a header's `firstElementChild` (§4.3) —
  expect it on every board header that migrates.
- ~~**`SelectField`'s `minWidth: 160`** is wider than a half-panel column; the
  mask editor's selects take `fullWidth` in a two-column grid.~~ Done by
  CTA-116: the floor is `min(160px, 100%)`, and the mask editor's selects
  carry no `fullWidth`.
- ~~**Monospace**~~ — done by CTA-113: `theme.typography.fontFamilyMonospace`
  (`MONOSPACE_FONT_FAMILY`, `monospaceOf`), read by `InlineAlert`, `CopyField`
  and the incompatible-import dialog; no literal stack is left.
- ~~**A gallery-discovery test** (`gallery/discover.test.ts`) lists the
  patterns by name; a new pattern (CTA-113's `UploadPanel`) must be added
  there, and a new table block moves `Main.test.tsx`'s "first block".~~ Done by
  CTA-116: both read the registries — the patterns off the disk with a glob,
  the first block off `views/dev/design/blocksTier.ts`, the tier the route
  itself uses.

### 4.6 Accessibility gaps the pilot did not close

Listed in [`ACCESSIBILITY.md`](../../ACCESSIBILITY.md#known-gaps) too.

- ~~**Play's thinking spinners**~~ (`PlayToggleButton`, `EngineThinking`)
  — fixed by CTA-113: both are blocks, the spinner named, the thinking line
  a polite status.
- ~~**The pinned engine lines' targets**~~ (`BestVariations`) — fixed by
  CTA-113: 24 px rows and toggle, the motion the theme's.
- ~~**The Openings Book list**~~ put buttons straight in a `ul` (axe's
  `list`) — fixed by CTA-113 (`OpeningBookList`).
- ~~**The board panel's tab panels** (`BoardPanel`) and the new-game form's
  panel are `role="tabpanel"` without `aria-labelledby` back to their tab.~~
  Fixed by CTA-112: `BoardPanel` links every tab and its panel, and
  `PanelTabs` takes an `idPrefix` whose panels a host marks with
  `tabPanelProps` (the new-game form, Settings).
- **The boards stay drag-only** — the board accessibility Story.

### 4.7 The browser pass

The migrated screens were opened in Chrome (headless, the dev server, driven
through the DevTools protocol — the DOM only, no screenshots) under **every
theme, light and dark, in English and Hebrew**: the Lobby seeded with a game
still on, a mated one, a masked one and an unreadable one; Play with Engine on
its Engine tab; Masked Pieces on its Masking tab; the four Settings tabs — 112
page loads. On each: the document's `dir` (right to left under Hebrew), the
board's (always `ltr`), the console, and axe's WCAG 2.2 A / AA rules **with
colour contrast and target size on**, which jsdom cannot measure.

It found the two contrast failures fixed in §4.1. What remains is outside the
pilot, listed in [`ACCESSIBILITY.md`](../../ACCESSIBILITY.md#known-gaps):

- ~~**The sidebar** (`views/main/Sidebar.tsx`, the shell) nests an `<li>` in an
  `<li>` in an open folder — axe's `listitem` and React's "cannot be a
  descendant" warning on every page with its folder open.~~ Fixed by CTA-112:
  an open folder's rows are a `ul` in its `li`.
- **The board**: its pieces are unnamed `role="button"`s
  (`aria-command-name`, react-chessboard's drag handles) — the board
  accessibility Story.
- **The pinned engine lines** (`BestVariations`, the board core): each move
  a 17 px tall target and the block's toggle 22 px (`target-size`), and a
  secondary line at 3.65:1 under brown, dark.
- A disabled slider's **value** (`engine-setting-hash-value`, green, light) is
  dimmed to 3.8:1 — text of an inactive control, which WCAG 1.4.3 exempts.

**CTA-113's browser pass**, the same way (headless Chrome over the DevTools
protocol, the dev server, the DOM only): the thirteen routes CTA-113 moved —
Home, Saved analyses, the Analysis Board and a saved analysis' settings, the
repertoires' list, upload, player and settings, the Library home, a
collection (Capablanca), the upload, a Library game, the Openings explorer —
seeded with a saved analysis and a repertoire through the app's own stores,
under **every theme, light and dark, in English and Hebrew**: 208 page loads,
then the six board pages again (96) after the fixes. On each: `dir` (right to
left under Hebrew, every page), the board's (`ltr`, every board), the console
(clean), and axe with colour contrast and target size on.

It found, and CTA-113 fixed:

- **The move list's rows were 19 px tall** (`target-size`, 30 on a whole
  Library game) — `MoveList`'s rows are at least `MIN_TARGET_PX` now.
- **The current row's evaluation** was dimmed on the primary fill: 3.61:1
  (default), 3.74 / 3.97 (brown), 3.69 (green) — it is whole on the current
  row now.

What remains, in [`ACCESSIBILITY.md`](../../ACCESSIBILITY.md#known-gaps):

- **The board's pieces** (`aria-command-name`, every board and preview) — the
  board accessibility Story.
- ~~**An engine line's last move, cut by the panel's edge** (`target-size`:
  15.9–22.9 px of it showing, on the boards with the engine on) —
  `BestVariations`, the board core's.~~ Fixed by CTA-116 (§4.1).

**From CTA-116 the browser pass is a command**, `yarn test:a11y`: every shipped
route (21 pages), seeded through the app's own Import — a game still on, a
finished, a masked and an unreadable one, saved analyses and repertoires (one
each at the top level and in a folder), two uploaded collections — under every
theme × scheme × language against the production build, with axe's colour
contrast and target size on, the console, the document's and the boards'
direction. It replaces the hand-run passes above
([`browser-a11y.md`](../../.claude/rules/browser-a11y.md), `ACCESSIBILITY.md`).
Its first run found one thing the hand passes had not, fixed in §4.1 (a side
line's move tokens), and measured **reflow at 320 px**: the sidebar leaves the
content no width, on every route ([`ACCESSIBILITY.md`](../../ACCESSIBILITY.md#known-gaps)).

## 5. Checklist for migrating a module

- [ ] Every piece in `docs/design/<Module>.md` marked with its destination.
- [ ] Each block in `src/blocks/<family>/<Block>/`: component, test, gallery
      (every state), `fixtures.ts` on `src/lib/` types, `index.ts`, a row in
      `hierarchy.md`. `yarn lint` passes the import rules.
- [ ] A missing generic piece added as a pattern or base component first; a
      misfit fixed with an optional prop, tested and demoed; the section doc
      updated.
- [ ] Screens: no `Dialog` stack, `Table` + `TableSortLabel` / `TablePagination`,
      `FormControlLabel` + `Switch` / `Checkbox`, side `ToggleButtonGroup`,
      `Tooltip` + `IconButton`, loading `Typography` or `Tabs` strip left, or
      listed in §4.4 with its reason.
- [ ] Every existing test passes with its ids; only the deliberate changes'
      tests updated, each listed here.
- [ ] Each screen's main states pass `expectNoAxeViolations`; the keyboard
      walk of each part tested with `userEvent`; status changes in live regions.
- [ ] `npx tsc -b`, `yarn test:run`, `yarn lint` clean (a MUI atom the design
      system wraps is a lint error; §4.4 lists the exceptions); `npx knip` reports
      nothing new but the blocks' prop types; `yarn build` and the `dist/`
      grep show no gallery, demo or fixture.
- [ ] The screens' routes are lines in `e2e/a11y/routes.ts` (`routes.spec.ts`
      fails a shipped route with none), seeded if they list records
      (`seedZip.ts`), and **`yarn test:a11y`** passes — every theme, light and
      dark, English and Hebrew, colour contrast and target size included. A new
      finding is fixed; only a real gap with a plan goes on the allowlist, and
      in `ACCESSIBILITY.md` first.
- [ ] Each migrated screen's route named (`handle.title`, `pages.*`), a record
      it opens reported (`usePageTitle`), a visible title that is the page's
      `h1` declared (`useOwnPageHeading`), and its page added to
      `src/pageOutline.test.tsx` — one `h1`, no skipped level, axe's page rules.
- [ ] **The screen-reader pass** per [the protocol](./screen-reader-testing.md):
      a script for each migrated screen in its §3, run at least with Orca
      and Firefox, in English and Hebrew; the rows in
      [`screen-reader-results.md`](./screen-reader-results.md), every issue
      fixed or a known gap in `ACCESSIBILITY.md`.
- [ ] `docs/design/<Module>.md` marked, this file's §4 extended, gaps in
      `ACCESSIBILITY.md`.
