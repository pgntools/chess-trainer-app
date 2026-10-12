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
  - "src/lib/analysisProjectRows.ts"
  - "src/blocks/tables/CasesTable/**"
  - "src/lib/analysisCaseRows.ts"
  - "src/blocks/dialogs/NewCaseDialog/**"
  - "src/blocks/dialogs/NewProjectDialog/**"
  - "src/blocks/dialogs/ProjectPickerDialog/**"
---

# Analysis V2 — Projects and Cases (CTA-186)

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
```

---

## 0. Where to look

| Path | What lives there |
| --- | --- |
| `src/lib/analysisProjects.ts` | **The records**, pure: `ProjectFolder` (a `GameFolder`, `lib/savedGameFolders.ts`'s model and reads), `AnalysisProject`, `AnalysisCase` and its `AnalysisCaseSource`; the normalisers `projectFolderFrom`, `analysisProjectFrom`, `analysisCaseFrom`; the constructors `gameCaseOf`, `positionCaseOfFen`, `positionCaseOfGame`, `copiedCase`; `caseStateOf` / `sameCaseState` (the autosave's state and its idempotency); `caseDerivedName`, `gameCaseDerivedName`; `projectsHere`, `projectsUnder`, `casesOf`, `caseCountsOf`; the caps (`MAX_PROJECT_FOLDERS` 100, `MAX_ANALYSIS_PROJECTS` 1,000, `MAX_ANALYSIS_CASES` 10,000). |
| `src/lib/analysisProjectsDb.ts` | The `chessapp.analysisProjects` database, version 1: object stores `folders`, `projects`, `cases`, one `BroadcastChannel`. |
| `src/lib/analysisProjectFolderStore.ts`, `analysisProjectStore.ts`, `analysisCaseStore.ts` | **The stores** over `idbRecordStore` ([`database.md`](./database.md) §3): folders oldest first, Projects and Cases newest first; every operation a promise of `undefined` or `"storage"` / `"too-many"`. |
| `src/lib/analysisProjectsEnabled.ts` | **The flag**: `ANALYSIS_PROJECTS_ENABLED = import.meta.env.DEV` — the module's Export / Import category in Settings — and **`analysisProjectStores()`**, the one way Settings reaches the three stores: dynamic imports under an *inline* `if (import.meta.env.DEV)`, `undefined` in a production build. Inline, because a dynamic import behind an imported constant is still followed by the bundler and its chunks emitted (orphaned) — one in a branch dead as written is not. Shipping the module is these two conditions (and §6). |
| `src/lib/exportCategories.ts` | `OFFERED_EXPORT_CATEGORIES` — the Export / Import categories this build offers (Analysis V2's only with the flag); apart from `lib/dataExport.ts`, which Node reads too (the browser pass's seed). |
| `src/views/analysisV2/` | **The screens**: `ProjectsBrowser.tsx` (`/analysis`), `ProjectScreen.tsx` (`/analysis/projects/<id>`), `CaseWorkspace.tsx` (`/analysis/projects/<id>/cases/<caseId>`; its `CaseBoard` the board), each behind a layout-only `…Main.tsx`; `useAnalysisProjects.ts` (the store bindings), `paths.ts` (the addresses). |
| `src/blocks/tables/ProjectsTable/` (its rows `lib/analysisProjectRows.ts`), `src/blocks/trees/CaseSiblings/`, `src/blocks/tables/CasesTable/` (`caseDisplayName`; its rows `lib/analysisCaseRows.ts`), `src/blocks/dialogs/NewProjectDialog/`, `NewCaseDialog/`, `ProjectPickerDialog/` (and the Library's `CollectionImportDialog`, `choiceOnly`) | The blocks, built in the gallery on fixtures first ([`docs/design/hierarchy.md`](../../docs/design/hierarchy.md)). The folder dialogs (`FolderNameDialog`, `FolderMoveDialog`) and `FolderActions` are the app's own, reused. |
| `src/views/board/core/useAnalysisSession.ts`, `useTreeNavigation.ts`, `src/views/shared/nextMoveArrows.ts` | **Moved out of the legacy module** (CTA-186) so that its removal takes nothing V2 needs — the session the Case's board composes, the core's navigation, the next-move arrows the explorer draws. The legacy screens import them from here. |
| Tests | `src/lib/analysisProjects.test.ts` (records), `src/lib/analysisProjectStores.test.ts` (the three stores), the blocks' own, `src/views/analysisV2/AnalysisV2.test.tsx` (the three screens over the real stores), `src/lib/dataExport.test.ts` / `dataImport.test.ts` / `src/views/settings/ImportTab.test.tsx` (the category), `src/views/board/boards.test.tsx` and `panelPropagation.test.tsx` (the Case's board in the set), `src/views/legal/legalDocuments.test.ts` (the dev-only database). |

Locale keys: `analysisV2.*` (`browser`, `folder`, `project`, `case`,
`newCase`, `workspace`), `nav.folders.analysisV2`, `nav.analysisProjects`,
`pages.analysisProjects` / `analysisProject` / `analysisCase`, and the
category's `settings.export.categories.analysisProjects` /
`settings.import.top.analysisProjects` — in both catalogs. `options.id` is
`analysis-case`; the test ids are `analysis-v2-*` (the lists and the Cases table) and
`analysis-case-*` (the board).

---

## 1. Dev-only while it is built

- **Routes**: three entries in `routes.tsx`'s `devRoutes`, each a
  `React.lazy` import behind `import.meta.env.DEV`, so a production build has
  no route and no chunk of it. The browser and a Project are
  `FULL_WIDTH_ROUTE`s; the Case's board is a board route.
- **Sidebar**: its own folder, *Analysis V2* (`analysis-v2`), with one entry,
  *Projects* (`/analysis`) — spreads in `navFolders()` / `navItems()` gated on
  `import.meta.env.DEV`.
- **Export / Import**: the `analysisProjects` category exists in the format,
  but only a build with the flag offers it (`lib/exportCategories.ts`), reads
  its stores (`analysisProjectStores()` — `lib/dataExportSource.ts`,
  `lib/dataImportTarget.ts`, `views/settings/useAnalysisProjectsCount.ts`)
  or reads its file out of a zip (`readImport`'s `categories`).
- **Not yet**: a pre-rendered page, an e2e a11y route, the legal pages'
  mention of `chessapp.analysisProjects` — `legalDocuments.test.ts` fails the
  day the flag stops being `import.meta.env.DEV`, to say the database must
  join the pages then.
- **Verify** after `yarn build`: `grep -rlE "analysisProjectStore|analysisCaseStore|chessapp\.analysisProjects|analysis-case|/analysis/projects|ProjectsBrowser|CaseWorkspace" dist/`
  finds nothing — no route, chunk, store or database name. The format's own
  code (`dataExport.ts` / `dataImport.ts`, the file name
  `analysis-projects.json`) and the catalogs' words are in the main chunk.

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
Map · Display · Settings · Export** (`PgnExportPanel`; **Display** is
`CaseDisplayTab`: the next-move arrows and the move marks on top, then inner
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

---

## 4. The store

`chessapp.analysisProjects`, version 1, a database of its own (apart from
`chessapp.analyses`, so the legacy module's removal takes nothing of it) —
[`database.md`](./database.md) §1. Every row is read through its normaliser
(a field an older row lacks reads as its default; a row without its identity
is dropped).

| Store | Order | Cap | Operations |
| --- | --- | --- | --- |
| `folders` | oldest first | 100 | `createProjectFolder`, `renameProjectFolder`, `moveProjectFolder` (never into its subtree), `removeProjectFolder` (keeps the contents: sub-folders re-parent, Projects re-filed up — `refileProjectsIn`), `removeProjectFolderDeep` (the subtree, `removeProjectsInFolders`), `addProjectFolders` (an import's, all or nothing) |
| `projects` | newest first | 1,000 | `createAnalysisProject` (a name required), `renameAnalysisProject`, `moveAnalysisProject`, `duplicateAnalysisProject` (its Cases first, all or nothing), `removeAnalysisProject(s)` (their Cases with them — `removeCasesOfProjects`), `importAnalysisProjects` |
| `cases` | newest first | 10,000 | `addAnalysisCases` (all or nothing), `renameAnalysisCase`, `moveAnalysisCase`, `duplicateAnalysisCase`, `removeAnalysisCases`, `saveCaseState` (the autosave, in place), `importAnalysisCases` |

A delete runs folder → Projects → Cases as writes queued one after another,
which is why `src/test/setup.ts` lets the writes settle three times over.

---

## 5. Export and Import

The `analysisProjects` category ([`import-export.md`](./import-export.md)):
one file, `analysis-projects.json` — `{ folders, projects }`: every folder as
its path of names (parents first, empty ones too) and every Project as stored
with its `folderPath` and its **Cases** as stored. Manifest version **4**
(a v3 zip reads through the table, its upgrade the stamp alone). On the way
in, folders are matched by their path of names and created where missing;
Projects clash by their folder like the analyses (Merge / Override / Skip, a
folder's own choice over the category's); each Project brings its Cases, each
filed in it; an Override's Projects take their Cases with them; the Projects'
and the Cases' caps both refuse the category. A build without the module
leaves the file unread.

---

## 6. Shipping it, later

1. `ANALYSIS_PROJECTS_ENABLED` to `true`; the routes out of `devRoutes`, the
   nav spreads ungated.
2. The database in both legal pages in both languages, and in
   `legalDocuments.test.ts`'s `STORED` (that test fails until then).
3. The routes in `e2e/a11y/routes.ts`, their pre-rendered pages
   ([`static-pages.md`](./static-pages.md)), `pageDescriptions.*` for them.
4. The legacy module's removal (its own issue): nothing here imports it.
