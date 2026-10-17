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
  - "src/lib/analysisProjectPickerRows*"
  - "src/blocks/tables/CasesTable/**"
  - "src/lib/analysisCaseRows.ts"
  - "src/blocks/dialogs/NewCaseDialog/**"
  - "src/blocks/dialogs/GamesPickerDialog/**"
  - "src/blocks/dialogs/NewProjectDialog/**"
  - "src/blocks/dialogs/ProjectPickerDialog/**"
  - "src/lib/evalSources/**"
  - "src/lib/analysisCaseLinkStore*"
  - "src/blocks/lists/CaseLinks/**"
  - "src/blocks/dialogs/CasePickerDialog/**"
  - "src/blocks/panels/ComputerAnalysisReport/**"
  - "src/blocks/panels/EvalGraph/**"
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

# Analysis V2 — Projects and Cases (CTA-186), linked Cases (CTA-188), the browser's Cases and picks (CTA-191), shipped (CTA-192); a Case's computer analysis a job of the Jobs module (CTA-221, [`jobs.md`](./jobs.md))

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
                                   └──┘  └──▶ a computer-analysis job (the Jobs module) ──▶ new Cases (here | another Project) | the Case itself
                                   links (Case → Case, across Projects)
```

**A Case's computer analysis** is a job of the **Jobs module** (CTA-221,
[`jobs.md`](./jobs.md) — Jobs V2 of CTA-188 to CTA-196 before; §6 is the
Case's side of it); **links** (§7) are a directed
many-to-many relation between Cases, across Projects. (CTA-188 first linked
Projects; that was a planning mistake, replaced before it shipped.) **Every
other screen hands a game to Analysis as a new Case** (§1.1).

---

## 0. Where to look

| Path | What lives there |
| --- | --- |
| `src/lib/analysisProjects.ts` | **The records**, pure: `ProjectFolder` (a `GameFolder`, `lib/savedGameFolders.ts`'s model and reads), `AnalysisProject`, `AnalysisCase` and its `AnalysisCaseSource`; the normalisers `projectFolderFrom`, `analysisProjectFrom`, `analysisCaseFrom`; the constructors `gameCaseOf`, `positionCaseOfFen`, `positionCaseOfGame`, `copiedCase`; `caseStateOf` / `sameCaseState` (the autosave's state and its idempotency); `caseDerivedName`, `gameCaseDerivedName`; `projectsHere`, `projectsUnder`, `casesOf`, `caseCountsOf`; a Project's order (CTA-203, §2.1) — `byCaseOrder`, `casesInOrder`, `appendedCases`, `withCaseOrders` (the backfill), `compactedCaseOrders`, `reorderedCases`; the caps (`MAX_PROJECT_FOLDERS` 100, `MAX_ANALYSIS_PROJECTS` 1,000) and **a Project's soft limit of Cases** (`MAX_CASES_PER_PROJECT` 1,000, `passesProjectCaseLimit` — CTA-225, §3.5; the app-wide `MAX_ANALYSIS_CASES` of 10,000 is gone). |
| `src/lib/analysisProjectPickerRows.ts` | **The Project picker's rows** (CTA-226, §3.2): `projectPickerRowsOf` (every Project, its folder path — each folder walked once — and its count of Cases), `filteredProjectPickerRows` (every word in the name or the path), `sortedProjectPickerRows` (Name, Folder, Cases, Updated; ties by name). Pure; the screens' binding is `useProjectPickerRows(active)` (`useAnalysisProjects.ts`), which reads the folders and the Cases only while the picker is open. |
| `src/lib/analysisProjectPicks.ts` | **The browser's picks** (CTA-191, §3.1): one set of ids over folders, Projects and Cases — `projectPicksOf` (each box's state), `toggleProjectPick` / `setProjectPicks` (a row's tick, select-all's), `projectPickTargetOf`, `projectPicksDeletion` (what a delete takes and how many of each go). Pure. |
| `src/lib/analysisProjectsDb.ts` | The `chessapp.analysisProjects` database, **version 3** (CTA-188): object stores `folders`, `projects`, `cases`, `jobs` (Jobs V2's — retired in CTA-221, unread, kept so the version stays 3) and `caseLinks`, one `BroadcastChannel`. |
| `src/lib/jobs/kinds/computerAnalysis/` | **A Case's computer analysis, a job kind of the Jobs module** (CTA-218's core, CTA-221's adapter — [`jobs.md`](./jobs.md)): its input (the Case's tree as sent), its state, its outputs (new Game Cases linked from the source, or the merge into it — `analysisOf` / `mergedPgnOf`). The Case's side: its Jobs tab (§6), `mergeIntoAnalysisCase`, an open board taking a merge in (§6). |
| `src/lib/analysisCaseLinkStore.ts` | **The links between Cases** (CTA-188, §7): `linkAnalysisCases`, `addCaseLinks` (several at once — a job's new Cases), `unlinkAnalysisCases`, `removeLinksOfCases`, `importCaseLinks`; the record `CaseLink` and `caseLinksOf` in `analysisProjects.ts`. |
| `src/lib/analysisProjectFolderStore.ts`, `analysisProjectStore.ts`, `analysisCaseStore.ts` | **The stores** over `idbRecordStore` ([`database.md`](./database.md) §3): folders oldest first, Projects and Cases newest first; every operation a promise of `undefined` or `"storage"` / `"too-many"` — the Cases' never `"too-many"` (no cap since CTA-225). |
| `src/lib/retiredDatabases.ts` | **The databases the app no longer keeps** (CTA-192): `chessapp.analyses` and `chessapp.jobs`, the legacy module's, deleted on every load (`src/main.tsx`, `deleteRetiredDatabases`). |
| `src/views/analysisV2/useSendToAnalysis.tsx` | **A game handed to Analysis** (CTA-192, §1.1): `useSendToAnalysis(testId)` → `{ send, dialog }` — the Project picker, the Game Cases written, the Case (or Project) opened. Every other screen's way in. |
| `src/views/analysisV2/useProjectCaseLimit.tsx` | **A Project's limit of Cases, asked about** (CTA-225, §3.5): `useProjectCaseLimit(testId)` → `{ check, dialog }` — New project's, New case's and `useSendToAnalysis`' one check before any work: under the limit straight on, past it the `ProjectCaseLimitDialog` (a Library collection of the games instead, Create anyway, Cancel). |
| `src/views/analysisV2/` | **The screens**: `ProjectsBrowser.tsx` (`/analysis`), `ProjectScreen.tsx` (`/analysis/projects/<id>`), `CaseWorkspace.tsx` (`/analysis/projects/<id>/cases/<caseId>`; its `CaseBoard` the board; the Case view's links and their picker, §7), each behind a layout-only `…Main.tsx`; `useAnalysisProjects.ts` (the store bindings — `useCaseLinks` too), `paths.ts` (the addresses). (Jobs V2's `jobs/` folder went in CTA-221: the Jobs screens are `views/jobs/`, [`jobs.md`](./jobs.md).) |
| `src/blocks/tables/ProjectsTable/` (its rows `lib/analysisProjectRows.ts`), `src/blocks/trees/CaseSiblings/`, `src/blocks/panels/CaseDetails/`, `src/blocks/panels/ProjectDetails/` (CTA-213), `src/blocks/tables/CasesTable/` (`caseDisplayName`; its rows `lib/analysisCaseRows.ts`), `src/blocks/dialogs/NewProjectDialog/`, `NewCaseDialog/`, `GamesPickerDialog/` (CTA-208), `ProjectPickerDialog/` (a table since CTA-226; and the Library's `CollectionImportDialog`, `choiceOnly`), `ProjectCaseLimitDialog/` (CTA-225, §3.5); since CTA-188 `src/blocks/lists/CaseLinks/`, `src/blocks/dialogs/CasePickerDialog/` | The blocks, built in the gallery on fixtures first ([`docs/design/hierarchy.md`](../../docs/design/hierarchy.md)). The folder dialogs (`FolderNameDialog`, `FolderMoveDialog`) and `FolderActions` are the app's own, reused — and `ComputerAnalysisReport` and `EvalGraph` (the Case view's Graph tab). The computer-analysis job's blocks (its form, `JobTargetFields`, `JobEngineProgress`) and the Case's Jobs tab's `EntityJobs` are [`jobs.md`](./jobs.md)'s. |
| `src/views/board/core/useAnalysisSession.ts`, `useTreeNavigation.ts`, `src/views/shared/nextMoveArrows.ts`, `src/views/shared/AnalysisEvalReport.tsx` | **Moved out of the legacy module** (CTA-186) so that its removal takes nothing V2 needs — the session the Case's board composes, the core's navigation, the next-move arrows the explorer draws, the eval graph and report the Case view's Graph tab shows. |
| Tests | `src/lib/analysisProjects.test.ts` (records), `src/lib/analysisProjectRows.test.ts` (the browser's rows — its Cases, CTA-191), `src/lib/analysisProjectPicks.test.ts` (its picks, CTA-191), `src/lib/analysisProjectStores.test.ts` (the stores — the Case links, a delete's jobs and links, the database's upgrade from versions 1 and 2, CTA-188), `src/lib/jobsV2.test.ts`, `jobV2Store.test.ts`, `jobV2Runner.test.ts` (Jobs V2; its live progress and throttling, CTA-190), `jobV2Live.test.ts` (the feed, the channel, a stale snapshot dropped), the engine server's heartbeat in `jobV2Runner.test.ts`, `hostedEngine.test.ts`, `JobEngineProgress.test.tsx` and `JobsV2Shell.test.tsx` (CTA-194), `jobsSettings.test.ts` (CTA-193; the old `evalApi` kept for its move, CTA-196), `lib/evalSources/lichess/api.test.ts` (the client — the FEN, the mapping, a 404, the timeout, a bad body) and the rest of the layer's tests ([`docs/engine.md`](../../docs/engine.md) §10.5), the runner's API cases in `jobV2Runner.test.ts` (through the layer), `JobsSettingsForm.test.tsx`, `uciEngine.test.ts` (the progress fields parsed), `src/views/analysisV2/jobs/JobsV2.test.tsx` (the Case's Jobs tab and popup, a merge into an open Case, a Case's links in its Linked cases dialog, the Jobs V2 view; the Jobs settings tab — its link to Settings → Engine, CTA-196 — and New Job V2's default, CTA-193), `JobsV2Shell.test.tsx` (the indicator; its heartbeat and live name, CTA-190; an eval source's warning, CTA-193, CTA-196), the blocks' own, `src/views/analysisV2/AnalysisV2.test.tsx` (the three screens over the real stores), `src/lib/dataExport.test.ts` / `dataImport.test.ts` / `src/views/settings/ImportTab.test.tsx` (the category), `src/views/board/boards.test.tsx` and `panelPropagation.test.tsx` (the Case's board in the set), `src/views/legal/legalDocuments.test.ts` (the database named in both pages, the retired ones in neither), `src/lib/retiredDatabases.test.ts`; **the hand-offs** (§1.1): `OpeningsBoard.test.tsx`, `PlayWithEngine.test.tsx`, `PlayedGames.test.tsx`, `Library.test.tsx` (the game board's Open in Analysis and a shipped game's copy), `LibraryPicks.test.tsx` (the batch), `StoredGameEmbed.test.tsx` and `EmbedSource.test.tsx` (an embed's Case address and its Open in Analysis), `ProjectPickerDialog.test.tsx` (the New project entry; the table — words, sort, pages, the choice kept, CTA-226), `analysisProjectPickerRows.test.ts` (its rows); **the picks' move** (CTA-226): `analysisProjectStores.test.ts` (`moveAnalysisCases` — order, compaction, skips), `AnalysisV2.test.tsx` (the selection bar's Move, a refusal, no other Project); **a Project's limit of Cases** (CTA-225, §3.5): `analysisProjectStores.test.ts` (no cap past 10,000), `ProjectCaseLimitDialog.test.tsx`, `AnalysisV2.test.tsx` (New project, New case), `useSendToAnalysis.test.tsx` (the hand-off), `dataImport.test.ts` (an import of any number). |

Locale keys: `analysisV2.*` (`browser`, `folder`, `project`, `case`,
`newCase`, `workspace`; `links` — CTA-188; `caseJobs`, the Case's Jobs tab — CTA-221; a job's words are `jobs.*`, [`jobs.md`](./jobs.md)), `nav.folders.analysisV2`, `nav.analysisProjects`,
`pages.analysisProjects` / `analysisProject` / `analysisCase`, the hand-off's `analysisV2.sendTo.*` and
`analysisV2.case.newProject*` (CTA-192), each sending screen's new Project name
(`openings.sendTo.projectName`, `playEngine.sendTo.projectName`,
`home.embed.projectName`), and the
category's `settings.export.categories.analysisProjects` /
`settings.import.top.analysisProjects` — in both catalogs. `options.id` is
`analysis-case`; the test ids are `analysis-v2-*` (the lists and the Cases table) and
`analysis-case-*` (the board), `analysis-case-jobs-*` and `analysis-case-new-job-*` (the Case's
Jobs tab and its New job).

---

## 1. In the app (shipped in CTA-192)

- **Routes**: three entries in `routes.tsx`'s shipped table — the browser
  (`/analysis`) and a Project (`/analysis/projects/<id>`) are
  `FULL_WIDTH_ROUTE`s; a Case's board (`…/cases/<caseId>`) is a board route.
  `/analysis` is static, so the pre-render writes it in every language, with
  its `pageDescriptions.analysisProjects` ([`static-pages.md`](./static-pages.md));
  the share section `analysis` is everything under `/analysis`
  (`src/assets/share/sections.ts`). Jobs V2's `/analysis/jobs` is an unknown
  route since CTA-221 (the jobs are `/jobs`, [`jobs.md`](./jobs.md)).
- **Sidebar**: one row, *Analysis*, after the Library, straight to the
  Projects lobby (`/analysis`) — the folder `analysis-v2`
  (`nav.folders.analysisV2`) is `singleEntry` (CTA-227), folded to its one
  screen (`nav.analysisProjects`, declared but not drawn) under its own name
  and icon, as Openings and Repertoires are: no toggle, no nested *Projects*.
  Active on `/analysis` only (an exact match — a Project or a Case lights no
  row); the Jobs module has its own row after it (CTA-228).
- **Export / Import**: the `analysisProjects` category, offered always (§5).
- **The legal pages** name `chessapp.analysisProjects`, in both languages;
  `legalDocuments.test.ts` holds them to it, and to naming neither retired
  database.
- **The browser pass** seeds a Project at the top level (a Game Case) and one
  in a folder (a Position Case) through its export zip (`e2e/a11y/seedZip.ts`)
  and visits the browser, a Project and a Case (`e2e/a11y/routes.ts`).
- **The legacy module's databases are deleted** on every load
  (`lib/retiredDatabases.ts`): `chessapp.analyses`, `chessapp.jobs`.

### 1.1 A game handed to Analysis — `useSendToAnalysis`

**Every other screen reaches Analysis by making a Case** — one hook,
`views/analysisV2/useSendToAnalysis.tsx`: `send({ games, projectName, onSent? })`
opens a **Project picker** (`ProjectPickerDialog` — the table of every
Project, §3.2 — with its `newProject` choice above it: *New project*,
chosen at first, named `projectName`, a name required), and its submit makes a **Game Case** of each game (`gameCaseOf`,
then the sending board's `nodeId` as the Case's `path`, its `orientation`, its
`display` where given) in the Project picked — or a new one at the top level —
in one all-or-nothing `addAnalysisCases` (a Project made for it taken back on
a refusal, said in the dialog, which stays open). Then the caller's
`onSent`, or — without one — one game **opens its Case**, several the
Project. The screen renders `dialog` once. **Past the chosen Project's
limit of Cases** (§3.5 — its Cases and these over 1,000, a new Project's
none) the picker's submit asks first, before any Project is made: a Library
collection of the games instead (each `SentGame`'s `pgn` where the sender
gives it — the Library's picks, the games as stored, `inLibrary` wording the
dialog — else the tree's), the Cases anyway, or back to the picker.

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
  new one; rename, move to another Project (the picks, CTA-226), duplicate,
  reorder and delete are the operations.

### 2.1 A Project's order (CTA-203)

A Project can be a tutorial — Chapter 1, Chapter 2, … — so **its Cases have
an order the reader sets**: `order`, a number on each Case, 1 the first,
within its Project (not "position": that is the Position Case). The store's
list stays newest first; the order is a field, read by `byCaseOrder` (a Case
without one last, ties oldest first then by id, so it is total).

- **A Case that arrives goes last** (`appendedCases`, in `addAnalysisCases`):
  a new one, a hand-off's (`useSendToAnalysis`), one moved in from another
  Project (several moved together in the order they had there, CTA-226), a duplicate, a computer-analysis job's result. A duplicated Project's copies keep
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
  everything in them (`removeProjectFoldersDeep`) — their unfinished jobs and links
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
- **one game** — a Project with that game as its one Game Case, on Create
  (the name still the reader's to change); a file that will not read is said
  as soon as it is picked;
- **several** — as soon as the file is picked (CTA-208, `onFilePicked`:
  no Create to press — a `.pgn` of several games, or a zip of several
  files), the Library's import popup opens on them
  (`CollectionImportDialog` with `choiceOnly`: what came in, the Elo / date /
  player filters and the count, no *Split by event*, no tournament mark) —
  and **Select games…** (CTA-208, `choiceOnly.selectGames`) opens the games
  picker (`GamesPickerDialog`, New case's) over **the games the filters
  keep**, numbered across a zip's files: the games picked there are the ones
  kept ("N games picked.", *Change the selection…*, *Use every game the
  filters keep*; a pick the filters later leave out is not kept) —
  and **Create project** makes a Game Case per game kept, in file order;
  Cancel goes back to the name.

**Making the Cases** (CTA-208): the games read in ~50 ms slices
(`parsePgnGameEntries`, a game that will not parse left out), their Cases
made the same way (`mapInSlices`), under a `ProgressDialog` over the popup
it came from ("Reading the games: 4,200 of 15,905", "Making the cases: …",
then "Saving the cases…" — Cancel on until the save, `useCancellableJob`),
then the Project and its Cases written. **Past the Project's limit of
Cases** (§3.5 — more than 1,000 games kept; the app's cap of 10,000 the
CTA-208 popup asked about went in CTA-225) it **asks first**, before any
work and before the Project is made ("These games make 15,905 cases — and a
project of more than 1,000 cases is slow…"): a Library collection of them
instead, *Create anyway*, or back to the choice. All or nothing: Cases the
store refuses take the Project back, and the popup says **exactly why** —
the browser's own words for its refusal (`lastAnalysisCaseWriteError`, the
record store's `lastWriteError`: "QuotaExceededError: …").

| On | Rename | Move | Duplicate | Delete |
| --- | --- | --- | --- | --- |
| a folder | `FolderNameDialog` | `FolderMoveDialog`, its subtree left out | — | its box, then the selection bar's Delete — always with everything in it |
| a Project | `FolderNameDialog` | `FolderMoveDialog` | named "‹name› (copy)", beside it, **with its Cases** (`duplicateAnalysisProject`) | its box — its Cases with it |
| a Case | (its Project's screen, §3.2) | (§3.2) | (§3.2) | its box |

A refused write is an `InlineAlert` under the header. A `?folder=` that names
no folder says so, with a way back.

### 3.2 A Project — `/analysis/projects/<id>`

**Its header's title is the browser's whole trail** (CTA-207, CTA-224 —
`Breadcrumbs`, the same name and labels — `analysisV2.browser.trail` /
`root` — as `ListScreenHeader`'s `heading`): the top level, every folder
from the top down to the Project's (`projectFolderPath`), each a link to the
browser there, then the Project's name, current and **the page's one `h1`**
(`currentComponent="h1"`; it wraps rather than cut); a Project at the top
level — or in a folder gone — reads root › Project. The Cases count under it,
the actions at the row's end; **no Back button** (CTA-224 took it, and the
trail's own row under the header) — the trail's links and the panel's Close
lead back. The screen waits for the folders' first read too.

**Its own panel, in the main menu's place** (CTA-213, `ProjectDetails` in the
shell's board left panel, `keepShell` — the header and footer stay, as on the
Case view; the shell draws a registered left panel on a `FULL_WIDTH_ROUTE`
too, before the whole body): a **Close** at its head (CTA-224 — an
`IconAction`, *Close ‹name›*, `analysisV2.projectDetails.close`; the block's
`closeLink`, the browser at the folder holding the Project, where Back led;
the Case list's Close, `CaseSiblings`', its model) before the Project's
name as its heading, then tabs —
**General** (a placeholder line) and **Options** (an example switch, held by
the screen and kept nowhere). A frame: its content is a later issue. Under
the shell's breakpoint it is a drawer, opened from an Info button in the
header (*The project's details*) and closed like the Case view's.

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
selection bar counts them and **moves them to another Project** together
(CTA-226 — *Move the picked cases to another project*, off with no picks or
no other Project) or deletes them together, asked first
(`DeleteManyDialog`, a failure said in it with the picks kept).

**The move** opens the Project picker (`ProjectPickerDialog`, "Move N cases
to another project", this Project left out) and writes once
(`moveAnalysisCases`): the Cases last in the chosen Project's order, in the
order they had here, this Project's order closed up behind them; their ids
stay, so their links and jobs are untouched. Then the picks are cleared and
a snackbar says how many went where, with *Open the project*; a refusal is
said in the dialog and the picks stay. **No limit is asked** (§3.5): a move
is no new work. **The picker is a table** (CTA-226), the same for the move,
a duplicate and Send to Analysis (§1.1): a wide popup, a words box (every
word in a Project's name or its folder path), then every Project as a row —
a radio, **Name**, **Folder** (its path, `Openings / Sicilian`), **Cases**
and **Updated**, each a sort header, Name A to Z at first — paged at 50
(`DEFAULT_TABLE_PAGE_SIZE`), only a page drawn, the filter and the sort
memoised (`lib/analysisProjectPickerRows.ts`, the rows built by the screen,
`useProjectPickerRows`). **One Project is chosen** — its radio, a click on
its row, or Enter / Space on the row — kept as the words, the sort and the
page change, and named under the table beside the buttons ("Into:
Openings / Najdorf", a `status`); the dialog opens on the page holding the
Project chosen at first (a duplicate's own). Its ids keep the old ones:
`<testId>-projects-<id>` a Project's row (`-radio` its radio),
`-projects-new` the New project choice, `-name`, `-project-name`,
`-problem`, `-into`, `-filter`. **New case** opens `NewCaseDialog`:

- **Game** — a PGN pasted or a `.pgn` or `.zip` picked (`PgnInput`, `zip`;
  a zip's `.pgn` files read together as one list of games, in its order —
  `readCollectionZip`; a zip unreadable, with no `.pgn`, no game or too
  large refused in words). **A file read takes the input's place** as a
  plate — its name, size and "N games read", and × (*Remove ‹name›*), which
  brings the file button and the paste box back to pick another; its text
  never goes into the paste box (a large one there froze the page); a file
  refused leaves the input, its problem under it. **Several games** (CTA-208): the dialog says *A case is
  represented by a single PGN file* and asks — **One case per game (N)**
  (the default; off past **1,000 games** — `MAX_CASES_AT_ONCE` in the
  dialog — a red ✕ in the option itself, "max (1,000) entries limit
  exceeded", part of its name; the group's one help line is a case each's,
  none under Select games) or **Select games**, which opens **the games
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

One new Case opens on its board; several stay on the list. **A batch that
takes the Project past its limit of Cases** (§3.5 — the Cases it holds and
these over 1,000; one game into a Project of 1,000 is enough) asks first, on
Create: a Library collection of the batch's games instead (each Case's tree
as PGN, named after the Project; New case closed), the Cases anyway, or back
to the dialog. A Case is renamed
(`""` gives it back its derived name) and duplicated into this Project or
another under a name ("‹name› (copy)", the picker above, its own Project
chosen first). **No row moves or deletes itself** (CTA-203 took the bin
away, CTA-226 the row's Move): the boxes and the selection bar's Move and
Delete are the one way — picking one row and Move does what the row's Move
did. The route waits for the stores' first
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
last round: inner tabs (the next-move arrows' and the move marks' on / off,
on top of it before, moved to Settings in CTA-211) — **Arrows**, the width source and palette (§3.4)
(`ArrowSettingsFields`), **Engine** — the engine's lines (`BoardPanel`'s
`showVariations`) — and **Accessibility**, the board's accessibility options,
a placeholder for now — all kept with the Case as its `display`, autosaved;
**Settings** — the Case view's tab since CTA-199, the board's settings alone since CTA-211 (`CaseSettingsTab`): the side the board faces, White / Black
(the Case's orientation), *Show next move arrows* and *Show move marks on the board* (its
`display.showArrows` / `showMoveMarks`, CTA-211 — the Display tab's before), the eval bar (its `display`) and *Write evaluations
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
  re-order). **A step is a quiet write** (CTA-222): a state that differs only
  in the move on screen (`onlyCasePathDiffers` — the reader stepping with the
  arrows or the panel's buttons) is written at once like any other, so a
  reload or a closed tab finds the last one, but this tab's subscribers are
  not called for it (the record store's `quiet`, [`database.md`](./database.md)
  §3.2) — the route is not redrawn a moment after every arrow press, which was
  the step's lag behind the Library board. **No saved / saving status**: the header speaks only when the
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
  (the whole of it when the words leave the open Case out). **Paged, 100 a
  page** (CTA-211 — a Project may hold thousands; `CASE_SIBLINGS_PAGE_SIZE`):
  past one page a `TablePager` under the list, its one size fixed
  (`pageSizes={[100]}`: "101–200 of 1,234" and the arrows, no select). The
  block pages the rows it is given and holds the page: it opens on the page
  holding the open Case, goes to that Case's page again when the Case changes
  (previous / next, a row) or the words do — the first page where they leave
  it out — and paging by hand changes no Case. It does not fold. The route
  builds the list's element itself, outside the board's `leftPanel` callback,
  so a step — which redraws the board and calls that callback — hands React
  the same element and leaves the list alone (CTA-222).
  Under the shell's breakpoint it is a drawer, opened from a list button in
  the board's header; the drawer is the route's state, so it outlives a step
  to another Case. Nothing locks it: a Case autosaves.
- **The panel's other screen, the Case's own view** (`CaseDetails`) — **where
  a Case opens** (CTA-199: no `?view=`; the list is `?view=list`,
  `withCaseView`, `paths.ts`, never carried back to the table; an older
  `?view=case` reads as the view). A row of the list picked — the open Case's
  too — opens that Case on it, and the panel shows the Case — **Back** to the list where the list has
  Close, its name and type, its details in **tabs** — **Info** (CTA-211,
  first, where a Case view opens: the Case's PGN tags as saved — `GameInfo`,
  the Library game board's Info tab; "no tags" when it has none — then a
  **Linked cases (n)** button, n its links both ways, opening a dialog
  (`BaseDialog`) of **its links** and Link a case — CTA-188, §7; `CaseLinks`,
  its heading out of sight under the dialog's title; Link a case opens
  `CasePickerDialog` over it), **Settings** (CTA-199: the board's settings,
  `CaseSettingsTab`, alone — its inner Info / Linked cases tabs went in CTA-211),
  **Graph**, the eval graph and report of the tree
  on the board (`views/shared/AnalysisEvalReport.tsx` — live, a click moves the board; disabled while the tree
  carries no `[%eval]`), **Display**, how the board draws (`CaseDisplayTab`,
  out of the right-hand panel), **Jobs** (CTA-188, §6 — the Jobs module's `EntityJobs` since CTA-221) — and previous / next at
  its foot, which keep the view — every Case opens on Info, a step to
  another one going back to it (CTA-211; the tab the screen's state). The
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

### 3.5 A Project's limit of Cases (CTA-225)

**The limit is a Project's, and soft**: `MAX_CASES_PER_PROJECT`, 1,000
(`lib/analysisProjects.ts`). A Project past it is slow — every Case of it is
read and listed — and a large set of games is what the Library is for. **The
store never refuses for a count** (`addAnalysisCases`, `importAnalysisCases`:
no cap; the app-wide 10,000 of CTA-186 and CTA-208's `pastCap` are gone).

- **Who asks** — the interactive adds alone, before any work, through one
  hook, `useProjectCaseLimit` (`check({ existing, count, collectionName,
  games, inLibrary?, proceed, onCollection? })`): **New project** from a file
  (§3.1, `existing` 0 — the Project is made only after), **New case** (§3.2,
  the Project's Cases), and **Send to Analysis** (§1.1, the chosen Project's,
  a new one's 0). At or under 1,000 it goes straight on.
- **Never asked**: a duplicate or a move of a Case or a Project, a
  computer-analysis job's outputs (its `too-many` error went with the cap),
  Settings → Import. They always go in.
- **The popup** (`ProjectCaseLimitDialog`, a block — `analysisV2.caseLimit.*`):
  how many Cases the add makes and — into a Project that has some — how many
  it would hold; that a Project past 1,000 is slow; a Library collection
  suggested. Three actions:
  - **Create a Library collection instead** (the primary): the same games
    indexed as the Library's import does (`indexCollection`, a
    `ProgressDialog` over the popup, Cancel on until the write) and kept as
    **one collection** at the Library's top level, named as the new Project
    would have been (else the Project's, else the sender's `projectName`),
    then opened (`/library/<id>`). No Case is made and no Project; a refusal
    is said in the popup. Games out of the Library (its picks, `inLibrary`)
    word it *Save them as a Library collection instead* and say they are
    there already; their PGNs are the stored ones, never re-written.
  - **Create anyway**: the Cases written past 1,000, as they would have been.
  - **Cancel**: back to the dialog it came from, nothing made.

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
| `cases` | newest first | **none** (CTA-225 — a Project's soft limit of 1,000 is the screens' warning, §3.5) | `addAnalysisCases` (all or nothing; each last in its Project's order), `moveAnalysisCaseInOrder` (CTA-203, §2.1 — no `updatedAt`), `renameAnalysisCase`, `moveAnalysisCases` (CTA-226 — the picks, one write; unknown ids and those there already skipped) and `moveAnalysisCase` (its one-id case), `duplicateAnalysisCase`, `removeAnalysisCases` (their unfinished jobs with them — the Jobs module's deletion rule, CTA-221; the gap closed), `saveCaseState` (the autosave, in place — never the tree of a state behind a merge, §6.6), `mergeIntoAnalysisCase` (a computer-analysis job's merge, §6), `importAnalysisCases` |
| `jobs` (CTA-188) | — | — | Jobs V2's — **retired in CTA-221**, left unread (the database stays at version 3; an upgrade never drops a store). The jobs are `chessapp.backgroundJobs`, [`jobs.md`](./jobs.md). |
| `caseLinks` (CTA-188) | oldest first | 50,000 | `linkAnalysisCases` / `addCaseLinks` (no self-link, no pair twice), `unlinkAnalysisCases`, `removeLinksOfCases`, `importCaseLinks` (§7) |

A delete runs folder → Projects → Cases → their unfinished jobs → their
links as writes queued one after another, which is why `src/test/setup.ts`
lets the writes settle five times over. A **Case or Project deleted takes
its unfinished jobs** (`removeUnfinishedJobsOf` → `runtime.removeUnfinishedOf`,
CTA-221 — a running one aborted; **finished jobs are kept**, their outputs on
their own, where Jobs V2 deleted them too) and **its links**
(`removeLinksOfCases`).

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
place by date, oldest first (`importAnalysisCases`, `withCaseOrders`). Jobs are not exported
([`import-export.md`](./import-export.md) §1.1, [`jobs.md`](./jobs.md)); their results are Cases, which are. On the way
in, folders are matched by their path of names and created where missing;
Projects clash by their folder like the collections (Merge / Override / Skip, a
folder's own choice over the category's); each Project brings its Cases, each
filed in it; an Override's Projects take their Cases with them; the Projects'
cap refuses the category — the Cases have none (CTA-225): an import takes any
number, unwarned. **The links** come after the
Cases: the zip's whose two Cases the app holds afterwards (Case ids are kept
by an import), the links of the Cases the import replaces or removes dropped
first (`importCaseLinks`). (An older zip's `analyses.pgn` — the legacy
saved analyses — is counted, skipped and said, §8.)

---

## 6. A Case's computer analysis — the Case's side (CTA-188; the Jobs module since CTA-221)

**The job itself** — its input, its checkpoint, the engine session, the
outputs, the retries, the screens — is the Jobs module's
`analysis.computer-analysis` kind: [`jobs.md`](./jobs.md) (§3 there). Jobs V2
(CTA-188 to CTA-196 — its record, store, runner, live feed, `/analysis/jobs`
and its blocks) was retired in CTA-221; its old records were dropped, not
migrated (their results are Cases, and stay). The analysis rules themselves
(positions, early stop, verdicts, the annotated trees, the report read back)
are [`pgn-annotations.md`](./pgn-annotations.md) §6. What stays Analysis's:

- **The Case's Jobs tab** (`CaseDetails`' fourth tab, `EntityJobs`): **New
  job**, then every job whose subjects include the Case, newest first — its
  title (a link to `/jobs/<id>`), kind, created, status and progress. New job
  opens the Jobs module's dialog (`useNewJob`) for the Case **on the board**:
  its tree as the board holds it travels as the dialog's `context`. The
  computer analysis's form is New Job V2's: a line when the Case has a job
  already (its status, a link), the engine and its preset seeded from the
  Jobs settings' default (else the board's), prefilling the depth and time
  per move, *Where to save the results* (`JobTargetFields` — new Cases here,
  another Project, a new one named "<Case> — analysis" made on Start, or into
  this Case, one variant), then `ComputerAnalysisForm`.
- **Its outputs are Cases**: each ticked variant a new Game Case, its id
  `<jobId>:<variant>` (applied twice, made once), named "<case> - computer
  analysis (<variant>)", **linked from the source Case** (§7); or the one
  variant **merged into the source Case** (`mergeIntoAnalysisCase`, the job's
  id in its `merges`). A Project or Case gone fails the job `target`.
- **Merging into the source Case** builds no tree merge of its own:
  `analysisOf` runs `computerAnalysisTree` over **the tree as it stands** —
  its positions read again, each given the job's checkpoint result for its
  FEN — so the reader's moves, side lines and comments are kept and every
  node keeps its id. **An open board** (`CaseBoard`) keeps the merges its tree
  holds; when the record lists one it does not, it applies the same merge to
  the tree it holds (the job's record read through `readComputerAnalysisJob`)
  — or, the job deleted since, loads the record's tree. Its autosave carries
  its `merges`, and **`saveCaseState` never writes the tree of a state behind
  a merge** (`isBehindMerges`).
- **The deletion rule** (§4): a Case or a Project deleted takes its
  **unfinished** jobs with it, a running one aborted; finished ones stay.

## 7. Links between Cases (CTA-188)

A **directed many-to-many self-relation between Cases**, across Projects: a
Case **links to** another (`CaseLink { id, fromId, toId, createdAt }`, the
`caseLinks` store), which is **linked from** it; never to itself, never the
same pair twice, cycles allowed, removed with either Case (and so with its
Project).

- **Made** by a computer-analysis job — its source Case links to every
  new Case it makes (§6) — and by the reader's **Link a case**.
- **Shown in the Case view's Linked cases dialog** — opened by the Info tab's *Linked cases (n)* (CTA-211; `CaseLinks`):
  *Links to* and *Linked from*, each Case a link to its board with its
  Project's name, and **Unlink** (`unlinkAnalysisCases`); none, "No linked
  cases yet". A refused Unlink is said under them.
- **Link a case** (in that dialog) opens `CasePickerDialog` over it, two
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
`ComputerAnalysisForm`, `ComputerAnalysisReport` and `EvalGraph` became Jobs V2's
— and Jobs V2 went in its turn in CTA-221, for the Jobs module ([`jobs.md`](./jobs.md)), `JobsTable`, `JobSummary`, `NewJobDialog` and `CaseJobs` with it. The Load tab moved into the Openings explorer (`OpeningsLoad.tsx`), the
`?at=` line builder into `lib/repertoireLink.ts` (`lineTreeOf`), the
placeholder player into `lib/gameModel.ts` (`ANALYSIS_PLACEHOLDER_PLAYER`).
Export lost the `analyses` category; Import counts an older zip's
`analyses.pgn` (`ImportDump.skippedAnalyses`), skips it and says so. The old
URLs are unknown routes — no redirect.
