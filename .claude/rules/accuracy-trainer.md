---
paths:
  - "src/views/accuracyTrainer/**"
  - "src/lib/accuracyTrainer*"
  - "src/lib/findBestMove/**"
  - "src/lib/achievements/**"
  - "src/lib/jobs/kinds/evaluatePosition/**"
  - "src/blocks/panels/GradedLines/**"
  - "src/blocks/panels/AccuracySessionReport/**"
  - "src/blocks/panels/AccuracyTrainerDetails/**"
  - "src/blocks/tables/FindBestMoveSessionsTable/**"
  - "src/test/findBestMoveKit.ts"
---

# Accuracy Trainer — Find Best Move v4 (CTA-238; rebuilt in CTA-244 from the CTA-243 design note; experimental, dev-only)

A sidebar folder of its own, **Accuracy Trainer**, for exercises that grade
the reader's moves against an engine's. Today it holds one: **Find Best Move
v4** — `/accuracy-trainer/find-best-move-v4`. **The exercise: find the N best
moves of each position, in the right order** (N, *Moves to find*, 3 to
start). The reader loads a game, picks a side, and at each of that side's
positions analyses on a board of their own — every move before the position
shown, none after — each line they play from the position one of their
moves, the lines' order their ranking; **Results** compares them with the top
N (the game's computer analysis, or the engine's own search): which were
found, which in their right place, each one's rank and loss; then Next — or
**Next** straight away, which grades them and goes on without the result —
and a summary at the end. **A session is an Analysis Case whose PGN's tags
hold it whole** (§5): reloaded, opened from the **sessions lobby** (§7),
downloaded as a `.pgn` and loaded back, it resumes where it was left; a
session's own address is `/accuracy-trainer/find-best-move-v4/<caseId>`.

**The design is [`docs/design/find-best-move-v4.md`](../../docs/design/find-best-move-v4.md)**
(CTA-243): its §3 the requirements R1–R26, §4 the session model, §5 the PGN
format, §6 the board / record / Case boundary, §7 the hook's split. This file
is the build's reference; read the note for the why.

(v1 and v2 were deleted when v3 replaced them; **v3 — its session's machine
data in `[%fbm]` movetext commands — was removed in CTA-244**: a foreign
`[%eval]` prepended into a command's comment made positions vanish, "the
38-to-35 bug". Nothing of v3 is kept since CTA-248 — not its job kind, not
its sessions: a v3 session Case is a plain Case, R26 dropped.)

> **Dev-only.** The routes — the lobby and a session's — are in `routes.tsx`'s `devRoutes` (`React.lazy`
> imports under `import.meta.env.DEV`), the folder and the nav entry spreads in
> `navFolders.ts` / `navItems.ts` under the same flag, and so is the Evaluate
> Position job kind (`lib/jobs/kinds/index.ts`, `views/jobs/kindViews.ts`):
> a production build has no code of any of it, only
> the catalog strings. For the same reason it has **no line in
> `e2e/a11y/routes.ts`**. Shipping it: the route into `appRoutes`, the
> folder's, the entry's and the kind's spreads dropped, the a11y route added,
> and `dist/` grepped for `find-best-move` and `evaluate-session-position`.

---

## 0. Where to look

| Path | What lives there |
| --- | --- |
| `src/lib/accuracyTrainer.ts` | **The grading**, pure (§1–§2): `trainingPositionsOf`, `gamePositionsOf` (a session's positions, CTA-245), `sessionPositionsOf`, `trainingPositionFrom`, `withEngineResult`, `needsEngine`, `targetOf`, `gradeSuggestion` / `gradePosition`, `sessionSummaryOf`, `moveSquaresOf`, `bareSan`. Reused by v4 as is. |
| `src/lib/achievements/` | **The achievements** (§10, CTA-249): `pieces.ts` (the five pieces, their values, `AchievementInput`), `categories.ts` (the five graders and `ACHIEVEMENT_CATEGORIES`, the registry), `material.ts` (`piecesOf`, `noPieces`, `sessionMaterialOf`). |
| `src/lib/findBestMove/model.ts` | **The record** (§3): `FindBestMoveRecord`, `PositionRecord`, the two axes `AnswerState` / `EngineState`, the position key; the recorded game replayed once (`replayGame`), a key's path, FEN and game move, `trainingPositionOf` (the grading's `TrainingPosition`, derived, never stored), `storedLinesOf`. |
| `src/lib/findBestMove/reducer.ts` | **The transitions** (§3.2): `sessionReducer`, `reduceSession`, the events `sessionEvents.*` — an event that does not apply answers the same record. |
| `src/lib/findBestMove/selectors.ts` | **What the panels read** (§3.3): `phaseOf`, `gradeOf`, `answerOf`, `engineFailedAt`, `resultsOf`, `summaryOf`, `progressOf`, `isDone`, `nextOpen`, `engineOfferedAt` (CTA-245), `achievementsOf` / `materialOf` (CTA-249, §10), `placeOf`, `positionAtPath`, `replayPlan` (capped, `REPLAY_MAX_PLIES`). |
| `src/lib/findBestMove/pgn.ts` | **The format, version 2** (§5): `isSessionTags` (the one predicate — Analysis's S3 reads it), `withoutSessionTags`, `sessionTagsOf` / `withSessionTags`, `sessionRecordOf` (lenient: `SessionIssue`s), the work fragment (`workFragmentOf`, `workFromFragment`). |
| `src/lib/findBestMove/projection.ts` | **The projections** (§4, §5.3): `sessionMovetextOf` (the readable game), `boardTreeOf` (the board at a position), `workOf`, `candidatesOf`, `reorderedCandidates`, `withoutCandidate`, `isAtPosition`, `isWorkNode` (S5's predicate); `AnswerWords`. |
| `src/lib/findBestMove/start.ts` | A session from a game (`sessionFromGame`) or one position (`sessionFromPosition`); `sourceHeadersOf` (the game's tags but its analysis's). |
| `src/lib/findBestMove/store.ts` | **The one writer** (§6): `editSessionCase`, `sessionTreeOf` / `sessionPgnOf`, `sessionProjectOf`, `createSessionCase` (S4's `writeEvals: false`), `duplicateSessionAsPlainCase` (S3). |
| `src/lib/findBestMove/rows.ts` | **The lobby's rows** (§7), from the tags alone: `findBestMoveSessionRowOf`, `sortedFindBestMoveSessions`, the columns. |
| `src/lib/findBestMove/words.ts`, `paths.ts` | The answers worded from the catalog (`answerWordsOf`); the addresses (`FIND_BEST_MOVE_PATH`, `findBestMoveSessionPath` — in `lib/` so Analysis can name them). |
| `src/lib/jobs/kinds/evaluatePosition/` | **The Evaluate Position job kind**, `analysis.evaluate-session-position` — [`jobs.md`](./jobs.md) §3.2. |
| `src/views/accuracyTrainer/findBestMoveV4/` | **The screen** (§8): `useSessionCase.ts` (persistence), `useSessionBoard.ts` (the board), `useReplay.ts` (the replay), `useSessionEngine.ts` (the engine jobs), `useFindBestMove.ts` (their composition, the actions), `FindBestMove.tsx` (composition alone), `FindBestMoveRoute.tsx` (a session's arrival), `SessionsLobby.tsx`, `NewSessionForm.tsx`, `SessionSetup.tsx` + `sessionSetup.ts` (the form's Game tab and its reading), `paths.ts`, `Main.tsx` / `LobbyMain.tsx` (layout-only). |
| `src/blocks/panels/GradedLines/`, `AccuracySessionReport/`, `AccuracyTrainerDetails/`, `src/blocks/tables/FindBestMoveSessionsTable/` | A graded position; the summary; the left panel (the game, its Case, Your moves, Results, Settings); the lobby's table. |
| Tests | `lib/accuracyTrainer.test.ts`; `lib/achievements/categories.test.ts` (each grader per tier and precondition, the outside rule, the tiers' nesting over every answer of a pool), `material.test.ts`; `lib/findBestMove/reducer.test.ts` (every event's row, the invariants over a seeded random walk), `selectors.test.ts` (the phase table, `nextOpen`, the replay's cap, a partial analysis — `PARTIAL_PGN` — passed through and the engine offered, CTA-245; `engineRetryOfferedAt`, CTA-250), `pgn.test.ts` (the round trips, the foreign writers, the 38-to-35 fixture, the manifest and stale data), `projection.test.ts`, `store.test.ts` (the two writers interleaved, S2), `rows.test.ts`; `src/test/findBestMoveKit.ts` (the games, plain words, a search); `lib/jobs/kinds/evaluatePosition/*.test.ts`; `findBestMoveV4/FindBestMove.test.tsx` (the screen by role and name, axe), `SessionsLobby.test.tsx`, and each unit alone — `useSessionCase.test.tsx` (the store read, a write, a refusal), `useSessionBoard.test.tsx` (the projection loaded, where it moves and edits, the work written, the engine asked, the replay's start), `useReplay.test.tsx`, `useSessionEngine.test.tsx` (queued once, the result echoed, a job gone or cancelled, a position evaluated again re-queued and its deleted job failed — CTA-250); the blocks' own; the trainer's rows in `views/board/boards.test.tsx` and `panelPropagation.test.tsx`, `navTree.test.ts`, `Sidebar.test.tsx`, `routes.test.tsx`; `views/explorer/useVariationsExplorer.test.tsx` (S5), `views/analysisV2/AnalysisV2.test.tsx` (S3), `lib/gameTree.test.ts` (S1). |

Routes and nav: `/accuracy-trainer/find-best-move-v4` — the sessions lobby,
the table in the board square and the New session form in the right-hand
panel, `pages.findBestMoveV4` (and `pageDescriptions.findBestMoveV4`) — and
`/accuracy-trainer/find-best-move-v4/:caseId` — a session, a board route,
`pages.findBestMoveV4Session`; the dev-only top-level folder
`accuracy-trainer` (`nav.folders.accuracyTrainer`), its screen
`nav.findBestMoveV4`, marked `experimental` (`NavItem.experimental`, a chip
in the sidebar, `nav.experimental`; the screen's header carries the same
chip). `options.id` `find-best-move-v4`. Locale keys: `accuracyTrainer.*`
(`setup`, `casePicker`, `position`, `session` — its `answer.*` the movetext's
words —, `details`, `lines`, `report`, `sessions` — the lobby's and a
session's own, `readIssue`, `writeProblem`), and
Analysis's notice `analysisV2.workspace.session.*`, in both catalogs.

---

## 1. What a game gives — the positions and their lines

A **computer analysis's output** ([`pgn-annotations.md`](./pgn-annotations.md)
§6) hangs the engine's pruned lines as side lines at an analysed mainline
move, each line's first move carrying its `[%eval]`, the mainline move its
own; the **full** variant at every analysed move, **medium** and **light** at
the classified ones; the scope tags `AnalysedPlies` / `AnalysedSide` say which.

- **A position to train** (`trainingPositionsOf`) is the position before an
  analysed mainline move with at least one evaluated side line — or, with
  `unevaluated`, every analysed position. Its **lines**: those side lines'
  first moves and the game's move (where it has an eval), scored from the
  mover's view (a mate ±10000 less its distance), ranked best first.
- **A session over a game asks every analysed position** (`gamePositionsOf`,
  CTA-245) — the `AnalysedPlies` / `AnalysedSide` scope, whether or not the
  analysis hung side lines there: a full
  analysis prunes every line far below line 1, so where the game's move was
  the only one in range there is **no side line**, and leaving that position
  out made Skip jump it (1 → 4). Such a position has **no top line of its
  own** — the game's move, unlisted, is not one — so it needs the engine to
  be graded (`needsEngine`, §3.2). A tree with **no** engine line — a plain
  game — asks **every mainline position** (CTA-246; no scope tags, the whole
  game), none with a top line: each is the engine's, offered there (§3.2).
  There is **no engine switch** (CTA-246): what a session asks never depends
  on it.
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

## 3. The session — a record, keyed by ply

All of it pure (`src/lib/findBestMove/`); React, the stores and the router
never reach it but through `store.ts`.

### 3.1 The record

- **A position's identity is its key** (`PositionKey`): the ply of its move
  in the session's **recorded game** — the start FEN and the mainline's SANs,
  copied when the session starts and never edited after. Not an index, not a
  FEN (a FEN repeats), not a tree node (ids do not survive a PGN). Order is
  the keys' numeric order.
- **The manifest** (`keys`) is fixed at start (R5): no later edit adds, drops
  or reorders a position. `current` is always one of them.
- **One `PositionRecord` per key**: its `lines` (every line graded against —
  the source's, then the engine's merged in; they only grow), its `answer`
  and `engine` axes, and its `work` (the reader's own lines there, a tree
  from its FEN — comments and glyphs with them).
- **A `TrainingPosition` is derived** (`trainingPositionOf`) from the game and
  the lines, so it cannot drift from them; `gradePosition` takes it.

### 3.2 The two axes, and the reducer

- **Answer**: `open` → `answered(moves)` (one or more, final) or `passed`;
  `passed` → `reopened` (*Answer it now*, only ever `current`) → `answered`
  or `passed` again.
- **Engine** (left `idle` unless the session's engine is on — `settings.engine`,
  the `FindBestMoveEngine` tag — and the top lines are fewer than N,
  `needsEngine`): `idle` → `wanted` (a first move there, or a
  check — persisted, so a reload still queues it; **when** is the session's
  `settings.engineStart`, below) → `queued(jobId)` →
  `searched(jobId)` (its lines merged — `withEngineResult`'s rule) or
  `failed`. `searched` is terminal: **a search that landed is never asked
  twice**, by the type. `failed` is left by one event alone (below). A pass
  never waits.
- **Evaluate again** (CTA-250, `engineRetry(key)`): an answered position
  graded without its engine — its search lost (`failed`: the job failed, was
  cancelled or deleted while queued), or never asked (`idle`, the offer
  declined) — goes back to `wanted` where the engine is on and its lines are
  still too few; the answer is untouched. The screen offers it where
  `engineRetryOfferedAt` says (§3.3) and writes `[settingsChanged({ engine:
  true }), engineRetry(key)]` in one write, so a declined position turns the
  session's engine on too; the engine unit queues the new job as any
  `wanted` (§8). The new search lands as any (`engineSearched`), so the row
  is graded, wins its pieces (§10) and counts in the summary, the material
  and the lobby's progress; lost again, it is `failed` and offered again.
  `engineFailed` with a `jobId` ends only that job's `queued`, so a late
  echo of the old job never fails the new search. The format is unchanged
  (`engine:wanted` / `queued/<id>` / `searched/<id>`, no version bump).
- **`sessionReducer(record, event)`**, pure; an event that does not apply
  returns the **same record by reference**, so "changed" is `!==` and a write
  of nothing writes nothing. `goTo` is the only way `current` changes, and it
  **leaves** the position on screen first — a reopened pass left unanswered is
  passed again, in that one place. The flow's compound actions are event
  lists applied in one write: Next while answering `[workRecorded, answer,
  next]`, Skip `[workRecorded, pass, next]`, *Answer it now* `[workRecorded,
  reopen]`.
- **When the engine starts thinking** (CTA-247 — `settings.engineStart`, the
  `FindBestMoveEngineStart` tag, the Settings tab's radio): **`move`** (*On
  the first move played* — the default, and every session from before it):
  `firstMove` and the grading (`answer` — Results, or Next while answering)
  both want the engine, so the search runs while the reader analyses;
  **`grade`** (*After Next is clicked*): `firstMove` is no event, only the
  grading wants it — the answer then waits for its search (`waiting`). A
  pass wants it under neither. Changed at any time (`settingsChanged({
  engineStart })`, one write); it changes the setting alone — a position
  already `wanted`, `queued` or `searched` keeps its engine, never asked
  twice.
- **The engine offered** (CTA-245): a first move at a position whose engine
  *would* be wanted were the session's engine on (`engineOfferedAt` — it
  off, the answer open or reopened, the engine `idle`, `needsEngine`) opens
  a dialog, *Use the engine?*: **Use the engine** is one write,
  `[settingsChanged({ engine: true }), firstMove(key)]` — the engine on for
  the session and the position `wanted` (under `grade` the `firstMove` is
  no event: the position's search waits for its grading, CTA-247); the
  offer opens on the first move under both; **Go on without it** leaves both,
  the answer graded against the lines there are (none: "nothing to compare",
  `target` 0). Asked once per position while the screen is up; **a Skip
  never asks**. **The offer is the only way a game's session turns its
  engine on** (CTA-246 removed *Use the engine* from the New session form
  and the left panel): a game's session starts with it off
  (`sessionFromGame`), a Board editor position's with it on
  (`sessionFromPosition`); once on it stays on.
- **The invariants** (held by a seeded random walk in `reducer.test.ts`):
  `current ∈ keys` and `positions` has exactly the keys; at most one
  `reopened`, and it is `current`; an answer is non-empty and never changes;
  the engine axis never leaves `searched`, nor re-enters `idle`, and leaves
  `failed` only through `engineRetry`, to `wanted`, at an answered position
  (CTA-250 — a walk start with every position lost makes sure it is reached);
  the lines only grow, only through a search; work is a tree from its position.

### 3.3 What the panels read

`phaseOf` — one pure function of the two axes: `answering` (the one on
screen, open or reopened), `unanswered`, `waiting` (answered, its engine
`wanted` / `queued`), `graded` (`engineFailedAt` flags one graded without its
engine), `passed`. `engineRetryOfferedAt` (CTA-250) — *Evaluate again*
offered: `graded`, `needsEngine`, and the engine `failed`, or `idle` with
nothing to compare (`target` 0, the offer declined); never at a search that
landed, a pass, or a position answering or waiting. `gradeOf` (a pass grades as one, for the summary),
`resultsOf` (every answered or passed position and the one being answered,
in game order), `summaryOf`, `progressOf` (the lobby's — from the record
alone, so it is what the screen says), `nextOpen` (**the first `open` key
after `current`** in the manifest — every analysed position of the side is
in it, §1, so Skip goes 1 → 2 → 3, never past one), `engineOfferedAt`
(§3.2), `positionAtPath` (the trained position the board stands at, never
past `current`), and `replayPlan(record, from, to)` — the recorded game's
SANs between two keys, **capped at `REPLAY_MAX_PLIES` = 2**: a longer gap
(where positions between were not trained) starts two plies short of `to`.

## 4. The board — a projection of the record

- **`boardTreeOf(record, key)`**: the recorded game up to the position; at
  every earlier position its graded lines with their `[%eval]`, its answer
  worded and the reader's work there — as the movetext projects them; at the
  position, **its work alone** (anything earlier that ran on through it is
  cut there). Loaded when `current` changes (and as the screen mounts), facing
  the side to move.
- **One thing is read back**: the position's subtree, the reader's work
  (`workOf` → `workRecorded`) — written a moment after the board changes and
  always first in an action's event list. The board is never written to the
  Case as a tree; a board move serialises nothing.
- **Where it moves** (R9): on the position or inside a line from it
  (`isAtPosition`). **Where it edits** (R7, S5): strictly under the position
  (`isWorkNode` → the explorer's `editableAt`) — the move menu, the comment
  block and shape drawing are offered nowhere else, so the session's own
  moves are never the reader's to change, and nothing is silently lost.

## 5. The session in its PGN — format 2, tags alone

**Every byte of session state is in the header**; the movetext holds none of
it and is never read by the session. No movetext writer — the Analysis
engine's `[%eval]`, a job's engine line, a typed comment, a promotion, the
Analysis autosave — can reach the session (`pgn.test.ts` holds them to it).

| Tag | Value |
| --- | --- |
| `FindBestMove` | `2` — **what makes a PGN a session**; any other value is none |
| `FindBestMoveName` | the game's name (job titles, the lobby) |
| `FindBestMoveSide` | `white`, `black` or `both` |
| `FindBestMoveMoves` | N, 1–10 (unreadable: 3) |
| `FindBestMoveEngine`, `FindBestMoveArrows` | `on` / `off` |
| `FindBestMoveEngineStart` | `move` / `grade` — when a position's engine search starts (CTA-247); absent (a session from before it) or unknown, `move` |
| `FindBestMoveGame` | the recorded game's SANs, space-separated (empty for a session from a position); its start the `SetUp` / `FEN` pair |
| `FindBestMoveKeys` | the manifest, ascending, comma-separated |
| `FindBestMoveCurrent` | the position on screen, a key |
| `FindBestMoveStatus` | `ongoing` / `done` — written, never read |
| `FindBestMove_<key>` | `state:` (`open` / `answered` / `passed` / `reopened`) `answer:` (`Nf3,d4`) `lines:` (`<moves dot-joined>/<White's score: cp or #N>/<l listed, p the game's move>`, the game's move by itself alone) `engine:` (`wanted`, `queued/<id>`, `searched/<id>`, `failed[/<id>]`; absent idle) — fields absent when empty |
| `FindBestMoveWork_<key>` | the reader's lines there, a PGN movetext fragment from its FEN on one line (`treeToPgn`'s own writing — comments and glyphs ride along; `"` and `\` escaped, S1) |

- **Every write drops every `FindBestMove*` tag** and writes the record whole
  (`withSessionTags`), so stale data lives until the next write at most.
- **Reading is lenient about fields, strict about structure**
  (`sessionRecordOf` → `{ record, issues }`): no `FindBestMove "2"`, a game
  that does not replay, or no manifest — no session; a manifest key whose tag
  is lost — **kept, open**, said (never skipped: the count is the
  manifest's); a key naming no position of the game — left out, said; a field
  that does not parse — its default, said; a work fragment that does not
  parse — none, said; `reopened` off screen — `passed`; `current` outside the
  manifest — the first open key. The screen says the issues once
  (`accuracyTrainer.sessions.readIssue`).
- **The movetext is a projection** (`sessionMovetextOf`): the recorded game as
  the mainline under the source's own tags; at a graded position every line
  hung as a variation, its first move carrying its `[%eval]`, then the answer
  worded on the game's move ("Find Best Move: 1. e4 (#1, Best), … — 2 of the
  top 3, 1 in place"); at a waiting one "… — waiting for the engine"; at a
  pass "Find Best Move: skipped", its lines hidden; at every position the
  reader's work grafted in. Re-derived on every write, never read back — so
  an answer comment is rewritten freely, and a foreign edit lasts until the
  next write. Its words are the catalog's in the writer's language
  (`answerWordsOf`).
- **Download** (the screen's and the lobby's) projects from the record at
  that moment — the screen's with the board's work in — so the file is
  current even where the stored movetext lags.
- **Extending it**: a new piece of state is a field of the record, its tag or
  field written and read in `pgn.ts` (absent reads as its default — no bump
  while an older PGN still reads), §5's table, and the round-trip test. Bump
  `SESSION_FORMAT_VERSION` only for a change an older reader would misread.

## 6. Who writes the Case — one writer

**`editSessionCase(caseId, events)`** (`store.ts`), over S2's
`editAnalysisCasePgn`: inside the Case store's queued write it reads the
record from the tags (`readPgnTags`, no movetext parse), reduces, and writes
the PGN only when the record changed. **Both writers use it** — the screen
(every action) and the Evaluate Position job (`engineSearched`) — and each
applies an event to the record stored at that moment, so **their writes
commute**: no `merges`, no "behind a merge". Two tabs converge through the
engine unit's echo (an idempotent `engineSearched`); a job's search lands
with the trainer closed. `"gone"` / `"not-a-session"` for a Case not there or
no longer a session; a refused write leaves the screen as it was, and says so
(`accuracyTrainer.sessions.writeProblem`).

**A session Case opened in Analysis is read-only** (S3, R24 —
`CaseWorkspace`'s `CaseBoard`, `isSessionTags`): the board navigates but takes
no move, no edit, no Play and no evaluation, and autosaves nothing; a notice
offers *Resume in Find Best Move* (dev builds) and *Duplicate as a plain
case* (`duplicateSessionAsPlainCase`: the readable game, none of the session's
tags). Its Case is made with `display.writeEvals` off (S4) besides.

## 7. The lobby, a new session, resuming

- **The lobby** (`/accuracy-trainer/find-best-move-v4`, `SessionsLobby`): every
  Case of the *Find Best Move* project (`sessionProjectOf`, by name in the
  reader's language) as `FindBestMoveSessionsTable` — Name (its link resumes
  it), Side, Moves to find, Progress, Found, Status, Updated; sortable, newest
  first, the sort and page the URL's; each row's Open in Analysis and
  Download PGN; picks deleted together after one confirmation
  (`removeAnalysisCases` — their unfinished jobs with them). **Rows are read
  from the tags alone**. A Case that holds no session keeps its row, which
  says so — it opens in Analysis and downloads as kept, but does not resume.
- **The New session form** (`NewSessionForm`, the lobby's right-hand panel):
  **Game** (a PGN uploaded or pasted, or a Case picked; the side — White
  to start, CTA-257), **Board editor** (a position other than the
  standard start is the session's — one position, the side to move's, no line
  of its own: the engine finds them, the session's engine on —
  Start off with why while it cannot be answered) and **Settings** (*Moves to
  find*, *Show next-move arrows* — no engine switch, CTA-246), a full-width
  **Start** under all three. **Any game trains** (`setupReadingOf`,
  `gamePositionsOf`, §1): a computer analysis whole, the positions it left no
  line at too; **a game with no engine lines** is taken, said as one (*This
  game carries no engine lines, so training it needs the engine: each
  position offers to turn it on* — `noLines`, information, not a refusal),
  Start on, its session's engine off and offered at each position (§3.2). Start makes
  the session (`sessionFromGame` / `sessionFromPosition`) and its Case
  (`createSessionCase`) and opens it.
- **A PGN of several games** (CTA-259 — New case's way, CTA-208): only
  **indexed** (`indexPgnGames`, no move read — a file of thousands loads at
  once), never listed in the form; the first game taken and **only the
  chosen game parsed**; the form names it ("Game 3 of 15,905: White –
  Black, Event, Date") with *Choose another game…*, which opens the games
  picker (`GamesPickerDialog`, `one` mode — the Library's games table,
  sortable, paged, a words box; its rows built the first time it opens); a
  click chooses. A chosen game that will not read is said
  (`accuracyTrainer.setup.games.unreadable`) and Start stays off. Picking a
  Case, or loading one game, forgets the games.
- **A session PGN loaded in the form** (a downloaded one, or a session Case
  picked): known by its tags, said with how far it got, the side toggle off —
  **Resume** in Start's place makes a **new** Case of it, where it was left
  (R6).
- **A session's address** (`FindBestMoveRoute`): the Cases read first, then
  the screen keyed by the Case; a Case not there and one that holds no
  session each say so, with the way on.

## 8. The screen — four units over the reducer

| Unit | Owns |
| --- | --- |
| `useSessionCase(caseId)` | the Case store's snapshot, the record parsed from its tags (memoised on the Case's row), `dispatch(events)` through `editSessionCase`, the write problem |
| `useSessionBoard` | `useBoardCore` over `boardTreeOf`, loaded when `current` changes (adjusted during render); the reader's moves (`candidates`, moved / deleted with their lines), Add move (`newMove`), `canMove`, `editableAt`; the wrapped drops (a first move where the engine is needed dispatches `firstMove` — or, the session's engine off, opens the offer, `engineOffer`: `open`, `accept`, `decline`, once per position, CTA-245); the debounced `workRecorded` and `flushWork`; the replay's start |
| `useReplay` | the timers: the board put on the plan's start, then one ply every `stepDelayMs` (`STEP_DELAY_MS`, 1 s — a prop for tests), stopped once the reader moves the board. No chess |
| `useSessionEngine` | an Evaluate Position job queued for every `wanted` position (the Engine menu's search, MultiPV N; an in-flight set so no render queues twice), then `engineQueued` / `engineFailed`; the queued jobs watched and echoed — `engineSearched` with a done job's result, `engineFailed` for one failed, cancelled or gone; a position wanted again (`engineRetry`, CTA-250) queued anew — the in-flight set holds a key only while its job is being queued |

`useFindBestMove` composes them and names the actions (each one event list,
one write, the board's work flushed first — `evaluateAgain(key)` among them,
CTA-250); `FindBestMove.tsx` places what it
returns. **Results** (outlined) grades, takes the board back to the
position — where the graded arrows are drawn — and opens Result (CTA-257);
**Next** while answering grades and goes on; **Skip** (`pass`, CTA-257 — the
reader's word "skip / skipped" throughout, the code's `pass`) puts it off and
goes on — both play the game's moves to the next position out (capped);
**Add move** (outlined, `board.newMove`, CTA-257) takes the board back to
the position node; a click on Results or the summary goes
straight there. The right panel: **Moves · Map · Result** (off until
answered) **· Summary**; the header — back to the sessions, the
*Experimental* chip, "Position 3 of 12 · 12. White", New session (an icon) and
Download PGN; the footer — a read issue, a refused write, the comment block,
the next-moves bar, the instructions, the reader's moves, the engine's word,
then Add move (outlined) · Skip · Results (n) · Next, or Next / Summary once answered;
the Result tab's word on a position graded without its engine — *could not
search* (`failed`) or *was not asked* (`idle`, `engine.notAsked`) — with
**Evaluate again** under it (CTA-250, `engineRetry`);
and **the engine's offer** (§3.2), a `ConfirmDialog` — *Use the engine?*,
Go on without it · Use the engine.
**The arrows**: the explorer's; once graded, on the position itself, the top
N in green and the reader's moves outside them in red. **The left panel**
(`AccuracyTrainerDetails`, a drawer under the breakpoint): the game's name,
its Case linked, then **Your moves** (the trained position the board stands
at — answering, its moves to reorder or delete; waiting; graded, every line
with the reader's marked — graded without its engine, **Evaluate again**
under it, CTA-250 (`AccuracyTrainerMoves`' `onEvaluateAgain`); passed, with *Answer it now*; not answered yet),
**Results** (in game order, the one the board stands at current; a click back
to each — a passed one to answer it now), **Score** (the pieces the
position the board stands at won, §10) and **Settings** (*Moves to find*
locked, *Show next-move arrows*, *Engine starts thinking* — on the first
move played, or after Next is clicked, a `RadioGroupField`, CTA-247
(`engineStart` / `onEngineStartChange`, `useFindBestMove`'s
`changeEngineStart`) — no engine switch since CTA-246: the offer alone turns
it on).

## 9. Extending it

- **A new measure**: a field of `SessionSummary` (`sessionSummaryOf`), its
  test, a row in `AccuracySessionReport` and its key.
- **Another grading rule**: in `gradeSuggestion` / `gradePosition`, pure,
  with its test; the blocks read the grade.
- **Another session step** (a hint, a retry): an event of the reducer — its
  table row, the invariants walk's generator, its test — an action of
  `useFindBestMove`. Never a field the screen keeps beside the record.
- **A new piece of session state**: §5's last point.
- **A new achievement category**: a grader and a registry line
  (`lib/achievements/categories.ts`, `ACHIEVEMENT_CATEGORIES`), its table
  test, and its name `accuracyTrainer.achievements.categories.<id>` in both
  catalogs — the row, the report and the material follow the registry.

## 10. Achievements — a piece per position, per category (CTA-249)

The design is [`docs/design/accuracy-achievements.md`](../../docs/design/accuracy-achievements.md).
**Every graded position wins a chess piece (or none) in each of five
categories** — a category is a goal at one position, a piece how well the
answer met it there; one answer earns in every category at once (no new
input, no mode). Pawn 1, Knight 3, Bishop 3 (ranked above the Knight), Rook
5, Queen 9; **the highest tier whose condition holds wins** (each grader
reads its table top down).

- **Pure, `lib/achievements/`**: a grader per category, `(AchievementInput)
  → Piece | null` — the `TrainingPosition`, its `PositionGrade` (every move
  given), the reader's `work` there and X, the session's *Moves to find*.
  **Only the first X moves are graded** (`grade.suggestions.slice(0, X)`).
  No piece for a pass or `target` 0 (every grader); a precondition not met,
  none in its category. **A move outside the lines fails every tier above
  Pawn** where its category grades it — A1 / A3 any of the first X, A2 / A4
  the first — and Pawn too where its bound (`lossAtLeast`) fails it.
- **The categories** (`ACHIEVEMENT_CATEGORIES`, ids and the note's codes):
  `order` A1 *Place in order* (X ≥ 2; Queen all X in place, Rook all X in the
  top X, Bishop the best first, Knight the best among them, Pawn one in the
  top X; a target under X caps it at Bishop); `best` A2 *Best move* (the
  first: Queen the best and line 2 losing ≥ 150 — `ONLY_MOVE_CP`, no second
  listed line at most Rook —, Rook the best, Bishop ≤ 20 — `NEAR_BEST_CP` —,
  Knight ≤ 50, Pawn in the top X); `clean` A3 *Clean candidates* (X moves
  given; every one: Queen ≤ 20, Rook in the top X, Bishop ≤ 50, Knight ≤
  100, Pawn ≤ 300); `game` A4 *Better than the game* (the game's move's line
  losing > 100; the first: Queen the best, Rook in the top X, Bishop ≤ 50,
  Knight ≤ 100, Pawn less than the game's — **a move not losing less than
  the game's wins nothing**, the game's move itself too, so every tier
  holds Pawn's); `line` B1 *See the line* (one of the first X the best move:
  the reader's work from it along its first children against the engine's
  line from it, `TrainingLine.sans` — plies matched from the start, 1 / 2 /
  3 / 4 / 6, `LINE_TIERS`; the game's move's stored line is the move alone).
- **Nothing stored.** `achievementsOf(record, key)` (`selectors.ts`): graded,
  `piecesOf` over the derived position, its grade and its work — none
  (`noPieces`) for one graded without its engine (`engineFailedAt`) or a
  pass; `null` while not graded. `materialOf(record)` →
  `sessionMaterialOf`: per category and in all, and how many of each piece.
  No tag, no projection — the pieces cannot drift from the grade.
- **The screen**: the left panel's **Score** tab (its id `achievements`)
  (`AccuracyTrainerDetails`' `achievements` — `{ label, pieces }`, the
  position the board stands at, as Your moves; `useFindBestMove`'s
  `shownAchievements`): a table (`AchievementTable`), a row per category —
  its colour's swatch (`CategorySwatch`) and name, then the five pieces Pawn
  to Queen from the board's set (`defaultPieces` via `PieceIcon`), the one
  won **filled with its category's colour** on a highlighted cell, the others
  dimmed and grey as disabled. **Each category has its own colour**, a theme
  token — `chess.achievements.<id>`, a light and a dark shade, each 3:1 on its
  paper (`contrast.ts` reports it; the theme editor's Annotations section
  edits it) — so a piece shown alone says which category it belongs to;
  `PieceIcon`'s `tint` draws one (one drawing per scheme: an SVG fill takes
  no CSS variable); under the table **what each piece won means**
  (`AchievementNotes`: a line per category that won, its piece, its name and
  `accuracyTrainer.achievements.explain.<category>.<piece>` with X as
  `count`; none won, a line saying so); on the **Results** tab every graded or passed row has **five slots** in
  its middle, a category each in the registry's order — the piece won in its
  colour, a disabled (dimmed, grey) pawn where none was — the row a grid of
  equal side columns, so the slots line up on every row
  (`AccuracyTrainerResult`'s `achievements`; a row waiting or being answered
  keeps their room empty); the pieces won named in the row's button ("— won
  Place in order: Queen, …", `resultOpenWon`); a screen reader hears each row header whole,
  "Place in order: Queen" / "…: no piece" (`achievementNameOf`), and each
  cell its piece and *Won* / *Not won* — or, not graded yet, a line
  saying so — the Result tab's `GradedLines` shows none; the Summary's `AccuracySessionReport`
  takes `material` — a table under the measures, a row per category and
  *All categories* (each category's swatch beside its name): each piece counted, the material. Words
  `accuracyTrainer.achievements.*`.
- **Later** (the note's §5, not built): a reader's lifetime ledger across
  sessions, a database of its own.
