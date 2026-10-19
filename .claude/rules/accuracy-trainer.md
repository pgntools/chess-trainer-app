---
paths:
  - "src/views/accuracyTrainer/**"
  - "src/lib/accuracyTrainer*"
  - "src/lib/findBestMoveSession*"
  - "src/lib/jobs/kinds/evaluatePosition/**"
  - "src/blocks/panels/GradedLines/**"
  - "src/blocks/panels/AccuracySessionReport/**"
  - "src/blocks/panels/AccuracyTrainerDetails/**"
---

# Accuracy Trainer — Find Best Move (CTA-238, experimental, dev-only)

A sidebar folder of its own, **Accuracy Trainer**, for exercises that grade
the reader's moves against an engine's. Today it holds one: **Find Best Move
v3** — `/accuracy-trainer/find-best-move-v3`. **The exercise: find the N best
moves of each position, in the right order** (N, *Moves to find*, 3 to
start). The reader loads a game, picks a side, and at each of that side's
positions analyses on a board of their own — every move before the position
shown, none after — each line they play from the position one of their
moves, the lines' order their ranking; **Check** compares them with the top N
(the game's computer analysis, or the engine's own search): which were found,
which in their right place, each one's rank and loss; then Next, and a
summary at the end. The session is kept as an Analysis Case.

(v1 — several moves suggested on a board that snapped back — and v2 — the
first analysis board, its own tree per position — were deleted when v3
replaced them; v3 is v2's behaviour on a cleaner model, plus the moves before
each position.)

> **Dev-only.** The route is in `routes.tsx`'s `devRoutes` (a `React.lazy`
> import under `import.meta.env.DEV`), the folder and the nav entry spreads in
> `navFolders.ts` / `navItems.ts` under the same flag, and so is the Evaluate
> Position job kind (`lib/jobs/kinds/index.ts`, `views/jobs/kindViews.ts`): a
> production build has no code of any of it, only the catalog strings. For the
> same reason it has **no line in `e2e/a11y/routes.ts`** (that pass runs on the
> production build). Shipping it: the route into `appRoutes`, the folder's,
> the entry's and the kind's spreads dropped, the a11y route added, and
> `dist/` grepped for `find-best-move` and `evaluate-position`.

---

## 0. Where to look

| Path | What lives there |
| --- | --- |
| `src/lib/accuracyTrainer.ts` | **The grading**, pure: `trainingPositionsOf` (the positions a tree trains — `unevaluated` keeps those with no engine line), `sessionPositionsOf`, `withEngineResult` (an engine search merged into a position's lines), `needsEngine`, `targetOf` (the N a position asks for), `gradeSuggestion` / `gradePosition` (the reader's moves in their order against the top N), `sessionSummaryOf`, `sanLineOf`, `moveSquaresOf`, `bareSan`. |
| `src/lib/findBestMoveSession.ts` | **The session**, pure: `FindBestMoveSession` (its N fixed, `wanted`) and its transitions (`startSession`, `openPosition`, `answerPosition`, `withPositionJob`, `nextUnanswered`); the Case's tree (`sessionBaseTree`, `caseTreeOf`, `withSessionAnnotations`, `withPositionEngineLines`); a position's view (`positionViewOf`, `candidatesOf` — the reader's moves in their order, `isAtPosition`). |
| `src/lib/jobs/kinds/evaluatePosition/` | **The Evaluate Position job kind** — [`jobs.md`](./jobs.md) §3.2. |
| `src/views/accuracyTrainer/findBestMoveV3/useFindBestMoveSession.ts` | **The screen's one hook**: the board core, the session, its Case (made, autosaved), the engine jobs, the grading, the board's wrapped drops — everything the screen shows, and every action. |
| `…/FindBestMoveV3.tsx` | **The screen — composition alone**: `BoardShell`, the explorer, the right panel's tabs, header and footer, the left panel. |
| `…/SessionSetup.tsx` | The setup: a PGN uploaded or pasted (`PgnInput`, a file of several games picking one) or an Analysis Case (`CasePickerDialog`, the Projects and Cases stores read only while it is open), the side, Start. |
| `…/sessionCase.ts` | The session's Case made: the *Find Best Move* project found or made, the Case of the game's mainline. |
| `…/useEvaluatePositionJobs.ts` | The screen's side of the job kind: queue one (the Engine menu's search), read each job's state and result, the done ones' ids (the Case's merges). |
| `…/Main.tsx` | Layout-only wrapper (`find-best-move-v3-wrapper`). |
| `src/blocks/panels/GradedLines/`, `AccuracySessionReport/`, `AccuracyTrainerDetails/` | A graded position; the session's summary; the left panel (the game, its Case, Settings). |
| Tests | `lib/accuracyTrainer.test.ts`, `lib/findBestMoveSession.test.ts`, `lib/jobs/kinds/evaluatePosition/*.test.ts`, `findBestMoveV3/FindBestMoveV3.test.tsx`, the blocks' own, the trainer's rows in `views/board/boards.test.tsx` and `panelPropagation.test.tsx`, `navTree.test.ts`, `Sidebar.test.tsx` (the experimental chip), `routes.test.tsx`. |

Routes and nav: `/accuracy-trainer/find-best-move-v3`, `pages.findBestMoveV3`
(and `pageDescriptions.findBestMoveV3`); the dev-only top-level folder
`accuracy-trainer` (`nav.folders.accuracyTrainer`, after the Engine — a
top-level folder with one screen stays a folder), its screen
`nav.findBestMoveV3`, marked `experimental` (`NavItem.experimental`, carried by
`navTree.ts`, drawn by `Sidebar.tsx` as a chip, `nav.experimental`; the
screen's header carries the same chip). `options.id` `find-best-move-v3`.
Locale keys: `accuracyTrainer.*` (`setup`, `casePicker`, `position`,
`session`, `details`, `lines`, `report`), in both catalogs.

---

## 1. What a game gives — the positions and their lines

A **computer analysis's output** ([`pgn-annotations.md`](./pgn-annotations.md)
§6) hangs the engine's pruned lines as side lines at an analysed mainline
move, each line's first move carrying its `[%eval]`, the mainline move its
own; the **full** variant at every analysed move, **medium** and **light** at
the classified ones; the scope tags `AnalysedPlies` / `AnalysedSide` say which.

- **A position to train** (`trainingPositionsOf`) is the position before an
  analysed mainline move with at least one evaluated side line — or, with the
  engine on (`unevaluated`), every analysed position. Its **lines**: those
  side lines' first moves and the game's move (where it has an eval), scored
  from the mover's view (a mate ±10000 less its distance), ranked best first.
- **The top N** are the engine's listed lines: every side line, and the
  game's move when it scores at least as well as the worst of them.
- **An engine search** (`withEngineResult`) adds its lines — every one
  listed, a move the tree already has a line for keeping the tree's — and the
  position is ranked again.

## 2. Grading — the N best moves, in order

- **The moves to find** (`targetOf`): the session's N (*Moves to find*,
  1–10, 3 to start — fixed when the session starts, the slider locked while
  it runs), held to the engine's top lines at the position (a position with
  two of them asks for two; with none, nothing to compare — said).
- **The reader's moves** are their lines' first moves from the position, in
  the lines' order (§5): their 1st, 2nd, ….
- **Each move** (`gradeSuggestion`): on the lines, its rank, its loss (line 1
  against it, each clamped to ±1000 from the mover's view, at least 0) and
  its verdict by the computer analysis's thresholds (inaccuracy > 50, mistake
  > 100, blunder > 300); **in the top N** when it is one of the engine's top
  N lines; **in place** when, besides, its rank is the reader's order for it
  (their 1st the engine's 1st…). None of the lines has it: *not among the
  lines*, its loss a bound (`lossAtLeast`, the worst listed line's), never a
  number.
- **A position** (`gradePosition`): `target` (N there), `found` (how many of
  the top N), `inPlace`, `bestFound` (a loss of 0), `bestLoss`,
  `worstVerdict`, `outside`; perfect when every one was found in place. A
  move given twice counts once, in its first place.
- **The summary** (`sessionSummaryOf`): answered and passed; **the best moves
  found and in their place** over every one there was to find
  (`foundRate`, `inPlaceRate`); the positions done perfectly; the best move
  found (over every graded position, a pass finding nothing); the average
  best loss where known; the inaccuracies, mistakes, blunders and moves not
  among the lines.

## 3. The session — one tree, the Case's

**The Case's tree is the session's one truth** (`lib/findBestMoveSession.ts`).

- **Start** (`createSessionCase`, then `startSession`) makes a Case in **one**
  project, *Find Best Move* (`accuracyTrainer.session.projectName`, at the top
  level — found by its name, else made), named "<game> — Find Best Move",
  holding **the game's mainline alone** (`sessionBaseTree`: its moves and
  tags, none of its comments, NAGs, side lines or analysis tags). A refused
  write is said under the setup, and nothing starts.
- **A position's view** (`positionViewOf`): the Case's tree **with the
  position's continuation set aside** — its node's children: the game's next
  move and everything after it, the engine's lines there, the answers further
  on. The board opens on that tree, on the position (`goToNode`), facing the
  side to move. **Every move before the position shows** — the game's moves,
  and the session's work at earlier positions (the reader's lines, the
  engine's, the answers).
- **The Case's tree now** (`caseTreeOf`): the board's tree with the
  continuation put back — the hidden moves first, so the game's move stays the
  mainline, then the reader's moves from the position merged in by SAN — and
  the session's annotations written (`withSessionAnnotations`: each done job's
  engine lines, each graded answer as a comment on its position; idempotent).
  **Everything the reader does is kept** — at the position and before it (a
  comment on an earlier move, a side line there) — **but for a board that lost
  the position** (a *Delete from here* before it would take the rest of the
  game with it): that board's tree is not kept, the tree the position opened
  on is.
- **Autosaved** (`useAutosave` → `saveCaseState`) on every change, its merges
  the done jobs' ids (§4). **Opening** another position (`openPosition`)
  takes the Case's tree as it stands now.
- **The answer** is written once it is graded — never while it waits, so a
  comment is never rewritten: "Find Best Move: 1. e4 (#1, Best), 2. Nf3 (#3,
  Good), 3. h3 (not among the lines) — 2 of the top 3, 1 in place", "Find
  Best Move: passed" (`accuracyTrainer.session.answer.*`).

## 4. The engine — the Evaluate Position job

The left panel's **Use the engine** (off); the lines it is asked for are the
moves to find, N.

- **On, the setup takes any game** (`unevaluated`). A game loaded before the
  switch is kept, and whether it trains is read from it as it stands, so the
  switch takes it — and off again refuses it, the refusal naming the way out.
- **A position with fewer top lines than N** (`needsEngine`) is searched
  by an **Evaluate Position job** ([`jobs.md`](./jobs.md) §3.2) — queued by
  the reader's **first move there** (the hook's wrapped `onPieceDrop` /
  `resolvePromotion`, a move made on or inside the position), or by Check if
  none was; once per position. Its search is the top bar's Engine menu's (the
  board's engine and its selected preset, depth, move time, Threads, Hash),
  MultiPV N. The footer says while it searches.
- **A check waits for its search**: the Result tab says so, and the moves are
  graded against the position with the engine's lines once the job ends. A job
  that fails, is cancelled or gone: graded with the tree's lines alone, and
  said. A pass never waits.
- **The job and the autosave never undo each other**: the job writes its lines
  into the stored Case under its id (`merges`); the session's state carries
  the ids of the jobs it has seen done, so `saveCaseState` writes no tree from
  before them — and its own tree holds the same lines.

## 5. The screen

- **Composition alone** (`FindBestMoveV3.tsx`): the hook decides; the screen
  places. `BoardShell` over the core with the hook's wrapped drops, the
  explorer (`useVariationsExplorer` with editing on, `playChances: false`,
  `annotations`, `arrows: { show }`, `map: { linked: true }` —
  [`tree-views.md`](./tree-views.md)), no engine of its own.
- **The board moves** only on the position or inside a line from it while the
  position is answered (`isAtPosition`); once answered, anywhere.
- **The reader's moves** (`candidatesOf`): **each line they play from the
  position is one, the lines' order their ranking** — a new line goes last,
  and the move menu's *Promote variation* / *Make main line* reorder them; a
  reply inside a line is analysis, not a move of theirs. The footer lists
  them ("Your moves: 1. Nf3 2. d4 3. c4") over **Check (n)** (off with none),
  beside Pass.
- **The right panel**: the setup before a session; then **Moves · Map ·
  Result** (off until answered) **· Summary**; the header — the
  *Experimental* chip, "Position 3 of 12 · 12. White"; the footer — the
  comment block, the next-moves bar (Moves), the instructions, the reader's
  moves and the engine's word while answering, New session, Pass / Check or
  Next / Summary. **Result** (`GradedLines`): the headline (found, in place;
  every one in place; none; a pass), the lines best first — rank, move, eval,
  loss, the reader's rank for it (*In place*), its verdict — a line under the
  top N.
- **The arrows**: the explorer's; once graded, on the position itself, the
  top N in green and the reader's moves outside them in red over them.
- **The left panel** (`AccuracyTrainerDetails`, `BoardLeftPanel` with
  `keepShell`; a drawer under the breakpoint, opened from the header): the
  game's name (the exercise's before), the session's Case linked, then
  **Settings** — *Moves to find* (locked while a session runs), *Show
  next-move arrows*, *Use the engine*.

## 6. Extending it

- **A new measure**: a field of `SessionSummary` (`sessionSummaryOf`), its
  test, a row in `AccuracySessionReport` and its key.
- **Another grading rule**: in `gradeSuggestion` / `gradePosition`, pure, with
  its test; the blocks read the grade.
- **Another session step** (a hint, a retry): a transition in
  `lib/findBestMoveSession.ts`, its test, an action of the hook.
- **Next** (asked): download the session's variations with their
  evaluations — they are all in its Case. Resuming a session from its Case is
  a later task.
