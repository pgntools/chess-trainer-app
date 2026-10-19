# The component hierarchy

How the app's UI is built, and **where a new component goes** (CTA-110). Five
layers, each built only from the ones below it, each with its own folder, its
own import rules (enforced by `yarn lint`) and its place in the gallery.

```
                         knows the domain?   reads stores / routes?   folder
 ┌───────────────────┐
 │ 5  Screens        │   yes                 YES — the only layer     src/views/<module>/
 └─────────┬─────────┘
           │ compose
 ┌─────────▼─────────┐
 │ 4  Blocks         │   yes (lib types,     no — rows, state and     src/blocks/<family>/<Block>/
 │                   │   pure helpers)       callbacks are props
 └─────────┬─────────┘
           │ compose
 ┌─────────▼─────────┐
 │ 3  Patterns       │   no                  no                       src/design-system/patterns/<section>/<Pattern>/
 └─────────┬─────────┘
           │ compose
 ┌─────────▼─────────┐
 │ 2  Base           │   no                  no                       src/design-system/components/<section>/<Component>/
 │    components     │
 └─────────┬─────────┘
           │ wrap
 ┌─────────▼─────────┐
 │ 1  MUI atoms      │   —                   —                        @mui/material
 └───────────────────┘
```

Under all of them sit the tokens and the theme (`src/design-system/themes/`,
`src/design-system/theme/` — [README.md](./README.md#themes)): every colour,
spacing and radius any layer draws.

## The layers

### 1. MUI atoms

`Button`, `Slider`, `Table`, `Dialog`, `TextField`, `Tooltip` … imported one
per file from `@mui/material/<Name>`. **Never composed by hand in a screen
when a layer above covers it**: a screen does not write
`Tooltip` + `span` + `IconButton` again, it uses `IconAction`.

### 2. Base components — `src/design-system/components/<section>/`

Small, generic, **one job**: they wrap one MUI job the app does over and
over, and know no chess, no record, no store, no route. Twelve sections
(CTA-108), each documented in [`sections/`](./sections/): `ConfirmDialog`,
`SwitchField`, `SortHeaderCell`, `PickCell`, `TableFrame`, `IconAction`,
`PanelTabs`, `EmptyState` …

### 3. Patterns — `src/design-system/patterns/<section>/`

Complex but still **generic**: several base components composed into a
reusable whole. They know no chess, no record, no store and no route, so
their demos run on made-up data.

| Pattern | What it is | Reference |
| --- | --- | --- |
| `DataTable` | a multi-column table: columns as data, controlled sort and paging, picks with select-all, row actions, row click and link, loading / empty / no-match rows, a row's note across the columns, sections closed by a bolder line, filter and toolbar slots, density, a sticky header — good at 10,000 rows | [`sections/patterns/tables.md`](./sections/patterns/tables.md) |
| `StandingsTable` | a Swiss tournament's standings: a row per competitor in rank order, one cell per round showing the result only (`ResultMark`: `1`, `½`, `0`, `*`, a dash), the points and tie-break columns that are data — every row shown, the frame scrolling both ways (CTA-120) | [`sections/patterns/tables.md`](./sections/patterns/tables.md#standingstable) |
| `CrossTable` | a round robin's crosstable: a row and a column per competitor, every result between two in the cell where they meet, the diagonal blank, the points and the tie-break columns — real row and column headers (CTA-120) | [`sections/patterns/tables.md`](./sections/patterns/tables.md#crosstable) |
| `Bracket` | a knockout's bracket: a column per round, a box per match — two sides, each a name, a score and a muted detail, the side that went through bold and marked — each match read by its words; a named region that scrolls sideways (CTA-128) | [`sections/patterns/tables.md`](./sections/patterns/tables.md#bracket) |
| `TreeView` | a collapsible tree: branches that open in place, leaves that link or select, the node on screen marked, a branch that can also be a destination — the sidebar's look | [`sections/patterns/trees.md`](./sections/patterns/trees.md) |
| `UploadPanel` | a file button and a paste box over one text, with a line under them for what was read (CTA-113) | [`sections/patterns/forms.md`](./sections/patterns/forms.md) |

`DataTable` also draws **tree rows** (CTA-113, `tree`): a details view of
folders — a depth indent and a named chevron per branch in the first column,
the rows arriving already walked (`lib/folderTreeRows.ts`). A tree *table*
(columns, a sort) is this; a tree *view* (one column, the arrow keys) is
`TreeView`.

Not built, since no two screens asked for one: `FilterBar`, `SettingsForm`,
`RadioCardGroup` ([`migration.md`](./migration.md#44-left-hand-written-and-why)).

### 4. Blocks — `src/blocks/<family>/<Block>/`

Complex and **domain-aware**: they know the app's data shapes — a
`PlayedGame`, a collection's `CollectionRow`s, a `GameFolder`, a PGN — and may
use `src/lib/`'s **types and pure helpers** (`openingLabelOf`,
`gameFolderChildren`). Built from patterns and base components.

**Blocks are presentational.** Their rows, their sort / page / filter state,
the selection and every callback arrive as **props**; a block never reads a
store, IndexedDB or the router. A link arrives as a `LinkTarget`
(`design-system/components/link.ts`), a route change as a callback. That is
what lets a block run in the gallery on fixtures — and be built and reviewed
before any screen uses it.

Grouped by **family** (`src/blocks/families.ts`: tables, trees, forms,
dialogs, lists, cards, panels), so every table sits beside every other table
in the gallery, whichever module it serves.

| Block | Family | What it is |
| --- | --- | --- |
| `PlayedGamesTable` | tables | The Lobby's games (`PlayedGameRow`) as a `DataTable`: sorted by `lib`'s `sortedPlayedGames`, a pick per row with select-all, Analysis / Continue row actions named by the row (`whenPlayed`), an unreadable record's row saying so (CTA-109). |
| `StorageTable` | tables | Settings → Storage's two read-only `DataTable`s: the browser's estimates, then the reader's records per category with each database's section closed by a bolder line (CTA-109). |
| `EngineOptionsTable` | tables | What an engine declared in its `uci` reply — a row per option: name, type, default, and its range (a spin's bounds, one value where pinned; a combo's values). Settings → Engine's panel, for the chosen engine-server engine. |
| `JobQueueTable` | tables | The Jobs module's queue (CTA-217): every background job of any kind, over block-local view models (`JobRowView` — the runtime's records mapped by the screen, no runtime import) — its title (the link to `/jobs/<id>`), kind, status in words (`JOB_STATUS_TONES`), progress and created time, and Resume / Pause / Cancel where the row allows them, Delete always. **Every column sorts** (`sort` / `onSort`, `JOB_QUEUE_DEFAULT_SORT` newest first) and **the filters stand over their columns** (CTA-221 — `filters`: the status's `SelectField` under Status's label, the kind's under Kind's, `labelHidden`; Clear above the table while one is on; `JobQueueFilters` and the subjects column gone — a job's subjects are its page's). Optional picks (a `SelectionBar` with Delete picked — the screen asks first), paging and its no-match row with Clear. Its folder also holds the parts every Jobs block draws a job with (`JobStatusText`, `JobProgressBar`, `JobSubjects`, `JobStamp`) and the view models (`jobView.ts`). |
| `EngineSettingsForm` | forms | The opponent's strength — an Elo, or Skill Level with its Elo an estimate — rendered from what the running engine declared (`engineOptionState`: absent, pinned, adjustable); the Elo off, with a link to Settings → Engine, while the engine's preset has `UCI_LimitStrength` off (`strengthOff`, CTA-181); the eval bar where a screen hands it one. Play with Engine's and Masked Pieces' Engine tab, the Lobby's new-game form (CTA-109; the strength alone since CTA-181). |
| `EngineSearchSettingsForm` | forms | The top bar's Engine menu (CTA-181): the search settings every board uses (`EngineSearchSettings`, `lib/engineSearchSettings.ts`) — depth, move time (lichess's marked slider, 1–600 s and ∞ — CTA-185), depth and move time typed in a number box too (CTA-185), lines, Threads and Hash up to what the engine running takes (`limits`, a value past it shown held to it), under the engine and preset selects (CTA-185); the link to Settings → Engine is the screen's. Given `changes`, the preset's unsaved changes under its select (`EnginePresetChanges`, CTA-185). |
| `SearchLimitsFields` | forms | Where a search stops (CTA-185): the depth and the move time, each a `SliderField` with a number box — depth's slider 1–50, typed up to 99, move time lichess's marks (1, 5, 10, 30, 60, 300, 600 s and ∞) and seconds typed up to 86,400 — 24 h (past 600 at the last time mark), the box off on ∞. The running engine's preset's — shown by `EngineSearchSettingsForm` (under the preset select) and `EnginePresetForm` (its Search limits section). |
| `EngineResourceSlider` | forms | Threads or Hash as a slider with a number box (CTA-185): the slider to the device's top (`searchSettingLimitsOf`), the box to the engine's (`searchSettingTypedLimitsOf`), a value past the slider shown at its end; a single-thread build's Threads fixed and said; Hash snapped to the powers of two from 16 MB, each mark where its size falls, labelled in GB where there is room (`hashSlots.ts`). The global request — in `EngineSearchSettingsForm` and `EnginePresetForm`'s search limits. |
| `EnginePicker` | forms | Settings → Engine's list: a radio per registered engine (`EngineEntry`: its `EngineDescriptor` and whether this page can run it) with its name, version, threading and how its strength is set; an engine the host cannot run is disabled and **says why** (CTA-153); one on the engine server names its address; `legend` names a second list on one page. |
| `EnginePresetForm` | forms | Settings → Engine's options form (CTA-179): the preset the chosen engine runs, picked from the library (each engine its own; New, Rename, Duplicate, Delete — Default cannot be), then every option the engine declares in its UCI type (`EnginePresetRow`s from `lib/enginePresets.ts`' `enginePresetRows`: a spin a number in its range, a check a switch, a combo a select, a string words), in three tabs (Basic, Advanced, System — the row's `tab`), with its type, default and range and a reset where the preset sets it; the boards' own (Threads, Hash, MultiPV), a button, a pinned option and a file path in a browser read-only, every limit saying why; an option that needs another disabled until it is on (the row's `disabled`), and a group's options (the row's `group` — Syzygy) behind a switch, shown only while on (`groups`, `onGroupChange`). Given `search`, the selected preset's search limits above the options (CTA-185, `SearchLimitsFields`). Given `resources`, Threads and Hash as the global request's sliders in the search limits, under the move time (their rows out of the options); Skill Level a 0–20 slider (CTA-185). Given `changes`, the preset's unsaved changes under the picker (`EnginePresetChanges`, CTA-185). |
| `EngineServerForm` | forms | Settings → Engine's API tab — the engine server on this computer: a switch (off by default — the app then contacts nothing) with a connection chip beside it (*Connecting…*, *Connected · N ms*, *Not connected*; the live region), the address with Connect — each press answered on the button (a spinner, then a check mark or a warning), the details — when it last answered, or what to check with Try again — and `children` under them, where the screen lists the server's engines (`lib/engineServer.ts`, `yarn api:start`). Its words are a catalog block (`localeKey`, `settings.engine.server` by default) — the lichess evaluation API's tab of Settings → Engine is the other (CTA-193; an eval source's, `evalSources.lichess`, since CTA-196). |
| `PlayedGamesFilters` | forms | The Lobby's filter row: the side the reader played (`SideToggle` with "all") and the opening each game reached (CTA-109). |
| `MaskEditor` | forms | Masked Pieces' Masking tab: the presets, the twelve per-type selects (each its own colour's six types), the notation and engine-lines switches (`PieceMask`, CTA-109). |
| `ExportCategoriesForm` | forms | Settings → Export's categories (`ExportSelection`), each with its count, and the shipped collections' box (CTA-109). |
| `ImportDialog` | dialogs | Settings → Import's choice dialog over an `ImportDump` and `ImportCurrent`: categories, Merge / Override / Skip per category and per folder (`RadioGroupField`), the preview and the caps, re-planned on every change; writes nothing (CTA-109). |
| `DevelopmentNoticeDialog` | dialogs | The app is still in development (CTA-155): a modal with the app's words and one Dismiss; whether it is open is a prop, the shell keeps the dismissal for 30 days (CTA-210). |
| `IncompatibleImportDialog` | dialogs | A zip that cannot be imported (`ImportProblem`): what is wrong, where each kind of PGN comes in by hand (`LinkTarget`s), the zip's `.pgn` files (CTA-109). |
| `EngineJobRunningDialog` | dialogs | One engine at a time (CTA-237): a board's engine asked for — turned on, or Play with Engine arriving on — while an engine job runs in any tab: the job named, and Pause the job / Wait for it to finish. Drawn once for the page by the board core's `EngineGateHost`, over `useEngineGate`. |
| `EngineOptionsChangedDialog` | dialogs | "Engine options changed" (CTA-181): a record opened — a saved analysis, a played game resumed — whose search settings differ from the ones in effect (`EngineSearchChange`s, `searchSettingsChanges`): a line per setting, the record's value then the current one, what this engine would hold, and Dismiss / Use these settings. |
| `ImportReport` | panels | What an import did (`ImportResults`): a line per category, an `InlineAlert` that is a success or a warning (CTA-109). |
| `ComputerAnalysisReport` | panels | A computer analysis's per-player report (CTA-173; `ComputerAnalysisReport` of `lib/computerAnalysis.ts`): inaccuracies, mistakes, blunders, missed mates, ACPL and accuracy, a row per measure and a column per side, "Not analysed" for a side with none — the eval graph's text alternative. Jobs V2's panel's, and a Case's Graph tab's (`AnalysisEvalReport`), where with `onStep` each count above 0 is a button to that side's next move of that kind. |
| `RepertoireEvaluationReport` | panels | **A repertoire evaluation's report** (CTA-219; `RepertoireEvaluationReport` of `lib/jobs/kinds/repertoireEvaluation/core.ts`, the `repertoire.evaluation.report@1` data output): the counts per verdict and the positions evaluated, then a `DataTable` of the repertoire's moves — the line to each (and how many more reach its position), the move (a link from `moveLink`, the repertoire at its `?at=` path), the evals before and after from the repertoire's side, the verdict as a `LabelChip` (words for a move not evaluated yet), the engine's best move — flagged first, worst first; a *Flagged moves only* switch (the screen's state) and optional `paging`. |
| `EvalGraph` | panels | A game's evaluation graph (CTA-173; `EvalPoint`s from `evalSeriesOf`): White's win chance over the moves, each verdict a dot in its move mark's colour, the board's move a hairline; a crosshair and tooltip on hover, a click or Enter choosing a move — a WAI-ARIA slider over the moves, each read as its move, eval and verdict; `span` (CTA-174) draws a run still being made from the left, its line growing. |
| `JobDetailsPanel` | panels | One job of any kind, whole (CTA-217; `JobDetailsView`): a header — title, kind, status chip, Pause / Resume / Cancel where allowed, Delete — its progress with the kind's `live` view under it, what it waits on (a scheduled retry: "Retrying in 40 s — attempt 2 of 3", its turn, a Resume), why it failed (message, code), its subjects, its times, then `details` and `parameters` slots. A polite status region announces a change of status only. `headingLevel` 1 on the job's own page. |
| `JobsIndicatorView` | panels | The header's Jobs indicator, presentational (CTA-217, generalised from Jobs V2's): the running job's progress (its title out of sight) or the queued count, a link to the Jobs screen, an icon alone when `compact` named in full, `heardAt` beating its spinner (`useEnginePulse`) with `liveWords` joined to its name; its status region says `announcement` — which `useJobStatusAnnouncement(jobs)` (beside it) derives from a change of status, never the progress. |
| `JobEngineProgress` | panels | A running engine job's live engine progress (CTA-190; `EngineSessionLive` of `lib/jobs/engineSession.ts`): the move searched, depth / selective depth, nodes and nodes per second (`formatEngineCount` — "2.4M"), the time on this position, the hash where reported, the best line with its score; its status region announcing the move and every tenth depth, never each update. The engine kinds' live view on a job's page, under `JobDetailsPanel`'s progress bar (CTA-221). |
| `FolderTree` | trees | The app's one nested-folder model (`GameFolder`, `lib/savedGameFolders.ts`) as a `TreeView`: each folder a destination with a count, its chevron its own button, an optional "everything" row. The second tree view the app has, after the sidebar's. |

CTA-113 moved the rest of the app onto blocks:

| Block | Family | What it is |
| --- | --- | --- |
| `CollectionsTreeTable` | tables | The Library home's details view — Built-in, the reader's folders and their collections (`LibraryEntry`, `FolderTreeRow`) as `DataTable` tree rows: Name, Games, Added, the row actions (`FolderActions` for a folder); a collection that reads as a tournament a trophy, its name read with "Tournament", one that could be (never marked, its games one event) a warning link first among its actions, its tooltip saying why (CTA-142). Optional (CTA-221): `picks` — a box on every collection's row and, since CTA-235, every reader's folder's (never Built-in's), each box's state and toggle the screen's (`pickOf` — a folder's standing for all under it, partly ticked while some is, `lib/libraryPicks.ts`), select-all the screen's too, and a `SelectionBar` counting the collections and folders with the screen's actions (none in the Library since CTA-232: its *Merge* and *Delete* are its header's) — its actions a folder's download, rename and move (no delete since CTA-235: a folder goes through the picks, whole); a collection's `onDeleteCollection` optional (the Library passes none since CTA-232) (no new sub-folder or upload into it, and no collection's *New job*, since CTA-231). |
| `CollectionGamesTable` | tables | A collection's games (`CollectionRow`) as a `DataTable`: the twelve columns sorted by `sortedRows`, picks with select-all over every game the filters leave, the White cell the row's link, an unreadable game marked. |
| `RepertoiresList` | lists | The repertoires' list: folders and records as rows or cards, picks, the settings link, a board preview on a card; `savedListView.ts` the view choice. |
| `FolderActions`, `FolderPicker` | lists | A folder's row actions (new, upload, download, rename, move, delete); the flat folder chooser over `PickerList`. |
| `OpeningBookList` | lists | The Openings explorer's Book tab: eco.json's continuations (`KnownMoveOpening`) as a named list of buttons, the pointed or focused one reported. |
| `FolderNameDialog`, `FolderMoveDialog`, `FolderDeleteDialog` | dialogs | The three folder trees' dialogs, their words as `labels`. |
| `CollectionImportDialog`, `OpeningTreePgnDialog` | dialogs | The Library's import options (what came in, the Elo / date / player filters, the count, the TAGS field stamped on every imported game — CTA-234) and *Save tree as PGN*'s choice. |
| `SaveAsCollectionDialog` | dialogs | The collection table's *Save as collection* (CTA-122): the derived name to edit, the count under it, a busy state and a problem slot — the write is the screen's. |
| `CollectionMergeDialog` | dialogs | **Library collections merged** (CTA-232 — the Jobs module's merge kind until then): the dialog the Library header's *Merge* (two or more ticked — a ticked folder's among them, CTA-235) opens (a collection page's *Merge with…* too, until CTA-235) — `CollectionMergeForm` and Merge (off below two collections, a note saying why), a refusal (too large, unreadable, refused) in an `InlineAlert`; **done** (`done`), the result instead: the new collection's name, its games and the duplicates left out (`role="status"`), **Open collection** (a link, closing it), **Download PGN** and Close. The read, the merge, the index pass and the write are the screen's (`views/library/useCollectionMerge.tsx`). |
| `JobSettingsChangedDialog` | dialogs | "Engine settings changed", asked on **Resume** (CTA-236): an engine job paused, interrupted or failed whose engine settings differ from the ones a new job would be given now (`JobEngineChange`s, `jobEngineChanges`) — a line per setting, the job's value then the current one (the engine, the preset and each option it sends differently, depth, move time, Threads, Hash), a note that the current settings queue it again as a new job keeping what it has analysed, and Cancel / *Continue with the job's settings* / *Continue with current settings*; a busy state and a problem slot. The resume and the new job are the screen's (`useResumeJob`). |
| `NewJobFrame` | dialogs | **New job** for any kind (CTA-217), over `FormDialog`: the kinds that apply to the entity as radio cards (name, a line on what it does; one that cannot start here says why and is off), the chosen kind's form as `children`, then Start — off until a kind is chosen or while `startBlockedNote` says why, the reason beside it and read with it (`FormDialog`'s `submitNote`), a refusal there as an alert, `busy`. The queueing is the screen's (`useNewJob`). |
| `ArrowSettingsFields` | forms | A Case's Display tab's Arrows (the legacy Analysis Board's Arrows tab until CTA-192). |
| `ComputerAnalysisForm` | forms | A computer analysis's options (CTA-174; `ComputerAnalysisOptions` of `lib/computerAnalysis.ts`) — a computer-analysis job's New-job form (CTA-177; inside `NewJobFrame` since CTA-221): threads, hash and lines by what the engine declared (`engineOptionState`, a single-thread engine's Threads pinned before its handshake), depth, time per move, the early stop's depth; the side, first move and colour, last move; under a collapsed Advanced the verdicts' thresholds and the variation range; the light / medium / full boxes, each explained; Start, off with no variant ticked or nothing to analyse, saying why — or, with no `onStart`, none: its host draws its own (`computerAnalysisStartNote`). Optional (CTA-188, Jobs V2): `engineChoice` — the engine and its preset, each a select at the head of the Engine section — and `singleVariant`, the variants as radios for a merge into the source Case. Its engine-and-search fields are `EngineSearchFields` (CTA-219, in its folder, exported beside it), shared with `RepertoireEvaluationForm`. |
| `RepertoireEvaluationForm` | forms | **A repertoire evaluation's New-job form** (CTA-219; `RepertoireEvaluationSettings` of `lib/jobs/kinds/repertoireEvaluation/core.ts`, the Jobs module's `repertoire.evaluation` kind): the engine and its search through `ComputerAnalysisForm`'s `EngineSearchFields` (the engine and preset selects with `engineChoice`; no early stop), the repertoire's side (prefilled by the screen, editable) and the ply limit, the verdicts' thresholds, and the outputs — the report always (ticked, disabled), a new repertoire "<name> — evaluated" and the annotated PGN as a file. Start is the New-job frame's. |
| `CollectionMergeForm` | forms | **A collection merge's form** (CTA-220; the Library's own since CTA-232, inside `CollectionMergeDialog`; `CollectionMergeSettings` of `lib/collectionMerge.ts`): the collections picked as an ordered list, each with its game count, moved up / down or removed (never below two once there are two, a note saying why) — the whole new list leaving through `onSourcesChange`; a `SelectAutocomplete` over the Library's other collections (`candidates`, grouped Built-in / the reader's own, typed to find) adding one at the end — none drawn with no candidates (the Library header's *Merge*); the dedupe mode as radios, each explained; the new collection's name, "<first> + <n> more" (`defaultMergeName`, in the reader's language) where left empty; `disabled` while it runs. Merge is the dialog's. |
| `PgnInput`, `FenInput`, `PositionFields` | forms | A PGN from a file or a paste (over `UploadPanel`), a FEN, the position editor's fields. |
| `MergeSplitChoice`, `CollectionFilters` | forms | A several-games text's merge or split; a collection's filter panel. |
| `CollectionFiltersRail` | forms | Library (CTA-230): a collection's filter panel folded to the shell's right-hand rail — the button that opens it again, a badge counting the filters still on (`activeFilterCount`), the count in its name too. |
| `CollectionSettingsForm` | forms | A collection's settings (CTA-121): the title, the description, and the tournament mark — a `SwitchField` off with its reason while the games do not share one `Event`, the type the games look like (`TournamentSuggestion`, CTA-142), then the formats as radios (every one selectable — the arena's table since CTA-204) with each one's description under the group. |
| `TournamentMarkFields` | forms | A collection's tournament mark as fields (`CollectionTournament`, CTA-142 — taken out of `CollectionSettingsForm` so the import popup asks it too): the switch, off with its reason where the games do not share one `Event`; the type the games look like (`TournamentSuggestion`); the formats as radios, each one's description. |
| `TournamentSuggestion` | forms | The tournament type a collection's games look like (`TournamentGuess`, `lib/tournamentKind.ts`, CTA-142): the format named in the settings' words with its reason, localized from the guess's facts, and an Apply that puts it in the draft — off, with "press Save", once the draft holds it; with `onDismiss`, a close button (the games table's, which marks at once). |
| `PgnExportPanel`, `GameInfo`, `CurrentOpening`, `ChangesStrip` | panels | Every board's Export and Info tabs, the opening line, the Update / Save as copy / Discard strip. |
| `EnginePresetChanges` | panels | An engine preset's unsaved changes (CTA-185): "Unsaved changes to ‹preset›", in effect already, with **Save** and **Save as new preset** (its name asked in a dialog, "‹preset› (copy)" to start) — a `FeedbackStrip` in the `success` tone. Shown by `EnginePresetForm` under its picker and `EngineSearchSettingsForm` under its preset select, while the preset's draft (`lib/enginePresetDraft.ts`) differs from what is saved. |
| `PlayToggleButton`, `EngineThinking` | panels | Play's header button and the engine's thinking line. |
| `BoardEngineControls` | panels | A board's engine in its header (CTA-181): the on / off as a play / pause button (`aria-pressed`, one name), and beside it a menu — a popover dialog — of the board's own engine choices: the eval bar. Every board's but the Case board, whose on / off is a header switch. |
| `ProjectsTable` | tables | Analysis V2 (CTA-186, CTA-191): the folders, Projects and their Cases as one tree table (`ProjectTreeRow`, `lib/analysisProjectRows.ts`'s `projectTreeRows` over `folderTreeRows`) — the legacy `SavedAnalysesTable`'s shape: folders first at every level, folders and Projects opened in place by their chevron or a click on the row, a Project's Cases indented under it, a name a link (into the folder, to the Project's Cases, to a Case's board), Name, Cases and Updated each a sort header, a folder's `FolderActions` (rename, move) and a Project's rename, move, duplicate; **a box on every row** — a folder's and a Project's the screen's state over all under it (`lib/analysisProjectPicks.ts`) — and the screen's select-all, no row deleting itself; the words box in its filters slot and a no-match row with its Clear. |
| `CasesTable` | tables | Analysis V2 (CTA-186): a Project's Cases (`CaseRow`, `lib/analysisCaseRows.ts`) as a `DataTable` — `#` (read "Order": the Case's place in the Project's order, CTA-203), Name (`caseDisplayName`: its own, else its game's tags or its position's side to move; the row's link to its board), Type, then a Game's White, Elo, Black, Elo, Result, Date, Event, Round, ECO, Opening, Moves off its tags (blank for a Position), Updated; every header a sort, the rows paged; move up, down, to the top, to the bottom (only under `#` ascending with no words, else off with the reason in the tooltip; never past an end), rename, move, duplicate — no row delete: the picks' bulk delete (CTA-203). |
| `NewCaseDialog`, `ProjectPickerDialog` | dialogs | Analysis V2 (CTA-186): a new Case — Game or Position, a Position from a FEN (checked as typed) or a PGN at a picked move; a `.pgn` or `.zip` read shown as a file plate, several games a Case each (the default, up to 1,000) or the games selected (CTA-208), an optional name (`NewCaseSpec`s back, the writes the screen's); a Project to move the picked Cases or duplicate a Case into — since CTA-226 a wide popup over a sortable, paged table of every Project (Name, Folder path, Cases, Updated) under a words box, one chosen by its radio, its row or Enter, kept and named under the table, built for thousands (the rows `projectPickerRowsOf`'s, the caller's), with the copy's name or a New project choice. |
| `ProjectCaseLimitDialog` | dialogs | Analysis (CTA-225): a Project past its soft limit of 1,000 Cases — how many it would hold, a Library collection suggested (worded for games already in the Library), *Create anyway* and Cancel; a busy state and a problem slot — the collection's write and the Cases' are the screen's. |
| `GamesPickerDialog` | dialogs | Analysis V2 (CTA-208): a file's games to pick from, in a wide popup — the Library's `CollectionGamesTable` (no links) under a words box, sorted and paged; ticked (select-all over what the words leave, a cap said) and handed back by number, or one chosen with a click. New case's, and New project's through `CollectionImportDialog`'s `choiceOnly.selectGames` (over the games its filters keep). |
| `NewProjectDialog` | dialogs | Analysis V2 (CTA-186): a new Project — its name, and optionally a `.pgn` whose games become its Cases (one game, one Case; several, chosen in `CollectionImportDialog` with `choiceOnly` — the Library's popup without its split or mark); reading and writing the screen's. |
| `CaseSiblings` | trees | Analysis V2 (CTA-186): a Project's Cases beside a Case's board — the legacy saved analyses' tree's shape (removed in CTA-192) for a Project with no folders: its Cases (`CaseRow`) as a flat `TreeView` of links, the open one current and scrolled into view, a words box, Close back to the Project at its head's start, previous / next sticky at its foot; nothing locks it (a Case autosaves). Paged, 100 a page (CTA-211): a fixed-size `TablePager` under the list past one page, opened on the open Case's page and back to it when the Case or the words change. A row picked opens the panel's second screen, `CaseDetails`. |
| `CaseDetails` | panels | Analysis V2 (CTA-186): a Case's own view beside its board, the left panel's second screen — Back to the Project's Cases (`CaseSiblings`) at its head's start, the Case's name and type, its details in tabs (Info — its PGN tags, through `GameInfo` —, Settings — the screen's board settings —, Graph — the screen's eval graph and report, the tab disabled without one —, Display — the screen's display settings), previous / next sticky at its foot. A last tab, Jobs (`jobs`, optional — the Case's Jobs V2, CTA-188), and on Info a *Linked cases (n)* button opening its links in a dialog (`links` and `linkCount`, optional — CTA-211). |
| `RepertoireDetails` | panels | Repertoires (CTA-206): a repertoire's own view beside its board — the player's and its games' left panel, `CaseDetails` for a repertoire: a head (Back at its start, the name, then Restart, the download and a gear opening the record's own settings at its end; the description on one line or, in a game, the game's title, under them); then tabs — Settings (the session's side, Autoplay and play chances where given, the next-move arrows, the eval bar), Games (each of `REPERTOIRE_GAMES` a link with what it does, the open one current, a way back to the repertoire first in a game) and Jobs (the screen's `jobs` slot — the repertoire's jobs and *Evaluate with engine…*, CTA-221; absent, an empty state). The session's state, the links and the open tab are the screen's. |
| `LibraryGameDetails` | panels | Library (CTA-209): a Library game's own view beside its board — the game board's left panel, `RepertoireDetails` for a Library game: a head (Back to the collection at its start, the game's title; "Game n of m · event · round · date · result" on one line under them, the whole on hover); then tabs — Info (the game's PGN tags, through `GameInfo`; first and the default, CTA-212) and Settings (the session's next-move arrows, move marks and eval bar); and at its foot, sticky, the previous and next game — disabled at either end, following the reading direction (CTA-212, as `CaseDetails`). The session's state, the links and the open tab are the screen's. |
| `ProjectDetails` | panels | Analysis V2 (CTA-213): a Project's own panel beside its Cases — the Project view's left panel, `CaseDetails` for a Project: the Project's name as its heading, then tabs — General (a placeholder line) and Options (an example switch). A frame: its content is a later issue. The open tab and the switch's state are the screen's. |
| `CollectionDetails` | panels | Library (CTA-229, its content CTA-231): a collection's own panel beside its games — the collection page's left panel, on the games table and the tournament view alike, `ProjectDetails` for a collection: a Close back to the Library (the page's one way back — no header Back) and the collection's name as its heading, then tabs — **General** (`general`: a tournament's `TournamentInfo` card, else the description and the facts — source, games, players, events, dates, ratings, added — over `collectionMetadataOf`; at its foot the `CollectionSource` card, `sources`, when the games name one, CTA-233) and **Settings** (`settings`, the screen's settings form; absent — a shipped collection — a read-only line; Options until CTA-235); its Jobs tab went in CTA-232 with the merge job. The open tab, the facts and the settings are the screen's. |
| `EntityJobs` | lists | One entity's jobs (CTA-221, replacing Jobs V2's `CaseJobs`) — a Case's Jobs tab, a repertoire's: New job (its words the screen's where the entity has one kind — *Evaluate with engine…*), then each job (`JobRowView`) newest first: its title (a link to `/jobs/<id>`), its kind and when it was created, its status in words and its progress bar; none, a line saying so (the screen's words). |
| `JobOutputsList` | lists | A job's outputs (CTA-217; `JobOutputView`): an entity a link (a deleted one said, unlinked), an artifact its name, MIME type and size (`formatBytes`, as the Storage tab) with a Download button (busy while read), a data output drawn by `renderData`; a pending one (decided, not applied) its name and a Pending chip. None, a line. |
| `JobHistory` | lists | A job's attempts (n, started – ended, outcome or under way, error) and events (when, and `describe(event)` in words), newest first, under a heading whose button opens and closes them (a disclosure; closed by default) (CTA-217). |
| `CaseLinks` | lists | Analysis V2 (CTA-188): a Case's links, in the dialog its Info tab opens (CTA-211) — the Cases it links to and the ones linked from it, across Projects, each a link there with its Project's name and an Unlink named for it — and Link a case (the screen's picker); none, a line saying so; a refused Unlink said under them. |
| `CasePickerDialog` | dialogs | Analysis V2 (CTA-188): a Case to link to — a Project (a select, the Case's own first; Projects with nothing to pick left out), then one of its Cases from a list; Link, a refusal said in it. Another screen may give it its own words — `title`, `submitLabel`, `emptyText` (CTA-238: the Accuracy Trainer's *Pick a case* / *Load*). |
| `JobTargetFields` | forms | A computer analysis's *Where to save the results* (CTA-188; the computer-analysis kind's New-job form since CTA-221) — new Cases in the source's Project, another Project (a new one named — the screen offers the Case's name — or an existing one), or merged into the source Case; `jobTargetProblem` says why a choice cannot be sent. A section of the kind's New-job form, before `ComputerAnalysisForm`. |
| `JobsSettingsForm` | forms | The Jobs settings (CTA-193), `/jobs/settings` since CTA-221: *Use a default engine and preset* for new jobs (a switch, then the engine and preset selects — off, the board's), and an *Evaluation sources* section saying a job asks the eval sources first, with a link to Settings → Engine (`evalSourcesLink`), where they are set since CTA-196. |

CTA-120 built the tournament tables ahead of their screen; their first
consumer is the Blog (CTA-128), through the MDX embeds `<SwissStandingsTable>`
and `<RoundRobinCrossTable>` (`views/home/frontPage/`) in its *Tournaments*
articles. CTA-128 added the other formats' — a knockout's bracket, a match,
a team event's standings — embedded the same way:

| Block | Family | What it is |
| --- | --- | --- |
| `SwissStandingsTable` | tables | A Swiss tournament's standings (`Tournament`, `lib/tournament.ts`) as a `StandingsTable`: the title before the name and the federation after it, the rating, a result per round named by its round, colour and opponent, the points, and the tie-breaks the tournament was ranked by (Buchholz, Sonneborn-Berger). `*` is an unfinished game, a dash a round the file holds no game of. |
| `RoundRobinCrossTable` | tables | A round robin's crosstable (`Tournament` ranked with `ROUND_ROBIN_TIE_BREAKS`) as a `CrossTable`: every game between two players in round order (`gamesBetween`) — two in a double round robin — then the points and Sonneborn-Berger. |
| `KnockoutBracket` | tables | A knockout's bracket (`Knockout`, `lib/knockout.ts`, CTA-128) as a `Bracket`: a column per round, a box per match — each side's title, name and score (tiebreak games counted; a team knockout's legs won, its board points muted beside them), the side that went through marked and said in words. A plain knockout's last rounds are named as they halve to the final; a double elimination is two brackets, the winners' over the losers', each named. |
| `MatchTable` | tables | A match between two players (`Match`, `lib/match.ts`, CTA-128) as a `StandingsTable`: two rows, the leader first, a column per game — the result for its row's player, read with the game, the colour and the opponent — and the score, halves as `½`. |
| `TeamStandingsTable` | tables | A team tournament's standings (`TeamTournament`, `lib/teamTournament.ts`, CTA-128) as a `StandingsTable`: a row per team, its flag where its players share a federation, a round's cell its board points in that match (`ResultMark`'s own `glyph`), toned as the match went and read with the opponent and the score both ways, then the match points and the board points it is ranked by. |
| `ParticipantsTable` | tables | A tournament's players (`Participant`, `lib/tournamentParticipants.ts`, CTA-142) as a sortable `DataTable`: the standings' rank, the player (title chip, name — a link to their games — and flag), a team event's team, the rating, the points, the games, W / D / L and the performance (a dash where none). The Library's tournament view's Participants tab. |
| `ArenaStandingsTable` | tables | An arena's standings (`Arena`, `lib/arena.ts`, CTA-204) as a `DataTable`, drawn as the arena was scored (Lichess arena points or game points): the rank, the player (the row's header — title chip, name a link to their games, flag), the rating, the **score sheet** (every game's score in the order played, each a link to its game; on fire on the theme's warning fill, berserk a bolt, each read by its words), the points, the games and the performance; a legend of the marks it shows. The Library's tournament view's Info tab for an Arena or a Lichess arena. |
| `TopPlayers` | panels | A tournament's standouts under the heading "Statistics" (`TopPlayers`, `topPlayersOf`, CTA-142): the best score, performance, most wins and longest unbeaten run, a card each naming the player and the figure; one no one reached left out. The tournament view's Participants tab puts it in the right-hand panel. |
| `TeamRosters` | lists | A team event's teams (`TeamRoster`: `teamTournamentOf`'s standing and `teamPlayersOf`'s names, CTA-142) as lines, one on top of the next — narrow enough for a side panel: each team's flag, name, and its match and board points at the line's end (abbreviated, read in full), its players small under it — a titled one's title the same chip before their name as the Participants table shows (`titleBadgeOf`, CTA-164) — every name a link. |
| `CollectionSource` | cards | Where a collection's games come from (`CollectionSources`, CTA-233): their `Source…` tags under a "Source" heading as a `KeyValueList` — PGN's tags labelled in their order (title, publisher, date, version, edition, quality, link), any other by its name, dates pinned LTR, a `SourceLink` web address a link (new tab) — several sources a list, each with its games, and the games naming none counted. The Library collection page's General, at the panel's foot under the event card or the facts (`collectionSourcesOf` over the rows). |
| `TournamentInfo` | cards | A tournament's event at a glance (`TournamentFacts`, CTA-142): the reader's description, then the type, event, site, dates, rounds and counts its games give, as a `KeyValueList` under its own heading. The Library's tournament view's Info tab. |
| `GradedLines` | panels | The Accuracy Trainer (CTA-238): a graded position — a headline (the best move found, *N of the top M*, none, or a pass) over the engine's lines as the tree has them, best first (rank, move — the game's marked —, eval, loss in centipawns), each suggestion's verdict (Best, Good, the computer analysis's Inaccuracy / Mistake / Blunder) on its line, and a suggestion none of the lines has after them, *outside the top N*, its loss a bound (`≥`) — `lib/accuracyTrainer.ts`'s `TrainingPosition` and `PositionGrade`. |
| `AccuracySessionReport` | panels | The Accuracy Trainer (CTA-238): a session's summary — positions answered and passed, the best-move and top-move rates, the average loss of the reader's best suggestion, every suggestion's inaccuracies / mistakes / blunders / outside the top N (`SessionSummary`) — then every position in game order (its move a button back to it, the game's move, line 1, the reader's moves, the loss, a result chip). |
| `AccuracyTrainerDetails` | panels | The Accuracy Trainer (CTA-238): an exercise's own panel beside its board, in the main menu's place (`BoardLeftPanel`, `keepShell`) — the game loaded as its heading, the session's Case linked, then tabs: **Your moves** (a trained position, named: being answered, the reader's moves in their order, each moved up or down or deleted; checked, every one of the engine's lines with the reader's moves marked — *Yours #n*, *In place*, the verdict — the top N closed by a bolder line, the reader's moves outside the lines after it; waiting for the engine; not answered yet; none) and **Settings** (*Moves to find*, locked while a session runs; *Show next-move arrows*; *Use the engine*). |

Every tournament block shows a player's **title as a chip** — a
`LabelChip` in its tone (GM and WGM gold, IM and WIM blue, FM and WFM
green, CM and WCM purple, any other title the primary colour), read in full
("Grandmaster") — and the **federation as a flag** (`Flag`, from the
`WhiteCountry` / `BlackCountry` tag through `lib/federations.ts`, named in the
reader's language), the tag's letters its fallback where there is no flag
(CTA-128, `blocks/tables/tournamentTable.ts`: `titleBadgeOf`,
`federationFlag`, `playerMarks`). And every table among them takes the
optional `paging` its pattern does. The Swiss standings, the crosstable and
the match table also take optional `playerLink(player)` and `gameLink(game)`
(`TournamentLinks`): a name, and each result, as a link — the Blog's
`<CollectionTournamentTable>` sends them into a Library collection. So do
`KnockoutBracket` (`playerLink`, and `gameLink` — each match's games, a team
match's legs, as a row of links under it, `Bracket`'s `games`) and
`TeamStandingsTable` (`teamLink`, and `gameLink` — a round's match to its
first board), for `<CollectionKnockoutBracket>`,
`<CollectionDoubleEliminationBracket>` and `<CollectionTeamStandingsTable>`.

How a module migrates — the order of work, what each old pattern became, the
findings — is [`migration.md`](./migration.md).

A block's words: `FolderTree` takes them as props (a `labels` object), so the
gallery shows them on fixtures and no catalog key is added for a dev-only
demo — as do the blocks several modules share (the folder dialogs, the saved
lists, `ChangesStrip` through a `labelKey`). A block that one module alone
uses may read the catalogs (`useTranslation`) instead — its words are the
app's; every CTA-109 block does.

A block's test ids: a **table** block takes the screen's `testId` as its
root, as `DataTable` does; a **form, panel or dialog** block takes it as the
prefix of every id it sets (`mask` → `mask-editor`, `mask-preset-<id>`).

### 5. Screens — `src/views/<module>/`

Read stores and routes, hold state, compose blocks. **The only layer that
knows where data comes from.** A screen's hook (`useLibraryCollections`,
`useTableUrlState` in a screen) belongs here too.

## Where does my component go?

Ask in this order; the first yes decides.

1. **Does it read a store, a route or global state?** → it is a **screen**
   (or a screen's hook). Split its presentational part out as a block.
2. **Does it need a domain type or a `src/lib/` helper** — a game, a
   collection, a folder, a PGN, a result? → a **block**.
3. **Does it compose several base components into a reusable whole**, with no
   domain? → a **pattern**.
4. **Does it wrap one MUI job**, with no domain? → a **base component**.

And:

- **Used by one screen only?** Still a block if it is complex. Blocks exist
  so complex UI can be built and reviewed standalone, not only for reuse.
- **A generic piece a block needs** (a tree, a table) is a pattern first, and
  the block is that pattern over the app's data — `FolderTree` is `TreeView`
  over `GameFolder`s. The design system's own gallery menu is a `TreeView`
  too, which it could not be if the tree were a block.
- **Unsure between pattern and block?** If its demo would need chess data to
  make sense, it is a block.

## The import rules

Each tier imports only the tiers below it. `yarn lint` enforces them
(`no-restricted-imports` in `eslint.config.js`, every message pointing
here); `src/design-system/boundary.test.ts`, `src/blocks/boundary.test.ts` and
`src/views/boundary.test.ts` test each rule through the project's own config —
and `yarn lint` is a **CI gate** (`ci.yml`, CTA-116), so a rule is kept for
every pull request, not only for whoever runs it locally.

| From | May import | Must not import |
| --- | --- | --- |
| `src/design-system/**` | MUI, React, its own modules | `src/views/`, `src/lib/`, `src/blocks/` |
| `src/design-system/components/**` | the above | `src/design-system/patterns/` |
| `src/design-system/patterns/**` | base components (their section `index.ts`) | — (the design system's rule) |
| `src/blocks/**` | every design-system tier, `src/lib/`'s types and pure helpers, other blocks | `src/views/`, a store or database module (`src/lib/*Store.ts`, `*Db.ts`, `idb*.ts`), `react-router`, **the locked MUI atoms** |
| `src/views/**` (screens) | every tier | **the locked MUI atoms** |

**The MUI lock** (CTA-116). A screen and a block build from the design system,
so neither imports an MUI atom the design system wraps — its own dialog stack,
table, tabs, tooltip. `MUI_LOCK` in `eslint.config.js` lists them, and each
message names what to use instead:

| Locked (`@mui/material/…`) | Use |
| --- | --- |
| `Dialog`, `DialogTitle`, `DialogContent`, `DialogActions` | `BaseDialog`, `ConfirmDialog`, `DeleteManyDialog`, `FormDialog`, `ProgressDialog`, `FullScreenDialog` |
| `Table`, `TableHead`, `TableBody`, `TableRow`, `TableCell`, `TableContainer`, `TableFooter`, `TableSortLabel`, `TablePagination` | `DataTable` (pattern), or a block over it |
| `Tabs`, `Tab` | `PanelTabs` |
| `Switch` | `SwitchField` |
| `Snackbar`, `SnackbarContent` | `useSnackbar()` |
| `Alert`, `AlertTitle` | `InlineAlert` |
| `Tooltip` | `IconAction` (an icon), `HintButton` (a text button) |
| `ToggleButtonGroup`, `ToggleButton` | `SideToggle`, `ViewToggle` |
| `Breadcrumbs` | `Breadcrumbs` |
| `Menu`, `MenuItem` | `AnchoredMenu`, `ContextMenu` |
| `Pagination` | `TablePager` |
| `Slider` | `SliderField` |
| `Autocomplete` | `SelectAutocomplete`, `ChipsAutocomplete` |

Both spellings are caught, `import Dialog from "@mui/material/Dialog"` and
`import { Dialog } from "@mui/material"`. `src/design-system/` is exempt — it is
what wraps them. `DialogContentText` is not locked: it is a dialog body's
secondary text (a `ConfirmDialog`'s own `message` is one), not a dialog.

**A job no component does yet** is a deliberate exception: the import is
disabled on its own line with its reason —
`// eslint-disable-next-line no-restricted-imports -- migration.md §4.4: …` —
and listed in [`migration.md`](./migration.md#44-left-hand-written-and-why)
(`src/views/boundary.test.ts` holds that list, its count and the reasons to
the source). Prefer a component: the exceptions are five imports in four files.

The one exception inside the design system: `useTableUrlState`, a base
component, reads the URL through `react-router`'s `useSearchParams` — a
screen calls it and hands its answer to a table.

**Import from an index.** A screen imports a base component from its
section's `index.ts`, a pattern from its section's `index.ts`, a block from
its family's `index.ts` — never a component's own file.

## The folder layout

```
src/design-system/
  components/
    sections.ts                     SECTIONS — the base tier's registry, the gallery's order
    <section>/index.ts              the section's public surface
    <section>/<Component>/
      <Component>.tsx               the component
      <Component>.test.tsx          its tests
      <Component>.gallery.tsx       its demos — one per variation
      index.ts                      re-exported by the section's index
  patterns/
    sections.ts                     PATTERN_SECTIONS
    <section>/index.ts
    <section>/<Pattern>/            the same four files
src/blocks/
  families.ts                       BLOCK_FAMILIES
  <family>/index.ts                 the family's public surface
  <family>/<Block>/
    <Block>.tsx  <Block>.test.tsx  <Block>.gallery.tsx  index.ts
    fixtures.ts                     sample data typed with src/lib/'s types —
                                    imported ONLY by the gallery and the test
```

A folder may hold more (a pure helper beside the component —
`DataTable/columns.ts`, `FolderTree/folderTreeNodes.ts` — so the component
file exports components only). The conventions tests check the layout and
the house rules of every tier (`src/test/tierConventions.ts`, called by each
tier's `conventions.test.ts`): the files, the index re-export, a `testId`, no
colour literal, no physical side, no literal `transition`, a `:focus-visible`
that spreads the theme's ring, a gallery with a demo, **its entry in the docs**
(CTA-117 — a heading in its section's doc, or a row of the Blocks table above)
and a block's fixtures imported only by its gallery and test.

**Adding one:** the checklist to work down, from the tier to the pull request,
is [`adding-a-component.md`](./adding-a-component.md). The shape of each entry:

| To add | Do |
| --- | --- |
| a base component | its folder in its section, a re-export from the section's `index.ts`, an entry in `sections/<section>.md` (a `## Name` heading) |
| a pattern | its folder in its pattern section (a new section: a folder, its `index.ts`, an entry in `patterns/sections.ts`), a re-export, `sections/patterns/<section>.md` |
| a block | its folder in its family (a new family: an entry in `blocks/families.ts`; the folder and its `index.ts` come with the first block), a re-export, `fixtures.ts`, and a line in the Blocks table above |

## The component rules

Every tier keeps [the base components' rules](./README.md#the-component-rules):
text as props, a `testId` its parts' ids derive from, colours only from the
theme, RTL-safe (logical properties, `dir="ltr"` on tokens, `dir="auto"` on a
reader's words), variations as optional props each with its own demo, a
`LinkTarget` for anything that goes somewhere. A block adds: **no store, no
IndexedDB, no router**, and **fixtures typed with `src/lib/`'s own types**, so a
change to a data shape breaks the fixtures at compile time.

## Accessibility

The target is **WCAG 2.2 AA** ([`ACCESSIBILITY.md`](../../ACCESSIBILITY.md),
CTA-111), and the design system carries it: a component, a pattern or a block
that keeps these rules gives every screen composed from it the same.

| Rule | What it means | Enforced by |
| --- | --- | --- |
| **Named** | Every control has an accessible name from its props: an icon action's `label`, a dialog's `title`, a field's `label`, a table's `ariaLabel` or `caption`, a tree's, a list's and a progress bar's `ariaLabel` / `label`, a column's `header`, a row's pick by its row ("Pick game 12"). A name is a required prop typed `VisibleLabel` (`components/a11y.ts` — any words, never `null`, `undefined` or a boolean) or `string`; a name that comes with an optional part is required with it (`DataTable`'s `rowActions` with `actionsLabel`). | `tsc -b` (`@ts-expect-error` cases in `components/a11y.test.tsx`, `TableFrame.test.tsx`, `DataTable.test.tsx`); axe |
| **Explained** (CTA-112) | A composite widget's keys are told, not guessed: `TreeView` takes a required `hint`, `DataTable` one with a sort or picks — words read with the widget (`aria-describedby`), out of sight (`visuallyHidden`, `components/a11y.ts`). Tabs name their panels: `BoardPanel` links each tab and panel; `PanelTabs` takes an `idPrefix` and the host marks its panel with `tabPanelProps`. | `tsc -b` (`@ts-expect-error` in `TreeView.test.tsx`, `DataTable.test.tsx`); `toHaveAccessibleDescription` / `toHaveAccessibleName` in their tests |
| **Structured** (CTA-112) | A heading is a heading because it says so: the theme writes a `subtitle1` / `subtitle2` as a paragraph (MUI's default is `h6`), so a bold line in a card or a panel never lands in a page's outline; a title that is a section's heading takes `component="h2"` (or `h3` under one). The page's `h1` is the shell's, or a screen's visible title (`useOwnPageHeading`). | `theme/accessibility.test.tsx`; `src/pageOutline.test.tsx` |
| **Announced** | An outcome is a `status`, an error an `alert` (`StatusText`, the snackbar by its severity); "reading…" is a `status`; a region being filled is `aria-busy` (a table, a busy button); a progress bar is named and says its value — or none, while indeterminate. A spinner beside words is decoration (`aria-hidden`). | the components' tests, by role |
| **Operable by keyboard** | Everything a pointer can do: every interactive part is a real button, link or input (or takes `tabIndex` and Enter / Space itself, as a clickable table row does), in a sensible order, with no trap. A composite widget follows its WAI-ARIA pattern — `TreeView` the tree's (one tab stop, arrows, Home / End, → / ← mirrored under RTL); a dialog keeps the focus while open and gives it back to its opener (MUI's modal). A pointer-only shortcut (the tree's chevron) is `aria-hidden` and out of the tab order, its job done by the keyboard another way. | `userEvent` keyboard tests, by role and name |
| **A visible focus** | The theme's focus ring — `focusRingWidth` of the palette's `focusRing`, 3:1 on every surface — on everything focusable: MUI's buttons and the slider draw it; anything else a component makes focusable spreads `theme.mixins.focusRing` under `&:focus-visible`. | `theme/accessibility.test.tsx`; `themes/contrast.test.ts` |
| **Big enough to hit** | Every pointer target at least 24 × 24 CSS px (WCAG 2.5.8): the theme floors every icon button at `MIN_TARGET_PX`; never shrink a control's padding below it. | `theme/accessibility.test.tsx` |
| **Readable** | Colours only from the theme, whose tokens are measured: text 4.5:1, a control's border and the focus ring 3:1. A colour a component needs that no token has is a new token, not a literal. | `themes/contrast.test.ts`; `tierConventions.ts` (no literal) |
| **Still** | Motion through the theme — `theme.transitions.create(…)`, never a literal `transition` — so a reader who asks for reduced motion gets none. | `theme/accessibility.test.tsx` |
| **Clean under axe** | Every gallery demo passes axe's WCAG 2.2 A / AA rules under every theme, scheme and direction — so every state a demo shows is audited. jsdom cannot measure colour or size, so those two rules are off there; the rows above cover them, and the next row measures them. | the gallery's axe matrix, `src/test/galleryMatrix/` (`expectNoAxeViolations`, `src/test/axe.ts`) — `yarn test:gallery`, nightly (CTA-123) |
| **Checked in a browser** (CTA-116) | Every shipped route, seeded, passes axe's WCAG 2.2 A / AA rules **with colour contrast and target size on**, with no console error, the document reading right to left under Hebrew and every board left to right — under every theme × scheme × language, against the production build. The known gaps are one allowlist that fails when an entry stops occurring. Reflow at 320 px is measured. | `yarn test:a11y` (`e2e/a11y/`, [`browser-a11y.md`](../../.claude/rules/browser-a11y.md)) |
| **Linted** | `eslint-plugin-jsx-a11y`'s recommended rules. A rule disabled on a line says why, and `ACCESSIBILITY.md` lists it. | `yarn lint` |

A test asks for a component **as a screen reader would**: `getByRole(…, { name })`
or `getByLabelText`, not only its test id, and drives it with `userEvent`'s
keyboard.

## Build standalone first

A complex component is built **in the gallery, before a screen uses it**:

1. **Build it with fixtures.** Write the block (or pattern) and its
   `fixtures.ts`; its `*.gallery.tsx` shows it on them. It appears in
   `/dev/design` with no registration.
2. **Review every state** in the gallery, a demo each: loading, empty, no
   match, one row, 10,000 rows, an unreadable row, long names, RTL (the
   direction switch, with Hebrew names in a demo) — under **every theme**, light
   and dark (the gallery's switches) — and from the keyboard alone. The
   every-theme tests render every demo under every theme, scheme and direction
   and fail on a console error or an axe violation ([Accessibility](#accessibility)).
3. **Then wire the screen**: the screen reads the store and the route, holds
   the state, and passes it all in.

## The gallery — one catalogue of every tier

`/dev/design` (dev-only, [README.md](./README.md#the-gallery)): the menu down
the left is a **collapsible tree** — **tier → section → component** (Base,
Patterns, Blocks) — and **every component is a page of its own**:

| Tier | Page |
| --- | --- |
| Base | `/dev/design/<section>/<Component>` (`/dev/design/tables/TableFrame`) |
| Patterns | `/dev/design/patterns/<section>/<Pattern>` (`/dev/design/patterns/tables/DataTable`) |
| Blocks | `/dev/design/blocks/<family>/<Block>` (`/dev/design/blocks/trees/FolderTree`) |

A section's own address (`/dev/design/tables`, CTA-107's pages) lands on its
first component. The chain above the page on screen opens with it; the
reader opens and closes the rest. The design system cannot import a block,
so `DesignGallery` takes extra tiers as a prop: the dev route
(`src/views/dev/design/Main.tsx`) finds `src/blocks/**/*.gallery.tsx` with
`import.meta.glob` and hands them in as Blocks.

## Naming

- A component is named for **what it is**, in PascalCase, its folder and file
  the same name: `DataTable/DataTable.tsx`.
- A block is named for **its data and its kind**: `PlayedGamesTable`,
  `CollectionGamesTable`, `FolderTree`, `PgnImportForm` — the family is the
  kind (`…Table` in `tables/`, `…Tree` in `trees/`).
- A pattern is named for its shape alone, with no domain word: `DataTable`,
  `TreeView`, `FilterBar`.
- Test ids: the component takes `testId` and derives its parts from it
  (`${testId}-row-${id}`), so a screen's tests keep their ids when it
  migrates.

## Where `src/views/shared/` fits

`src/views/shared/` predates the tiers. Its **chess-aware compositions** —
`FolderTreeTable`, the saved-list pieces, the folder dialogs, the Engine and
Export tabs, `GameInfo`, `CurrentOpening`, the inputs — were blocks in all
but name, and **moved into `src/blocks/`** (CTA-109, CTA-113). What is left
there is **the board's pieces and hooks** — `EvalBar`, `CapturedPieces`,
`PlayerPlate`, `PromotionPicker`, `EngineBoardSquare`, `MoveList`,
`VariationLine`, `BoardControls`, `BestVariations`, `NextMovesBar`, the
position editor, `useCurrentOpening`, `useStoreRead` — which belong to the
board core ([`chessboard.md`](../../.claude/rules/chessboard.md) §9), not to
the hierarchy; they are built of base components where they have chrome. The
sidebar (`src/views/main/Sidebar.tsx`) is the app shell's and stays
hand-written: `TreeView`'s keys are a tree's, the sidebar's a page's links
([`migration.md`](./migration.md#44-left-hand-written-and-why)).
