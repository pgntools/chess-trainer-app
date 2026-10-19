---
paths:
  - "src/views/accuracyTrainer/**"
  - "src/lib/accuracyTrainer*"
  - "src/lib/findBestMoveSession*"
  - "src/lib/jobs/kinds/evaluatePosition/**"
  - "src/blocks/panels/GradedLines/**"
  - "src/blocks/panels/AccuracySessionReport/**"
  - "src/blocks/panels/AccuracyTrainerDetails/**"
  - "src/blocks/tables/FindBestMoveSessionsTable/**"
---

# Accuracy Trainer — Find Best Move (CTA-238, experimental, dev-only; its sessions kept in their PGN, CTA-239)

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
summary at the end. **A session is an Analysis Case whose PGN holds it
whole** (CTA-239, §7): reloaded, opened from the **sessions lobby** — the
route itself, `/accuracy-trainer/find-best-move-v3` (§8) — downloaded as a
`.pgn` and loaded back, it resumes where it was left; a session's own address
is `/accuracy-trainer/find-best-move-v3/<caseId>`, a new one's setup `…/new`.

(v1 — several moves suggested on a board that snapped back — and v2 — the
first analysis board, its own tree per position — were deleted when v3
replaced them; v3 is v2's behaviour on a cleaner model, plus the moves before
each position.)

> **Dev-only.** The routes — the lobby and a session's — are in `routes.tsx`'s `devRoutes` (`React.lazy`
> imports under `import.meta.env.DEV`), the folder and the nav entry spreads in
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
| `src/lib/findBestMoveSession.ts` | **The session**, pure: `FindBestMoveSession` (its side, the game's name, its N fixed — `wanted` — and which positions' lines already hold their search, `searched`) and its transitions (`startSession`, `openPosition`, `answerPosition`, `withPositionJob`, `nextUnanswered`, `leavePosition`, `reopenPassed`, `resumeSession` — CTA-239); the Case's tree (`sessionBaseTree`, `caseTreeOf`, `withSessionAnnotations`, `withPositionEngineLines`, `withPositionLines` — a graded position's lines hung as variations, CTA-239); a position's view (`positionViewOf` — the session's commands taken off the board, `withoutSessionCommands`; `candidatesOf` — the reader's moves in their order, `workOf` — their lines there, `reorderedCandidates` / `withoutCandidate` — one moved or deleted, `isAtPosition`, `positionAtPath` — the trained position the board stands at). |
| `src/lib/findBestMoveSessionPgn.ts` | **The session in its PGN** (CTA-239, §7), pure: `withSessionRecord` (the session's tags and each position's `[%fbm …]` written into its tree), `sessionRecordOf` (read back — `undefined` for a PGN that is no session), `isSessionTree`, `sessionProgressOf` (the lobby's counts). |
| `src/lib/findBestMoveSessionRows.ts` | **The lobby's rows** (CTA-239, §8), pure: `findBestMoveSessionRowOf` (a session Case's PGN read), `sortedFindBestMoveSessions`, the columns and their first directions. |
| `src/lib/jobs/kinds/evaluatePosition/` | **The Evaluate Position job kind** — [`jobs.md`](./jobs.md) §3.2. |
| `src/views/accuracyTrainer/findBestMoveV3/useFindBestMoveSession.ts` | **The screen's one hook**: the board core, the session, its Case (made, autosaved), the engine jobs, the grading, the board's wrapped drops — everything the screen shows, and every action. |
| `…/FindBestMoveV3.tsx` | **The screen — composition alone**: `BoardShell`, the explorer, the right panel's tabs, header (the way back to the lobby, Download PGN) and footer, the left panel; a Case that holds no session said so. |
| `…/FindBestMoveV3Route.tsx` | A session's route (CTA-239): `new` the setup, else the Cases read and the screen mounted keyed by the Case (`resume`), a Case not there said. |
| `…/SessionsLobby.tsx` | **The sessions lobby** (CTA-239, §8): the project's Cases as `FindBestMoveSessionsTable`, New session, Delete picked, Download PGN. |
| `…/paths.ts` | The addresses: the lobby, `sessionPath(caseId)`, `NEW_SESSION_PATH`. |
| `…/SessionSetup.tsx` | The setup: a PGN uploaded or pasted (`PgnInput`, a file of several games picking one) or an Analysis Case (`CasePickerDialog`, the Projects and Cases stores read only while it is open), the side, Start — and a session's own PGN known by its tags, **Resume** in Start's place (CTA-239). |
| `…/sessionCase.ts` | The session's Case made: the *Find Best Move* project found or made (`sessionProjectOf`, the lobby's too), a Case of the session's PGN. |
| `…/useEvaluatePositionJobs.ts` | The screen's side of the job kind: queue one (the Engine menu's search), read each job's state and result, the done ones' ids (the Case's merges). |
| `…/Main.tsx`, `…/LobbyMain.tsx` | Layout-only wrappers (`find-best-move-v3-wrapper`, `find-best-move-sessions-wrapper`). |
| `src/blocks/panels/GradedLines/`, `AccuracySessionReport/`, `AccuracyTrainerDetails/`, `src/blocks/tables/FindBestMoveSessionsTable/` | A graded position; the session's summary; the left panel (the game, its Case, Settings); the lobby's table (CTA-239). |
| Tests | `lib/accuracyTrainer.test.ts`, `lib/findBestMoveSession.test.ts`, `lib/findBestMoveSessionPgn.test.ts` (the format: the round trip, a PGN that is no session, the leniency, the board without the commands — CTA-239), `lib/findBestMoveSessionRows.test.ts`, `lib/jobs/kinds/evaluatePosition/*.test.ts`, `findBestMoveV3/FindBestMoveV3.test.tsx` (mounted through its route: a reload resuming, Download, a session PGN resumed from the setup, a Case that is no session, one not there), `findBestMoveV3/SessionsLobby.test.tsx`, the blocks' own, the trainer's rows in `views/board/boards.test.tsx` and `panelPropagation.test.tsx`, `navTree.test.ts`, `Sidebar.test.tsx` (the experimental chip), `routes.test.tsx`. |

Routes and nav: `/accuracy-trainer/find-best-move-v3` — the sessions lobby, a
`FULL_WIDTH_ROUTE`, `pages.findBestMoveV3` (and `pageDescriptions.findBestMoveV3`)
— and `/accuracy-trainer/find-best-move-v3/:caseId` — a session, or `new` the
setup, a board route, `pages.findBestMoveV3Session` (CTA-239); the dev-only top-level folder
`accuracy-trainer` (`nav.folders.accuracyTrainer`, after the Engine — a
top-level folder with one screen stays a folder), its screen
`nav.findBestMoveV3`, marked `experimental` (`NavItem.experimental`, carried by
`navTree.ts`, drawn by `Sidebar.tsx` as a chip, `nav.experimental`; the
screen's header carries the same chip). `options.id` `find-best-move-v3`.
Locale keys: `accuracyTrainer.*` (`setup`, `casePicker`, `position`,
`session`, `details`, `lines`, `report`, and the lobby's and a session's own
`sessions` — CTA-239), in both catalogs.

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

- **Start** (`startSession`, then `createSessionCase`) makes a Case in **one**
  project, *Find Best Move* (`accuracyTrainer.session.projectName`, at the top
  level — found by its name, else made, `sessionProjectOf`), named "<game> — Find Best Move",
  holding **the game's mainline alone** (`sessionBaseTree`: its moves and
  tags, none of its comments, NAGs, side lines or analysis tags) **with the
  new session written in** (CTA-239, §7 — its tags and each position's
  command, the positions' lines among them: the source's analysis is not in
  the tree, so it is in the commands) — then opens it at its address, where
  the screen resumes it from that PGN as a reload would (§8). A refused write
  is said under the setup, and nothing starts.
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
- **The reader's own lines at each position** (`work`): kept on their own
  when the position is left (`leavePosition`, the board's moves from it) and
  put back on the board when it opens again (`openPosition`). The Case holds
  them too, merged — with the game's own moves where they meet (the reader
  played the game's move), so there they cannot be told apart, and the view
  hides everything under the position: the game's continuation and the
  engine's lines stay hidden, the reader's lines come back.
- **Autosaved** (`useAutosave` → `saveCaseState`) on every change, its merges
  the done jobs' ids (§4) and the ones the Case held when it was read — **and
  the session itself with it** (`withSessionRecord`, CTA-239): every change of
  the session's state is a change of the Case's PGN, so nothing of it lives
  only in memory. **Opening** another position (`openPosition`) takes the
  Case's tree as it stands now. **The board never holds the session's
  commands** (`positionViewOf` → `withoutSessionCommands`): they would give
  the answer away in a comment dialog; the writer puts them back on every save.
- **The answer** is written once it is graded — never while it waits, so a
  comment is never rewritten: "Find Best Move: 1. e4 (#1, Best), 2. Nf3 (#3,
  Good), 3. h3 (not among the lines) — 2 of the top 3, 1 in place", "Find
  Best Move: passed" (`accuracyTrainer.session.answer.*`). **With it, the
  position's lines** (CTA-239, `withPositionLines`): every line graded
  against, hung as a variation with its `[%eval]` — so the Case shows them to
  any PGN reader; a pass's stay out of the tree, hidden.

- **On to the next position** — Next after a check, or a Pass, which **goes
  on at once** (the summary after the last): the board starts at the position
  just answered and **plays the game's moves to the next one out, one every
  second** (`STEP_DELAY_MS`, the hook's `stepDelayMs` — the screen's prop, a
  test's own): the reader's side's game move, then the reply. A step that
  finds the board moved by the reader stops the rest. Opening a position
  from the summary or *Answer it now* jumps straight there.
- **A pass is "later"** — put off, not given up: its lines stay hidden (Your
  moves shows it passed; the summary's best moves for it "–"; no answer
  arrow), and **Answer it now** — on Your moves when the board is back at it
  (or on Result, opened from the summary) — opens it again as the
  position on screen (`reopenPassed` over the Case's tree as it stands, the
  one on screen left first), the pass and its comment taken back
  (`withoutPositionComment`). After Check, Next goes on to the next position
  still to answer — the one the reader left, their lines there back. An
  answer with moves is final.

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
  the ids of the jobs it has seen done — and, read back, every merge the Case
  held — so `saveCaseState` writes no tree from before them, and its own tree
  holds the same lines.
- **A job over is written as such** (CTA-239): its search's lines go into the
  position's stored lines and its command names it `searched:` — so a session
  read back grades the same, never waits for it again, and never asks for
  another, even once the runtime has forgotten the job. A job still running
  is `job:`, and a session read back waits for it as before.

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
  Result** (off until answered) **· Summary**; the header — the way back to
  the sessions (CTA-239), the *Experimental* chip, "Position 3 of 12 · 12.
  White", and **Download the session's PGN** (its Case's PGN as the autosave
  writes it); the footer — the
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
  game's name (the exercise's before), the session's Case linked, then tabs —
  **Your moves** (where a session opens) — **the trained position the board
  stands at** (`positionAtPath`: the position on screen inside its lines, an
  earlier one when the reader steps back to it or past it), named ("Position
  1 of 12 · 1. White"): being answered, the reader's moves in their order,
  each **moved up or down** or **deleted** on the board itself
  (`reorderedCandidates`, `withoutCandidate` through `core.replaceTree`: a
  move is its line, so its line moves or goes with it); checked, **every one
  of the engine's lines best first — rank, move, eval, loss — the reader's
  moves marked** in it (*Yours #n*, *In place*, the verdict), a bolder line
  closing the top N, the reader's moves none of the lines has after it, and
  the headline (`gradeHeadlineOf`, `GradedLines`'); checked and waiting for
  the engine, the moves and a word; an earlier position skipped, not answered
  yet. **Results**: every position answered or passed — and the one being
  answered now, *Answering now* — in game order, one row each: the move, the
  game's move, the score (found / in place, *Perfect*), *waiting for the
  engine*, or *Passed · Answer it*; the one the board stands at current. A
  click goes back to it: an answered one opened on its result (Result), a
  passed one to answer it now (`answerAgain`, Moves), the one being answered
  the board back on it — straight there, nothing played out. **A pass
  reopened stays in its place**: answered now while it is on screen, and
  **left unanswered it is passed again** (`reopened`, `leavePosition`). And **Settings** — *Moves to
  find* (locked while a session runs), *Show next-move arrows*, *Use the
  engine*. (Named *Your moves*, not *Moves*: the right panel's Moves is the
  move list.)

## 6. Extending it

- **A new measure**: a field of `SessionSummary` (`sessionSummaryOf`), its
  test, a row in `AccuracySessionReport` and its key.
- **Another grading rule**: in `gradeSuggestion` / `gradePosition`, pure, with
  its test; the blocks read the grade.
- **Another session step** (a hint, a retry): a transition in
  `lib/findBestMoveSession.ts`, its test, an action of the hook.
- **A new piece of session state** (CTA-239): a field of the session, its
  tag or command field written and read in `lib/findBestMoveSessionPgn.ts`
  (absent reads as its default — no version bump while an older PGN still
  reads), §7's table, and the round-trip test. Bump `SESSION_FORMAT_VERSION`
  only for a change an older reader would misread; a PGN of another version
  is no session to this build.

## 7. The session in its PGN (CTA-239)

**The Case is the session**: its PGN holds everything the session is —
`lib/findBestMoveSessionPgn.ts` writes it on every autosave
(`withSessionRecord`) and reads it back (`sessionRecordOf`); no store, no
database, no field of the Case's own. Readable in any PGN viewer: the game,
the reader's variations, the engine's lines with their `[%eval]`, the answers
as comments; the trainer's machine data is in tags and one `[%fbm]` command
per position alone (`readComment` shows it as no chip — [`pgn-annotations.md`](./pgn-annotations.md) §2).

| Tag | Value |
| --- | --- |
| `FindBestMove` | The format's version, `1` — **what makes a PGN a session**; another version is none to this build |
| `FindBestMoveSide` | `white`, `black` or `both` |
| `FindBestMoveMoves` | N, the moves to find (1–10; unreadable: 3) |
| `FindBestMoveEngine`, `FindBestMoveArrows` | `on` / `off` — *Use the engine*, *Show next-move arrows* |
| `FindBestMovePosition` | The position on screen, 1-based |
| `FindBestMoveStatus` | `ongoing` / `done` — for a reader of the file; the session reads it from its positions |
| `FindBestMoveGame` | The game's name (its jobs' titles) |

**A position's command** — `[%fbm …]`, the first comment on the move the
position follows (the game's opening comment for the start); the positions
are the moves carrying one, in game order. Its fields, `key:value`,
space-separated, absent when empty:

| Field | Value |
| --- | --- |
| `game:` | The game's move there |
| `state:` | `open` (not answered), `answered`, `passed`, `reopened` (a pass being answered again — only on screen; anywhere else read as a pass) |
| `answer:` | The reader's moves in their order, `Nf3,d4,c4` |
| `lines:` | **Every line the position is graded against** — the source's analysis and the engine's search together — each `<moves>/<score>/<flags>`: its moves from the position dot-joined (the game's move by its first alone), its score in White's view (centipawns, `#N` a mate), `l` one of the engine's listed lines, `p` the game's move: `e4/30/lp,d4.d5.c4/25/l`. A position rebuilt from them (`trainingPositionFrom`) is the one the source gave. |
| `work:` | **The reader's own lines there** — each line to a leaf dot-joined, the leaves `\|`-separated in the tree's order (`Nf3.d5\|Nf3.Nf6\|d4`): their first moves' order is their ranking. Read back, each move takes the comments and glyphs the Case holds for it, but an `[%eval]`. |
| `job:` / `searched:` | Its Evaluate Position job — `searched:` once it is done, its lines in `lines:`: waited for no more. A job that failed stays `job:`, read back as it reads live (graded with the lines there are, said) |

**Why the lines and the work are written out**: the Case's tree alone cannot
tell them apart — the source's analysis is not in it, and a reader's line, an
engine's line and the game's continuation merge where they share a move. So
grading is reproduced from the command, never re-read from the tree.

## 8. The lobby and resuming (CTA-239)

- **The lobby** (`/accuracy-trainer/find-best-move-v3`, `SessionsLobby`): every
  Case of the *Find Best Move* project (`sessionProjectOf`, by name in the
  reader's language, as Start finds it) as `FindBestMoveSessionsTable` — Name
  (its link resumes it), Side, Moves to find, Progress (answered or passed of
  all; how many each), Found (the best moves found of those to find, how many
  in place — over the graded positions, a check still waiting for its search
  not yet), Status (*Ongoing* / *Done* — nothing left to answer), Updated;
  every header sorts, newest first, the sort and page the URL's; each row's
  Open in Analysis and Download PGN; picks deleted together after one
  confirmation (`removeAnalysisCases` — their unfinished jobs with them);
  **New session** opens the setup. A Case there that holds no session (one
  from before CTA-239, one put there by hand) keeps its row, which says so —
  it opens in Analysis and downloads, but does not resume.
- **Resuming** (`…/<caseId>`, `FindBestMoveV3Route`): the Cases read, the
  screen mounts keyed by the Case and reads its PGN once
  (`sessionRecordOf` → `resumeSession`): the position on screen opened (on
  its Result tab when it is answered), the reader's lines there back on the board, the settings (*Moves to find*
  locked, *Use the engine*, the arrows) as they were, every answer graded as
  before. A Case that holds no session says so with its link into Analysis;
  one not there says so with the way back.
- **A session PGN loaded in the setup** (a downloaded one, or a session Case
  picked): known by its tags — said as a session, how far it got, the side
  toggle off — and **Resume** keeps it as it is, a **new** Case in the
  project, opened where it was left. A plain game starts a fresh session.
