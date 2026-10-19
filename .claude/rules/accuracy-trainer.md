---
paths:
  - "src/views/accuracyTrainer/**"
  - "src/lib/accuracyTrainer*"
  - "src/blocks/lists/SuggestionList/**"
  - "src/blocks/panels/GradedLines/**"
  - "src/blocks/panels/AccuracySessionReport/**"
---

# Accuracy Trainer (CTA-238, experimental, dev-only)

A sidebar folder of its own, **Accuracy Trainer**, for exercises that grade
the reader's moves against a computer analysis. Today it holds one:
**Find Best Move v1** — `/accuracy-trainer/find-best-move-v1`. A later
exercise (or a v2) is a screen of its own beside it, under
`src/views/accuracyTrainer/<exercise>/`, reusing `lib/accuracyTrainer.ts`.

## Find Best Move v1

The reader loads a **fully analysed game**, picks a side, and at each of that
side's analysed positions suggests the moves they think best — none, one or
several. Each suggestion is graded against the engine's lines **the tree
already carries**; after each position the lines are revealed, and at the end
a summary. **No engine runs on this screen.** The base of a feature to be
extended later; this file is its whole reference.

> **Dev-only.** The route is in `routes.tsx`'s `devRoutes` (a `React.lazy`
> import under `import.meta.env.DEV`), and the folder and the nav entry
> spreads in `navFolders.ts` / `navItems.ts` under the same flag, so a production build has neither, nor a
> chunk of it ([`chessboard.md`](./chessboard.md) §9.5). For the same reason it
> has **no line in `e2e/a11y/routes.ts`** (the browser pass runs against the
> production build) and no `pageDescriptions` use in the pre-render. Shipping
> it is: move the route into `appRoutes`, drop the folder's and the nav entry's
> spreads, add the a11y route, and grep `dist/` for `accuracy` and
> `find-best-move`.

---

## 0. Where to look

| Path | What lives there |
| --- | --- |
| `src/lib/accuracyTrainer.ts` | **The pure layer**: `trainingPositionsOf` (the positions a tree can train, each with its evaluated lines), `sessionPositionsOf` (one side's, or both), `gradeSuggestion` / `gradePosition` (a suggestion, a position), `sessionSummaryOf` (the report's measures), `sanOfMove` (a drop read as SAN — `chess.js` reads, never plays), `moveSquaresOf` (a SAN's arrow), `bareSan`, `ACCURACY_THRESHOLDS`. Unit-tested in `accuracyTrainer.test.ts`. |
| `src/views/accuracyTrainer/findBestMoveV1/FindBestMoveV1.tsx` | **The screen**: the session state, the board composed from the core, the panel's tabs (Train · Summary), header and footer. |
| `src/views/accuracyTrainer/findBestMoveV1/AccuracySetup.tsx` | The setup: a PGN uploaded or pasted (`PgnInput`, a file of several games picking one), or an Analysis Case (`CasePickerDialog` — the Projects and Cases stores subscribed to only while it is open), the side (`SideToggle`, *Both* its `all`), Start. |
| `src/views/accuracyTrainer/findBestMoveV1/Main.tsx` | Layout-only wrapper (`find-best-move-v1-wrapper`). |
| `src/blocks/lists/SuggestionList/` | The reader's moves at one position, each removable (read only once graded). |
| `src/blocks/panels/GradedLines/` | A graded position: the headline and the engine's lines with the suggestions' verdicts. |
| `src/blocks/panels/AccuracySessionReport/` | The summary: the measures and every position, each a button back to it. |
| Tests | `src/lib/accuracyTrainer.test.ts`, `src/views/accuracyTrainer/findBestMoveV1/FindBestMoveV1.test.tsx`, the three blocks' own, Find Best Move v1's rows in `views/board/boards.test.tsx` and `panelPropagation.test.tsx`, `navTree.test.ts`, `Sidebar.test.tsx` (the experimental chip), `routes.test.tsx`. |

Routes and nav: `/accuracy-trainer/find-best-move-v1`, `pages.findBestMoveV1`
(and `pageDescriptions.findBestMoveV1`); the dev-only top-level folder
`accuracy-trainer` (`nav.folders.accuracyTrainer`, a `DEV` spread in
`navFolders.ts`, right after the Engine — a top-level folder with one screen
stays a folder), its screen `nav.findBestMoveV1`, marked `experimental` — `NavItem.experimental`
carried by `navTree.ts` and drawn by `Sidebar.tsx` as a chip (`nav.experimental`),
the screen's header carrying the same chip. `options.id` `find-best-move-v1`.
Locale keys: `accuracyTrainer.*`, in both catalogs.

---

## 1. What a full analysis leaves in the tree

A computer analysis's output ([`pgn-annotations.md`](./pgn-annotations.md) §6):
the source game, and at an analysed mainline move the engine's **pruned
lines as side lines**, each line's first move carrying the line's `[%eval]`
(its search at the position before the move), the mainline move its own
`[%eval]` (the next position's search). The **full** variant writes lines at
every analysed move, **medium** and **light** only at the classified ones; a
job run with multiPV 10 and a wide `variationRangeCp` leaves up to 10
candidates per position. The scope tags `AnalysedPlies` / `AnalysedSide` say
which mainline moves were analysed.

## 2. The positions — `trainingPositionsOf`

- **A position to train** is the position before an analysed mainline move —
  inside the scope tags when the tree has them (`analysisScopeOf`), every
  mainline move otherwise — that has **at least one evaluated side line**. A
  position with none is skipped (a medium analysis trains its classified
  moves alone). A tree with none at all is **refused**: "This game carries no
  engine lines" — the setup never starts.
- **Its lines**: each evaluated side line's first move, and the game's move
  when it carries an eval (a side line repeating a move, or one with no eval,
  is not a line). Each scored from **the mover's view** — a mate ±10000 less
  its distance (`whiteCp`, the computer analysis's; a side line's eval signed
  with this position's side to move, the game move's with the next
  position's, so its `#0` reads as the mover's mate) — then **ranked best
  first**, ties in the engine's order with the game's move after them.
- **The top N** are the engine's listed lines: every side line, and the
  game's move **when it scores at least as well as the worst of them** (the
  writer leaves the game's move out of its lines, so one within the engine's
  range was one of them; one below it — the usual mistake — was not listed).
  `topCount` is N.
- **A loss** is line 1 against the line, each clamped to ±1000 first, at
  least 0 (so it can reach 2000 — the computer analysis's rule).

## 3. Grading — `gradeSuggestion`, `gradePosition`

- **A suggestion on a line**: its rank, its loss, its verdict by the computer
  analysis's thresholds (`kindOfLoss`: inaccuracy > 50, mistake > 100,
  blunder > 300; `null` otherwise), whether it is listed and whether it was
  the game's move. SANs compare without `+ # ! ?`.
- **A suggestion none of the lines has** is *outside the top N*: its loss is
  **unknown**, carried only as a bound — `lossAtLeast`, the worst listed
  line's loss — and shown as "≥ N", never as a number of its own. It has no
  verdict.
- **A position**: `passed` (no suggestion), `bestFound` (a suggestion lost 0
  — line 1, or one as good, which the clamp makes of two mates), `topFound`
  (listed lines found), `bestLoss` (the least loss among suggestions on the
  lines; `null` for a pass or where every one is outside), `worstVerdict`
  (among those on the lines), `outside` (how many were not). A move suggested
  twice counts once.
- **The summary** (`sessionSummaryOf`): positions graded, answered, passed;
  the best-move and top-move hit counts and **rates over every graded
  position** (a pass found nothing); the average `bestLoss` over the positions
  where it is known (rounded); and over every suggestion the inaccuracies,
  mistakes, blunders and outside-the-top-N.

## 4. The screen

- **Composed from the board core** ([`chessboard.md`](./chessboard.md) §9):
  `useBoardCore` holds the position on screen (`loadFen` — a position turns
  the board to the side to move), `BoardShell` and `BoardPanel` with no
  `analysis` (no variations block, no status row), the eval bar off. No
  engine module, no explorer, no autosave.
- **A drop is read, never played**: the screen wraps `onPieceDrop` and
  `resolvePromotion` (as the repertoire trainer does): a legal move is named
  by `sanOfMove` and joins the list, the drop returns `false` so the piece
  snaps back, the tree never grows. A promotion goes through the core's own
  picker (the core's `onPieceDrop` opens it), and its answer is read the same
  way, the picker dismissed. Dragging is on only while answering.
- **The panel**: the header — the *Experimental* chip, then "Position 3 of 12
  · 12. White"; the tabs **Train** (the setup, then the position: the
  instructions, `SuggestionList`, after Submit `GradedLines`) and **Summary**
  (`AccuracySessionReport`, off until a session starts); the footer — *New
  session* (back to the setup, the game kept), and **Pass** / **Submit**
  (off with no move) while answering, **Next** after (to the next position
  still unanswered, else **Summary**).
- **The arrows** (the theme's `chess.drawing` brushes): while answering, each
  suggestion in blue; once graded, line 1 in green and each other suggestion
  in its verdict's colour — blue within the threshold, yellow an inaccuracy
  or mistake, red a blunder or outside the lines.
- **Back from the summary**: a position's button opens it, graded as
  answered.
- **Nothing is kept**: a session lives in the screen's state; leaving ends
  it. No store, so no Export / Import, Storage or legal-page lines.

## 5. Extending it

- **A new measure**: a field of `SessionSummary` in `sessionSummaryOf`, its
  test, a row in `AccuracySessionReport`'s measures and its key.
- **Another grading rule** (a missed mate, a weighting by rank): in
  `gradeSuggestion` / `gradePosition`, pure, with its test — the blocks read
  the grade and change only to show a new field.
- **Persistence** (a session resumed, a history per game): a store over
  `lib/idbRecordStore.ts` — and with it the Export / Import category, the
  Storage row and the legal pages' line ([`database.md`](./database.md)).
- **Shipping**: the dev-only note at the top.
