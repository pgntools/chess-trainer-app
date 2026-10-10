---
paths:
  - "src/views/tools/analysis/**"
  - "src/lib/savedAnalyses*"
  - "src/lib/savedAnalysisStore*"
  - "src/lib/savedAnalysisFolders*"
  - "src/lib/savedAnalysisFolderStore*"
  - "src/lib/savedAnalysisDb*"
  - "src/lib/savedGameFolders*"
  - "src/lib/analysisSettings*"
  - "src/lib/arrowSettings*"
  - "src/lib/nextMoveWeights*"
  - "src/lib/gameReference*"
  - "src/lib/gameCatalog*"
  - "src/lib/pgnExport*"
  - "src/lib/analysesListContext*"
  - "src/blocks/trees/AnalysesTree/**"
  - "src/views/main/boardLeftPanel*"
  - "src/views/main/shellCompact.ts"
  - "src/blocks/lists/SavedAnalysesList/**"
  - "src/blocks/lists/FolderActions/**"
  - "src/blocks/lists/FolderPicker/**"
  - "src/blocks/dialogs/Folder*/**"
  - "src/blocks/forms/AnalysisEngineForm/**"
  - "src/blocks/forms/ComputerAnalysisForm/**"
  - "src/blocks/forms/ArrowSettingsFields/**"
  - "src/blocks/forms/PgnInput/**"
  - "src/blocks/forms/FenInput/**"
  - "src/blocks/panels/**"
---

# The Analysis Board and Saved analyses — `/tools/analysis`

A board a game is **worked on**: both colours move from any node, every
alternative is kept as a side line, the engine analyses the position on
screen, and the whole tree is saved **when the reader says so**, filed into
folders at `/tools/analysis/saved`. It is also where every other screen sends
a game or a position to be analysed (`?fen=`, `?game=`, the Openings
explorer's hand-off). The board core, the engine protocol and testing are
[`chessboard.md`](./chessboard.md); the move list, map and arrows
[`tree-views.md`](./tree-views.md); the stores [`database.md`](./database.md).

---

## 0. Where to look

| Path | What lives there |
| --- | --- |
| `src/views/tools/analysis/AnalysisBoard.tsx` | **The screen**: the arrivals (`arrivalOf`), the slots, the header, the URL write-back. `AnalysisBoardRoute` waits for the stores a URL names. |
| `src/views/tools/analysis/useAnalysisSession.ts` | **The shareable session**: core + engine + `usePlayToggle` + a **baseline** (the tree as it arrived or was last kept), `changed`, `extensionIds`. The Library's game board and the Openings explorer compose it too. |
| `src/views/tools/analysis/useAnalysisBoard.ts` | That session plus **the saved record**: Save / Update / Save as copy / Discard, the Load tab's new boards, the arrival precedence. |
| `src/views/tools/analysis/AnalysisLoad.tsx` | The Load tab: a PGN by file or paste (one game; several open the popup) or a FEN, over `useAnalysisLoad`. `onCollectionSaved`, `onAnalysesSaved` (CTA-141), `choiceLabelKey` and `onLoadPosition` optional — the Openings explorer passes no `onCollectionSaved`, so its choice stays inline and merge-only. |
| `src/views/tools/analysis/MultiGameDialog.tsx` | **The popup a PGN of several games opens** (CTA-101): Merge games, Save as games collection (index pass with progress and Cancel, `addCollection` at the Library's top level, then `/library/<id>`), or Save to Saved analyses (CTA-141: a folder's name, then a new top-level folder with an analysis per game — `analysisGamesOfText`, `batchAnalysesOf` — then `/tools/analysis/saved?folder=<id>`). The Board's Load tab and the Lobby's form both render it. |
| `src/views/tools/analysis/useAnalysisLoad.ts` | **The Load route's state** (CTA-96): the pipeline behind `AnalysisLoad`, on its own so a host can place its pieces itself — the analyses Lobby's form puts the FEN field and the `.pgn` pick in its editor's row and the paste box below. |
| `src/blocks/panels/PgnExportPanel/` | The Export tab (every board's): FEN, PGN with or without comments / NAGs / side lines, copy and download. |
| `src/lib/engineEvals.ts` | **The engine's evaluations written into the game** (CTA-167, §1): `[%eval pawns,depth]` on the move searched, the override by depth, the `Annotator` tag — [`pgn-annotations.md`](./pgn-annotations.md) §2. |
| `src/blocks/forms/AnalysisEngineForm/` | The Engine tab (**infinite analysis**, depth 1–40, move time 0–60 s — its own ceiling since CTA-163, the engine form's marks reach 300 s — lines, **threads, hash** — Play with Engine's, up to what the device can give, `deviceLimits`, CTA-160 — the eval bar, Clear) — every board's but Play's; each option slider rendered from what the engine declared (`engineOptionState`). |
| `src/views/tools/analysis/ComputerAnalysisTab.tsx`, `computerAnalysisSeed.ts`, `src/lib/jobLiveAnalysis.ts` | **The Computer analysis tab** (CTA-174, §1.3): this game's job and its results so far (`jobLiveAnalysis`), the report and eval graph of a tree's `[%eval]`s, the form and Start (`enqueueComputerAnalysis`); the form's first options from the Engine tab (`computerAnalysisSeed`). |
| `src/blocks/forms/ComputerAnalysisForm/` | The tab's form (CTA-174): threads, hash, lines (by what the engine declared, `engineOptionState`), depth, time per move, the early stop's depth; side, first move and colour, last move; under a collapsed Advanced the thresholds and the variation range; the light / medium / full boxes; Start, off saying why. The report and graph are the Jobs screen's blocks, `ComputerAnalysisReport` (with `onStep`) and `EvalGraph` ([`jobs.md`](./jobs.md)). |
| `src/views/tools/analysis/AnalysisArrows.tsx`, `src/blocks/forms/ArrowSettingsFields/` | The Arrows tab (CTA-98, §1.1): the next-move arrows switch, the width source and the palette — and the move marks switch (CTA-168). The fields block is shared with the settings screen. |
| `src/views/tools/analysis/SaveAnalysisDialog.tsx` | A new board's name and folder. |
| `src/blocks/panels/PlayToggleButton/`, `EngineThinking/` | Play's header button and status line, shared with every board that has Play. |
| `src/views/tools/analysis/useTreeNavigation.ts` | The core's navigation (node id as state, the keys). |
| `src/views/tools/analysis/nextMoveArrows.ts`, `src/views/shared/NextMovesBar.tsx` | The next-move arrows and bar every board draws through ([`tree-views.md`](./tree-views.md)). |
| `src/views/tools/analysis/saved/SavedAnalyses.tsx` | `/tools/analysis/saved`: the games table (the list view, CTA-144) and preview cards, the folders, the picks and bulk delete. |
| `src/views/tools/analysis/saved/NewAnalysisForm.tsx` | The saved list's right-hand panel (CTA-87/96): the shared position editor over a **Start** that opens the Analysis Board on the edited position; the form's header carries the editor's resets (New, Clear, Flip), its `controls` row the FEN field and the `.pgn` pick, and under the editor the paste box — `useAnalysisLoad` placed by hand, a whole game handed to the board as `analysisHandOff` location state, a position PGN or FEN setting the editor up ([`position-editor.md`](./position-editor.md) §4). |
| `src/views/tools/analysis/saved/AnalysisSettingsScreen.tsx` | `/tools/analysis/saved/<id>/settings`. |
| `src/views/tools/analysis/saved/useSavedAnalyses.ts`, `useAnalysisFolders.ts` | The store bindings (`undefined` until read). |
| `src/blocks/tables/SavedAnalysesTable/` | **The list view** (CTA-144): the folders and analyses as one tree table on `DataTable`'s tree rows — folders first, opened in place; an analysis' Name, White, Elo, Black, Elo, Result, Date, Event, Round, ECO, Opening, Moves, Updated — over rows the screen walks (`analysisTreeRows`); the words box in its filters slot, a no-match row with its Clear. |
| `src/lib/savedAnalysisRows.ts` | **An analysis as a table row**, pure (CTA-144): `savedAnalysisRowOf` (the tags, through the Library's `collectionRowOf` — no `chess.js`; the placeholders read as absent), `savedAnalysisRowWith` (unreadable, the book's opening where the tags name none), `analysisTreeRows` (folders and analyses as one tree's rows, over `folderTreeRows`), `compareAnalysisRows` / `compareAnalysisFolders`, `sortedAnalysisRows`, `filteredAnalysisRows`, `SAVED_ANALYSIS_COLUMNS`, `SAVED_ANALYSES_DEFAULT_SORT`, `savedAnalysisFirstDirection`. |
| `src/blocks/lists/SavedAnalysesList/`, `FolderActions/`, `FolderPicker/`; `src/blocks/dialogs/Folder*Dialog/` | The card views (folders and records as cards) and the nested-folder pieces — a folder's actions, the picker, the name / move / delete dialogs — each taking its words as `labels` and a test-id prefix (CTA-113). |
| `src/lib/savedAnalyses.ts` | **The record**, pure: `SavedAnalysis`, `savedAnalysisOf`, `savedAnalysisFrom` (the normaliser), `savedAnalysisDerivedName`, `batchAnalysesOf`, `analysisGamesOfText` (a text's games as analyses, CTA-141), `savedAnalysisCatalogOf`. |
| `src/lib/savedAnalysisStore.ts` | **The store** (`chessapp.analyses`, object store `analyses`): `saveAnalysis`, `addAnalyses`, `fileSavedAnalysis`, `renameSavedAnalysis`, `updateSavedAnalysisSettings`, `removeSavedAnalyses`, `unfileAnalysesIn`, `findSavedAnalysisGame`; cap `MAX_SAVED_ANALYSES` (20,000). |
| `src/lib/savedAnalysisFolders.ts` + `savedAnalysisFolderStore.ts` | The folders: an `AnalysisFolder` *is* a `GameFolder` (`lib/savedGameFolders.ts`, the nested model: cycles cut, dangling parents read as top level); create / rename / move (never into its own subtree) / delete (sub-folders re-parent, analyses become Unfiled) or delete deep (`removeAnalysisFoldersDeep`, CTA-147 — the bulk delete's, the whole subtree gone); the picks model (`analysisPicksOf` — a folder's pick is its whole subtree; the toggles keep no folder checked with its contents partly picked); cap 100. |
| `src/lib/analysisSettings.ts` | `AnalysisSettings` (depth, move time, lines, `infinite`, `threads`, `hashMb` — CTA-160 — and `writeEvals`, CTA-167), the defaults (depth 20, no time limit, infinite off, Play with Engine's 1 thread and 16 MB, evaluations not written), `ANALYSIS_SETTING_BOUNDS`, `ANALYSIS_UCI_OPTION` (`MultiPV`, `Threads`, `Hash`), `analysisUciOptionsOf` (the ceilings held) / `withClampedAnalysisUciOptions`, `analysisSettingsFrom` (a record from before reads `infinite` off and Play's threads and hash, and `writeEvals` off). |
| `src/lib/arrowSettings.ts` | The Arrows tab's ids (CTA-98): `ArrowWidthSource`, `ArrowPaletteId`, their defaults and readers (`arrowWidthSourceFrom`, `arrowPaletteFrom`). |
| `src/lib/nextMoveWeights.ts` | Each width source's weights at a branch (`nextMoveWeights`), the `[%eval]` reader (`evalOf`), and which sources a tree offers (`arrowWidthSourcesIn`). Pure. The `games` tag's reader is `lib/gamesTag.ts`. |
| `src/lib/gameReference.ts` + `gameCatalog.ts` | **The `?game=` carrier** (§3). |
| `src/lib/analysesListContext.ts` | **Where the board was opened from** (CTA-145, §1.2), pure: `listContextOf` (the URL's `?folder=` / `?sort=` / `?dir=`), `analysisBoardPath` and `analysesListPath` (the links that carry and restore them), `siblingAnalysesOf` / `siblingPlaceOf` (previous / next). |
| `src/blocks/trees/AnalysesTree/` | The workspace's tree (CTA-145): the list's folders and analyses nested and collapsible over `TreeView`, rooted at one folder, names wrapped, a Close link, a fold to a rail, a lock while the board holds unsaved changes; `analysesTreeNodes` the pure nodes. `views/tools/analysis/AnalysesFolderView.tsx` reads the stores and hosts it, `folderViewState.ts` what the reader did to it. |
| `src/views/main/boardLeftPanel.tsx`, `boardLeftPanelSlot.ts`, `shellCompact.ts` | The shell's slot the tree is registered in (CTA-145, §1.2): a column of the board's row (`BOARD_LEFT_PANEL_WIDTH_PX`) or a rail (`BOARD_LEFT_PANEL_COLLAPSED_PX`), the window taken whole while it is there, a drawer under the breakpoint (`useShellCompact`). |
| `src/lib/pgnExport.ts` | `downloadPgn` — several stored PGN records joined with a blank line (`pgnFileOf`), saved as a file. Also Settings' Export's (`downloadBinaryFile`, [`import-export.md`](./import-export.md)). |
| Tests | `AnalysisBoard.test.tsx` (every arrival, Save, Load, Export, Play, the hand-off, the Arrows tab, the PGN's shapes drawn and written, the Computer analysis tab — CTA-174), `src/blocks/forms/ComputerAnalysisForm/ComputerAnalysisForm.test.tsx`, `useTreeNavigation.test.ts`, `EngineThinking.test.tsx`, `nextMoveArrows.test.ts`, `src/lib/nextMoveWeights.test.ts`, `saved/SavedAnalyses.test.tsx` (the table, the cards and the panel's new-analysis form), `saved/AnalysisSettingsScreen.test.tsx`, `src/lib/savedAnalyses.test.ts`, `src/lib/savedAnalysisRows.test.ts`, `src/blocks/tables/SavedAnalysesTable/SavedAnalysesTable.test.tsx`, `savedAnalysisStore.test.ts`, `savedAnalysisFolderStore.test.ts`, `src/lib/analysesListContext.test.ts`, `src/blocks/trees/AnalysesTree/` (`AnalysesTree.test.tsx`, `analysesTreeNodes.test.tsx` — the filter included), `src/views/main/Layout.test.tsx` (the left panel's slot), the `TreeView` pattern's tests (`wrapLabels`, `disabled`), `savedGameFolders.test.ts`, `gameReference.test.ts`, and the propagation tests in `src/views/board/`. |

Routes and nav: the **Analyses** folder (`nav.folders.analysisBoard`) holds
the **Lobby** (`nav.lobby`, `/tools/analysis/saved`) and **Jobs** (`nav.jobs`,
`/jobs` — [`jobs.md`](./jobs.md)); the board itself has no nav entry and is
the list's **New** button. `options.id` is `analysis`. Locale keys: `analysis.*`
(the board) and `savedAnalyses.*` (the list, its folders, the settings
screen); the Computer analysis tab's are `computerAnalysis.form.*` and
`computerAnalysis.board.*`, beside the report's and graph's (CTA-174).

---

## 1. The board

- **A `GameTree`, both colours from any node.** A move from an earlier
  position is a side line; replaying one that is there follows it.
- **The engine starts off** (CTA-148) — on the Analysis Board, the Library's
  game board and the Openings explorer alike, all on `useAnalysisSession`: no
  search runs until the reader switches the header's engine on. The engine and
  the eval bar are switched independently. The engine moves a piece only while
  the header's **Play** is on (`usePlayToggle`, off at the start, disabled while
  the engine is off, paused by any step that is not one move forward), and then
  only for the side not at the bottom.
- **The header** holds the name (and the record's notes), the opening, Save,
  Play, Settings (over a record) and the engine switch — no previous / next and
  no link to the list (the workspace's tree has both; outside one the sidebar
  leads there). **The opening is one line of link text** (`CurrentOpening`'s
  `oneLine`, this board only): the name cut with an ellipsis before the Save
  button, the full name and its ECO code on hover (`title`), a click opening the
  Openings explorer at the position in a new tab; **nothing at all** while the
  position has no known opening or the book is loading. Every other board keeps
  the name beside the ECO chip and the "No known opening yet" words.
- **A game's players are plated on the board** (CTA-148, as the Library's —
  CTA-105): when the tags name someone (`playerPlatesOf`, `views/shared/playerResults.ts`,
  over the tree's headers; the record's placeholder `Analysis` and the spec's
  `?` are no name), `BoardShell`'s `playerPlates` draws the result, Elo and name
  at the left end of the captured-pieces strips, the orientation deciding which
  is at the top. A position, or an analysis with no names, has none.
- **How long the engine searches** (CTA-160, [`docs/engine.md`](../../docs/engine.md)
  §5.1): to the Engine tab's depth (default 20) and move time (default none),
  or — **Infinite analysis**, lichess's switch, off by default — until the
  position changes or the engine is switched off. **While Play is on the depth
  and time decide** whatever the switch says (`useAnalysisSession`: `infinite
  && !playing`): Play needs a search that ends with a move. The same holds on
  every board over `useAnalysisSession`, and the repertoire player takes the
  switch too (it has no Play).
- **Write evaluations into the game** (CTA-167) — an Engine-tab switch, off
  by default, on this board only (`AnalysisEngineForm`'s `offerWriteEvals`;
  the other boards over `useAnalysisSession` do not offer it, and their
  settings read it off). While it is on, every search that finishes — to its
  depth, or ended early by a step or the engine switched off, at the depth it
  reached; under infinite analysis and Play too — is written on the move whose
  position was searched as `[%eval pawns,depth]` (the start position into the
  game's opening comment), a deeper or equal search replacing a shallower, and
  the engine named in the `Annotator` tag. A change like any other edit: Save
  offers it, Discard drops it, Export writes it with the comments
  ([`pgn-annotations.md`](./pgn-annotations.md) §2). The session does it
  (`useAnalysisSession`: the engine module's `onSearchFinished` →
  `recordEvaluation` through the core's `annotateTree`). Kept with the
  record's `AnalysisSettings` (`writeEvals`, §2.1).
- **Tabs: Moves · Map · Load · Export · Engine · Computer analysis · Arrows.**
  Moves and Map are kept mounted. The footer holds the comment block, the changes strip, Play's
  status line and the next-moves bar (on the Moves tab).
- **The explorer**: editing on (the move menu and the comment block —
  `core.replaceTree`), *Play chances…* off, the moves added since the baseline
  tinted in the list and ringed on the map, every map dot a link.
- **The PGN's shapes, drawn and written** (CTA-143): the `[%cal]` arrows and
  `[%csl]` circles of the position's comment are on the board with the
  next-move arrows; a right-drag (arrow) or right-click (circle) — plain
  green, Shift red, Alt blue, both yellow — writes one into the move's comment
  (the game's opening one at the start), drawn again takes it off. A change
  like any other edit: Save offers it, and Export writes it with the
  comments ([`pgn-annotations.md`](./pgn-annotations.md) §2,
  [`tree-views.md`](./tree-views.md) §2).
- **Load is a new analysis.** The Load tab reads a PGN the way a repertoire is
  read (`readRepertoireText`): one game goes onto the board unsaved; **several
  open a popup** (`MultiGameDialog`, CTA-101) with the game count, the skipped
  count and three choices:
  - **Merge games** — one tree on the board, unsaved, written with
    `[%games N]` on every move where the games part
    ([`pgn-annotations.md`](./pgn-annotations.md) §1, *Merging*). Off, saying
    why, while the games do not share a start position.
  - **Save as games collection** — always offered. The popup keeps the text
    as a new Library collection the way `/library/new` does
    (`readCollectionText` → `indexCollection` under a progress bar →
    `addCollection` at the top level), named by the same rule (the `Event`
    every game shares, else the file name's words, else "Pasted collection"),
    and the reader lands on `/library/<id>`. Cancel, Escape or the popup going
    away stop the index pass and write nothing; a failed pass or write is said
    in the popup — the check (`problem.index`) told from the write
    (`problem.write` / `storage`) — and its cause logged with `console.error`
    (CTA-141). A worker that fails falls back to indexing on the page
    (`indexCollection`), logged too.
  - **Save to Saved analyses** (CTA-141) — always offered. A `FormDialog` in
    the popup's place asks for the folder's name: the file name's words
    (`collectionNameOfStem`), for a paste the `Event` every game shares, else
    "Analysed games", capped at `MAX_ANALYSIS_FOLDER_NAME`; an empty name
    cannot be saved, and **Back** returns to the choices, writing nothing. Save
    is the Library's Analyse (§4, [`game-collections.md`](./game-collections.md)
    §6.5), all or nothing: `createAnalysisFolder` at the top level, then
    `addAnalyses(batchAnalysesOf(…))` over `analysisGamesOfText` — every game
    that `parsePgnTree` reads, **a position alone included**, in file order,
    its PGN as the text holds it, named by its chapter / players / event
    (`repertoireGameNamesOf`); the unreadable ones are left out and counted. A
    refused folder (the cap) or a refused write (`MAX_SAVED_ANALYSES`,
    storage) is said in the dialog, and the folder is taken back. The reader
    lands on `/tools/analysis/saved?folder=<id>` (`onAnalysesSaved`).

  A FEN is a position: it turns the board.
- **Export** writes the FEN, and the PGN with or without comments, NAGs and
  side lines (`treeToPgn`'s `PgnExportOptions`).

### 1.1 The Arrows tab (CTA-98)

The next-move arrows, and only this board's — every other board keeps the
classic, colour-only arrows. Three settings, all the **session's**, opened as
the record says (a new board: on, None, Classic) — and a fourth under them,
the move marks (below):

- **Next move arrows** — the switch (moved here from the Engine tab, test id
  `analysis-arrows`). Off: only a hovered move's arrow, as before.
- **Width source** — one of five radios (`lib/arrowSettings.ts`), each
  continuation's weight worked out by `nextMoveWeights` and drawn on the
  play-chance arrows' absolute scale (`chanceArrowWidth` over 0–1) by the
  explorer's overlay:

  | Source | Read from | Width |
  | --- | --- | --- |
  | **None** | — | the library arrows, colour only |
  | **Evaluation** | `[%eval X]` in the move's own comment, or the trailing `+1.31 (21 ply)` shape — White's view, turned to the mover's | loss vs the best tagged move: the best widest, a hairline at 300 cp (`EVAL_HAIRLINE_CP`) or worse; a mate for the mover best, against it a hairline |
  | **Games** | `games:N` / `[%games N]` (`lib/gamesTag.ts`) | `N / Σ N` over the tagged moves |
  | **Play chance** | `prc:N` / `[%prc N]` | the marks scaled to 100% over the tagged moves |
  | **Lines ahead** | nothing (`linesWithin`, 8 plies) | each move's share — always offered |

  **A tag radio is disabled while no move in the tree carries it**
  (`arrowWidthSourcesIn`, recomputed on every new tree — a load, a comment
  edited). A choice whose tag is gone is **kept**, shown checked and disabled
  with a note, and the board **draws as None** until the tag is back. At a
  branch where **some** moves carry the tag the untagged ones are drawn gray
  and half-transparent at a fixed modest width (`UNTAGGED_ARROW_CHANCE`);
  where **none** do, the ordinary palette arrows are drawn, so the board stays
  readable past the tagged part of a game.
- **Colours** — a palette (`NEXT_MOVE_ARROW_PALETTES` in `nextMoveArrows.ts`):
  **Classic** (`#4caf50` / `#2196f3` / `#f44336`, every board's), **Lichess**
  (its brushes, `#15781B` / `#003088` / `#882020`) and **Colour-blind safe**
  (Okabe–Ito, `#0072B2` / `#E69F00` / `#CC79A7`) — mainline / side line /
  hovered, each apart from the untagged gray. It colours the library arrows
  and the width-sized ones alike.
- **Show move marks on the board** (CTA-168, `analysis-move-marks`) — the
  move on screen's mark (`!!` … `??`) drawn as a badge on its square
  ([`pgn-annotations.md`](./pgn-annotations.md) §4); off, none is drawn (the
  move list still shows the glyphs). The session's like the rest, opened as
  the record's `showMoveMarks` says (on for a new board and a record from
  before it), passed to the explorer as `moveMarks`.

### 1.3 The Computer analysis tab (CTA-174)

The board's side of a game's **computer analysis** (CTA-171): the engine run
once over the mainline as a **background job** — the shell's runner's, not the
board's ([`jobs.md`](./jobs.md)) — each ticked variant saved as a new Saved
analysis ([`pgn-annotations.md`](./pgn-annotations.md) §6).
`ComputerAnalysisTab.tsx`, three parts, top to bottom:

- **This game's job**, while there is one: the job this board sent (its id
  kept by the board, so it outlives the tab), else of the jobs sent from the
  same saved analysis (`source.analysisId`) the newest **unfinished** one,
  else the newest **done** one — a board reopened later still leads to its
  results. Its status in words, its progress as a **status** (`ProgressLine`'s
  `announce`: "12 of 80 positions · 7. Nf3"), a line saying what is going on,
  why it failed, once done a contained **Open the <variant> analysis** button
  per output, and **Open in Jobs** (`/jobs?job=<id>`). Read through
  `useJobs()`. **Its results so far fill in as it runs** (lichess's server
  analysis): `lib/jobLiveAnalysis.ts` re-parses the job's source and reads its
  checkpoint — every finished position a point of an eval graph that spans
  the whole run (`EvalGraph`'s `span`: the line grows from the left), the
  latest finished position's eval, depth and numbered best line, and the
  report over the moves judged so far (a move needs both its positions done;
  `moveVerdicts` skips the rest). The job's node ids are its own re-parse's,
  so each point is the board's mainline node at its ply, kept only while it
  holds the same FEN: a click moves the board, a board edited since sending
  loses the points it changed. **While it is queued or running it takes the form's place**
  (lichess's request button turning into its progress), so the same game is
  not sent twice; **Start moves the focus** onto its heading (`tabIndex -1`),
  which scrolls it into view — the signal is set before the write, because a
  saved game's job reaches the store, and mounts its section, before
  `enqueueComputerAnalysis` settles.
- **The report and the eval graph**, whenever the tree on screen carries
  `[%eval]`s — an output of a computer analysis, a lichess export, the
  evaluations the Engine tab wrote (CTA-167): `evalSeriesOf` / `reportFromTree`
  over the tree as it stands, so an edit shows at once. The graph
  (`EvalGraph`) marks the move on the board and moves it (`core.goToNode`) on
  a click or Enter — the start position's point to the start; the report
  (`ComputerAnalysisReport`, players from the tags — the board's placeholder
  `Analysis` is no name) makes each count above 0 a button to **that side's
  next move of that kind** after the mainline move on the board, round again
  from the first (`onStep`, lichess's).
- **The form** (`ComputerAnalysisForm`): **No time limit** is a switch over
  the time slider (as the Engine tab's infinite analysis is — a job's search
  must end, so "infinite" here is the depth alone deciding, `moveTimeMs` 0;
  the slider then starts at 1 s and switching it off brings back the last time
  set). Its first options are the Engine
  tab's depth, move time, lines, threads and hash, the early stop at the
  depth, the rest the defaults (`computerAnalysisSeed`), and it follows the
  Engine tab until the reader changes one of its own — then they are the
  board's, kept across tabs. Threads, Hash and Lines follow what the engine
  declared; before the engine has started (it starts off, §1) a
  single-thread build's Threads already reads pinned at 1
  (`descriptor.capabilities.multiThread`). Every change is held to its bounds
  (`computerAnalysisOptionsFrom`: the early stop at most the depth, the
  thresholds in order, the last move not before the first). **Start** sends
  `{ source: { analysisId, name, folderId, pgn: core.pgn }, options }` with the
  engine the reader chose **at that moment** (`enqueueComputerAnalysis`) — the
  PGN as the board holds it, unsaved changes and side lines too (every output
  keeps them). It is off with no variant ticked, on a board with no moves, or
  with no move in the chosen range (`analysisPositionsOf` empty), each said
  under it; a refusal (`storage`, `too-many`) is said there too. Not shown
  while this game's job is queued or running.

### 1.2 The workspace — the list's tree beside the board (CTA-145)

An analysis **opened from the saved list** (a row of the table or a card)
opens the board as a **workspace**: the shell gives it the whole window — no
header, no main menu, no footer — and the list's own tree in a column on its
left. A link from anywhere else (an embed, the Library, a hand-off, a pasted
address) is the plain board.

- **The context is the URL's**: `?analysis=<id>&folder=<id>` — the folder the
  analysis was opened from, **empty for the top level** — and the table's own
  `?sort=` / `?dir=` when they differ from the default (Updated, newest
  first). `lib/analysesListContext.ts` writes and reads them
  (`analysisBoardPath`, `listContextOf`). The list's rows and cards link
  through it (`boardPath` in `SavedAnalyses.tsx`: a row carries **its own**
  folder, which in a tree table is not always the `?folder=` the reader is
  standing in, and the table's sort; the cards, newest first). The board keeps
  it while it is a record — Save as copy points the URL at the copy and keeps
  it — and a Load, a Clear or a hand-over drops it, which ends the workspace.
- **The tree** (`AnalysesTree`, hosted by `AnalysesFolderView`): the list's
  folders nested and collapsible in the main menu's look (`TreeView`), the
  analyses in them in the table's order, every name wrapped whole, the open one
  current. **It is rooted at the folder the board was opened from**: that
  folder's contents are the top rows, nothing outside it is listed, and the
  root stays where it was opened from as the reader clicks through (every link
  in the tree carries the same context). The chain to the open analysis starts
  open; the folders the reader opens or closes, the pages and the fold are kept
  by the **route** (`AnalysisBoardRoute`, `FolderViewState`), so they survive
  stepping to another analysis. A branch carries the count under it; a folder
  lists a page of 100 analyses (always up to the open one) and a "Show N more"
  row — a folder of thousands is never mounted whole. The order is the
  table's, over each record's **tags** (no parsing; the table's ECO and Opening
  columns may add the book's name where tags name none, which this order does
  not), read live from the store — an Update under the default sort moves the
  record to the top (there is no manual order; a follow-up).
- **The filter box** above the tree narrows it by words, as the list's own
  words box does (`analysisMatcherOf`, `lib/savedAnalysisRows.ts`, shared with
  the table): an analysis stays when it holds every word (name, notes, players,
  Elos, event, round, date, ECO, opening — tags only), a folder whose name does
  stays with all that is in it, a folder with neither is left out, and the
  counts are the matches. **Every branch left is open while the words stand**
  (so a folder cannot be collapsed until they are cleared), the page and "show
  more" still apply, and "No analysis matches the filter." says an empty
  result (the list's strings). The words are `FolderViewState.text`, kept by
  the route like the fold, so they survive stepping to another analysis; Escape
  or the clear button empties it; the folded rail has no box.
- **Close goes back to the list**, on the folder and in the order the board
  was opened from (`analysesListPath`); in-app navigation is not guarded
  (the board's list link behaves the same), a reload still asks (`beforeunload`).
- **Fold**: a button in the panel's header folds the column to a rail at the
  start edge — two buttons, open it again and Close — and gives the board the
  room (the rail is 48 px, the column 400; arrows point at the start edge under
  Hebrew). The window stays the board's while folded.
- **Previous / next** are a toolbar at the **foot of the panel** (CTA-148;
  `AnalysesTree`'s `siblings`, computed in `AnalysesFolderView`, test ids
  `analysis-sibling-previous` / `-next`), sticky under the scrolling tree and
  still on the folded rail and in the compact drawer. They walk the open
  analysis' own folder in the same order (`siblingAnalysesOf`), disabled at the
  ends.
- **Unsaved changes come first**: while the session holds any (`state.unsaved`)
  the tree's analyses (disabled, `aria-disabled`, no link — folders still open)
  and previous / next (named by the note) are off, and a note says why; the header's Save opens the
  changes strip (Update / Save as copy / Discard). Nothing is written by
  looking.
- **A click, previous or next is a link to the other analysis' board.** The
  route keys the board by a generation it bumps when the URL names an analysis
  the board did not write itself — the board reads its arrival once — so another
  analysis is a new board, the browser's Back between two works, and a save's
  own URL write (`onPointUrl`) is not taken for an arrival.
- **Where it lives**: the shell's **board left panel**
  (`views/main/boardLeftPanel.tsx` — `BoardLeftPanel`, `BoardLeftPanelOutlet`,
  `useBoardLeftPanelWidth`), a slot like the right-hand one — **not** the main
  menu's `LeftPanel` slot, which stays unused. While a panel is registered the
  shell hides its header, rail and footer (a rail, a column, a square and the
  aside do not fit together) and takes the column's width, and the gap, out of
  the square's, so the board stays square. The shell puts its own theme back
  around the panel (`ShellThemeContext`), which sits inside the board's
  `ForceLTR`, so the column mirrors and the tree's arrow keys follow the
  direction. **Under the shell's breakpoint** (`useShellCompact`) there is no
  column and the header stays: the tree is a `NavDrawer` the shell draws,
  opened from a header button, closed on Escape — no fold there, Close still
  leaves for the list.

---

## 2. Saving

Nothing is written unasked. The session holds a **baseline** — the tree as it
arrived, was loaded, or was last saved — and `core.tree !== baseline` is the
whole of "changed" (every edit makes a new tree; replaying a move that is
there does not).

- **Over a record** (`?analysis=`, or once saved) the header's **Save** lights
  and opens the changes strip (the `ChangesStrip` block under this screen's
  `labelKey`): **Update analysis** (the record takes the tree, the place in
  it, the orientation and the settings; its name and folder stay), **Save as
  copy** ("‹name› (copy)", same folder; the session goes on in it) or
  **Discard** (back to the baseline).
- **A board with no record** — blank, a `?fen=` / `?game=` arrival, a PGN
  just loaded, a tree handed over — saves through `SaveAnalysisDialog`: a name
  (seeded from the tags) and a folder.
- **A reload or closed tab with changes unsaved asks first** (`beforeunload`).
- **The record is a tree as PGN** (`treeToPgn` / `parsePgnTree` — side lines,
  comments and NAGs are the point), the `AnalysisSettings` (the Engine tab's,
  *Write evaluations into the game* among them — CTA-167; a record without it
  reads it off), the orientation,
  **where the reader stands** as SAN from the root (`sanPathTo` /
  `nodeAtSanPath` — node ids do not survive a PGN round trip; the path stops
  at the last move it recognises), the name, the folder, and the settings of
  §2.1. A record lacking a newer field reads as its default (named by its
  tags, Unfiled, arrows and move marks on) — no version bump.

### 2.1 A record's settings — `/tools/analysis/saved/<id>/settings`

The title (`name`), a `description` (shown under the title on the board), the
side the board opens facing (`orientation`), whether it opens drawing the
next-move arrows (`showArrows`), what sizes them (`arrowWidthSource`,
`"none"`) and their colours (`arrowPalette`, `"classic"`) — §1.1, CTA-98 —
whether it draws the move marks on the board (`showMoveMarks`, on — CTA-168)
and the folder (`folderId`, `null` Unfiled) — one draft, written on Save in
place (`updateSavedAnalysisSettings`). Every width source is offered on the
screen; whether the tree carries its tag is the board's to say. A missing or
unknown `arrowWidthSource` / `arrowPalette` reads as its default. Linked
from the board's header (off while there are unsaved changes) and from every
row and card. A flip or the Arrows tab on the board is the session's:
Update keeps the stored settings, a copy takes the original's, a new board's
first save takes what it shows.

### 2.2 The store

IndexedDB (`chessapp.analyses`, object stores `analyses` and `folders`, over
`idbRecordStore`). Every write is a promise; a quota refusal answers
`"storage"`, never throws. Reads are the kept snapshot, `undefined` until the
first read lands — so a screen arriving by URL (`?analysis=`,
`?game=analysis/…`, the settings screen) says it is reading and waits rather
than calling the record missing. The cap is **20,000** because the
Library's Analyse makes a record per game; measured with the Carlsen fixture,
20,000 records are ~20 MB, written in one batch in ~0.6 s and read in ~0.1 s.

---

## 3. Arriving — the URL

Read once (`arrivalOf`); **precedence** `?analysis=` > a handed-over tree >
`?game=` > `?fen=` > blank.

| Arrival | What it is |
| --- | --- |
| `?analysis=<id>` | A saved record: its tree, its node, its orientation, its settings. |
| location state `analysisHandOff` | A whole tree from the Openings explorer (`lib/analysisHandOff.ts`, [`openings-explorer.md`](./openings-explorer.md) §5): a new unsaved board with the tree's orientation. |
| `?game=<key>/<path>/<id>` (+ `?move=`) | A game from a store, re-read with `parsePgnTree` (§3.1). Opens facing White. |
| `?fen=` | A position (`parseFen`; ignored if it does not pass). Turns the board. |
| `?at=` | The line on screen as SAN from the start (`lib/repertoireLink.ts`); **beats** `?move=` and a record's own place. |

**The URL is a permanent link.** `?at=` is written back with history replace
on every step, beside what the board is (`?analysis=<id>` once it is a record,
the arrival's parameters before that, nothing after a Load).

### 3.1 `?game=` — a reference into a store

A FEN fits in a URL; a game does not, so the game hand-off carries
`?game=<key>/<path>/<id>` and the board looks the game up itself
(`resolveGameReference`). It keeps what `?fen=` is good for — bookmarkable,
validated, ignored when it does not resolve, taken as *initial* state.

- **A reference resolves against a store's catalog** (`lib/gameCatalog.ts`: a
  `path` and its games, each with its PGN and mainline). `catalogsByKey` in
  `lib/gameReference.ts` is the whole mapping: `analysis`
  (`savedAnalysisCatalogOf`; `findSavedAnalysisGame` parses only the record
  named), `play` (the games against the engine, `playedGameCatalogOf`) and
  `library` (`library/<collection>/<n>`, [`game-collections.md`](./game-collections.md)
  §6.7). **A line in that registry is the whole cost of a new producer of
  games.**
- **A store read asynchronously makes the board wait** (`AnalysisBoardRoute`:
  `isReferenceRead` / `loadReferencedGames`, and the saved analyses' first
  read).
- **`?move=` rides beside it**: the mainline ply to open at, read by
  `parseMoveParam` (anything not a non-negative integer is ignored; past the
  end clamps). With no `?move=`, a game's **`StartPly` tag** declares its own
  opening ply (`initialPlyOf` — absent, unreadable or past the end is ply 0).
  One line: `parseMoveParam(?move=) ?? initialPlyOf(game)`.

---

## 4. Saved analyses — `/tools/analysis/saved`

- **Newest first, filed into a nested tree of folders**; `?folder=<id>` is
  where the reader stands (the Library's Analyse links there). The top level shows the
  folders, then the Unfiled analyses.
- **The panel is the new-analysis form** (CTA-87): the shared position editor
  and a **Start** that opens the Analysis Board — the edited position riding
  along as `?fen=` when it is not the standard start, which turns the board
  to its side to move ([`position-editor.md`](./position-editor.md) §4). The
  form's header carries the editor's resets (**New, Clear, Flip**); the
  editor's own controls row holds the **quick loads** — a FEN field and a
  `.pgn` pick, side by side — and the paste box sits under the editor
  (`useAnalysisLoad`, the Load route's pipeline placed by hand; the form
  renders `AnalysisLoad` not at all). A PGN of more than one move (or a
  merge, from the same popup as the board's — `MultiGameDialog`, counted) is
  handed to the board as `analysisHandOff` location state facing White (a game
  does not turn the board); a text of several kept as a games collection
  lands on its Library table, one kept as analyses (CTA-141) on its new
  folder here; a PGN of a single move or none, like a FEN, sets the editor up
  instead (`onLoadPosition` / `onLoadFen`). The editor offers no tabs of its
  own (`forms={["position"]}`, the fields always shown —
  [`position-editor.md`](./position-editor.md)).
- **A tree table, or preview boards** at the saved lists' two card sizes
  (`CardGrid`'s `cardGridColumns`), each card showing the position and side the
  reader **was standing on** (`options.id` `saved-analyses-preview-<id>`).
- **The table** (CTA-144, the list view and the default — most analyses are
  imported games) is **a tree table, the Library list's** (`analysisTreeRows`
  over `lib/folderTreeRows.ts`, the `DataTable`'s tree rows): the folders
  first at every level, each with its subtree's count, opened in place by
  its chevron or a click on its row (its analyses indented under it — the open
  folders are the screen's state, not the URL's), its name a link into it
  (`?folder=`), its actions download / rename / move (no delete icon —
  CTA-147). Folders and records are picked alike: a folder's checkbox (its
  pick covers its whole subtree, checked or indeterminate by what under it is
  picked — `analysisPicksOf` in `lib/savedAnalysisFolders.ts`) joins the
  header's select-all, which the screen owns (`picks.selectAll`), since a
  closed folder's pick covers rows the table never shows. An analysis row: **Name** (the reader's name, else the players, else
  "Analysis board"; the row's link to the board, the description under it),
  White, Elo, Black, Elo, Result, Date, Event, Round, ECO, Opening, Moves,
  Updated — read off the PGN tags without parsing the tree
  (`lib/savedAnalysisRows.ts`, the Library's `collectionRowOf`); the
  placeholders a board's own analysis is written with (White / Black
  `Analysis`, Event `Analysis Board`, Result `*`) are empty cells.
  - **Every header sorts**, both ways, missing values last, ties
    newest-updated first; the default is Updated, newest first. A **words box**
    (`?q=`) matches names, notes, players, Elos, event, round, date, ECO and
    opening, and the folders' names, opening the folders above a match. The
    sort (within each level; folders by name, or by when they changed under
    Updated) and the words cover **everything in view** — the whole tree, or
    a `?folder=`'s subtree seen from inside it — and the page is cut after
    them; the sort, the page, its size and the words are the URL's
    (`useTableUrlState`, history replace), so a settings screen or a board
    comes back to the table as it was. A new sort, filter or folder starts at
    the first page; a new folder drops the words and keeps the sort. Nothing
    matching says so (`saved-analyses-table-no-match`) with a Clear.
  - **ECO and Opening from the book** where the tags name none
    (`openingOfLine` over the mainline): over every analysis the open folders
    show while they are at most 250 (the largest page — every record parsed
    once and kept, so those columns sort and filter by it and every
    unreadable record is marked); past that for the page on screen only, the
    sort and the filter reading the tags alone.
- **Every row and card** has its link to the board (a row's name, a card's
  board), the settings gear and a checkbox — a folder's box picks its whole
  subtree with it (CTA-147); the export bar downloads the picks and deletes
  them in bulk, asking first — a delete that includes folders says the
  folders go **with everything under them**, and takes the folders' whole
  subtrees (`removeAnalysisFoldersDeep`; standing inside what goes, the
  reader steps out to the nearest folder that survives). Unticking an
  analysis under a picked folder demotes the folder, so none stays checked
  with its contents partly picked (`toggleAnalysisPick` / `unpickAnalysis` /
  `toggleAnalysisFolderPick`). Select-all — the table's, in its
  header, over the rows shown (the filter's, the open folders' — a folder's
  whole subtree with it); the cards', in the bar, over the folder's. The
  picks persist across folders and views.
- **Folders** are created, renamed, moved (never into their own subtree) and
  downloaded as one `.pgn`; deleted through the picks (CTA-147).
- **Paged, and parsed no more than a page at a time**: the design system's
  page sizes, 25 / 50 / 100 / 250, 50 by default (`SAVED_ANALYSES_PAGE` =
  `DEFAULT_TABLE_PAGE_SIZE`) in every view; each record's tree parsed once
  when it is needed (its page, or a table folder of at most 250) and kept
  while it is the stored one; the table's tag columns, counts, downloads and
  picks read the records unparsed. The card views keep the folder's own
  order (newest first) and have no filter.

---

## 5. Invariants

1. **Nothing is written unasked**; `core.tree !== baseline` is "changed".
2. **The engine moves only while Play is on**, only the opponent's side, only
   for the position on screen.
3. **A record is PGN plus a SAN path**, read back through its normaliser; a
   missing field is its default.
4. **An arrival is read once**, validated, and ignored when it does not pass.
5. **A route naming a record waits for its store's first read.**
6. **`?fen=` and `?game=` are additive** — a new producer is a catalog entry,
   never a new parameter.

---

## 6. Recipes

- **A new `?game=` producer**: a `…CatalogOf` over its store and one entry in
  `catalogsByKey`; if its store is read asynchronously, teach
  `isReferenceRead` / `loadReferencedGames` about it. Test it in
  `gameReference.test.ts` and as an arrival in `AnalysisBoard.test.tsx`.
- **A new record setting**: the field on `SavedAnalysis`, its default in
  `savedAnalysisFrom`, a section in `AnalysisSettingsScreen`, and where the
  board reads it on open. No version bump.
- **A new tab**: a `tabs` entry in `AnalysisBoard.tsx` and
  `analysis.tabs.<id>` in both catalogs; keep the `moves` and `engine` ids,
  which the propagation tests expect. State a tab must keep across a switch
  of tabs is the board's (only Moves and Map stay mounted) — as the Computer
  analysis tab's options and sent job are.
- **The new-analysis form** (the shared position editor in the saved list's
  panel, a second host of it): [`position-editor.md`](./position-editor.md) §4.
