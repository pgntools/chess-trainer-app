# Find Best Move v4 — requirements and architecture (CTA-243)

> **Status: built in CTA-244**, which also removed v3. The build's reference is
> [`accuracy-trainer.md`](../../.claude/rules/accuracy-trainer.md). Where it
> settled something this note left open: the Evaluate Position kind took a
> new id, `analysis.evaluate-session-position`, so that v3's
> `analysis.evaluate-position` jobs read as a retired kind's (kept, never run,
> Delete alone — S6); an answer comment sits on the game's move at its
> position (the position itself where it has none, as in a session from a
> position); a manifest key past the game's end is left out, said, since no
> board can show it.
>
> **CTA-248 removed what v4 kept of v3**: the retired kind
> `analysis.evaluate-position` (S6's retired input) and the *older session*
> — a `FindBestMove "1"` Case is a plain Case now, its row the lobby's "holds
> no session", and `fbm` left `UNREAD_COMMANDS`. No reader had either saved.
> What R23, §5.5, §8 (S6 too), §9.3 and §9.4 say of them below is history.

A design note: no production code ships with it. It reviews the Find Best
Move v3 session (the Accuracy Trainer, dev-only —
[`accuracy-trainer.md`](../../.claude/rules/accuracy-trainer.md)) end to end,
both how its PGN is written and read and its game flow (open a position,
answer, Pass, Next, the stepped replay, reopening a pass, resuming). It then
specifies **v4, built from a clean slate**: every requirement v3 meets, on a
model that keeps those requirements by construction instead of patching
around them. A later issue builds it, scoped from §9.

**Decisions already taken** (the user's, on CTA-243):

- v4 is a clean slate. It reuses what is sound (the grading, the blocks)
  and replaces the session, its PGN format and the screen hook.
- **The v1 session format (v3's `[%fbm]`) may be dropped.** A v3 session
  does not resume in v4.
- The build is a later issue (or issues), scoped from this note.

---

## 1. What triggered it

The trigger was debugging session `gmvgdlti036ue`. Its PGN held 38
`[%fbm]` commands, but it resumed with 35 positions. Positions 8, 9 and 10
vanished, two of them already answered. Results showed 1–7, 11, 12, and Next
from position 7 replayed eight plies to position 11.

**The cause**: on those three moves an `[%eval]` had been prepended into
the comment holding the command (`{ [%eval -0.39,29] [%fbm game:Be6 …] }`).
`SESSION_COMMAND` (`lib/findBestMoveSession.ts`) matches only a comment that
is the command alone, so `commandsOf` (`lib/findBestMoveSessionPgn.ts`)
skipped those three, and the positions list shrank. Every index after them
then shifted.

**Where the `[%eval]` comes from**: `withEval` (`lib/engineEvals.ts`) writes
"first in the move's first comment", and v3 puts the command first. Two
writers reach a session's command node:

1. **The Case opened in Analysis with the engine on.** `DEFAULT_CASE_DISPLAY.writeEvals`
   is `true`, so every finished search writes an `[%eval]` on the move on
   screen.
2. **Inside the trainer, with side `both`.** An Evaluate Position job's
   `withEngineLine` writes the eval of each line's first move. That move is
   the game's move when the engine agrees with it, which is the move
   carrying the *next* position's command.

Both writers do exactly what their contracts say. The fault is v3's: it
keeps machine data in a place every other writer is entitled to edit.

---

## 2. v3's weak points, and v4's answer to each

| # | v3 | v4 | Where |
| --- | --- | --- | --- |
| 1 | Machine data shares the PGN movetext with every other writer. A command is a comment among comments, recognised by a whole-comment regex, so any foreign edit (an eval, an analysis, a hand edit) can silently drop a position. | **Machine data lives in PGN tags alone.** The movetext is a *projection*: written by the trainer, never read back. Nothing a movetext writer does can reach the session. | §5.1, §5.4 |
| 2 | Commands are never garbage-collected. `withSessionRecord` replaces commands only on positions it knows, so an unread command stays forever. `withoutSessionCommands` misses a merged one, so the board shows it as a comment and gives the answer away. | Every write drops **every** `FindBestMove*` tag and writes the record whole, so stale data cannot survive a write. The board is built from the record, never from the stored PGN, so it cannot show machine data. | §5.5, §6.1 |
| 3 | `FindBestMovePosition` is an index into the position list. When the list changes size it silently points at another position. | A position's identity is its **key**: the ply of its move in the session's own recorded game, which never changes. `current` is a key. A **manifest** tag lists every key, so a lost position is detected and said, never skipped. | §4.1, §5.2 |
| 4 | The session is seven parallel arrays (`positions`, `answers`, `jobs`, `searched`, `work`, plus `reopened` and `index`), mapped together by every transition. Identity is an array index. | **One record per position**, in a map keyed by the position key. Each holds its own answer, engine and work state. | §4.2 |
| 5 | The reader's work is stored twice: in `work:`, and merged into the Case's tree (`graftMoves`), where it cannot be told apart from the game's and the engine's moves. So the view must hide and graft continuations (`positionViewOf` / `caseTreeOf` / `withChildren`). | **The work lives in the record alone**, one tag per position, written as a PGN fragment so its comments and glyphs ride along. The board and the export are both projections of it. Nothing is hidden, grafted or told apart. | §5.3, §6.1 |
| 6 | The grading lines are stored twice: in `lines:`, and hung in the tree (`withPositionLines` / `withPositionEngineLines`). The answer is written as a comment that must never be rewritten. | **The lines live in the record alone.** The export hangs them, and writes the answer comment, afresh on every write, so a comment being rewritten is harmless. | §5.2, §5.4 |
| 7 | `useFindBestMoveSession.ts` (~550 lines) owns the board, the session, the job states, the grading, the replay timers, and a `caseTree` memo that rebuilds and re-serialises the whole PGN on every board change. The autosave and the job both write the same Case, reconciled through `merges` ids. | **Four units and a pure reducer** (§7). A board move serialises nothing. Every Case write applies an **event to the stored record** (read, modify, write), so the trainer's write and the job's write commute. No `merges` are needed. | §6, §7 |
| 8 | The flow's states are implicit (answering, waiting for the engine, graded, passed, reopened), spread across `answers[]` null vs `[]` vs moves, `reopened`, `jobs`, `searched` and the engine job states. | **Two explicit per-position axes**, the answer and the engine, each a small state machine with pure transitions. The screen's states are one pure function of the two (`phaseOf`). | §4.3 |
| 9 | Next means "first unanswered after the current index". That is right, but invisible when positions disappear, and the replay plays every ply in between with no cap. | Next is "the first `open` key after `current` in the manifest". The manifest is fixed at start, so no position can disappear. The replay is planned purely and **capped**: at most the last two plies are played out, and the board jumps to the start of them. | §4.4 |

---

## 3. Requirements

Each one is marked against v3: **kept** (as v3 meets it), **changed**
(kept in spirit, behaviour amended — the change said), **new** or
**dropped**.

### 3.1 Starting a session

| # | Requirement | v4 |
| --- | --- | --- |
| R1 | A session from a **game**: a PGN uploaded or pasted (one game picked from many), or an Analysis Case, for a **side**: white, black or both. | kept |
| R2 | A session from **one position** (the New session form's Board editor). One position, the side to move's, no lines of its own, so the engine finds them (the session's engine on, whatever the switch said). Start is off, with the reason, while the position cannot be answered. | kept |
| R3 | **N, the moves to find**: 1–10, 3 to start, **fixed for the session** (locked in Settings while it runs). | kept |
| R4 | **The positions**: every position before an analysed mainline move (the `AnalysedPlies` / `AnalysedSide` scope), **whether or not the analysis hung side lines there** (`gamePositionsOf`); of a tree with no engine line at all, every mainline position. Filtered by side (`sessionPositionsOf`). A position with no side line has no top line of its own — the game's move is not one — so it needs the engine (R12). | changed in CTA-245: v4 first kept, with the engine off, only positions with at least one evaluated side line, so a full analysis's positions where the game's move was the only line in range were left out of the manifest and Pass skipped them (1 → 4). Changed again in CTA-246: a game with no engine line was refused while *Use the engine* was off; it is taken now, every position the engine's, offered there (R12). |
| R5 | **The position set is fixed when the session starts.** No later edit adds, drops or reorders one. | new: v3 meant this but did not hold it (the 38-to-35 bug) |
| R6 | A session PGN loaded in the form is known by its tags and **resumed as a new Case**, where it was left (Resume in Start's place, the side toggle off). | kept, for the v2 format only |

### 3.2 At a position

| # | Requirement | v4 |
| --- | --- | --- |
| R7 | A board with **every move before the position and none after**, facing the side to move. "Before" means the game's moves plus what the session left at earlier positions: their graded lines with `[%eval]`, their answers as comments, the reader's lines there with their comments and glyphs. | changed: v3 also kept *free* edits anywhere before the position (a comment on an earlier game move). v4 keeps only what the session owns, so only the current position's subtree is editable (§6.1, shared change S5). |
| R8 | **The reader's moves** are the first moves of their lines from the position, ranked in line order. A new line goes last. *Promote variation* / *Make main line* reorder. Your moves moves one up or down, or deletes it with its line. **New move** takes the board back to the position node. A reply inside a line is analysis, not a move. | kept |
| R9 | **Where the board moves**: on the position or inside a line from it. | changed: v3 allowed moves anywhere once the position was answered, and kept them in the Case. v4 keeps only the position's subtree, so moves elsewhere would be silently lost. To work at another position the reader opens it (Results). |
| R10 | **Results** (grade, open Result), **Pass** (put off for later, go on at once), **Next while answering** (grade, go on, no Result tab), **Answer it now** on a pass (reopened as the position on screen, its pass taken back). An answer with moves is final. A reopened pass left unanswered is passed again. | kept. "Passed again" becomes an invariant of the one `leave` transition (§4.3). |
| R11 | **Grading**: the reader's moves in their order against the top N by rank and centipawn loss. Found, in place, best found, verdicts, *not among the lines* with its loss a bound (`gradePosition`). | kept, and reused as is |
| R12 | **The engine** (the session's `settings.engine`): a position with fewer top lines than N is searched by one **Evaluate Position job** (the Engine menu's search, MultiPV N). It is queued by the reader's first move there, or by a check if none was. A check waits for it. A job that fails, is cancelled or is gone is graded with the lines there are, and said. **A position's engine is never asked twice.** A pass never waits. **With the engine off**, the reader's first move at such a position asks whether to turn it on for the session: yes turns it on and queues the job; no goes on, graded against the lines there are. A pass never asks. **The offer is the only way on**: a game's session starts with it off, a position's (the Board editor) with it on — no switch. | kept. The job's result lands in the session record, not in the movetext, and the intent to search (`wanted`) persists across a reload (§4.3). The offer is new in CTA-245 (`engineOfferedAt`); CTA-246 removed the *Use the engine* switch from the New session form and the left panel. |
| R13 | **Arrows**: the explorer's next-move arrows (*Show next-move arrows*). Once graded, on the position, the top N in green and the reader's moves outside them in red. | kept |

### 3.3 Between positions

| # | Requirement | v4 |
| --- | --- | --- |
| R14 | **On to the next**: the next position still to answer after the one on screen. The summary comes after the last. | kept. Defined on keys and the manifest (§4.4). |
| R15 | **The stepped replay**: the board starts at the position just answered and plays the game's moves to the next one, one every `STEP_DELAY_MS` (1 s, a prop for tests). It stops when the reader navigates. Opening from Results or the summary, or *Answer it now*, jumps straight there. | changed: **capped**. At most the last two plies are played out; a longer gap is jumped to the start of them (§4.4). |

### 3.4 The screen

| # | Requirement | v4 |
| --- | --- | --- |
| R16 | **The right panel**: Moves · Map · Result (off until answered) · Summary. The header has the way back to the lobby, the *Experimental* chip, "Position 3 of 12 · 12. White", New session (an icon) and Download PGN. The footer has the comment block, the next-moves bar, the instructions, the reader's moves, the engine's word, then **New move · Pass · Results (n) · Next** while answering, or Next / Summary once answered. | kept |
| R17 | **The left panel** (`AccuracyTrainerDetails`, a drawer under the breakpoint): the game's name, its Case linked, then **Your moves** (the trained position the board stands at: answering, waiting, graded, passed with *Answer it now*, or not answered yet), **Results** (every answered or passed position plus the one being answered, in game order, a click back to each) and **Settings** (*Moves to find* locked, *Show next-move arrows*). | changed in CTA-246: *Use the engine* removed — the offer (R12) turns it on |
| R18 | **The summary** (`sessionSummaryOf`, `AccuracySessionReport`). | kept |

### 3.5 Keeping it

| # | Requirement | v4 |
| --- | --- | --- |
| R19 | **A session is one Analysis Case** in the one *Find Best Move* project (found by its name, else made), named "<game> — Find Best Move", **autosaved**. | kept. Written by events (§6.2), not by snapshots. |
| R20 | **Reloadable, downloadable and resumable from its PGN alone.** | kept |
| R21 | **Readable in any PGN viewer**: the game, the reader's lines, the engine's lines with `[%eval]`, the answers as comments. | kept. The movetext is a projection holding **no** machine command, so no viewer shows one as text (§5.4). |
| R22 | **The Jobs deletion rule**: deleting the Case takes its unfinished jobs. | kept (the job's subject stays the Case) |
| R23 | **The lobby**: the project's Cases as `FindBestMoveSessionsTable` (Name, Side, Moves to find, Progress, Found, Status, Updated; sortable, paged, URL state; Open in Analysis, Download PGN; picks deleted after one confirmation), with the **New session form** in its right-hand panel (Game, Board editor and Settings tabs; Start or Resume). A Case that holds no session keeps its row and says so. | kept. Rows are read from the tags alone (`readPgnTags`, no movetext parse). A v3 session's row says "an older session" and opens in Analysis. |
| R24 | **A session Case opened in Analysis** cannot corrupt the session. | new. True by construction (§5.4). As well, Analysis opens a session Case **read-only**, offering *Duplicate as a plain Case* (S3), so a reader's edit there is never silently replaced by the trainer's next write. |
| R25 | **Dev-only**, *Experimental* chip, no `e2e/a11y/routes.ts` line, no code in `dist/`. | kept |
| R26 | **A v3 (format 1) session resumes.** | **dropped** (the user's decision) |

---

## 4. The session model

All of it is pure (`src/lib/findBestMove/`, §9). React, the store and the
router never reach it.

### 4.1 Identity: the position key

A session records **its game**: the start FEN and the mainline as SANs,
copied from the source when the session starts and **never edited after**.
Every position is a position of that recorded game, so it is named by:

```ts
/** The ply of the move to find, 1-based from the recorded game's start (`TrainingPosition.ply`). */
type PositionKey = number;
```

- **Stable**: the recorded game never changes, so a key always names the
  same position. Its SAN path is `game.moves.slice(0, key - 1)`, its FEN
  that path replayed from `game.startFen` (computed once, cached), and its
  game move `game.moves[key - 1]` (none past the end, or for a session from
  a position, whose game is empty and whose one key is `1`).
- **Not an index**: nothing derives a key from a position's place in a
  list. Order is the keys' numeric order.
- **Not a FEN**: a FEN can repeat in one game (a repetition, a
  transposition), and a ply cannot.
- **Not a tree node id**: ids do not survive a PGN round trip (CLAUDE.md,
  *One game model*).

### 4.2 The records

```ts
type FindBestMoveRecord = {
  version: 2;
  name: string;                      // the game's name — job titles, the lobby
  side: TrainingSide;                // "w" | "b" | "both"
  wanted: number;                    // N, 1–10, fixed
  settings: { engine: boolean; arrows: boolean };
  game: { startFen: string; moves: readonly string[] };   // immutable
  keys: readonly PositionKey[];      // the manifest, ascending, fixed at start
  current: PositionKey;              // the position on screen — always one of `keys`
  positions: ReadonlyMap<PositionKey, PositionRecord>;
};

type PositionRecord = {
  key: PositionKey;
  /** Every line the position is graded against: the source's, then the engine's merged in. Grows only. */
  lines: readonly StoredTrainingLine[];
  answer: AnswerState;
  engine: EngineState;
  /** The reader's own lines from the position (moves, comments, NAGs), a tree from its FEN; `null` none. */
  work: GameTree | null;
};
```

A `TrainingPosition` (what `gradePosition` takes) is **derived**:
`trainingPositionFrom(<key's path, fen, turn, ply, move number, game move>, lines)`.
It is never stored, so it cannot drift from the lines.

### 4.3 The per-position state machines

A position has two independent axes, each a small machine. **What the
screen shows is a pure function of the two** (`phaseOf`, below). There is no
third place to look.

**The answer axis:**

```
            pass                    reopen ("Answer it now")
  open ─────────────▶ passed ──────────────────────────▶ reopened
   │                    ▲                                   │  │
   │ answer(moves≥1)    └──────── leave (unanswered) ───────┘  │ answer(moves≥1)
   ▼                                                           ▼
 answered ◀────────────────────────────────────────────────────┘
 (final)                         pass (from reopened) → passed
```

```ts
type AnswerState =
  | { kind: "open" }
  | { kind: "passed" }
  | { kind: "reopened" }                          // a pass being answered again — only ever `current`
  | { kind: "answered"; moves: readonly string[] }; // ≥ 1 move, final
```

**The engine axis** (only ever left `idle` while the session's engine is on and
the position's top lines are fewer than N, `needsEngine`):

```
 idle ──want──▶ wanted ──queued(id)──▶ queued ──searched(result)──▶ searched
                  │                      │
                  └──refused─┐           └──failed / cancelled / gone──┐
                             ▼                                         ▼
                           failed ◀────────────────────────────────────┘
                             │
                             └──retry (Evaluate again, answered — CTA-250)──▶ wanted
```

```ts
type EngineState =
  | { kind: "idle" }
  | { kind: "wanted" }                      // to be queued — persisted, so a reload still queues it
  | { kind: "queued"; jobId: string }
  | { kind: "searched"; jobId: string }     // its lines are in `lines`
  | { kind: "failed"; jobId?: string };     // graded with the lines there are, and said
```

`searched` is terminal, and nothing leads back to `idle`. That is **"never
asked twice"**, held by the type rather than by a ref and a `queuedAt` set.
`failed` is left by one event alone, the reader's **Evaluate again**
(`engineRetry`, CTA-250): an answered position whose search was lost goes back
to `wanted`, and a new job is queued for it.

**The derived phase**, what every panel reads:

| answer | engine | `phaseOf` |
| --- | --- | --- |
| `open`, the key is `current` | any | `answering` (the footer says while `wanted` / `queued`) |
| `open`, not `current` | any | `unanswered` |
| `reopened` | any | `answering` (a reopened pass) |
| `answered` | `wanted`, `queued` | `waiting` |
| `answered` | `idle`, `searched` | `graded` |
| `answered` | `failed` | `graded`, flagged "the engine did not answer" |
| `passed` | any | `passed` |

**The transitions**: one reducer, `sessionReducer(record, event) → record`,
pure. An event that does not apply returns the same record by reference, so
"changed" is `!==`, as with trees:

| Event | Effect |
| --- | --- |
| `goTo(key)` | `leave` the current position, then `current = key`. |
| *(internal)* `leave` | The current position, if `reopened`, becomes `passed`. This is the **only** way `current` changes, so a reopened pass can never outlive being on screen. |
| `workRecorded(key, work)` | That position's `work` replaced. |
| `firstMove(key)` | The engine axis goes `idle → wanted` where the engine is on and the lines are too few. |
| `answer(key, moves)` | `open` / `reopened` → `answered(moves)`, for one or more moves. Same engine rule as `firstMove`. |
| `pass(key)` | `open` / `reopened` → `passed`. The engine axis is untouched: a pass never waits. |
| `reopen(key)` | `passed` → `reopened`, then `goTo(key)`. |
| `next` | `goTo(nextOpen(record))`, or nothing when no position is left (the summary's turn). |
| `engineQueued(key, jobId)` | `wanted → queued`. |
| `engineSearched(key, jobId, result)` | `wanted` / `queued` → `searched`, and the result merged into `lines` (`withEngineResult`'s rule: a move the lines already hold keeps its own). **Idempotent**: the same result twice is the same record. |
| `engineFailed(key, jobId?)` | `wanted` / `queued` → `failed`; with a `jobId`, only `queued(jobId)` — a job's echo names its own search, never a new one. |
| `engineRetry(key)` (CTA-250) | *Evaluate again*: `answered`, the engine on and the lines still too few — `failed` or `idle` → `wanted`. The answer is untouched. For a position whose offer was declined the action is `[settingsChanged({ engine: true }), engineRetry(k)]`, one write. |
| `settingsChanged({ engine?, arrows? })` | The settings (N is not a setting here). |

The flow's compound actions are **event lists applied in one write**: Next
while answering is `[answer(k, moves), next]`, Pass is `[pass(k), next]`,
*Answer it now* is `[workRecorded(current, …), reopen(k)]`.

**Invariants**, asserted after every event by one test helper (§9.3):

- `current ∈ keys`, and `positions` has exactly `keys`;
- at most one position is `reopened`, and it is `current`;
- `answered.moves` is non-empty and never changes;
- the engine axis never leaves `searched`, never re-enters `idle`, and leaves
  `failed` only by `engineRetry`, to `wanted`, at an answered position (CTA-250);
- `lines` only grows, and only through `engineSearched`;
- `work`, when present, is a tree from the position's FEN.

### 4.4 Next and the replay

- **`nextOpen(record)`**: the first key after `current`, in `keys` order,
  whose answer is `open`. This is v3's rule, but over a manifest fixed at
  start, so "after" can never skip a position that silently vanished.
- **`replayPlan(record, from, to) → string[]`**: the recorded game's SANs
  between two keys, pure, so the replay itself holds no chess. **Capped at
  `REPLAY_MAX_PLIES = 2`** (the reader's side's game move, then the reply,
  the usual gap). A longer gap, met only where positions in between were
  not trained, jumps the board to `to − 2` and plays the last two.
- The replay unit (§7) plays the plan, one ply every `stepDelayMs`, and
  stops as soon as the board's node is not the one it expects (the reader
  navigated). This is v3's rule, kept.

### 4.5 Selectors (pure, what the panels read)

`trainingPositionOf(record, key)`, `phaseOf(record, key)`,
`gradeOf(record, key)` (`gradePosition` over the derived position; `null`
unless `graded`), `resultsOf(record)` (the Results rows),
`summaryOf(record)` (`sessionSummaryOf` over the graded),
`progressOf(record)` (the lobby: from the record alone, so it equals the
screen's), `positionAtPath(record, sanPath)` (the trained position the
board stands at, for Your moves), `nextOpen`, and `isDone` (every answer is
`answered` or `passed`).

---

## 5. The PGN format, version 2

### 5.1 Where machine data lives: tags, and only tags

**Every byte of session state is in the header.** The movetext holds none of
it and is never read by the session. Why tags:

- **No movetext writer reaches them.** `withEval`, `withEngineLine`,
  `withMoveVerdict`, the Analysis board's edits, `mergeTrees`, a comment
  typed by hand: every one is a `setComments` / `setNags` / `addLine` edit
  of moves. The only headers any of them write are `Annotator` and the
  computer analysis's scope tags (`AnalysedPlies`, `AnalysedSide`). The
  session uses none of them.
- **They round-trip through every app path.** `parsePgnTree` keeps every
  tag (with `\"` escapes, `splitTags`) and `treeToPgn` writes every tag
  back, so the Analysis autosave, an Export zip and an Import all carry
  them. One gap: the writer does not yet escape a quote in a value (shared
  change S1).
- **Precedent**: `AnalysedPlies` / `AnalysedSide` are tags for exactly this
  reason, "a reader may ignore a tag it does not know, out of sight, whereas
  some readers print an unknown comment command as text" (`pgn-annotations.md`
  §6).
- **Cheap to read**: `readPgnTags` reads the header without parsing a move,
  which is all the lobby needs.

Rejected, with the reason:

- **One dedicated movetext command** (v3's scheme, hardened). A command
  hardened against prefixes is still in the space every other writer edits.
  Each new writer is another way to break it, and needs another shared-code
  exception.
- **A separate store, with the PGN as a pure export.** R20 requires resuming
  from the file alone, so the export must carry the record anyway. Keeping it
  in a store too would be double storage, the very thing §2 rows 5 and 6
  remove.

### 5.2 The tags

Session tags, in this order:

| Tag | Value |
| --- | --- |
| `FindBestMove` | `2`, the format version. **What makes a PGN a session**: any other value (v3's `1`) is none to v4. |
| `FindBestMoveName` | The game's name (job titles, the lobby). |
| `FindBestMoveSide` | `white`, `black` or `both` |
| `FindBestMoveMoves` | N, 1–10 |
| `FindBestMoveEngine`, `FindBestMoveArrows` | `on` / `off` |
| `FindBestMoveGame` | **The recorded game**: its mainline SANs, space-separated, no numbers (`e4 e5 Nf3 Nc6 Bb5`). Empty for a session from a position. The start is the standard `SetUp` / `FEN` pair, which `treeToPgn` writes from `startFen`. |
| `FindBestMoveKeys` | **The manifest**: every position key, comma-separated, ascending (`5,7,9`). |
| `FindBestMoveCurrent` | The position on screen, a key. |
| `FindBestMoveStatus` | `ongoing` / `done`, for a reader of the file. Written, never read: the session derives it. |

One tag per position, `FindBestMove_<key>`, its fields `key:value`,
space-separated, absent when empty (v3's command grammar, kept where it was
sound):

| Field | Value |
| --- | --- |
| `state:` | `open`, `answered`, `passed`, `reopened` |
| `answer:` | the moves, `Nf3,d4,c4` (only with `state:answered`) |
| `lines:` | every line graded against, each `<moves dot-joined>/<score, White's view: centipawns or #N>/<flags: l listed, p the game's move>` — `e4.e5.Nf3/31/lp,d4/25/l` |
| `engine:` | `wanted`, `queued/<jobId>`, `searched/<jobId>`, `failed` or `failed/<jobId>`; absent for `idle` |

One more per position that has work, **`FindBestMoveWork_<key>`**: the
reader's lines as a **PGN movetext fragment** from the position's FEN, on one
line (`3. Bb5 {the Spanish} (3. Bc4 $5 Bc5) *`), with `"` and `\` escaped as
the PGN standard escapes a string. Reading it is `parsePgnTree` over the
fragment under a `SetUp` / `FEN` header of the key's FEN. The reader's
comments and glyphs ride along, with no encoding of v4's own.

Tag names fit the parser's `[A-Za-z0-9_]+`. No value holds a newline.

**An example**: a session over White's moves, position 5 answered and
graded with the engine's help, position 7 on screen:

```pgn
[Event "Casual game"]
[White "Alice"]
[Black "Bob"]
[Result "*"]
[FindBestMove "2"]
[FindBestMoveName "Alice – Bob"]
[FindBestMoveSide "white"]
[FindBestMoveMoves "3"]
[FindBestMoveEngine "on"]
[FindBestMoveArrows "on"]
[FindBestMoveGame "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6"]
[FindBestMoveKeys "5,7"]
[FindBestMoveCurrent "7"]
[FindBestMoveStatus "ongoing"]
[FindBestMove_5 "state:answered answer:Bb5,Bc4 lines:Bb5/31/lp,Bc4.Bc5/25/l,d4.exd4/22/l engine:searched/j8k2m4"]
[FindBestMoveWork_5 "3. Bb5 {the Spanish} (3. Bc4 Bc5) *"]
[FindBestMove_7 "state:open lines:Ba4/28/lp,Bxc6/20/l"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 { [%eval 0.31] Find Best Move: 1. Bb5 (#1, Best), 2. Bc4 (#2, Good) — 1 of the top 3, 1 in place } { the Spanish }
( 3. Bc4 { [%eval 0.25] } 3... Bc5 ) ( 3. d4 { [%eval 0.22] } 3... exd4 ) 3... a6 4. Ba4 Nf6 *
```

### 5.3 One source of truth each

| Data | Its one home | Projected into |
| --- | --- | --- |
| The game | `FindBestMoveGame` (+ `FEN`) | the movetext's mainline; the board's moves up to the position |
| The positions | `FindBestMoveKeys` + one `FindBestMove_<key>` each | nothing (machine data) |
| The grading lines | `lines:` | variations with `[%eval]` at a graded position, in the movetext and on the board |
| The answer | `state:` + `answer:` | the answer comment |
| The reader's work | `FindBestMoveWork_<key>` | variations in the movetext; the board's lines at the position (editable on screen, at earlier positions read-only) |
| The engine's job | `engine:` | nothing (the job record is the runtime's) |

### 5.4 The movetext is a projection

`sessionMovetextOf(record, words) → GameTree` writes the readable game:

- the recorded game as the mainline, under the source game's own tags;
- at a **graded** position, every line in `lines` hung as a variation, its
  first move carrying its `[%eval]` (v3's `withPositionLines`), then the
  answer comment ("Find Best Move: 1. e4 (#1, Best), … — 2 of the top 3, 1
  in place");
- at a **waiting** position, the answer comment's waiting form, its lines
  not yet shown;
- at a **passed** position, "Find Best Move: passed", its lines hidden (they
  would answer it);
- at every position, the reader's work grafted after the game's move and
  the engine's lines (`addMove` follows a move already there);
- **no machine command anywhere**.

Being a projection, it is **re-derived on every write and never read
back**. So:

- **A foreign writer cannot corrupt the session.** An `[%eval]` prepended
  by Analysis, an engine line hung by any job, a hand edit: each changes
  only the projection. The session reads the tags, and the next trainer
  write re-derives the movetext over the edit.
- **The answer comment is rewritten freely.** v3's rule "a comment is never
  rewritten" existed only because v3 read its comments back.
- **Download** (the screen's and the lobby's) projects from the record at
  download time, so the file is current even when the stored movetext lags
  (a job's write, §6.2).
- `words` are the catalog's (`accuracyTrainer.session.answer.*`), in the
  writer's language: `i18next.t`, as `lib/localizedText.ts` already reads
  the catalog from `src/lib/`.

### 5.5 Stale and unreadable data

`sessionRecordOf(tags) → { record, issues } | undefined` is lenient about
fields and strict about structure:

| What is read | What happens |
| --- | --- |
| No `FindBestMove` tag, or not `2` (a plain game, a v3 session) | `undefined`, not a session. The lobby row and the screen say so (a v3 session as "an older session — open it in Analysis"). |
| `FindBestMoveGame` does not replay from the start FEN | `undefined`: no position can be named. Said as unreadable. |
| `FindBestMoveKeys` missing or empty | `undefined` |
| A manifest key with no `FindBestMove_<key>` tag, or one past the game's end | Kept, **recreated `open` with no lines**, and an `issue` raised ("1 position could not be read"), shown once on the screen. It is never skipped, so the count is the manifest's. |
| A `FindBestMove_<key>` / `FindBestMoveWork_<key>` tag for a key not in the manifest | Ignored, and gone at the next write |
| A field that does not parse | Its default (`state:` → `open`, `lines:` → none, `engine:` → `idle`, `answer:` without `state:answered` → ignored), and an `issue` |
| `state:reopened` on a key that is not `current` | `passed` (as v3) |
| `FindBestMoveCurrent` not in the manifest | The first `open` key, else the first key |
| A work fragment that does not parse from its FEN | `work: null`, and an `issue` |
| `engine:queued/<id>` whose job the runtime no longer has | `failed` once the engine unit sees the runtime's list (§7) |

**Every write drops every `FindBestMove*` tag before writing the record's**
(`withSessionTags`). Stale data therefore lives until the next write at most,
and the tags always say exactly the record.

---

## 6. The boundary: board tree, session record, Case write

### 6.1 Three layers, one direction each

```
  Case (IndexedDB)  ──read tags──▶  record  ──boardTreeOf(record, current)──▶  board (core tree)
        ▲                              │                                             │
        └──── editSessionCase(event) ◀─┴───── workRecorded(current, workOf(board)) ◀─┘
```

- **The record** is the truth, held as the Case store's snapshot parsed
  (memoised by the tags' text). The screen keeps no second copy and no
  optimistic overlay. A write that the browser refuses leaves the screen as
  it was (the record store's semantics, `idbRecordStore.ts`), and the
  screen says so.
- **The board** is a projection, `boardTreeOf(record, key)`: the recorded
  game up to the position; at every earlier position its lines, answer
  comment and work, as the movetext projects them; at the position, its
  work; nothing after. It is loaded when `current` changes (and once on
  mount). It is never written to the Case as a tree.
- **From the board, one thing is read back**: the position's subtree
  (`workOf(board, positionNode)`), as a `workRecorded` event. Edits outside
  that subtree are not offered (S5), so there is nothing to discard and
  nothing silently lost. That is how v3's "a board that lost the position"
  case (a *Delete from here* before it) disappears: the reader cannot
  delete a move the session owns.

### 6.2 Who writes the Case

**One function writes a session Case**: `editSessionCase(caseId, events)`
(`lib/findBestMove/store.ts`). Inside the Case store's queued write it:

1. reads the stored record from the Case's PGN tags (`readPgnTags`, no
   movetext parse);
2. applies `events` with `sessionReducer`;
3. if nothing changed (`===`), writes nothing;
4. else writes the PGN: `treeToPgn(withSessionTags(sessionMovetextOf(record, words), record))`.

It sits on a new generic primitive, `editAnalysisCasePgn(id, edit)` (S2):
`mergeIntoAnalysisCase` without the merge id.

**Both writers use it**: the screen (every action) and the Evaluate Position
job's `applyOutput` (`engineSearched`). Because each write applies an
**event to the record stored at that moment**, and not a snapshot of
someone's memory, the two commute:

- **Same tab** (the leader tab runs the job and shows the trainer): the
  store queues writes, so each applies to the other's result. No order
  loses anything.
- **Two tabs**: the record store re-reads on another tab's broadcast, so a
  write applied to a stale snapshot can overwrite the other. The engine unit
  makes this converge. It watches the runtime's job records (as v3 does)
  and dispatches the same `engineSearched` the job wrote. The event is
  idempotent, so a write that lost the job's lines is followed by one that
  restores them.
- **The trainer closed**: the job's own write lands the result in the
  record, so it survives the runtime forgetting the job (retention). This
  is v3's `searched:` guarantee, now applied by the job itself.

**`merges` are gone** from the session: no `readMerges`, no done-jobs list,
no `isBehindMerges`. The session Case's `merges` stays `[]`.

**What is re-serialised, and when**:

| Trigger | Write |
| --- | --- |
| A board move, a comment, a reorder | **none.** The board holds it. |
| The board's work, debounced (`useAutosave`'s cadence), and always before a `goTo` / `answer` / `pass` / `reopen` / unmount | one `workRecorded` event |
| Results / Next / Pass / *Answer it now* / a Results click | one event list, one write |
| The first move at a position needing the engine | `firstMove` |
| A job queued, searched, failed | one engine event (the job's own write for `searched`, plus the screen's echo) |
| A setting | `settingsChanged` |

The Case's other fields: `path` stays `[]` and `orientation` the first
position's. Nothing reads them for a session. `display.writeEvals` is set
`false` at creation (S4), as defence in depth.

---

## 7. The screen hook, split

`useFindBestMoveSession` becomes a **composition** of four units over the
pure reducer and selectors. Each unit is its own file with its own test.

| Unit | Inputs | Outputs | Owns |
| --- | --- | --- | --- |
| **`sessionReducer` + selectors** (`lib/findBestMove/`, pure) | a record, an event | a record; phases, grades, results, summary, progress, `nextOpen`, `replayPlan` | every rule of the flow |
| **`useSessionCase(caseId)`** (persistence) | the Case id | `record \| "not-a-session" \| undefined` (loading), `issues`, `dispatch(events) → Promise<problem>` | reading the Case store's snapshot, parsing the tags (memoised), `editSessionCase`, the write problem said |
| **`useSessionBoard({ record, dispatch })`** (board) | the record, `dispatch` | `core` (the board core), `candidates` (the reader's moves in order), `moveCandidate` / `removeCandidate`, `newMove`, `onPosition`, `canMove`, the wrapped `onPieceDrop` / `resolvePromotion` (a first move dispatches `firstMove`), `flushWork() → Event`, `editableAt(nodeId)` (S5) | `useBoardCore`; loading `boardTreeOf(record, current)` when `current` changes; the debounced `workRecorded`; the orientation (facing the side to move) |
| **`useReplay({ core, stepDelayMs })`** (replay) | the core's `goToNode` / `nodeId`, the delay | `play(nodeIds)`, `stop()`, `playing` | the timers and the "the reader moved, stop" check. No chess: the plan comes from `replayPlan` |
| **`useSessionEngine({ caseId, record, dispatch })`** (engine jobs) | the Case, the record, `dispatch` | `engineAt(key)` (the runtime's live progress, for the footer) | queuing a job for every position whose engine is `wanted` (the Engine menu's search, MultiPV N; an in-flight set so a re-render never queues twice), then `engineQueued` or `engineFailed`; watching the job records to echo `engineSearched` / `engineFailed` (a job failed, cancelled or gone) |

The composition (~100 lines) wires them and names the actions. For
example, `next = async () => { await dispatch([flushWork(), answer(k, candidates), …]); replay.play(plan) }`.
The screen (`FindBestMove.tsx`) stays composition alone and reuses
`GradedLines`, `AccuracySessionReport`, `AccuracyTrainerDetails` and
`FindBestMoveSessionsTable`, whose props are the selectors' output.

---

## 8. Shared-code changes

Each is backward compatible under the shared-piece rule (CLAUDE.md, *The
board is pure UI*): absent, today's behaviour.

| # | Where | Change | Today's callers |
| --- | --- | --- | --- |
| S1 | `lib/gameTree.ts` (`treeToPgn`, `moveTreeToPgn`) | **Escape `\` and `"` in a tag value**, as the PGN standard requires and `splitTags` already reads. Needed because a work fragment's comment may hold a quote. | No change for any value without those two characters. Today a value with one writes a broken PGN, so this is a fix, not an option. |
| S2 | `lib/analysisCaseStore.ts` | **`editAnalysisCasePgn(id, edit)`**: a Case's PGN read, modified and written in the store's queue. `"gone"` for a Case not there; an edit answering the same text writes nothing. `mergeIntoAnalysisCase` becomes it plus the merge id. | Unchanged |
| S3 | `views/analysisV2/` (the Case view) | **A session Case opens read-only**: a predicate from `lib/findBestMove/` (`isSessionTags`). The board navigates but does not edit, no evaluation is written, and a notice offers *Resume in Find Best Move* (dev builds) and *Duplicate as a plain Case* (a copy without the `FindBestMove*` tags, an ordinary game). | Every other Case unchanged. If the board core cannot yet be read-only, the fallback is the notice plus `writeEvals` off. Edits then are harmless by §5.4 but replaced at the next trainer write, which the notice says. |
| S4 | `lib/analysisProjects.ts` (`gameCaseOf`) | An optional `display` override, so the session's Case is created with `writeEvals: false`. | Absent → `DEFAULT_CASE_DISPLAY`, as today |
| S5 | `views/explorer/useVariationsExplorer` | An optional **`editableAt(nodeId) → boolean`**: the move menu's edits (comment, glyphs, shapes, delete, promote) are offered only where it answers `true`. | Absent → every node editable, as today |
| S6 | `lib/jobs/kinds/evaluatePosition/` | The input names the **session key** instead of a SAN path. `applyOutput` writes `editSessionCase(caseId, [engineSearched(key, jobId, result)])` instead of `withPositionEngineLines` into the movetext. The input version is bumped, and an old (v3) input parses as a retired job: kept, never run, Delete alone (the [`jobs.md`](../../.claude/rules/jobs.md) retiring checklist). | Dev-only kind, one caller |

**Considered and not needed**: a rule that `withEval` / `withEngineLine`
never prepend into a machine-command comment. v4 puts nothing in a comment,
so there is nothing to protect. Both writers keep their contract
untouched. (Had v3 lived on, the fix would have been an
`ownComment` set in `withEval`: a comment that is a lone command of a
listed key gets its `[%eval]` in a comment of its own.) `fbm` stays in
`moveAnnotations.ts`'s `UNREAD_COMMANDS`, so a v3 session Case still opened
in Analysis shows no chip.

---

## 9. Implementation plan

### 9.1 Order, and what runs in parallel

| Step | Scope | Depends on | Parallel with |
| --- | --- | --- | --- |
| 1 | **Shared**: S1 (tag escaping, with a `pgnAnnotations` / `gameTree` round-trip test), S2 (`editAnalysisCasePgn`, and `mergeIntoAnalysisCase` over it, its tests unchanged), S4 | — | 2, 3 |
| 2 | **The model** (`src/lib/findBestMove/`): `model.ts` (types, keys, derived positions), `reducer.ts`, `selectors.ts`, `pgn.ts` (tags in and out, §5.2 and §5.5), `projection.ts` (`boardTreeOf`, `sessionMovetextOf`), `start.ts` (a session from a game or a position) | S1 for the work fragment's escaping (stub it until then) | 1, 3 |
| 3 | **S5** (`editableAt`) and **S3** (Analysis read-only for a session Case, *Duplicate as a plain Case*) | 2's `isSessionTags` (a one-line predicate, which can land first) | 1, 2 |
| 4 | **Persistence**: `lib/findBestMove/store.ts` (`editSessionCase`), the lobby's rows from the tags (`progressOf`) | 1, 2 | 5 |
| 5 | **The job kind** (S6), its kind and core tests | 2 (`engineSearched`), 4 | 4 once 4's signature is fixed |
| 6 | **The screen**: the four units (§7), `FindBestMove.tsx`, the lobby, the New session form (reusing v3's `SessionSetup`, `NewSessionForm`, the position editor and the blocks), the route at `/accuracy-trainer/find-best-move-v4` | 4, 5 | — |
| 7 | **Retire v3** (§9.4), the rules file rewritten, CLAUDE.md's row | 6 | — |

Steps 1–3 are three independent pieces of work. Step 6 is the largest, and
it can split into a units issue (persistence, board, replay, engine, each
tested alone) and a screen issue.

### 9.2 What v4 reuses unchanged

`lib/accuracyTrainer.ts` (positions, grading, summary: R4, R11, R18),
`withEngineResult`, `trainingPositionFrom`, the blocks (`GradedLines`,
`AccuracySessionReport`, `AccuracyTrainerDetails`,
`FindBestMoveSessionsTable`), `SessionSetup` / the New session form's tabs,
`sessionProjectOf`, and the Evaluate Position kind's search step.

### 9.3 Test strategy

- **The reducer**: each transition's table row, and **the invariants**
  (§4.3) asserted after every event of a seeded random walk over events
  (a few hundred sequences, a fixed seed, no new dependency).
- **The selectors**: `phaseOf` for every row of the phase table; `nextOpen`
  past passed, answered and reopened positions; `replayPlan`'s cap (a gap
  of 1, 2 and 8 plies).
- **The round trip**: record → PGN → record is equal, for a session in
  every state (each answer state, each engine state, work with comments,
  NAGs and a quote, a session from a position). PGN → record → PGN is
  equal text, so the projection is deterministic.
- **A foreign writer touching a session**: take a session PGN and, before
  reading it back, apply every foreign writer. That is `recordEvaluation`
  on every move (the Analysis engine), `withEngineLine` at every position
  (a job), a comment and a NAG typed on a position's move, a variation
  promoted, and the Analysis autosave's own parse → `treeToPgn`. The record
  read back is **identical**, and the next write's movetext is the clean
  projection again.
- **The 38-to-35 regression, as a fixture**: a 38-position session (side
  `both`, so consecutive positions share moves). Its v2 PGN, with
  `[%eval]`s prepended into the first comment of positions 8, 9 and 10's
  moves, reads back with **38** positions, the same answers, the same
  `current`, and Next from 7 going to 8. The same game as a **v3** PGN, the
  original shape, reads as *not a session* (an older session) and does not
  crash the lobby.
- **The manifest and garbage collection**: a PGN with one
  `FindBestMove_<key>` tag deleted reads with that position `open` and an
  issue. A tag for a key outside the manifest is gone after one write. A
  `FindBestMoveCurrent` outside the manifest falls back.
- **The two writers**: `editSessionCase` with a screen event and the job's
  `engineSearched` interleaved in both orders gives the same record. The
  job's write with the trainer closed lands in the record. The engine
  unit's echo is idempotent.
- **The job kind**: `applyOutput` writes the record, not the movetext. A
  retired v3 input is kept and never run (the `jobsKit` crash-between-writes
  pattern).
- **The screen** (`FindBestMove.test.tsx`, by role and name, `userEvent`):
  v3's list carried over (start from the form; every move before and none
  after; reorder, delete, New move; Results, Pass, Next while answering;
  *Answer it now* and passed again; the engine's wait and failure; the
  replay and its stop; reload resuming exactly; Download; a session PGN
  resumed from the form; a Case that is no session; one not there). Added:
  editing outside the position is not offered, a read issue is said, and
  the replay's cap. Plus `expectNoAxeViolations` on the screen and the
  lobby.
- **Analysis** (S3): a session Case opens read-only, writes no evaluation,
  and *Duplicate as a plain Case* makes a game without the session's tags.

### 9.4 Retiring v3

- **Delete** `src/views/accuracyTrainer/findBestMoveV3/`,
  `lib/findBestMoveSession.ts`, `lib/findBestMoveSessionPgn.ts`,
  `lib/findBestMoveSessionRows.ts` and their tests. Keep `fbm` in
  `UNREAD_COMMANDS` (§8).
- **Routes and nav**: the `devRoutes` entries for
  `/accuracy-trainer/find-best-move-v3` and `/:caseId` replaced by v4's;
  `navItems.ts`'s entry (`nav.findBestMoveV3` → `nav.findBestMoveV4`, still
  `experimental`); `routes.test.tsx`, `navTree.test.ts`, `Sidebar.test.tsx`
  and the `boards.test.tsx` / `panelPropagation.test.tsx` rows moved to v4.
- **Locale keys**: `pages.findBestMoveV3*`, `pageDescriptions.findBestMoveV3`
  and `nav.findBestMoveV3` renamed for v4. `accuracyTrainer.*` kept and
  extended (the read issue, the older-session row, the Analysis notice), in
  both catalogs.
- **The project**: the same *Find Best Move* project. A v3 session Case
  keeps its row (an older session, Open in Analysis, Download, Delete) and
  is never converted.
- **Jobs**: v3's stored Evaluate Position jobs become retired inputs (S6).
- **Docs**: `.claude/rules/accuracy-trainer.md` rewritten for v4 (§3, §5 and
  §7 here are its skeleton), `pgn-annotations.md` §2's `%fbm` row reworded
  ("a v3 session's, unread; v4 keeps its state in tags"), CLAUDE.md's
  Accuracy Trainer row, and this note's status line pointing at the build.
