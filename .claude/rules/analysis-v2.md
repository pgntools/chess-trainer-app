---
paths:
  - "src/views/analysisV2/**"
  - "src/lib/analysisProjects*"
  - "src/lib/analysisProjectStore*"
  - "src/lib/analysisProjectFolderStore*"
  - "src/lib/analysisCaseStore*"
  - "src/lib/analysisProjectsDb.ts"
  - "src/lib/exportCategories.ts"
  - "src/blocks/tables/ProjectsTable/**"
  - "src/blocks/trees/CaseSiblings/**"
  - "src/blocks/panels/CaseDetails/**"
  - "src/lib/analysisProjectRows.ts"
  - "src/blocks/tables/CasesTable/**"
  - "src/lib/analysisCaseRows.ts"
  - "src/blocks/dialogs/NewCaseDialog/**"
  - "src/blocks/dialogs/NewProjectDialog/**"
  - "src/blocks/dialogs/ProjectPickerDialog/**"
  - "src/lib/jobsV2*"
  - "src/lib/jobV2Store*"
  - "src/lib/jobV2Runner*"
  - "src/lib/analysisProjectLinkStore*"
  - "src/blocks/forms/JobTargetFields/**"
  - "src/blocks/lists/CaseJobs/**"
  - "src/blocks/lists/ProjectLinks/**"
---

# Analysis V2 — Projects and Cases (CTA-186), Jobs V2 and linked Projects (CTA-188)

A new analysis module, part of renewing the codebase: the reader's analysis
organised into **Projects** filed in nested **folders**, each Project holding
**Cases** — a **Game** or a **Position** — and each Case its own board,
**autosaved** as the reader works. lichess's Studies and Chapters are the UX
reference. The legacy Analysis module (`/tools/analysis`,
`views/tools/analysis/`, `chessapp.analyses` — [`analysis-board.md`](./analysis-board.md))
stays untouched and is the code and UI reference; it will be removed in a
later issue, so **V2 imports nothing from `views/tools/analysis/`**.

```
folders (nested) ──▶ Projects ──▶ Cases (game | position) ──▶ the Case's board
                        │  ▲              │
                        └──┘ links        └──▶ Jobs V2 (a Case's computer analysis) ──▶ new Cases | a linked Project | the Case itself
```

**Jobs V2** (CTA-188, §6) are the module's own background jobs — a Case's
computer analysis, a clone of the legacy Jobs ([`jobs.md`](./jobs.md)), never
sharing its store, runner or screen; **links** (§7) are a directed
many-to-many relation between Projects.

---

## 0. Where to look

| Path | What lives there |
| --- | --- |
| `src/lib/analysisProjects.ts` | **The records**, pure: `ProjectFolder` (a `GameFolder`, `lib/savedGameFolders.ts`'s model and reads), `AnalysisProject`, `AnalysisCase` and its `AnalysisCaseSource`; the normalisers `projectFolderFrom`, `analysisProjectFrom`, `analysisCaseFrom`; the constructors `gameCaseOf`, `positionCaseOfFen`, `positionCaseOfGame`, `copiedCase`; `caseStateOf` / `sameCaseState` (the autosave's state and its idempotency); `caseDerivedName`, `gameCaseDerivedName`; `projectsHere`, `projectsUnder`, `casesOf`, `caseCountsOf`; the caps (`MAX_PROJECT_FOLDERS` 100, `MAX_ANALYSIS_PROJECTS` 1,000, `MAX_ANALYSIS_CASES` 10,000). |
| `src/lib/analysisProjectsDb.ts` | The `chessapp.analysisProjects` database, **version 2** (CTA-188): object stores `folders`, `projects`, `cases`, `jobs` (Jobs V2) and `projectLinks`, one `BroadcastChannel`. |
| `src/lib/jobsV2.ts`, `jobV2Store.ts`, `jobV2Runner.ts` | **Jobs V2** (CTA-188, §6): the record (`JobV2`, `jobV2Of`, `jobV2From`, `jobV2AnalysisOf` / `jobV2MergedPgn` — the merge into a Case, `jobV2OfCase`, `jobV2OutputName`), the store (`enqueueJobV2`, `pauseJobV2`, `cancelJobV2`, `resumeJobV2`, `removeJobV2`, `removeJobsV2Of`, `interruptRunningJobsV2`, `MAX_JOBS_V2` 100) and the runner (`createJobV2Runner`, `startJobV2Runner` / `stopJobV2Runner`, its lock `chessapp.analysisProjects.jobs.runner`). V1's pure parts reused: `lib/jobs.ts`'s statuses, positions, checkpoint reader and progress, `lib/jobLiveAnalysis.ts` (its argument widened to `LiveAnalysisJob`). |
| `src/lib/analysisProjectLinkStore.ts` | **The links between Projects** (CTA-188, §7): `linkAnalysisProjects`, `unlinkAnalysisProjects`, `removeLinksOfProjects`, `importProjectLinks`; the record `ProjectLink` and `projectLinksOf` in `analysisProjects.ts`. |
| `src/lib/analysisProjectFolderStore.ts`, `analysisProjectStore.ts`, `analysisCaseStore.ts` | **The stores** over `idbRecordStore` ([`database.md`](./database.md) §3): folders oldest first, Projects and Cases newest first; every operation a promise of `undefined` or `"storage"` / `"too-many"`. |
| `src/lib/analysisProjectsEnabled.ts` | **The flag**: `ANALYSIS_PROJECTS_ENABLED = import.meta.env.DEV` — the module's Export / Import category in Settings — and **`analysisProjectStores()`**, the one way Settings reaches the three stores: dynamic imports under an *inline* `if (import.meta.env.DEV)`, `undefined` in a production build. Inline, because a dynamic import behind an imported constant is still followed by the bundler and its chunks emitted (orphaned) — one in a branch dead as written is not. Shipping the module is these two conditions (and §8). |
| `src/lib/exportCategories.ts` | `OFFERED_EXPORT_CATEGORIES` — the Export / Import categories this build offers (Analysis V2's only with the flag); apart from `lib/dataExport.ts`, which Node reads too (the browser pass's seed). |
| `src/views/analysisV2/` | **The screens**: `ProjectsBrowser.tsx` (`/analysis`), `ProjectScreen.tsx` (`/analysis/projects/<id>`; its links, §7), `CaseWorkspace.tsx` (`/analysis/projects/<id>/cases/<caseId>`; its `CaseBoard` the board), each behind a layout-only `…Main.tsx`; `useAnalysisProjects.ts` (the store bindings — `useJobsV2`, `useProjectLinks` too), `paths.ts` (the addresses — `jobsV2Path`). `jobs/` (CTA-188): `JobsV2Screen.tsx` (`/analysis/jobs`, behind `JobsV2Main.tsx`), `JobV2Reports.tsx` (a done job's report, another's results so far), `NewJobV2.tsx` (the popup's screen side), `JobsV2Shell.tsx` (`JobV2Runner`, `JobsV2Indicator` — the shell's, loaded lazily). |
| `src/blocks/tables/ProjectsTable/` (its rows `lib/analysisProjectRows.ts`), `src/blocks/trees/CaseSiblings/`, `src/blocks/panels/CaseDetails/`, `src/blocks/tables/CasesTable/` (`caseDisplayName`; its rows `lib/analysisCaseRows.ts`), `src/blocks/dialogs/NewProjectDialog/`, `NewCaseDialog/`, `ProjectPickerDialog/` (and the Library's `CollectionImportDialog`, `choiceOnly`); since CTA-188 `src/blocks/forms/JobTargetFields/`, `src/blocks/lists/CaseJobs/`, `src/blocks/lists/ProjectLinks/` | The blocks, built in the gallery on fixtures first ([`docs/design/hierarchy.md`](../../docs/design/hierarchy.md)). The folder dialogs (`FolderNameDialog`, `FolderMoveDialog`) and `FolderActions` are the app's own, reused — and so, for Jobs V2, V1's `JobsTable`, `JobSummary` (generic over a job's fields), `NewJobDialog` and `ComputerAnalysisForm` (optional props: the engine and preset selects, one variant, a section before the form), each unchanged without them. |
| `src/views/board/core/useAnalysisSession.ts`, `useTreeNavigation.ts`, `src/views/shared/nextMoveArrows.ts`, `src/views/shared/AnalysisEvalReport.tsx` | **Moved out of the legacy module** (CTA-186) so that its removal takes nothing V2 needs — the session the Case's board composes, the core's navigation, the next-move arrows the explorer draws, the eval graph and report the Case view's Graph tab shows. The legacy screens import them from here. |
| Tests | `src/lib/analysisProjects.test.ts` (records), `src/lib/analysisProjectStores.test.ts` (the stores — the links, a delete's jobs and links, the database's upgrade from version 1, CTA-188), `src/lib/jobsV2.test.ts`, `jobV2Store.test.ts`, `jobV2Runner.test.ts` (Jobs V2), `src/views/analysisV2/jobs/JobsV2.test.tsx` (the Case's Jobs tab and popup, a merge into an open Case, a Project's links, the Jobs V2 view), `JobsV2Shell.test.tsx` (the indicator), the blocks' own, `src/views/analysisV2/AnalysisV2.test.tsx` (the three screens over the real stores), `src/lib/dataExport.test.ts` / `dataImport.test.ts` / `src/views/settings/ImportTab.test.tsx` (the category), `src/views/board/boards.test.tsx` and `panelPropagation.test.tsx` (the Case's board in the set), `src/views/legal/legalDocuments.test.ts` (the dev-only database). |

Locale keys: `analysisV2.*` (`browser`, `folder`, `project`, `case`,
`newCase`, `workspace`; `jobs`, `links` — CTA-188), `nav.folders.analysisV2`, `nav.analysisProjects`,
`nav.analysisJobs`, `pages.analysisProjects` / `analysisProject` / `analysisCase` / `analysisJobs`, the
New Job form's additions under `computerAnalysis.form.*` (`engineSelect`, `preset`, `presetHelp`,
`variant`, `variantHelpSingle`), and the
category's `settings.export.categories.analysisProjects` /
`settings.import.top.analysisProjects` — in both catalogs. `options.id` is
`analysis-case`; the test ids are `analysis-v2-*` (the lists and the Cases table) and
`analysis-case-*` (the board), `analysis-case-jobs-*` and `analysis-case-new-job-*` (the Case's
Jobs tab and popup), `analysis-v2-jobs-*` (the Jobs V2 view and indicator).

---

## 1. Dev-only while it is built

- **Routes**: four entries in `routes.tsx`'s `devRoutes`, each a
  `React.lazy` import behind `import.meta.env.DEV`, so a production build has
  no route and no chunk of it. The browser and a Project are
  `FULL_WIDTH_ROUTE`s; the Case's board and Jobs V2 (`/analysis/jobs`,
  CTA-188 — the list in the square, a job in the aside) are board routes.
- **Sidebar**: its own folder, *Analysis V2* (`analysis-v2`), with two
  entries, *Projects* (`/analysis`) and *Jobs* (`/analysis/jobs`, CTA-188) —
  spreads in `navFolders()` / `navItems()` gated on `import.meta.env.DEV`.
- **The shell's Jobs V2 runner and indicator** (CTA-188): `Layout.tsx` loads
  `views/analysisV2/jobs/JobsV2Shell.tsx` with `lazy` behind an **inline**
  `import.meta.env.DEV`, so a production build emits no chunk of it — the
  runner beside V1's `JobRunner`, the indicator beside V1's `JobsIndicator`
  (both untouched).
- **Export / Import**: the `analysisProjects` category exists in the format,
  but only a build with the flag offers it (`lib/exportCategories.ts`), reads
  its stores (`analysisProjectStores()` — `lib/dataExportSource.ts`,
  `lib/dataImportTarget.ts`, `views/settings/useAnalysisProjectsCount.ts`)
  or reads its file out of a zip (`readImport`'s `categories`).
- **Not yet**: a pre-rendered page, an e2e a11y route, the legal pages'
  mention of `chessapp.analysisProjects` — `legalDocuments.test.ts` fails the
  day the flag stops being `import.meta.env.DEV`, to say the database must
  join the pages then.
- **Verify** after `yarn build`: `grep -rlE "analysisProjectStore|analysisCaseStore|chessapp\.analysisProjects|analysis-case|/analysis/projects|ProjectsBrowser|CaseWorkspace|jobV2Store|jobV2Runner|analysisProjectLinkStore|/analysis/jobs|JobsV2|analysis-v2-jobs" dist/`
  finds nothing — no route, chunk, store, runner, lock or database name. The format's own
  code (`dataExport.ts` / `dataImport.ts`, the file name
  `analysis-projects.json`, its `projectLinks` field and the stores' method
  names it calls, `loadProjectLinks` / `importProjectLinks`) and the catalogs' words are in the main chunk.

---

## 2. The model

- **A folder** holds sub-folders and Projects — never a Case. It is the app's
  nested-folder model: a dangling parent reads as the top level, a cycle is
  cut on read, and a move into its own subtree is refused on write.
- **A Project** is a name (required when it is made — a blank one makes
  nothing) and the folder it is filed in (`null` the top level).
- **A Case** is
  - its **type**, `game` or `position`, fixed when it is made — "Position" is
    what it is, not what it was read from;
  - its **source**, fixed too: `{ kind: "pgn", pgn, startPath, fen }` — one
    game as `treeToPgn(parsePgnTree(…))` writes it (side lines, comments,
    NAGs, `[%eval]`s kept), `startPath` the SAN line to where the Case begins
    (`[]` for a Game) — or `{ kind: "fen", fen }`; `fen` is the position it
    begins on in both;
  - **the analysis on it**: `pgn` (the whole tree), `path` (where the reader
    stands, as SAN from the start — `sanPathTo` / `nodeAtSanPath`; node ids do
    not survive a PGN round trip), `orientation`, and `display` — how its
    board draws (`CaseDisplay`: the arrows on or off, their width source and
    palette, the move marks, the eval bar, the engine's lines; a record from
    before reads the defaults);
  - its **name**, optional: `""` is derived — a Game from its tags (*White –
    Black, Event, year*, the parts the tags name), a Position from its side to
    move and move number ("Black to move, move 41"), in the reader's language
    (`caseDisplayName`).
- **To change a Case's type or source**, the reader duplicates it or makes a
  new one; rename, move to another Project, duplicate and delete are the
  operations.
- **The engine search settings stay global** (the top bar's Engine menu); a
  Case keeps none of its own.

---

## 3. The screens

### 3.1 The Projects browser — `/analysis` (`?folder=<id>`)

The folder on screen (`?folder=`, everything at the top level) as **one tree
table** (`ProjectsTable`, the legacy saved analyses' — CTA-144): its trail
(`Breadcrumbs`, links), then its folders first at every level, each **opened
in place** by its chevron or a click on its row (its name a link into it, how
many Projects are under it), and its Projects (the name a link to its Cases,
how many it holds, when it changed). Name, Cases and Updated each sort (`?sort=`
/ `?dir=`, Name by default; folders by name, or by when they changed under
Updated); a **words box** (`?q=`) keeps the Projects and folders whose name
holds every word — everything in a matching folder with it — and opens the
folders above a match; paged past 25 (`projectTreeRows` over
`lib/folderTreeRows.ts`). Which folders the reader opened is the screen's
state. **New folder** and
**New project** in the header; a new Project opens at once.

**New project** is a popup (`NewProjectDialog`): a name (required — picking a
file with none typed names it after the file) and, optionally, a `.pgn`
whose games become its Cases (`collectionImportFileOf` reads it):

- **no file** — an empty Project;
- **one game** — a Project with that game as its one Game Case;
- **several** — the Library's import popup opens on them
  (`CollectionImportDialog` with `choiceOnly`: what came in, the Elo / date /
  player filters and the count, no *Split by event*, no tournament mark),
  and **Create project** makes a Game Case per game kept, in file order;
  Cancel goes back to the name.

All or nothing: Cases the store refuses take the Project back, and the
popup says why; a game that will not parse is left out.

| On | Rename | Move | Duplicate | Delete |
| --- | --- | --- | --- | --- |
| a folder | `FolderNameDialog` | `FolderMoveDialog`, its subtree left out | — | a confirmation with a choice: **keep** what it holds (sub-folders and Projects move up a level, `removeProjectFolder`) or **delete it too** (the subtree, its Projects and their Cases, `removeProjectFolderDeep`), naming how many Projects |
| a Project | `FolderNameDialog` | `FolderMoveDialog` | named "‹name› (copy)", beside it, **with its Cases** (`duplicateAnalysisProject`) | a confirmation that names how many Cases go with it |

A refused write is an `InlineAlert` under the header. A `?folder=` that names
no folder says so, with a way back.

### 3.2 A Project — `/analysis/projects/<id>`

Its Cases as a **table** (`CasesTable`, rows from `lib/analysisCaseRows.ts`):
Name (the link to its board) and Type, then the games table's columns —
White, Elo, Black, Elo, Result, Date, Event, Round, ECO, Opening, Moves, read
off a Game's tags (**blank for a Position**) — and Updated. Every header
sorts (a blank last either way, ties newest first); the sort and the page
are the URL's (`useTableUrlState`: `?sort=`, `?dir=`, `?page=`, `?rows=`;
Updated, newest first, by default), paged past 25. A **words box** over it
(`?q=`, `filteredCaseRows`) keeps the rows holding every word typed — the
name, the type, a Game's players, Elos, result, date, event, round, ECO and
opening — with a no-match row and its Clear. **Picks**: a box per row and
select-all in the header (over the rows the words leave); the header's
selection bar counts them and deletes them together, asked first
(`DeleteManyDialog`, a failure said in it with the picks kept). **New case** opens `NewCaseDialog`:

- **Game** — a PGN pasted or picked (`PgnInput`); several games show a list
  to pick one from, and *One case per game (N)*, which makes them all.
- **Position** — **from a FEN** (checked as it is typed, `parseFen`) or
  **from a PGN** at a move picked from its mainline (*Start at*), the moves
  before it kept.
- A name, optional (none for one-per-game).

One new Case opens on its board; several stay on the list. A Case is renamed
(`""` gives it back its derived name), moved to another Project
(`ProjectPickerDialog`, its own left out; off while there is no other),
duplicated into this Project or another under a name ("‹name› (copy)"), and
deleted after a confirmation. The route waits for the stores' first read,
then says a Project that is not there.

### 3.3 A Case's board — `/analysis/projects/<id>/cases/<caseId>`

**Composed from the board core** ([`chessboard.md`](./chessboard.md) §9), as
the Analysis Board is: `useAnalysisSession` (the core, the engine — off at the
start, the reader's global search settings — and Play), `useVariationsExplorer`
(the move list, map, comment block, next-move arrows, the PGN's shapes;
editing on, *Play chances…* off), `BoardShell` and its panel — tabs **Moves ·
Map · Settings · Export** (`PgnExportPanel`; **Display** — `CaseDisplayTab`,
the board's state, shown on the left panel's Case view (below) since CTA-186's
last round: the next-move arrows and the move marks on top, then inner
tabs — **Arrows**, the Analysis Board's width source and palette
(`ArrowSettingsFields`), **Engine** — the engine's lines (`BoardPanel`'s
`showVariations`) — and **Accessibility**, the board's accessibility options,
a placeholder for now — all kept with the Case as its `display`, autosaved;
**Settings** is `CaseSettingsTab`: the side the board faces, White / Black
(the Case's orientation), the eval bar (its `display`) and *Write evaluations
into the game* (the session's, as on the Analysis Board)), and the header:
the name, the opening, a refused save (nothing else), Play and the engine's on / off as a
**small switch** labelled with the top bar's Engine icon (`SmartToyRounded`, read as "Engine") — not the other boards' play / pause and options menu
(`BoardEngineControls`), whose choices are the Settings tab here.
`options.id` `analysis-case`.

- **Read once, as it mounts**, from its record: the tree, the node at
  `path`, the orientation. A Game opens at its start facing White (a game does
  not turn the board); a Position faces the side to move (set when it was
  made) — from a PGN, at the move picked, its moves before it on the board.
  The route keys the board by the Case, so another Case is a new board.
- **Autosave, no Save button**: `useAutosave` writes `caseStateOf(…)` — the
  tree as PGN (`core.pgn`, memoised on the tree), the SAN path to the node on
  screen and the orientation — through `saveCaseState` on every change;
  `sameCaseState` makes a state the record holds a no-op (no write, no
  re-order). **No saved / saving status**: the header speaks only when the
  browser refuses a write, in the error colour (a `status` region, mounted
  throughout, so it is announced).
- **Reopening — a reload, another visit — restores** the tree, the move and
  the orientation exactly.
- **The Project's Cases beside the board, in the main menu's place**
  (`CaseSiblings` in the shell's board left panel, `BoardLeftPanel`'s
  `keepShell` — unlike the legacy workspace, **the header and footer stay**,
  and with them the top bar's Engine menu): the Cases as a list of links, the
  open one current, in the **Cases table's order and under its words** — the
  table's `?sort=` / `?dir=` / `?q=` carried into the Case's URL
  (`caseListContextOf`, `paths.ts`) and back by its **Close**, at the head's
  start before the Project's name — the one way back, the board's header has
  none; a words box (writing `?q=`) and previous / next over the list as shown
  (the whole of it when the words leave the open Case out). It does not fold.
  Under the shell's breakpoint it is a drawer, opened from a list button in
  the board's header; the drawer is the route's state, so it outlives a step
  to another Case. Nothing locks it: a Case autosaves.
- **The panel's second screen, the Case's own view** (`CaseDetails`): a row
  of the list picked — the open Case's too — opens that Case with
  `?view=case` (`withCaseView`, `paths.ts`; never carried back to the table),
  and the panel shows the Case — **Back** to the list where the list has
  Close, its name and type, its details in **tabs** — **Info**, the Case's
  PGN tags as saved (`GameInfo`, the Library game board's Info tab; "no
  tags" when it has none), **Graph**, the eval graph and report of the tree
  on the board (`views/shared/AnalysisEvalReport.tsx`, the Analysis Board's
  Evaluations tab — live, a click moves the board; disabled while the tree
  carries no `[%eval]`), **Display**, how the board draws (`CaseDisplayTab`,
  out of the right-hand panel), **Jobs** (CTA-188, §6.4) — and previous / next at
  its foot, which keep the view and its open tab (the screen's state). The
  board draws the left panel (`CaseBoard`'s `leftPanel`, given the tree on
  screen), so the Graph follows it and Display sets it. Back drops
  `?view=` and keeps the rest of the context. A reload keeps the screen.

---

## 4. The store

`chessapp.analysisProjects`, **version 2** (CTA-188 — the upgrade from 1 only
creates `jobs` and `projectLinks`, every folder, Project and Case kept), a database of its own (apart from
`chessapp.analyses`, so the legacy module's removal takes nothing of it) —
[`database.md`](./database.md) §1. Every row is read through its normaliser
(a field an older row lacks reads as its default; a row without its identity
is dropped).

| Store | Order | Cap | Operations |
| --- | --- | --- | --- |
| `folders` | oldest first | 100 | `createProjectFolder`, `renameProjectFolder`, `moveProjectFolder` (never into its subtree), `removeProjectFolder` (keeps the contents: sub-folders re-parent, Projects re-filed up — `refileProjectsIn`), `removeProjectFolderDeep` (the subtree, `removeProjectsInFolders`), `addProjectFolders` (an import's, all or nothing) |
| `projects` | newest first | 1,000 | `createAnalysisProject` (a name required), `renameAnalysisProject`, `moveAnalysisProject`, `duplicateAnalysisProject` (its Cases first, all or nothing), `removeAnalysisProject(s)` (their Cases with them — `removeCasesOfProjects`), `importAnalysisProjects` |
| `cases` | newest first | 10,000 | `addAnalysisCases` (all or nothing), `renameAnalysisCase`, `moveAnalysisCase`, `duplicateAnalysisCase`, `removeAnalysisCases` (their Jobs V2 with them), `saveCaseState` (the autosave, in place — never the tree of a state behind a merge, §6.6), `mergeIntoAnalysisCase` (a Jobs V2 merge, §6.6), `importAnalysisCases` |
| `jobs` (CTA-188) | newest first | 100 (the oldest finished dropped; refused when every one is unfinished) | Jobs V2 (§6.2) |
| `projectLinks` (CTA-188) | oldest first | 10,000 | `linkAnalysisProjects` (no self-link, no pair twice), `unlinkAnalysisProjects`, `removeLinksOfProjects`, `importProjectLinks` (§7) |

A delete runs folder → Projects → Cases → their Jobs V2 → the Projects'
links as writes queued one after another, which is why `src/test/setup.ts`
lets the writes settle five times over. A **Case or Project deleted takes
its Jobs V2** (`removeJobsV2Of`) — a running one is stopped by the runner,
which reads it gone — and **a Project deleted takes its links**.

---

## 5. Export and Import

The `analysisProjects` category ([`import-export.md`](./import-export.md)):
one file, `analysis-projects.json` — `{ folders, projects, links }`: every folder as
its path of names (parents first, empty ones too), every Project as stored
with its `folderPath` and its **Cases** as stored, and — since manifest
version **5** (CTA-188) — the **links** between the Projects as stored (a link
to a Project not exported left out). Version 4 added the file (a v3 zip reads
through the table, its upgrade the stamp alone); version 5 its links (a v4
zip reads with none). Jobs V2 are not exported (as V1's jobs are not —
[`import-export.md`](./import-export.md) §1.1); their results are Cases, which are. On the way
in, folders are matched by their path of names and created where missing;
Projects clash by their folder like the analyses (Merge / Override / Skip, a
folder's own choice over the category's); each Project brings its Cases, each
filed in it; an Override's Projects take their Cases with them; the Projects'
and the Cases' caps both refuse the category. **The links** come after the
Cases: the zip's whose two ends the app holds afterwards (Project ids are
kept by an import), an Override's removed Projects' own links dropped first
(`importProjectLinks`). A build without the module leaves the file unread.

---

## 6. Jobs V2 — a Case's computer analysis (CTA-188)

A **clone** of the legacy Jobs ([`jobs.md`](./jobs.md), CTA-171/173/177/178),
named "Jobs V2" everywhere so the two are never confused. V1 is not modified
(its blocks only gained optional props); **a V1 job and a V2 job may run at
the same time**, each runner with its own lock and engine. Like the rest of
Analysis V2 it imports nothing from `views/tools/analysis/` or `views/jobs/`;
it reuses `lib/jobs.ts`'s pure parts (statuses, `JobPosition`, the checkpoint
reader, `jobProgress`, the `can…` predicates) and `lib/jobLiveAnalysis.ts`.

### 6.1 The record — `lib/jobsV2.ts`

V1's `ComputerAnalysisJob` with these differences:

| Field | What |
| --- | --- |
| `source` | `{ projectId, caseId, name, pgn }` — the Case, its name as shown, its tree **as the board held it when sent**. |
| `options` | `ComputerAnalysisOptions` — the engine (`engine`) and the search **as the popup left it**: depth, move time, Threads, Hash, lines. |
| `preset` | `{ id, name, values }` — the engine's preset the job was given, its values (`presetSentValues`) as they were then. **The runner sends these**, never whatever preset is selected when it runs. |
| `target` | `{ kind: "project", projectId }` (new Cases beside the source), `{ kind: "linked", projectId }` (new Cases in a linked Project), or `{ kind: "case" }` (merged into the source Case — **one** variant: `jobV2Of` refuses more). |
| `outputs` | `{ variant, projectId, caseId }` — the new Cases, or the source Case merged into. |
| `error` | V1's codes and **`target`**: where the results were to go is gone (the linked Project, the source Case). |

`jobV2From` reads a row leniently as `jobFrom` does: dropped without an id,
the kind, its Case or its positions; a target that will not read is new Cases
beside the source, a preset that will not read none.

### 6.2 The store — `lib/jobV2Store.ts`

The `jobs` object store of this database, V1's operations cloned
(`enqueueJobV2` — the popup's one call — `addJobV2`, `updateJobV2`,
`pauseJobV2`, `cancelJobV2`, `resumeJobV2`, `removeJobV2`,
`interruptRunningJobsV2`, `findJobV2`), the cap `MAX_JOBS_V2` (100), and
`removeJobsV2Of({ projectIds, caseIds })` — what a Case's or Project's
delete calls. Every write idempotent; **every operation a store write** the
runner acts on.

### 6.3 The runner — `lib/jobV2Runner.ts`

V1's runner cloned (`jobs.md` §3): one per page, started by the shell's
`JobV2Runner` (dev only), **its own Web Lock**
`chessapp.analysisProjects.jobs.runner`, a reload's `running` read as
`interrupted` and never resumed unasked, one job at a time oldest first, its
own engine (the job's, falling back as a board does), Threads, Hash and each
position's MultiPV clamped to what the engine declared, **the job's preset**
(`resolveEnginePreset(job.preset.values, …)`), a checkpoint per position, a
job no longer `running` or gone stopped at once. At the end, **by its
target**:

- `project` / `linked` — the Project must still be there (else `target`);
  each ticked variant a new **Game Case** (`gameCaseOf` over
  `jobV2AnalysisOf` of the source as sent), named `jobV2OutputName` —
  "<case> - computer analysis (<variant>)" — in one `addAnalysisCases`.
- `case` — `mergeIntoAnalysisCase(caseId, jobId, jobV2MergedPgn)` (§6.6); a
  Case gone fails it `target`.

### 6.4 The Case's Jobs tab and the New Job V2 popup

The Case view (`CaseDetails`, §3.3) has a fourth tab, **Jobs** (`CaseJobs`):
**New job**, then the Case's jobs newest first — when asked for and where the
results go (a link to it on the Jobs V2 view), the status in words and the
progress. **New job** opens the popup (`NewJobV2.tsx` over `NewJobDialog`)
for the Case **on the board** — its tree as the board holds it:

- **It asks first** when the Case has a job (`jobV2OfCase`: the newest
  unfinished, else done, else newest) — *Start a new analysis* / *Check
  existing* (the Jobs V2 view at it) — as V1's does.
- **The engine and its preset, each a select** (as the top bar's Engine menu
  offers them: `describeEngines()`, every preset; `ComputerAnalysisForm`'s
  `engineChoice`) **prefill** the depth and time per move from the preset
  (`presetSearchOf`) and Threads, Hash and lines from the global search
  settings; all stay editable for this one job; changing the engine (its
  selected preset with it) or the preset prefills the two again. The rest of
  the form is V1's: lines, the early stop's depth, the variation range, the
  side, the first and last move, the thresholds, the variants.
- **Where to save the results** (`JobTargetFields`, a section before the
  form): **new Cases in this Project**; **a linked project** — a **new** one
  (its name asked, "<Case> — analysis" offered — named after the Case, not its Project; made on Start in the
  source Project's folder and linked from it) or an **existing** one (those
  the source links to listed first and marked; any other is linked on Start);
  or **into this Case** — the form then offers **one variant** (radios,
  `singleVariant`). A new Project with no name, or none picked, keeps Start
  off with the reason (`startBlockedNote`).
- **Start** queues it (`enqueueJobV2`), closes, and a snackbar's *Open in
  Jobs V2* goes to the job. A refusal stays in the dialog, a Project made for
  it taken back.

### 6.5 The Jobs V2 view — `/analysis/jobs` (`?job=<id>`)

V1's Jobs screen cloned (`JobsV2Screen`): the list (`JobsTable` over
`JobV2`) in the square, newest first, Resume / Pause / Cancel / Delete; one
job (`JobSummary` over `JobV2`) in the aside — its status, progress, why it
failed, **Open the Case** (its source, while it is there), **links to its
results** (each new Case; the linked Project; the source Case "the analysis
merged in"), its parameters with **the preset** and **where the results go**
(`extraFacts`), and on Results a done job's **report and eval graph** read
back from its first output Case (`JobV2Report`, the graph read only) or
another's **results so far** (`JobV2LiveReport`, `jobLiveAnalysis`). Delete
asks first and keeps the Cases.

**The header indicator** is a decision of this issue: **a V2 indicator
beside V1's** (`JobsV2Indicator`, dev only) — "Jobs V2 12/80" while one
runs, "Jobs V2: N queued", a link to the Jobs V2 view, announced only on a
change of status; V1's `JobsIndicator` is untouched.

### 6.6 Merging into the source Case

**No tree merge of its own**: `jobV2AnalysisOf(job, tree, variant)` runs
`computerAnalysisTree` over **the tree as it stands** — its positions read
again (`analysisPositionsOf`), each given the job's checkpoint result **for
its FEN** — so the reader's moves, side lines and comments are kept by
construction and every node keeps its id; a move whose position the job never
searched (a mainline changed since) is left unannotated.

- **The store**: `mergeIntoAnalysisCase` applies it to the Case's PGN as the
  store holds it **then**, and adds the job's id to the Case's `merges` (an
  older record reads `[]`). A merge it already holds is a no-op.
- **An open board** (`CaseBoard`) keeps the merges its tree holds; when the
  record lists one it does not, it applies **the same merge** to the tree it
  holds (`core.annotateTree` — nothing moves) — or, the job deleted since,
  loads the record's tree. Its autosave carries its `merges`
  (`CaseState.merges`), and **`saveCaseState` never writes the tree of a state
  behind a merge** (`isBehindMerges`) — only its place, side and display — so
  the older tree is never written back.

## 7. Links between Projects (CTA-188)

A **directed many-to-many self-relation**: a Project **links to** another
(`ProjectLink { id, fromId, toId, createdAt }`), which is **linked from** it;
never to itself, never the same pair twice, cycles allowed, removed with
either Project. Minimal in this issue: a Jobs V2 popup's *linked project*
makes them, and **a Project's screen lists them** (`ProjectLinks`, under its
header — nothing while it has none): *Links to* and *Linked from*, each a link
to that Project with **Unlink** (`unlinkAnalysisProjects`). Export / Import
carry them (§5). A richer linking screen is a later issue.

## 8. Shipping it, later

1. `ANALYSIS_PROJECTS_ENABLED` to `true`; the routes out of `devRoutes`, the
   nav spreads ungated, the shell's Jobs V2 runner and indicator imported
   as V1's are.
2. The database in both legal pages in both languages, and in
   `legalDocuments.test.ts`'s `STORED` (that test fails until then).
3. The routes in `e2e/a11y/routes.ts`, their pre-rendered pages
   ([`static-pages.md`](./static-pages.md)), `pageDescriptions.*` for them.
4. The legacy module's removal (its own issue): nothing here imports it.
