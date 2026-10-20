# Accuracy Trainer — achievements: a piece per position, per category

> **Status: built in CTA-249** — §6's three steps; §5 (a reader's lifetime)
> is still a later issue. The build's reference is
> [`accuracy-trainer.md`](../../.claude/rules/accuracy-trainer.md) §10. The trainer it extends is
> [`accuracy-trainer.md`](../../.claude/rules/accuracy-trainer.md) (Find Best
> Move v4); the grading it reads is `src/lib/accuracyTrainer.ts`.

**Decisions already taken** (the user's):

- **A category is a goal at one position; a piece is how well the reader met
  it there.** Not a count of positions — every graded position wins a piece
  (or none) in every category.
- **Five pieces**, Pawn → Knight → Bishop → Rook → Queen, the Queen the
  category's great achievement.
- **One answer earns a piece in every category at once.** No new input, no
  session mode: the reader answers as today, and the categories read the
  same answer.
- **Only the categories that today's data can grade**: those over the
  top-X lines (§3, A) and the one over the reader's own line (§3, B). No
  category that asks a new input (an evaluation guessed, a verdict given).

---

## 1. Terms

- **X** — the session's *Moves to find* (`FindBestMoveMoves`, N, 1–10).
- **The target** — X held to the engine's top lines there (`targetOf`,
  `PositionGrade.target`): fewer when the lines are fewer (the engine
  declined, a failed search).
- **Your moves** — the reader's answer, in their order. **Only the first X
  are graded for a piece**: an answer has no cap, and ten moves would always
  "find all three". A move past the X-th is analysis, never a piece.
- **The best move** — a move whose loss is 0 (line 1, or a line as good).
- **The top X** — the listed lines ranked 1…target (`SuggestionGrade.inTop`).
- **The verdicts** — the computer analysis's thresholds: an inaccuracy loses
  more than 50 cp, a mistake more than 100, a blunder more than 300.
- **A move outside the lines** (`kind: "outside"`) — its loss unknown, at
  least the worst listed line's (`lossAtLeast`). It **fails every tier above
  Pawn** in every category, and Pawn too where its bound already fails it.

## 2. The pieces and the score

| Piece | Value |
| --- | --- |
| ♙ Pawn | 1 |
| ♘ Knight | 3 |
| ♗ Bishop | 3 (ranks above the Knight) |
| ♖ Rook | 5 |
| ♕ Queen | 9 |

- **The highest tier whose condition holds wins** — one piece per category
  per position.
- **No piece** for a pass, a position with nothing to compare (`target` 0),
  or one graded without its engine (`engineFailedAt`). A category with a
  precondition (below) gives none where it does not hold.
- **No negative points.** A bad answer wins nothing.
- **Material**: a position's pieces' values, per category; a session's sum,
  per category and in all; and how many of each piece.

## 3. The categories

### A. Over the top-X lines

**A1. Place X moves in order.** *Precondition: X ≥ 2* (at X = 1 every tier
is the same move). Over your first X moves:

| Piece | Condition |
| --- | --- |
| ♙ | One of them is in the top X (`found ≥ 1`) |
| ♘ | The best move is among them, not first |
| ♗ | The best move is your first |
| ♖ | All X are in the top X, the order wrong (`found = target`, `inPlace < target`) |
| ♕ | All X, each exactly in its place (`inPlace = target`) |

Where `target < X` the position is graded against the target, **capped at
Bishop** — finding two of two is not finding three of three.

**A2. Find the best move.** Your **first** move alone:

| Piece | Condition |
| --- | --- |
| ♙ | In the top X |
| ♘ | No inaccuracy (loss ≤ 50) |
| ♗ | Loss ≤ 20 |
| ♖ | The best move |
| ♕ | The best move, **and it is the only one**: line 2 loses at least 150. Needs a second listed line; without one, at most Rook |

**A3. Clean candidates** — every one of your first X moves is sound.
*Precondition: you gave X moves* (fewer cannot win: one safe move would
always be "clean"). Every one of them:

| Piece | Condition |
| --- | --- |
| ♙ | Not a blunder |
| ♘ | Not a mistake |
| ♗ | Not an inaccuracy |
| ♖ | In the top X |
| ♕ | Within 20 cp of the best |

**A4. Better than the game.** *Precondition: the game's move is a mistake or
a blunder* (the played line's verdict; it has an eval). Your **first** move:

| Piece | Condition |
| --- | --- |
| ♙ | Loses less than the game's move |
| ♘ | No mistake (loss ≤ 100) |
| ♗ | No inaccuracy (loss ≤ 50) |
| ♖ | In the top X |
| ♕ | The best move |

### B. Over the reader's own line

**B1. See the line.** *Precondition: one of your first X moves is the best
move.* Your line from it — the work you played from the position starting
with that move, along its first children (`FindBestMoveWork_<key>`) —
against the engine's line from the same move (`TrainingLine.sans`): how many
plies match from the start.

| Piece | Plies matched |
| --- | --- |
| ♙ | 1 (the move itself) |
| ♘ | 2 |
| ♗ | 3 |
| ♖ | 4 |
| ♕ | 6 |

**A tier is reachable only where the engine's line is that long** — a line of
three plies matched whole is a Bishop, not a Queen.

## 4. Where it lives

- **Pure, in `src/lib/achievements/`**: one grader per category,
  `(position: TrainingPosition, grade: PositionGrade, work, wanted) → Piece
  | null`; the registry of categories (id, catalog key, grader); the values;
  `piecesOf(position…)` → a piece per category; `sessionMaterialOf(...)`.
  Each grader with its table test, and a test that the tiers nest (a
  position that meets a tier meets every one below it, where the table
  says so).
- **Nothing new stored for a session.** Every input is already in the
  session record (the lines, the answer, the work), so the pieces are
  **derived** — a selector beside `gradeOf` / `summaryOf` — and cannot drift
  from the grade. No PGN tag; the projection (the answer comment) may name
  the pieces, as words, never read back.
- **The screen**: in `GradedLines`, a row of pieces under a graded position,
  one per category, each named (the category and the piece) for a screen
  reader; in `AccuracySessionReport`, the material per category and the
  count of each piece; in Results, optionally, the position's best piece.
  The pieces drawn from the board's piece set, so they follow the theme.

## 5. Later — a reader's lifetime

Across sessions — lifetime material per category, *Queens won* — needs a
ledger: a new IndexedDB database (`chessapp.achievements`), one entry per
(the game's identity, the position key, the category), so a session
duplicated or loaded back again never counts twice, and a session deleted
keeps what it won. Rebuildable from the sessions. It brings the usual: the
legal pages' list of databases (both languages), an Export / Import
category, `database.md`'s conventions. **Not in the first build.**

Open for then: whether a position replayed in a new session over the same
game wins again (proposed: no — keyed by the position's FEN and X).

## 6. The build, in steps

1. `src/lib/achievements/` — the five graders, the registry, the material;
   tests.
2. The selector over the session record; the pieces in `GradedLines` and the
   material in `AccuracySessionReport`; the catalog keys, `en` and `he`; the
   blocks' gallery states (every piece, none, a precondition not met).
3. `accuracy-trainer.md` — a section on achievements; §9 *Extending it*
   gains "a new category: a grader and a registry line".
