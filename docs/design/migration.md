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
shows them in English.

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
| `EngineSettingsForm`'s three-state rule | `blocks/forms/EngineSettingsForm/engineOptionState.ts` | `views/shared/OptionSlider.tsx` keeps the same rule, since the Analysis Board still uses it (rule 1: shared pieces migrate with their module). **When Analyses migrates, `OptionSlider` goes onto `engineOptionState` + `SliderField`.** |

### 4.5 Mismatches and loose ends

- **`lib/storageDiagnostics.ts` mixes a pure helper (`formatBytes`) with a
  store read** (`estimatedLibraryGamesPayload`). `StorageTable` imports the
  helper, which the lint rule allows but which pulls the Library's store into
  the block's graph. Move `formatBytes` to a pure module the next time `lib/`
  is open.
- **`IconAction`'s span** changes a header's `firstElementChild` (§4.3) —
  expect it on every board header that migrates.
- **`SelectField`'s `minWidth: 160`** is wider than a half-panel column; the
  mask editor's selects take `fullWidth` in a two-column grid.
- **Monospace** — the incompatible dialog's paths use `InlineAlert`'s stack
  (`ui-monospace, SFMono-Regular, Menlo, monospace`); a typography token for
  notation and machine words would make it one.

### 4.6 Accessibility gaps the pilot did not close

Listed in [`ACCESSIBILITY.md`](../../ACCESSIBILITY.md#known-gaps) too.

- **Play's thinking spinners** (`PlayToggleButton`, `EngineThinking` —
  `views/tools/analysis/`) are unnamed progress bars while the engine
  thinks (axe's `aria-progressbar-name`). They migrate with the Analysis
  module; the screens' axe tests audit a game whose engine has answered.
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
- [ ] `npx tsc -b`, `yarn test:run`, `yarn lint` clean; `npx knip` reports
      nothing new but the blocks' prop types; `yarn build` and the `dist/`
      grep show no gallery, demo or fixture.
- [ ] The screens checked in the running app under every theme, light and
      dark, and in Hebrew — through the DOM.
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
