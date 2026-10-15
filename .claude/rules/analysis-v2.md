---
paths:
  - "src/views/analysisV2/**"
  - "src/lib/analysisProjects*"
  - "src/lib/analysisProjectStore*"
  - "src/lib/analysisProjectFolderStore*"
  - "src/lib/analysisCaseStore*"
  - "src/lib/analysisProjectsDb.ts"
  - "src/lib/retiredDatabases*"
  - "src/views/main/boardLeftPanel*"
  - "src/views/main/shellCompact.ts"
  - "src/blocks/tables/ProjectsTable/**"
  - "src/blocks/trees/CaseSiblings/**"
  - "src/blocks/panels/CaseDetails/**"
  - "src/lib/analysisProjectRows.ts"
  - "src/lib/analysisProjectPicks*"
  - "src/blocks/tables/CasesTable/**"
  - "src/lib/analysisCaseRows.ts"
  - "src/blocks/dialogs/NewCaseDialog/**"
  - "src/blocks/dialogs/GamesPickerDialog/**"
  - "src/blocks/dialogs/NewProjectDialog/**"
  - "src/blocks/dialogs/ProjectPickerDialog/**"
  - "src/lib/jobsV2*"
  - "src/lib/jobV2Store*"
  - "src/lib/jobV2Runner*"
  - "src/lib/jobV2Live*"
  - "src/lib/jobsSettings*"
  - "src/lib/evalSources/**"
  - "src/blocks/panels/JobEngineProgress/**"
  - "src/lib/analysisCaseLinkStore*"
  - "src/blocks/forms/JobTargetFields/**"
  - "src/blocks/forms/JobsSettingsForm/**"
  - "src/blocks/lists/CaseJobs/**"
  - "src/blocks/lists/CaseLinks/**"
  - "src/blocks/dialogs/CasePickerDialog/**"
  - "src/lib/jobV2LiveAnalysis*"
  - "src/blocks/tables/JobsTable/**"
  - "src/blocks/panels/JobSummary/**"
  - "src/blocks/panels/ComputerAnalysisReport/**"
  - "src/blocks/panels/EvalGraph/**"
  - "src/blocks/dialogs/NewJobDialog/**"
  - "src/blocks/forms/ComputerAnalysisForm/**"
  - "src/blocks/forms/ArrowSettingsFields/**"
  - "src/blocks/forms/PgnInput/**"
  - "src/blocks/forms/FenInput/**"
  - "src/blocks/lists/FolderActions/**"
  - "src/blocks/lists/FolderPicker/**"
  - "src/blocks/dialogs/Folder*/**"
  - "src/lib/savedGameFolders*"
  - "src/lib/analysisSettings*"
  - "src/lib/arrowSettings*"
  - "src/lib/gameCatalog*"
  - "src/lib/gameReference*"
  - "src/lib/embedSource*"
  - "src/views/home/frontPage/embedSource*"
  - "src/views/home/frontPage/StoredGameEmbed*"
---

# Analysis V2 — Projects and Cases (CTA-186), Jobs V2 and linked Cases (CTA-188), Jobs V2's live progress (CTA-190), the browser's Cases and picks (CTA-191), shipped (CTA-192), the Jobs settings and the lichess evaluation API (CTA-193; the app's, an eval source, since CTA-196)

**The app's analysis module**: the reader's analysis organised into
**Projects** filed in nested **folders**, each Project holding **Cases** — a
**Game** or a **Position** — and each Case its own board, **autosaved** as
the reader works. lichess's Studies and Chapters are the UX reference. Built
dev-only beside the legacy Analysis Board, Saved analyses and Jobs (CTA-73 …
CTA-178), it **shipped in their place in CTA-192**, which removed them (§8);
the "V2" in its names stays (dropping it is a later issue).

```
folders (nested) ──▶ Projects ──▶ Cases (game | position) ──▶ the Case's board
                                   │  ▲  │
                                   └──┘  └──▶ Jobs V2 (a Case's computer analysis) ──▶ new Cases (here | another Project) | the Case itself
                                   links (Case → Case, across Projects)
```

**Jobs V2** (CTA-188, §6) are the app's background jobs — a Case's computer
analysis (the legacy Jobs' successor); **links** (§7) are a directed
many-to-many relation between Cases, across Projects. (CTA-188 first linked
Projects; that was a planning mistake, replaced before it shipped.) **Every
other screen hands a game to Analysis as a new Case** (§1.1).

---

## 0. Where to look

| Path | What lives there |
| --- | --- |
| `src/lib/analysisProjects.ts` | **The records**, pure: `ProjectFolder` (a `GameFolder`, `lib/savedGameFolders.ts`'s model and reads), `AnalysisProject`, `AnalysisCase` and its `AnalysisCaseSource`; the normalisers `projectFolderFrom`, `analysisProjectFrom`, `analysisCaseFrom`; the constructors `gameCaseOf`, `positionCaseOfFen`, `positionCaseOfGame`, `copiedCase`; `caseStateOf` / `sameCaseState` (the autosave's state and its idempotency); `caseDerivedName`, `gameCaseDerivedName`; `projectsHere`, `projectsUnder`, `casesOf`, `caseCountsOf`; a Project's order (CTA-203, §2.1) — `byCaseOrder`, `casesInOrder`, `appendedCases`, `withCaseOrders` (the backfill), `compactedCaseOrders`, `reorderedCases`; the caps (`MAX_PROJECT_FOLDERS` 100, `MAX_ANALYSIS_PROJECTS` 1,000, `MAX_ANALYSIS_CASES` 10,000). |
| `src/lib/analysisProjectPicks.ts` | **The browser's picks** (CTA-191, §3.1): one set of ids over folders, Projects and Cases — `projectPicksOf` (each box's state), `toggleProjectPick` / `setProjectPicks` (a row's tick, select-all's), `projectPickTargetOf`, `projectPicksDeletion` (what a delete takes and how many of each go). Pure. |
| `src/lib/analysisProjectsDb.ts` | The `chessapp.analysisProjects` database, **version 3** (CTA-188): object stores `folders`, `projects`, `cases`, `jobs` (Jobs V2) and `caseLinks`, one `BroadcastChannel`. |
| `src/lib/jobsV2.ts`, `jobV2Store.ts`, `jobV2Runner.ts` | **Jobs V2** (CTA-188, §6): the record (`JobV2`, `jobV2Of`, `jobV2From`, `jobV2AnalysisOf` / `jobV2MergedPgn` — the merge into a Case, `jobV2OfCase`, `jobV2OutputName`), the store (`enqueueJobV2`, `pauseJobV2`, `cancelJobV2`, `resumeJobV2`, `removeJobV2`, `removeJobsV2Of`, `interruptRunningJobsV2`, `MAX_JOBS_V2` 100) and the runner (`createJobV2Runner`, `startJobV2Runner` / `stopJobV2Runner`, its lock `chessapp.analysisProjects.jobs.runner`). Since CTA-192 `jobsV2.ts` also holds what the legacy jobs' record shared with it: the statuses (`JobStatus`), `JobPosition`, the `can…` predicates, `jobSearchOf`, `jobProgress`, `jobMoveLabel`, the checkpoint's reader. `lib/jobV2LiveAnalysis.ts` (`jobV2LiveAnalysis`): a job's results so far — the eval graph's points, the verdicts and report over the moves judged, the latest finished position (§6.5). |
| `src/lib/jobV2Live.ts` | **A running job's live engine progress** (CTA-190, §6.7): `JobV2Live` (the snapshot), `createJobV2LiveFeed` (the runner's throttled feed), `jobV2LiveSnapshot` / `subscribeJobV2Live` (read by `views/analysisV2/jobs/useJobV2Live.ts`), the channel `chessapp.analysisProjects.jobs.live` — in memory, never stored. |
| `src/lib/jobsSettings.ts` | **The Jobs settings** (CTA-193, §6.9): the preference `chessapp.jobsSettings` (`readJobsSettings`, `storeJobsDefaultPreset`) — the default engine and preset for new jobs. The lichess evaluation API left it for the app-wide eval-source layer in CTA-196: `src/lib/evalSources/` (the layer, the decorator, `askEvalSources` / `recordInEvalSources`, `reportEvalSourceUnreachable` / `subscribeEvalSourceUnreachable`) and its plugin `src/lib/evalSources/lichess/` (the client `api.ts`, `settings.ts` — `chessapp.lichessEvalApi`, the status, the migration — and its Settings → Engine tab) — [`docs/engine.md`](../../docs/engine.md) §10. |
| `src/lib/analysisCaseLinkStore.ts` | **The links between Cases** (CTA-188, §7): `linkAnalysisCases`, `addCaseLinks` (several at once — a job's new Cases), `unlinkAnalysisCases`, `removeLinksOfCases`, `importCaseLinks`; the record `CaseLink` and `caseLinksOf` in `analysisProjects.ts`. |
| `src/lib/analysisProjectFolderStore.ts`, `analysisProjectStore.ts`, `analysisCaseStore.ts` | **The stores** over `idbRecordStore` ([`database.md`](./database.md) §3): folders oldest first, Projects and Cases newest first; every operation a promise of `undefined` or `"storage"` / `"too-many"`. |
| `src/lib/retiredDatabases.ts` | **The databases the app no longer keeps** (CTA-192): `chessapp.analyses` and `chessapp.jobs`, the legacy module's, deleted on every load (`src/main.tsx`, `deleteRetiredDatabases`). |
| `src/views/analysisV2/useSendToAnalysis.tsx` | **A game handed to Analysis** (CTA-192, §1.1): `useSendToAnalysis(testId)` → `{ send, dialog }` — the Project picker, the Game Cases written, the Case (or Project) opened. Every other screen's way in. |
| `src/views/analysisV2/` | **The screens**: `ProjectsBrowser.tsx` (`/analysis`), `ProjectScreen.tsx` (`/analysis/projects/<id>`), `CaseWorkspace.tsx` (`/analysis/projects/<id>/cases/<caseId>`; its `CaseBoard` the board; the Case view's links and their picker, §7), each behind a layout-only `…Main.tsx`; `useAnalysisProjects.ts` (the store bindings — `useJobsV2`, `useCaseLinks` too), `paths.ts` (the addresses — `jobsV2Path`). `jobs/` (CTA-188): `JobsV2Screen.tsx` (`/analysis/jobs`, behind `JobsV2Main.tsx`), `JobV2Reports.tsx` (a done job's report, another's results so far), `NewJobV2.tsx` (the popup's screen side), `JobsV2Shell.tsx` (`JobV2Runner`, `JobsV2Indicator` — the shell's), `useJobV2Live.ts` (the live progress, `liveOfJob` — CTA-190), `JobsSettingsTab.tsx` and `useJobsSettings.ts` (the Jobs settings, CTA-193). |
| `src/blocks/tables/ProjectsTable/` (its rows `lib/analysisProjectRows.ts`), `src/blocks/trees/CaseSiblings/`, `src/blocks/panels/CaseDetails/`, `src/blocks/tables/CasesTable/` (`caseDisplayName`; its rows `lib/analysisCaseRows.ts`), `src/blocks/dialogs/NewProjectDialog/`, `NewCaseDialog/`, `GamesPickerDialog/` (CTA-208), `ProjectPickerDialog/` (and the Library's `CollectionImportDialog`, `choiceOnly`); since CTA-188 `src/blocks/forms/JobTargetFields/`, `src/blocks/lists/CaseJobs/`, `src/blocks/lists/CaseLinks/`, `src/blocks/dialogs/CasePickerDialog/`; since CTA-190 `src/blocks/panels/JobEngineProgress/`; since CTA-193 `src/blocks/forms/JobsSettingsForm/` (the default engine and preset, and a link to Settings → Engine for the eval sources — CTA-196) | The blocks, built in the gallery on fixtures first ([`docs/design/hierarchy.md`](../../docs/design/hierarchy.md)). The folder dialogs (`FolderNameDialog`, `FolderMoveDialog`) and `FolderActions` are the app's own, reused — and so, for Jobs V2, `JobsTable`, `JobSummary` (generic over a job's fields), `NewJobDialog`, `ComputerAnalysisForm` (the engine and preset selects, one variant, a section before the form; `JobSummary`'s `live` slot, CTA-190), `ComputerAnalysisReport` and `EvalGraph` — built for the legacy Jobs, Jobs V2's since CTA-192. |
| `src/views/board/core/useAnalysisSession.ts`, `useTreeNavigation.ts`, `src/views/shared/nextMoveArrows.ts`, `src/views/shared/AnalysisEvalReport.tsx` | **Moved out of the legacy module** (CTA-186) so that its removal takes nothing V2 needs — the session the Case's board composes, the core's navigation, the next-move arrows the explorer draws, the eval graph and report the Case view's Graph tab shows. |
| Tests | `src/lib/analysisProjects.test.ts` (records), `src/lib/analysisProjectRows.test.ts` (the browser's rows — its Cases, CTA-191), `src/lib/analysisProjectPicks.test.ts` (its picks, CTA-191), `src/lib/analysisProjectStores.test.ts` (the stores — the Case links, a delete's jobs and links, the database's upgrade from versions 1 and 2, CTA-188), `src/lib/jobsV2.test.ts`, `jobV2Store.test.ts`, `jobV2Runner.test.ts` (Jobs V2; its live progress and throttling, CTA-190), `jobV2Live.test.ts` (the feed, the channel, a stale snapshot dropped), the engine server's heartbeat in `jobV2Runner.test.ts`, `hostedEngine.test.ts`, `JobEngineProgress.test.tsx` and `JobsV2Shell.test.tsx` (CTA-194), `jobsSettings.test.ts` (CTA-193; the old `evalApi` kept for its move, CTA-196), `lib/evalSources/lichess/api.test.ts` (the client — the FEN, the mapping, a 404, the timeout, a bad body) and the rest of the layer's tests ([`docs/engine.md`](../../docs/engine.md) §10.5), the runner's API cases in `jobV2Runner.test.ts` (through the layer), `JobsSettingsForm.test.tsx`, `uciEngine.test.ts` (the progress fields parsed), `src/views/analysisV2/jobs/JobsV2.test.tsx` (the Case's Jobs tab and popup, a merge into an open Case, a Case's links on its Linked cases tab, the Jobs V2 view; the Jobs settings tab — its link to Settings → Engine, CTA-196 — and New Job V2's default, CTA-193), `JobsV2Shell.test.tsx` (the indicator; its heartbeat and live name, CTA-190; an eval source's warning, CTA-193, CTA-196), the blocks' own, `src/views/analysisV2/AnalysisV2.test.tsx` (the three screens over the real stores), `src/lib/dataExport.test.ts` / `dataImport.test.ts` / `src/views/settings/ImportTab.test.tsx` (the category), `src/views/board/boards.test.tsx` and `panelPropagation.test.tsx` (the Case's board in the set), `src/views/legal/legalDocuments.test.ts` (the database named in both pages, the retired ones in neither), `src/lib/retiredDatabases.test.ts`; **the hand-offs** (§1.1): `OpeningsBoard.test.tsx`, `PlayWithEngine.test.tsx`, `PlayedGames.test.tsx`, `Library.test.tsx` (the game board's Open in Analysis and a shipped game's copy), `LibraryPicks.test.tsx` (the batch), `StoredGameEmbed.test.tsx` and `EmbedSource.test.tsx` (an embed's Case address and its Open in Analysis), `ProjectPickerDialog.test.tsx` (the New project entry). |

Locale keys: `analysisV2.*` (`browser`, `folder`, `project`, `case`,
`newCase`, `workspace`; `jobs`, `links` — CTA-188; `jobs.live`, `jobs.indicator.liveDepth` / `liveNodes` — CTA-190; `jobs.live.alive` / `heardNow` / `heardSeconds` / `heardMinutes` — CTA-194; `jobs.tabs`, `jobs.settings` — CTA-193; the eval sources' words are `evalSources.*`, CTA-196), `nav.folders.analysisV2`, `nav.analysisProjects`,
`nav.analysisJobs`, `pages.analysisProjects` / `analysisProject` / `analysisCase` / `analysisJobs`, the
New Job form's additions under `computerAnalysis.form.*` (`engineSelect`, `preset`, `presetHelp`,
`variant`, `variantHelpSingle`), the hand-off's `analysisV2.sendTo.*` and
`analysisV2.case.newProject*` (CTA-192), each sending screen's new Project name
(`openings.sendTo.projectName`, `playEngine.sendTo.projectName`,
`home.embed.projectName`), and the
category's `settings.export.categories.analysisProjects` /
`settings.import.top.analysisProjects` — in both catalogs. `options.id` is
`analysis-case`; the test ids are `analysis-v2-*` (the lists and the Cases table) and
`analysis-case-*` (the board), `analysis-case-jobs-*` and `analysis-case-new-job-*` (the Case's
Jobs tab and popup), `analysis-v2-jobs-*` (the Jobs V2 view and indicator — the live engine section
`analysis-v2-jobs-engine-*`, the indicator's `analysis-v2-jobs-indicator-heartbeat`, CTA-190).

---

## 1. In the app (shipped in CTA-192)

- **Routes**: four entries in `routes.tsx`'s shipped table — the browser
  (`/analysis`) and a Project (`/analysis/projects/<id>`) are
  `FULL_WIDTH_ROUTE`s; a Case's board (`…/cases/<caseId>`) and Jobs V2
  (`/analysis/jobs` — the list in the square, a job in the aside) are board
  routes. `/analysis` and `/analysis/jobs` are static, so the pre-render
  writes them in every language, with their `pageDescriptions.analysisProjects`
  / `analysisJobs` ([`static-pages.md`](./static-pages.md)); the share
  section `analysis` is everything under `/analysis` (`src/assets/share/sections.ts`).
- **Sidebar**: the folder *Analysis V2* (`analysis-v2`, `nav.folders.analysisV2`)
  after the Library, with *Projects* (`/analysis`) and *Jobs* (`/analysis/jobs`).
- **The shell** mounts `JobV2Runner` and `JobsV2Indicator`
  (`views/analysisV2/jobs/JobsV2Shell.tsx`) — the app's one job runner and
  its header indicator.
- **Export / Import**: the `analysisProjects` category, offered always (§5).
- **The legal pages** name `chessapp.analysisProjects`, in both languages;
  `legalDocuments.test.ts` holds them to it, and to naming neither retired
  database.
- **The browser pass** seeds a Project at the top level (a Game Case) and one
  in a folder (a Position Case) through its export zip (`e2e/a11y/seedZip.ts`)
  and visits the browser, a Project, a Case and Jobs V2 (`e2e/a11y/routes.ts`).
- **The legacy module's databases are deleted** on every load
  (`lib/retiredDatabases.ts`): `chessapp.analyses`, `chessapp.jobs`.

### 1.1 A game handed to Analysis — `useSendToAnalysis`

**Every other screen reaches Analysis by making a Case** — one hook,
`views/analysisV2/useSendToAnalysis.tsx`: `send({ games, projectName, onSent? })`
opens a **Project picker** (`ProjectPickerDialog` with its `newProject`
entry: *New project* first, chosen at first, named `projectName`, a name
required), and its submit makes a **Game Case** of each game (`gameCaseOf`,
then the sending board's `nodeId` as the Case's `path`, its `orientation`, its
`display` where given) in the Project picked — or a new one at the top level —
in one all-or-nothing `addAnalysisCases` (a Project made for it taken back on
a refusal, said in the dialog, which stays open). Then the caller's
`onSent`, or — without one — one game **opens its Case**, several the
Project. The screen renders `dialog` once.

| Sender | What it sends | New Project's name |
| --- | --- | --- |
| Openings explorer's Analysis button | the whole tree, at the node on screen, facing the board's side | the opening on screen, else `openings.sendTo.projectName` |
| Play with Engine's / Masked Pieces' game over | the record as kept (its tags), facing the board's side | `playEngine.sendTo.projectName` |
| the Lobby's row Analyse (`PlayedGamesTable`'s `onAnalyse`) | the played game | the same |
| the Library game board's Export tab, *Open in Analysis* | the game as the collection holds it, at the position on screen | the collection's name |
| a shipped Library game's *Save as copy* | the board's tree, named "… (copy)", its arrows and move marks as `display` | the collection's name |
| the Library's picks, *Analyse* (`onSent`: a snackbar with *Open project*) | each readable picked game, named by its chapter | `batchFolderNameOf` (the collection, the count, the filters) |
| an embed's *Open in Analysis* (`StoredGameEmbed`) | the stored game — a Case's own reference is a plain link to its board instead | `home.embed.projectName` |

**An embed reads a Case** by its address, `/analysis/projects/<p>/cases/<c>`
(`lib/embedSource.ts`, the `case` kind), resolved as the reference
`case/<p>/<c>` (`lib/gameReference.ts` → `findAnalysisCaseGame` in
`analysisCaseStore.ts`, out of what has been read — `loadReferencedGames`
first): the MDX embeds, the MDX editor's address field and its lookups
(`addressOptions.ts`, the group *Analysis cases*; `libraryLookup.ts`).

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
    palette, the move marks, the eval bar, the engine's lines — and, CTA-199,
    whether the engine's evaluations are written, `writeEvals`, on; a record
    from before reads the defaults);
  - its **name**, optional: `""` is derived — a Game from its tags (*White –
    Black, Event, year*, the parts the tags name), a Position from its side to
    move and move number ("Black to move, move 41"), in the reader's language
    (`caseDisplayName`);
  - its **place in its Project's order**, `order` (CTA-203, §2.1).
- **To change a Case's type or source**, the reader duplicates it or makes a
  new one; rename, move to another Project, duplicate, reorder and delete are
  the operations.

### 2.1 A Project's order (CTA-203)

A Project can be a tutorial — Chapter 1, Chapter 2, … — so **its Cases have
an order the reader sets**: `order`, a number on each Case, 1 the first,
within its Project (not "position": that is the Position Case). The store's
list stays newest first; the order is a field, read by `byCaseOrder` (a Case
without one last, ties oldest first then by id, so it is total).

- **A Case that arrives goes last** (`appendedCases`, in `addAnalysisCases`):
  a new one, a hand-off's (`useSendToAnalysis`), one moved in from another
  Project, a duplicate, a Jobs V2 result. A duplicated Project's copies keep
  the original's order. The constructors leave `order` `0`; the store gives it.
- **A Case that leaves closes the gap** (`compactedCaseOrders`): deleted, or
  moved to another Project — its old Project numbered 1, 2, … again.
- **Reordering** (`moveAnalysisCaseInOrder(id, "up" | "down" | "top" |
  "bottom")`, over `reorderedCases`) moves it and numbers its Project again;
  **it is not an edit** — `updatedAt` stays. Past an end it writes nothing.
- **A record from before has none** (`0`): the store gives every such Case its
  place **as it reads** (`withCaseOrders`, the record store's `repair`, written
  back) — after the Cases of its Project that have one, oldest first, so a
  Project of them alone reads 1 (the oldest), 2, …. An import does the same
  for an older zip's (§5).
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
how many it holds, when it changed) — **each opened in place too** (CTA-191),
by its chevron ("Show the cases of …") or a click on its row, its **Cases**
indented under it: the name (`caseDisplayName`) a link to the Case's board,
its kind (Game / Position) and when it changed; a click on a Case's row opens
it as well. A Project with no Case has no chevron. Name, Cases and Updated
each sort (`?sort=` / `?dir=`, Name by default; folders and a Project's Cases
by name, or by when they changed under Updated); a **words box** (`?q=`)
keeps the folders, Projects and Cases whose name holds every word —
everything in a matching folder, every Case of a matching Project, only the
named Cases of a Project kept for them — and opens the folders and the
Project above a match (a row the reader opened or closed by hand keeps its
state); paged past 25 (`projectTreeRows` over `lib/folderTreeRows.ts`). Which
folders and Projects the reader opened is the screen's state. **New folder**
and **New project** in the header; a new Project opens at once.

**Deleting is by checkboxes**, as in the legacy Saved analyses (CTA-147;
`lib/analysisProjectPicks.ts`):

- **Every row has a box** — folders, Projects and Cases — over **one set of
  ids**. Ticking a folder ticks its whole subtree (sub-folders, Projects,
  Cases); ticking a Project ticks its Cases. A folder's or a Project's box is
  **checked or partly ticked from what is under it** (its leaves: each Case,
  each Project without one; an empty folder only by its own box or one
  above). **Unticking** an item un-ticks everything under it and **every
  container above it**; what was picked through them stays picked.
- **Select-all** in the header covers the rows the words leave, closed ones'
  too: the leaves the words keep, so a container is ticked through them,
  never more.
- **The picks persist** across opening and closing rows and across folders;
  a pick of a record deleted (here or in another tab) falls out.
- **The selection bar** in the header (`SelectionBar`): how many are ticked —
  every folder, Project and Case that would go —, Clear, and **Delete the
  picked items**, which asks first (`DeleteManyDialog`: "Delete N items?",
  how many folders, Projects and Cases), then deletes the picked Cases
  (`removeAnalysisCases`), the checked Projects with their Cases
  (`removeAnalysisProjects`) and the checked folders **deep**, with
  everything in them (`removeProjectFoldersDeep`) — their Jobs V2 and links
  with them, as the stores do. A refusal is said in the dialog and the picks
  stay. Standing inside a folder that goes, the reader steps to the nearest
  one that survives.
- **No row deletes itself** (CTA-191 took the per-row Delete away, and with it
  the folder delete's choice to keep what it held: a ticked folder always
  goes whole).

**New project** is a popup (`NewProjectDialog`): a name (required — picking a
file with none typed names it after the file) and, optionally, a `.pgn`
whose games become its Cases (`collectionImportFileOf` reads it):

- **no file** — an empty Project;
- **one game** — a Project with that game as its one Game Case;
- **several** — the Library's import popup opens on them
  (`CollectionImportDialog` with `choiceOnly`: what came in, the Elo / date /
  player filters and the count, no *Split by event*, no tournament mark) —
  and **Select games…** (CTA-208, `choiceOnly.selectGames`) opens the games
  picker (`GamesPickerDialog`, New case's) over **the games the filters
  keep**, numbered across a zip's files: the games picked there are the ones
  kept ("N games picked.", *Change the selection…*, *Use every game the
  filters keep*; a pick the filters later leave out is not kept) —
  and **Create project** makes a Game Case per game kept, in file order;
  Cancel goes back to the name.

All or nothing: Cases the store refuses take the Project back, and the
popup says why; a game that will not parse is left out.

| On | Rename | Move | Duplicate | Delete |
| --- | --- | --- | --- | --- |
| a folder | `FolderNameDialog` | `FolderMoveDialog`, its subtree left out | — | its box, then the selection bar's Delete — always with everything in it |
| a Project | `FolderNameDialog` | `FolderMoveDialog` | named "‹name› (copy)", beside it, **with its Cases** (`duplicateAnalysisProject`) | its box — its Cases with it |
| a Case | (its Project's screen, §3.2) | (§3.2) | (§3.2) | its box |

A refused write is an `InlineAlert` under the header. A `?folder=` that names
no folder says so, with a way back.

### 3.2 A Project — `/analysis/projects/<id>`

Under its header (the Back button kept), **the browser's trail** (CTA-207,
`Breadcrumbs`, the same name and labels — `analysisV2.browser.trail` /
`root`): the top level, every folder from the top down to the Project's
(`projectFolderPath`), each a link to the browser there, then the Project's
name, current; a Project at the top level — or in a folder gone — reads root
› Project. The screen waits for the folders' first read too.

Its Cases as a **table** (`CasesTable`, rows from `lib/analysisCaseRows.ts`):
**`#`** (its place in the Project's order, §2.1 — the header read "Order"),
Name (the link to its board) and Type, then the games table's columns —
White, Elo, Black, Elo, Result, Date, Event, Round, ECO, Opening, Moves, read
off a Game's tags (**blank for a Position**) — and Updated. Every header
sorts (a blank last either way, ties newest first); the sort and the page
are the URL's (`useTableUrlState`: `?sort=`, `?dir=`, `?page=`, `?rows=`;
**`#` ascending by default**, CTA-203 — Updated before), paged past 25. A **words box** over it
(`?q=`, `filteredCaseRows`) keeps the rows holding every word typed — the
name, the type, a Game's players, Elos, result, date, event, round, ECO and
opening — with a no-match row and its Clear. **Picks**: a box per row and
select-all in the header (over the rows the words leave); the header's
selection bar counts them and deletes them together, asked first
(`DeleteManyDialog`, a failure said in it with the picks kept). **New case** opens `NewCaseDialog`:

- **Game** — a PGN pasted or a `.pgn` or `.zip` picked (`PgnInput`, `zip`;
  a zip's `.pgn` files read together as one list of games, in its order —
  `readCollectionZip`; a zip unreadable, with no `.pgn`, no game or too
  large refused in words). **A file read takes the input's place** as a
  plate — its name, size and "N games read", and × (*Remove ‹name›*), which
  brings the file button and the paste box back to pick another; its text
  never goes into the paste box (a large one there froze the page); a file
  refused leaves the input, its problem under it. **Several games** (CTA-208): the dialog says *A case is
  represented by a single PGN file* and asks — **One case per game (N)**
  (the default; off, with the reason, past **1,000 games** —
  `MAX_CASES_AT_ONCE` in the dialog: "too many — make a collection of them
  in the Library instead") or **Select games**, which opens **the games
  picker** at once (`GamesPickerDialog`, a wide popup: the Library's
  `CollectionGamesTable` with no links over `collectionRowOf` rows — built
  the first time it opens, ~0.3 s for 15,905 games — under a words box,
  every column a sort, paged, ticks with select-all over what the words
  leave, at most 1,000, the count said; **Select** hands them back), then
  says what is selected, with *Change the selection…*; each game selected is
  a Case — one, with the name typed. **No merge here**: merging many games
  into one Case was built and taken out again in CTA-208 — a 15,905-game
  file merges into a tree of ~900k moves no Case board is built for; it is
  to live elsewhere. **Built for thousands of games** (`lib/pgnGames.ts`):
  what is read is only **indexed** — each game's text and tags
  (`indexPgnGames`, ~135 ms for 15,905 games), no move read — and only a
  single Case's game is parsed (a few ms); a game that will not play is
  said when chosen (*That game cannot be read*). **Several Cases** parse
  their games on Create (`parsePgnGameEntries`: ~50 ms slices, the page
  given back between them, a move cache shared across the batch — ~21%
  fewer chess.js calls), a progress bar counting them ("400 of 1,000 games
  read"), Create off and Cancel on, which stops it; a game that will not
  play stops it, said with its number in the file.
- **Position** — **from a FEN** (checked as it is typed, `parseFen` — the pieces alone are enough, its missing fields completed as lichess does: White to move, no castling or en passant, `0 1`; CTA-200) or
  **from a PGN** at a move picked from its mainline (*Start at*), the moves
  before it kept — a PGN (or zip) of several games choosing its game in the
  games picker first (*Choose another game…*: no ticks, a click chooses;
  the first game until then — CTA-208).
- A name, optional (none for one-per-game).

One new Case opens on its board; several stay on the list. A Case is renamed
(`""` gives it back its derived name), moved to another Project
(`ProjectPickerDialog`, its own left out; off while there is no other) and
duplicated into this Project or another under a name ("‹name› (copy)").
**No row deletes itself** (CTA-203 took the bin away): the boxes and the
selection bar's Delete are the one way. The route waits for the stores' first
read, then says a Project that is not there.

**Reordering** (CTA-203): each row's **Move up**, **Move down**, **Move to
top** and **Move to bottom** — on only while the table is sorted by `#`
ascending with no words typed (the Project's order itself, every Case a row);
under any other sort or a filter they are off, their tooltip and name saying
why ("sort by # ascending to reorder", "clear the filter to reorder"). Up and
top are off on the first Case, down and bottom on the last. The order is the
Project's, not the page's: a Case moved past the page's edge takes the page
with it. The focus stays on the moved Case's same action (that action off at
its new end, the nearest one still on), and its new place is announced ("…
is now number 3 of 12.", a hidden `status`).

### 3.3 A Case's board — `/analysis/projects/<id>/cases/<caseId>`

**Composed from the board core** ([`chessboard.md`](./chessboard.md) §9), as
the legacy Analysis Board was: `useAnalysisSession` (the core, the engine — off at the
start, the reader's global search settings — and Play), `useVariationsExplorer`
(the move list, map, comment block, next-move arrows, the PGN's shapes;
editing on, *Play chances…* off), `BoardShell` and its panel — tabs **Moves ·
Map · Export** (`PgnExportPanel`; **Settings** moved to the left panel's Case
view in CTA-199, below; **Display** — `CaseDisplayTab`,
the board's state, shown on the left panel's Case view (below) since CTA-186's
last round: the next-move arrows and the move marks on top, then inner
tabs — **Arrows**, the width source and palette (§3.4)
(`ArrowSettingsFields`), **Engine** — the engine's lines (`BoardPanel`'s
`showVariations`) — and **Accessibility**, the board's accessibility options,
a placeholder for now — all kept with the Case as its `display`, autosaved;
**Settings** — the Case view's first tab since CTA-199 — opens with `CaseSettingsTab`: the side the board faces, White / Black
(the Case's orientation), the eval bar (its `display`) and *Write evaluations
into the game* (on by default and kept with the Case as its `display.writeEvals`
since CTA-199 — the session starts from it; [`pgn-annotations.md`](./pgn-annotations.md))), and the header:
the name, the opening, a refused save (nothing else), Play and the engine's on / off as a
**small switch** labelled with the top bar's Engine icon (`SmartToyRounded`, read as "Engine") — not the other boards' play / pause and options menu
(`BoardEngineControls`), whose choices are the Case view's Settings tab here.
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
  open one current, in the **Cases table's order and under its words** — by
  default the Project's order (CTA-203) — the
  table's `?sort=` / `?dir=` / `?q=` carried into the Case's URL
  (`caseListContextOf`, `paths.ts`) and back by its **Close**, at the head's
  start before the Project's name — the one way back, the board's header has
  none; a words box (writing `?q=`) and previous / next over the list as shown
  (the whole of it when the words leave the open Case out). It does not fold.
  Under the shell's breakpoint it is a drawer, opened from a list button in
  the board's header; the drawer is the route's state, so it outlives a step
  to another Case. Nothing locks it: a Case autosaves.
- **The panel's other screen, the Case's own view** (`CaseDetails`) — **where
  a Case opens** (CTA-199: no `?view=`; the list is `?view=list`,
  `withCaseView`, `paths.ts`, never carried back to the table; an older
  `?view=case` reads as the view). A row of the list picked — the open Case's
  too — opens that Case on it, and the panel shows the Case — **Back** to the list where the list has
  Close, its name and type, its details in **tabs** — **Settings** (CTA-199,
  first: the board's settings, `CaseSettingsTab`, then its own tabs — **Info**,
  the Case's PGN tags as saved (`GameInfo`, the Library game board's Info
  tab; "no tags" when it has none), and **Linked cases**, **its links** and
  Link a case (CTA-188, §7; `CaseLinks`, its heading out of sight)),
  **Graph**, the eval graph and report of the tree
  on the board (`views/shared/AnalysisEvalReport.tsx` — live, a click moves the board; disabled while the tree
  carries no `[%eval]`), **Display**, how the board draws (`CaseDisplayTab`,
  out of the right-hand panel), **Jobs** (CTA-188, §6.4) — and previous / next at
  its foot, which keep the view and its open tab (the screen's state). The
  board draws the left panel (`CaseBoard`'s `leftPanel`, given the tree on
  screen), so the Graph follows it and Display sets it. Back sets
  `?view=list` and keeps the rest of the context. A reload keeps the screen.

### 3.4 The next-move arrows — the Display tab's Arrows (CTA-98, CTA-168, CTA-180, CTA-197)

The Case board's arrows, kept with the Case as its `display` (a new Case:
on, None, Classic, move marks on); every other board keeps the classic,
colour-only arrows. `ArrowSettingsFields` (the block), `lib/arrowSettings.ts`,
`lib/nextMoveWeights.ts`, drawn by the explorer's overlay on the play-chance
arrows' absolute scale (`chanceArrowWidth` over 0–1):

| Width source | Read from | Width |
| --- | --- | --- |
| **None** | — | the library arrows, colour only |
| **Evaluation** | `[%eval X]` in the move's own comment, or the trailing `+1.31 (21 ply)` shape — turned to the mover's view | **two groups** (CTA-180): within 1 cp of the best (`EVAL_BEST_CP`) the *best* group, widest, in the palette's mainline colour wherever it is in the tree; every other *worse* — the side-line colour, at most `EVAL_WORSE_MAX_WEIGHT` (0.6) wide, thinner with the square root of its loss, a hairline at 300 cp (`EVAL_HAIRLINE_CP`); a mate for the mover best, against it a hairline |
| **Games** | `games:N` / `[%games N]` (`lib/gamesTag.ts`) | `N / Σ N` over the tagged moves |
| **Play chance** | `prc:N` / `[%prc N]` | the marks scaled to 100% over the tagged moves |
| **Lines ahead** | nothing (`linesWithin`, 8 plies) | each move's share — always offered |
| **Variations** (CTA-197) | the engine's listed lines (MultiPV), not the tree — each line's first move, in the tree or not (`engineLineWeights`) | **Evaluation's rule** on the lines' scores, as the side to move sees them: within 1 cp of the best line widest, in the mainline colour; the rest thinner by loss to a hairline at 300 cp, in the side-line colour; a mate for the mover best, against it a hairline — always offered |

- **A tag's radio is disabled while no move in the tree carries it**
  (`arrowWidthSourcesIn`); a choice whose tag is gone is kept, shown checked
  and disabled with a note, and the board draws as None until it is back. At
  a branch where some moves carry the tag the untagged ones are gray, half
  transparent, a fixed modest width (`UNTAGGED_ARROW_CHANCE`); where none do,
  the ordinary palette arrows.
- **Variations draws the engine, not the tree**: while the engine is on and
  its lines are for the position on screen (`Analysis.fen === core.fen`, so
  a stale position's are never drawn), `CaseWorkspace` hands their weighted
  first moves to the explorer as `arrows.engineMoves` — drawn in the
  overlay (`${testId}-engine-arrows-overlay`) in place of the tree's
  continuations, following each new depth and position. Off, or before its
  first lines here, the choice is kept and saved and the board draws as None,
  the same *drawn as None* note saying the engine is off or has not reported
  (`ArrowSettingsFields`' `engineLines`); the radio is never disabled.
- **Colours** (`NEXT_MOVE_ARROW_PALETTES`, `nextMoveArrows.ts`): **Classic**
  (every board's), **Lichess** (its brushes), **Colour-blind safe**
  (Okabe–Ito) — mainline / side line / hovered; under **Evaluation** and
  **Variations** the best group takes the mainline colour and every worse
  move the side-line one.
- **Move marks on the board** (CTA-168): the move on screen's mark drawn as a
  badge on its square ([`pgn-annotations.md`](./pgn-annotations.md) §4); off,
  none (the move list shows the glyphs either way).

---

## 4. The store

`chessapp.analysisProjects`, **version 3** (CTA-188 — an upgrade from 1 only
creates `jobs` and `caseLinks`, every folder, Project and Case kept; version 2
existed on CTA-188's branch alone, its `projectLinks` store left unread by 3),
a database of its own —
[`database.md`](./database.md) §1. Every row is read through its normaliser
(a field an older row lacks reads as its default; a row without its identity
is dropped).

| Store | Order | Cap | Operations |
| --- | --- | --- | --- |
| `folders` | oldest first | 100 | `createProjectFolder`, `renameProjectFolder`, `moveProjectFolder` (never into its subtree), `removeProjectFolder` (keeps the contents: sub-folders re-parent, Projects re-filed up — `refileProjectsIn`; no screen calls it since CTA-191), `removeProjectFolderDeep` / `removeProjectFoldersDeep` (the subtrees, in one write, `removeProjectsInFolders` — the browser's delete of the picks), `addProjectFolders` (an import's, all or nothing) |
| `projects` | newest first | 1,000 | `createAnalysisProject` (a name required), `renameAnalysisProject`, `moveAnalysisProject`, `duplicateAnalysisProject` (its Cases first, all or nothing), `removeAnalysisProject` / `removeAnalysisProjects` (their Cases with them — `removeCasesOfProjects`), `importAnalysisProjects` |
| `cases` | newest first | 10,000 | `addAnalysisCases` (all or nothing; each last in its Project's order), `moveAnalysisCaseInOrder` (CTA-203, §2.1 — no `updatedAt`), `renameAnalysisCase`, `moveAnalysisCase`, `duplicateAnalysisCase`, `removeAnalysisCases` (their Jobs V2 with them; the gap closed), `saveCaseState` (the autosave, in place — never the tree of a state behind a merge, §6.6), `mergeIntoAnalysisCase` (a Jobs V2 merge, §6.6), `importAnalysisCases` |
| `jobs` (CTA-188) | newest first | 100 (the oldest finished dropped; refused when every one is unfinished) | Jobs V2 (§6.2) |
| `caseLinks` (CTA-188) | oldest first | 50,000 | `linkAnalysisCases` / `addCaseLinks` (no self-link, no pair twice), `unlinkAnalysisCases`, `removeLinksOfCases`, `importCaseLinks` (§7) |

A delete runs folder → Projects → Cases → their Jobs V2 → their links as
writes queued one after another, which is why `src/test/setup.ts`
lets the writes settle five times over. A **Case or Project deleted takes
its Jobs V2** (`removeJobsV2Of`) — a running one is stopped by the runner,
which reads it gone — and **its links** (`removeLinksOfCases`).

---

## 5. Export and Import

The `analysisProjects` category ([`import-export.md`](./import-export.md)):
one file, `analysis-projects.json` — `{ folders, projects, links }`: every folder as
its path of names (parents first, empty ones too), every Project as stored
with its `folderPath` and its **Cases** as stored, and — since manifest
version **5** (CTA-188) — the **links between the Cases** as stored (a link
to a Case not exported left out). Version 4 added the file (a v3 zip reads
through the table, its upgrade the stamp alone); version 5 its links (a v4
zip reads with none). **A Case's `order`** (CTA-203) travels with it — an
optional field, no format bump: into a Project the import fills the zip's
order is kept, into one that keeps Cases of its own (Merge) the arriving ones
go last in the zip's order, and an older zip's Cases, with none, get their
place by date, oldest first (`importAnalysisCases`, `withCaseOrders`). Jobs V2 are not exported
([`import-export.md`](./import-export.md) §1.1); their results are Cases, which are. On the way
in, folders are matched by their path of names and created where missing;
Projects clash by their folder like the collections (Merge / Override / Skip, a
folder's own choice over the category's); each Project brings its Cases, each
filed in it; an Override's Projects take their Cases with them; the Projects'
and the Cases' caps both refuse the category. **The links** come after the
Cases: the zip's whose two Cases the app holds afterwards (Case ids are kept
by an import), the links of the Cases the import replaces or removes dropped
first (`importCaseLinks`). (An older zip's `analyses.pgn` — the legacy
saved analyses — is counted, skipped and said, §8.)

---

## 6. Jobs V2 — a Case's computer analysis (CTA-188)

**The app's background jobs**: work done app-wide while the reader goes on
with anything else — one kind, a Case's **computer analysis** (Stockfish over
the game's mainline, every finished position checkpointed, each ticked
variant — light, medium, full — written as a new Case or merged into the
source). Begun as a clone of the legacy Jobs (CTA-171/173/177/178), which
CTA-192 removed, folding their shared pure parts into `lib/jobsV2.ts`. The
analysis rules themselves (positions, early stop, verdicts, the annotated
trees, the report read back) are [`pgn-annotations.md`](./pgn-annotations.md) §6.

```
queued ──▶ running ──▶ done
   ▲          │ ├────▶ failed ──────┐
   │          │ └────▶ cancelled    │
   │          ▼ (a reload)          │
   ├──── interrupted ◀──────────────┘   Resume: paused, interrupted, failed → queued
   │
   └──── paused ◀── Pause: queued, running
```

### 6.1 The record — `lib/jobsV2.ts`

| Field | What |
| --- | --- |
| `id`, `kind` (`"computer-analysis"`), `status` | |
| `createdAt`, `updatedAt`, `startedAt`, `finishedAt` | ISO; `startedAt` the first run's, kept across a resume; `finishedAt` done, failed or cancelled. |
| `engine` | `{ id, name, version }` of the engine that **actually ran** — the options' choice, or the one it fell back to; `null` until it first runs. |
| `positions` | A `JobPosition` per searched position — FEN, ply, the move played from it (`san`), whether that move is analysed: the screen's words, and the FENs a resumed job is checked against. **The record keeps FENs, never node ids** (they do not survive a PGN round trip). |
| `checkpoint` | A `PositionResult` per position, by index, `null` where it has none — **the checkpoint unit** — always as long as `positions`; an entry about another FEN reads as missing. |
| `source` | `{ projectId, caseId, name, pgn }` — the Case, its name as shown, its tree **as the board held it when sent**. |
| `options` | `ComputerAnalysisOptions` — the engine (`engine`) and the search **as the popup left it**: depth, move time, Threads, Hash, lines. |
| `preset` | `{ id, name, values }` — the engine's preset the job was given, its values (`presetSentValues`) as they were then. **The runner sends these**, never whatever preset is selected when it runs. |
| `target` | `{ kind: "project", projectId }` (new Cases beside the source), `{ kind: "other", projectId }` (new Cases in another Project — a row from before the rename, `linked`, reads as it), or `{ kind: "case" }` (merged into the source Case — **one** variant: `jobV2Of` refuses more). Every new Case is linked from the source Case. |
| `outputs` | `{ variant, projectId, caseId }` — the new Cases, or the source Case merged into. |
| `error` | `source` (the PGN no longer reads, or its positions changed), `engine` (no handle, no `uci` answer, silence, no scored line), `storage`, `too-many` (the Cases' cap), **`target`** (where the results were to go is gone — the other Project, the source Case) — `analysisV2.jobs.errors.<code>`. |

`jobV2From` reads a row leniently: dropped without an id, the kind, its Case
or its positions; an unknown status reads as `interrupted` (never run
unasked); a target that will not read is new Cases beside the source, a
preset that will not read none; the options are clamped as a form's are.

### 6.2 The store — `lib/jobV2Store.ts`

The `jobs` object store of this database (`enqueueJobV2` — the popup's one
call, answering the job's id or `"invalid"`, `"storage"`, `"too-many"` —
`addJobV2`, `updateJobV2`,
`pauseJobV2`, `cancelJobV2`, `resumeJobV2`, `removeJobV2`,
`interruptRunningJobsV2`, `findJobV2`), the cap `MAX_JOBS_V2` (100), and
`removeJobsV2Of({ projectIds, caseIds })` — what a Case's or Project's
delete calls. Past the cap the oldest **finished** jobs go; when every job
kept is unfinished it refuses. Pause, Cancel, Resume and Delete are **store
writes, never calls into the runner** — the runner, in whichever tab holds
it, reads the change and acts, so one tab's screen cancels another tab's run.
Every write idempotent.

### 6.3 The runner — `lib/jobV2Runner.ts`

- **One per page, started by the shell** (`JobV2Runner`, an effect — never
  during render, so the pre-render starts none; never stopped by an effect
  cleanup, so a StrictMode remount does not leave a job half run). **Nothing
  at module scope** (`engines/noWorkerAtImport.test.ts`).
- **One tab runs jobs**: it holds the Web Lock
  `chessapp.analysisProjects.jobs.runner` for the page's life; another tab's
  waits and takes over when this one closes (where there is no Web Locks
  API — jsdom — every runner runs). **Taking over** turns every `running` job
  into `interrupted` (`interruptRunningJobsV2`): **never resumed unasked** —
  an engine run is heavy on CPU; the reader presses Resume.
- **One job at a time, the oldest queued first.** A run claims its job,
  re-parses the source (`jobSearchOf`) and checks its positions against the
  record's — a mismatch fails it `source`.
- **Its own engine**: `resolveEngine(options.engine)` — the default where that
  engine is gone or cannot run here, as a board falls back; a `hosted:…` id
  waits for the engine server's list first; built lazily, separate from any
  board's. After the `uci` answer (30 s) `Threads`, `Hash` and before each
  search `MultiPV` (the position's own), **each clamped to what the engine
  declared**, and beside them **the job's preset**
  (`resolveEnginePreset(job.preset.values, …)`, those three never taken from
  it). The protocol discipline is the handle's ([`chessboard.md`](./chessboard.md) §4.1).
- **The eval sources first** (CTA-193's lichess evaluation API, the app's
  since CTA-196 — §6.9, [`docs/engine.md`](../../docs/engine.md) §10), while
  Settings → Engine turns one on: a position not answered without a search
  (below) is looked up there before the engine is built or asked.
- **Each position**: `search(fen, { depth, movetime })`, every `info` for that
  FEN folded in, the early stop one `stop()`, the `bestmove` ending it; a
  mate or stalemate, and a position whose move is not analysed and whose
  stored `[%eval]` is as deep as asked, are not searched. Then **the
  checkpoint**, only while the job is still `running`.
- **Stopping**: the job no longer `running` or `queued`, or gone, aborts the
  run at once — `stop()`, the handle terminated, nothing more written.
- **Failing**: no handle, no `uci` answer in 30 s, 120 s of silence, or a
  search ending with no scored line → `failed`, `engine`; the checkpoint
  stays, so Resume goes on from it.
- **Quiet is not silent** (CTA-194): deep in a search Stockfish prints
  nothing for minutes (at depth 32+, MultiPV 5, one thread, one root move
  took 191 s), so an engine server's engine sends a **heartbeat** while it is
  alive but quiet — the server's `isready` answered mid-search, every 15 s of
  silence ([`docs/engine.md`](../../docs/engine.md) §8). `HostedEngine` hands
  it on as an `EngineMessage` with `heartbeat: true`; the runner hears one
  about the position it searches as it hears an `info` line — the silence
  timer starts again, the live snapshot's `heardAt` moves on — and changes no
  line, depth or score. A server whose engine died sends none and fails
  within the timeout as before; so does an older server, and an in-browser
  engine never sends one. Every other `onMessage` consumer ignores it
  (`useEngineModule` returns on it).
- **At the end**, the handle terminated, **by its target**:

- `project` / `other` — the Project must still be there (else `target`);
  each ticked variant a new **Game Case** (`gameCaseOf` over
  `jobV2AnalysisOf` of the source as sent), named `jobV2OutputName` —
  "<case> - computer analysis (<variant>)" — in one `addAnalysisCases`, then
  **each linked from the source Case** (`addCaseLinks`; a refused link leaves
  the Case unlinked and the job done — the Cases are made).
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
  existing* (the Jobs V2 view at it).
- **The engine and its preset, each a select** (as the top bar's Engine menu
  offers them: `describeEngines()`, every preset; `ComputerAnalysisForm`'s
  `engineChoice`) — seeded from **the Jobs settings' default** where one is
  set and its engine runs here and its preset is still there
  (`defaultPresetInEffect`, CTA-193), else the board's engine and its
  selected preset — **prefill** the depth and time per move from the preset
  (`presetSearchOf`) and Threads, Hash and lines from the global search
  settings; all stay editable for this one job; changing the engine (its
  selected preset with it) or the preset prefills the two again. The rest of
  the form (`ComputerAnalysisForm`): lines, the early stop's depth, the
  variation range, the side, the first and last move, the thresholds, the
  variants.
- **Where to save the results** (`JobTargetFields`, a section before the
  form): **new Cases in this Project**; **another project** — a **new** one
  (its name asked, "<Case> — analysis" offered — named after the Case, not
  its Project; made on Start in the source Project's folder) or an
  **existing** one; or **into this Case** — the form then offers **one
  variant** (radios, `singleVariant`). Every new Case, here or there, is
  linked from the source Case. A new Project with no name, or none picked,
  keeps Start off with the reason (`startBlockedNote`).
- **Start** queues it (`enqueueJobV2`), closes, and a snackbar's *Open in
  Jobs V2* goes to the job. A refusal stays in the dialog, a Project made for
  it taken back.

### 6.5 The Jobs V2 view — `/analysis/jobs` (`?job=<id>`)

`JobsV2Screen`: two tabs over the square (CTA-193) — **Jobs**, the list, and
**Settings** (`?tab=settings`, §6.9); the list (`JobsTable` over
`JobV2`) in the square, newest first, Resume / Pause / Cancel / Delete; one
job (`JobSummary` over `JobV2`) in the aside — its status, progress, why it
failed, **Open the Case** (its source, while it is there), **links to its
results** (each new Case; the other Project; the source Case "the analysis
merged in"), its parameters with **the preset** and **where the results go**
(`extraFacts`), and on Results a done job's **report and eval graph** read
back from its first output Case (`JobV2Report`, the graph read only) or
another's **results so far** (`JobV2LiveReport`, `jobV2LiveAnalysis` — it
fills in with every checkpoint; nothing in it a live region); while
it runs, **its engine live** under the progress bar (§6.7). Delete asks
first and keeps the Cases.

**The header indicator** (`JobsV2Indicator`) — "Jobs V2 12/80" while one
runs, "Jobs V2: N queued", a link to the Jobs V2 view, announced politely
and only on a change of status (never the progress, nothing for the first
read); under the breakpoint an icon alone, named in full. While the engine reports
on the running job (§6.7) its spinner **beats** and the numbers join its name.

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

### 6.7 Live engine progress (CTA-190)

A position at depth 30 or a long move time takes minutes, and the checkpoint
moves only once per position — so a running job shows **what its engine is
saying now**, from the engine's own `info` lines (real callbacks, never an
animation standing in for them), for an in-browser engine and an engine
server's alike (both reach `parseEngineLine`).

- **Parsed**: `EngineMessage` carries, optionally, `nodes`, `nps`, `time`,
  `seldepth`, `hashfull`, `currmove` / `currmovenumber` — read off an `info`
  line, before its `pv` only ([`chessboard.md`](./chessboard.md) §4); absent,
  today's message.
- **Published, never stored**: the runner's `searchPosition` builds a
  `JobV2Live` from every word about its position — the job and position
  index, the move label (the progress caption's, `jobMoveLabel`), depth /
  seldepth, nodes, nps, hashfull (a field a line lacks keeps the last one —
  a `currmove` line has no counts), the elapsed time (the engine's `time`,
  else the runner's clock, never going back), the best line's score and
  first six moves in SAN, the time heard — into a **throttled feed**
  (`createJobV2LiveFeed`: the first word at once, then at most one per
  250 ms, the interval's last), **cleared** however the position ends —
  its `bestmove`, the job paused, cancelled, deleted or failed, the runner
  stopped. The jobs store is still written once per position.
- **Every tab**: the feed posts each snapshot on
  `chessapp.analysisProjects.jobs.live` (`BroadcastChannel`; the runner lives
  in the one tab holding the lock), again every second while a position is
  searched; another tab drops a snapshot nothing has followed for 4 s (the
  runner's tab closed).
- **Shown only for a `running` job it names** (`liveOfJob`): the Jobs V2
  view's panel, under the progress bar, `JobEngineProgress` through
  `JobSummary`'s `live` slot — the move, **that the engine is alive** (a
  mark that beats once each time it is heard, and "Engine alive · heard 3 s
  ago" from `heardAt` on the block's own one-second clock — CTA-194), depth /
  seldepth, nodes, nps ("2.4M"), the time on this position, the hash, the
  best line and score; its status region announces the move and every tenth
  depth, never each update, the beat or the time since. The header's
  indicator beats with it and adds "depth 22, 3.1M nodes" to its name,
  unannounced.
- **The beat** (`useEnginePulse`, `blocks/panels/JobEngineProgress/enginePulse.ts`,
  CTA-194): one opacity beat each time `heardAt` moves on — an `info` line or
  a heartbeat — four of the theme's `transitions.duration.complex` long and
  never cut short (a word heard during a beat starts none), so a busy engine
  beats steadily and a quiet one once per heartbeat; timed by `heardAt`, so
  every tab beats alike; still under reduced motion (the words carry it).
  The heartbeat is published like a line, so another tab sees it too.

### 6.9 The Jobs settings, and the eval sources a job asks first (CTA-193, CTA-196)

The Jobs V2 view's **Settings** tab (`/analysis/jobs?tab=settings`,
`JobsSettingsTab.tsx` over the `JobsSettingsForm` block) holds Jobs V2's own
preferences, one `localStorage` key, `chessapp.jobsSettings`
(`lib/jobsSettings.ts`; [`database.md`](./database.md) §2, both legal pages):

- **The default engine and preset for new jobs** — a switch, *Use a default
  engine and preset*, turned on from the board's engine and its selected
  preset, then the two selects. New Job V2 seeds from it (§6.4); unset — or
  naming an engine that does not run here or a preset gone — a new job starts
  as before, and the pair stays stored.
- **Evaluation sources** — a line saying a job asks them first, and a link to
  **Settings → Engine**, where they are set for the whole app.

**The lichess evaluation API** — a FastAPI server over the lichess evaluation
database (the `lichess-eval-db-api` repository, outside this one) — was this
tab's in CTA-193; **CTA-196 made it the app's**: an eval source of the generic
layer `lib/evalSources/` (its plugin `lib/evalSources/lichess/`), set in
Settings → Engine ([`settings.md`](./settings.md) §4), kept in
`chessapp.lichessEvalApi` (a reader's old `chessapp.jobsSettings.evalApi`
moved there on the first read), and asked by **every analysis search** — the
boards' through the `EngineHandle` decorator, the jobs' by the runner. The
layer, the decorator, the eligibility rule, the client and adding or removing
a source are [`docs/engine.md`](../../docs/engine.md) §10. What a job does
with it is unchanged:

- **The runner asks first** (`lib/jobV2Runner.ts`, `askEvalSources`): for a
  position not answered without a search (a terminal one, a deep enough
  stored `[%eval]`), the enabled sources in order — the lichess API's
  `GET /fen?fen=<4-field FEN>&best=true` (5 s, given up when the job stops).
  An eval **at the job's depth or deeper** is the position's result: its lines
  up to the position's `MultiPV`, each the eval's depth and score (White's
  view), its UCI line with the API's king-takes-rook castling written as the
  engine's and cut at a move that does not play — checkpointed like a search,
  so the outputs read like an engine's (§6.6). No engine is built until a
  position needs one: a job the sources answer whole starts none. **A miss or
  a shallower eval** — the engine searches it. **No usable answer** — the run
  goes on with the engine, that source left alone for the rest of the run
  (writes too), said once (`reportEvalSourceUnreachable`, `kind: "read"`): the
  shell's `JobV2Runner` shows a warning snackbar naming the source, with a
  link to Settings → Engine.
- **Write-back** (`recordInEvalSources`): while the API's *Enable evaluations
  Write API* is ticked, each position **the engine searched** in a job (never
  one a source answered, a terminal one or a stored `[%eval]`, nor one
  shallower than the API's *Minimum depth to write*, 35 by default — skipped,
  not refused, CTA-202) is sent after its search as one `POST /evals` entry — its FEN, line 1's depth, the nodes
  in thousands, `pov: "white"`, its lines' scores and UCI moves, the engine's
  name. **A write not taken** (403 — no write mode, 401, 422, no answer) —
  the run goes on without sending to it, said once (`kind: "write"`). A write
  token (`LICHESS_API_WRITE_TOKEN`) is not supported — run the API without
  one.
- **CORS**: the browser asks another origin, so the API must answer with
  CORS headers (`--cors-origins`, `*` by default, in its own repository);
  the tests stub `fetch`.

### 6.8 Invariants and testing

1. **The runner is the shell's, never a board's** — one per page, one job at
   a time, one tab running jobs. **The store is the only channel** between a
   screen and it.
2. **A checkpoint per finished position**; a resume never searches a position
   that has one; **never resumed unasked**.
3. **A job builds its own engine handle** and terminates it when it ends, is
   cancelled, deleted or fails. **Nothing at module scope.**

- **The runner** (`jobV2Runner.test.ts`) mocks `lib/engines/builtin` with
  the harness's `builtinEnginesMock` and drives each `FakeEngine` by hand —
  `engine.say({ fen, depth, multipv, positionEvaluation, pv })` then
  `{ fen, bestMove }` — with `createJobV2Runner({ useLock: false })`, stopped
  and awaited after each test; wait with `vi.waitFor` on the store.
- **The teardown** (`src/test/setup.ts`) stops the page's runner
  (`stopJobV2Runner`) before the stores settle, then deletes
  `chessapp.analysisProjects` with the others.
- **The screens** (`JobsV2.test.tsx`) seed the store (`addJobV2`, a partial
  checkpoint through `withCheckpointV2`) and assert by role and name.

## 7. Links between Cases (CTA-188)

A **directed many-to-many self-relation between Cases**, across Projects: a
Case **links to** another (`CaseLink { id, fromId, toId, createdAt }`, the
`caseLinks` store), which is **linked from** it; never to itself, never the
same pair twice, cycles allowed, removed with either Case (and so with its
Project).

- **Made** by a Jobs V2 computer analysis — its source Case links to every
  new Case it makes (§6.3) — and by the reader's **Link a case**.
- **Shown on the Case view's Linked cases tab** — Settings' own, beside Info (CTA-199; `CaseLinks`):
  *Links to* and *Linked from*, each Case a link to its board with its
  Project's name, and **Unlink** (`unlinkAnalysisCases`); none, "No linked
  cases yet". A refused Unlink is said under them.
- **Link a case** (the Linked cases tab) opens `CasePickerDialog`, two
  autocompletes built for hundreds of Projects and thousands of Cases
  (CTA-199): a Project typed to find (the Case's own first; Projects with
  nothing to pick left out; cleared, any Project), then a Case typed to find
  among its Cases — every Project's, grouped, with none chosen — or **by its
  id, or its address pasted, in any Project** (which becomes the chosen one);
  at most 50 listed at once. Every Case but this one and those it links to
  already; **Link** (`linkAnalysisCases`, this Case → that one). A refusal
  stays in the dialog.
- Export / Import carry them (§5).

CTA-188 first linked **Projects** (a `projectLinks` store, the Project
screen's lists, the popup's "a linked project"); that was a planning mistake,
replaced by this before it shipped — the database's version 3 leaves a
version-2 store of them unread, and a job row's `linked` target reads as
`other`.

## 8. What CTA-192 removed

The legacy Analysis Board (`/tools/analysis`), Saved analyses
(`/tools/analysis/saved`, a record's settings screen) and Jobs (`/jobs`) —
their screens, stores (`chessapp.analyses`, `chessapp.jobs`, deleted on
load), blocks (`SavedAnalysesTable`, `SavedAnalysesList`, `AnalysesTree`),
locale keys and rules files (`analysis-board.md`, `jobs.md`). What V2 used
was folded in: the jobs' record into `jobsV2.ts`, their live analysis into
`jobV2LiveAnalysis.ts`; `JobsTable`, `JobSummary`, `NewJobDialog`,
`ComputerAnalysisForm`, `ComputerAnalysisReport` and `EvalGraph` are Jobs V2's
now. The Load tab moved into the Openings explorer (`OpeningsLoad.tsx`), the
`?at=` line builder into `lib/repertoireLink.ts` (`lineTreeOf`), the
placeholder player into `lib/gameModel.ts` (`ANALYSIS_PLACEHOLDER_PLAYER`).
Export lost the `analyses` category; Import counts an older zip's
`analyses.pgn` (`ImportDump.skippedAnalyses`), skips it and says so. The old
URLs are unknown routes — no redirect.
