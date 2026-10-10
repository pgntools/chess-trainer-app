---
paths:
  - "src/lib/jobs*"
  - "src/lib/jobStore*"
  - "src/lib/jobRunner*"
  - "src/views/jobs/**"
  - "src/blocks/tables/JobsTable/**"
  - "src/blocks/panels/JobSummary/**"
  - "src/blocks/panels/ComputerAnalysisReport/**"
  - "src/blocks/panels/EvalGraph/**"
---

# Jobs — the background job runner, its store and the Jobs screen (`/jobs`)

A **job** is work the app does in the background, app-wide, while the reader
goes on with anything else. One kind so far: a game's **computer analysis**
(CTA-171) — Stockfish run once over the game's mainline, every finished
position checkpointed, and each ticked variant (light, medium, full) saved as
a new Saved analysis. The analysis rules themselves (positions, early stop,
verdicts, the annotated trees, the report read back) are
[`pgn-annotations.md`](./pgn-annotations.md) §6; a game is sent from the
**New Job** dialog the Analysis Board's and the saved list's Analyse icons open
(CTA-177, [`analysis-board.md`](./analysis-board.md) §1.3). This file is
everything about the job: the record, the store, the runner, the screen, the
shell's indicator, and how to test and extend them.

---

## 0. Where to look

| Path | What lives there |
| --- | --- |
| `src/lib/jobLiveAnalysis.ts` | **A job's results so far**, pure (CTA-174): the source re-parsed, the checkpoint read into the eval graph's points, the verdicts and report over the moves judged so far, the latest finished position — drawn while a job runs (the Analysis Board's tab's until CTA-177; the Jobs screen's, CTA-178). |
| `src/lib/jobs.ts` | **The record**, pure: `Job` (`ComputerAnalysisJob`), its statuses and errors, `ComputerAnalysisRequest`, `computerAnalysisJobOf` (a request → a queued job, or `undefined` when there is nothing to run), `jobSearchOf` (the source's tree and positions), `withCheckpoint`, `jobProgress`, `jobMoveLabel`, `canCancelJob` / `canResumeJob`, `jobOutputName`, `MAX_JOBS`, and the normaliser `jobFrom`. |
| `src/lib/jobStore.ts` | **The store**: `chessapp.jobs`, object store `jobs`, over `idbRecordStore` (newest first). `enqueueComputerAnalysis` (the New Job dialog's one call), `addJob` (the cap), `updateJob`, `cancelJob`, `resumeJob`, `removeJob`, `interruptRunningJobs`, `findJob`; `jobsSnapshot` / `subscribeJobs` / `loadJobs` / `settledJobs` / `resetJobStore` / `deleteJobsDb`. |
| `src/lib/jobRunner.ts` | **The runner** (§3): `createJobRunner(deps)`, and the page's one, `startJobRunner()` / `stopJobRunner()` (tests). |
| `src/views/jobs/JobRunner.tsx` | Mounts the runner: the shell (`views/main/Layout.tsx`'s `DefaultLayout`) renders it beside its outlets. |
| `src/views/jobs/JobsIndicator.tsx` | The header's indicator (§5). |
| `src/views/jobs/useJobs.ts` | `useJobs()` / `useJob(id)` — the New Job dialog's read too (CTA-177: a game's job — the one the board sent, else the newest unfinished, else done, of the same saved analysis — makes Analyse ask first, and Check existing opens it here; `jobOfGame`, [`analysis-board.md`](./analysis-board.md) §1.3). |
| `src/views/jobs/JobsScreen.tsx`, `JobsMain.tsx`, `JobReport.tsx` | **The Jobs screen** (§4) and a finished job's report and graph. |
| `src/blocks/tables/JobsTable/` | The list (a `DataTable`): game, status, progress, times, Resume / Cancel / Delete. |
| `src/blocks/panels/JobSummary/` | One job whole: status, progress, error, actions, links, facts; a finished job's report under it. |
| `src/blocks/panels/ComputerAnalysisReport/`, `EvalGraph/` | The per-player report and the eval graph — built here (CTA-173, decided with the reader) and reused by the Analysis Board — at the top of its Moves tab (CTA-174, CTA-177). |
| Tests | `src/lib/jobs.test.ts`, `jobStore.test.ts`, `jobRunner.test.ts`; `src/views/jobs/JobsScreen.test.tsx`, `JobsIndicator.test.tsx`; each block's own; `src/lib/engines/noWorkerAtImport.test.ts` (the runner builds nothing at import). |

Route `/jobs` (`handle.title` `pages.jobs`, its description
`pageDescriptions.jobs`), `?job=<id>` the job open in the panel. Nav:
**Jobs** (`nav.jobs`) in the **Analyses** folder, under its Lobby (CTA-174 —
a top-level folder of its own before).
Locale keys: `jobs.*` (the screen, the blocks' words, the indicator) and
`computerAnalysis.*` (the report's, the graph's, the variants' and verdicts'
words — shared with the board). Test ids: `jobs-*`.

---

## 1. The record — `lib/jobs.ts`

```
queued ──▶ running ──▶ done
   ▲          │ ├────▶ failed ──────┐
   │          │ └────▶ cancelled    │
   │          ▼ (a reload)          │
   └──── interrupted ◀──────────────┘   Resume: interrupted, failed → queued
```

| Field | What |
| --- | --- |
| `id`, `kind` (`"computer-analysis"`), `status` | |
| `createdAt`, `updatedAt`, `startedAt`, `finishedAt` | ISO; `startedAt` the first run's, kept across a resume; `finishedAt` done, failed or cancelled. |
| `source` | `{ analysisId, name, folderId, pgn }` — the saved analysis it came from (`null` for a board never saved), the name the outputs are named after, the folder they are filed in, the PGN **as sent**: the job never reads the source again. |
| `options` | `ComputerAnalysisOptions` (`lib/computerAnalysis.ts`), held to their bounds by `computerAnalysisOptionsFrom`. |
| `engine` | `{ id, name, version }` of the engine that **actually ran** — the options' choice, or the default it fell back to; `null` until it first runs. |
| `positions` | A `JobPosition` per searched position — FEN, ply, the move played from it (`san`), whether that move is analysed: the screen's words, and the FENs a resumed job is checked against. |
| `checkpoint` | A `PositionResult` per position, by index, `null` where it has none — **the checkpoint unit** — always as long as `positions`. |
| `outputs` | `{ variant, analysisId }` per Saved analysis made, once done. |
| `error` | `source` (the PGN no longer reads, or its positions changed), `engine` (no handle, no `uci` answer, silence, no scored line), `storage`, `too-many` (Saved analyses' cap) — `jobs.errors.<code>`. |

- **Node ids do not survive a PGN round trip**, so the record keeps FENs and
  plies, never node ids; the runner re-parses the source and works from
  `analysisPositionsOf` over it, and a checkpoint entry counts only for the
  position whose FEN it carries.
- **The normaliser** (`jobFrom`) drops a record with no id, an unknown kind,
  no source or unreadable positions; an unknown status reads as
  `interrupted` (never run unasked); a checkpoint entry that will not read,
  or is about another FEN, reads as missing (that position is searched again);
  the options are clamped as a form's are.

## 2. The store — `lib/jobStore.ts`

`chessapp.jobs` (version 1, object store `jobs`, keyed by `id`), its own
`BroadcastChannel`. Newest first.

- **The cap, `MAX_JOBS` (100)**: past it `addJob` drops the oldest
  **finished** jobs (done, failed, cancelled — their outputs are Saved
  analyses of their own); when every job kept is unfinished it refuses,
  `"too-many"`. A refused write is `"storage"`, nothing thrown.
- **`enqueueComputerAnalysis(request)`** — the New Job dialog's one call
  (`views/tools/analysis/NewJob.tsx`, CTA-177) → the job's id, or `"invalid"` (no
  variant ticked, a PGN that does not read, no analysed move), `"storage"`,
  `"too-many"`. The runner picks the job up by itself.
- **Cancel, Resume, Delete are store writes**, never calls into the runner:
  `cancelJob` (a job not ended → `cancelled`), `resumeJob` (interrupted or
  failed → `queued`, the checkpoint and `startedAt` kept, the error cleared),
  `removeJob`. The runner, in whichever tab holds it, reads the change and
  acts — so one tab's screen cancels another tab's run.
- **Every write is idempotent** — a cancel of an ended job, a checkpoint the
  record has: the same array, no write.

## 3. The runner — `lib/jobRunner.ts`

- **One per page, started by the shell** (`JobRunner.tsx`, an effect — never
  during render, so the pre-render starts none; never stopped by an effect
  cleanup, so a StrictMode remount does not leave a job half run).
  **Nothing at module scope** (`engines/noWorkerAtImport.test.ts`).
- **One tab runs jobs**: the runner holds the Web Lock `chessapp.jobs.runner`
  (`navigator.locks`) for the page's life; another tab's waits for it and
  takes over when this one closes. Where there is no Web Locks API (jsdom),
  every runner runs.
- **Taking over** (the lock, or the start where there is none): read the
  store, turn every `running` job into `interrupted` (`interruptRunningJobs`
  — a run this page does not have), then subscribe. **An interrupted job is
  never resumed on its own** — an engine run is heavy on CPU; the reader
  presses Resume.
- **One job at a time, the oldest queued first.** A run claims its job
  (`queued` → `running`, the engine named, `startedAt` kept), re-parses the
  source (`jobSearchOf`) and checks its positions against the record's —
  a mismatch fails it `source`.
- **Its own engine**: `resolveEngine(options.engine)` — the default where that
  engine is gone or cannot run here, as `useEngineModule` falls back; a
  `hosted:…` id waits for the engine server's list first. Built lazily (a job
  whose every position is checkpointed or terminal builds none), separate
  from any board's. After the `uci` answer (`whenOptionsReady`, 30 s) it sets
  `Threads` and `Hash`, and before each search `MultiPV` (the position's own
  — the options' lines where its move is analysed, else 1), **each clamped
  to what the engine declared**. The protocol discipline is the handle's
  ([`chessboard.md`](./chessboard.md) §4.1): the runner calls `setOption` and
  `search` and never sequences them.
- **Each position**: `search(fen, { depth, movetime })`; every `info` for that
  FEN with a PV is folded in (`withSearchInfo`, normalised against the
  searched FEN's turn); `shouldStopEarly` → one `stop()`; the `bestmove`
  ends it, the lines kept up to the first gap. **Not searched**: a mate or
  stalemate (`terminalResultOf`), and a position whose move is not analysed
  and whose stored `[%eval]` is as deep as asked. Then **the checkpoint**:
  the result written into the record (only while it is still `running`).
- **Stopping**: the store changing so the job is no longer `running` or
  `queued` (cancelled), or gone (deleted), aborts the run at once — `stop()`,
  the search abandoned, the handle terminated, nothing more written.
- **Failing**: no handle, no `uci` answer in 30 s, **120 s of silence** in a
  search, or a search ending with no scored line → `failed`, `engine`; the
  checkpoint stays, so Resume goes on from it.
- **At the end**: the handle terminated, the verdicts (`moveVerdicts`), every
  ticked variant built (`computerAnalysisTree`, the `Annotator` from
  `annotatorOf`) and saved in **one `addAnalyses`** as
  `savedAnalysisOf(…)` named `jobOutputName` — "<source> — computer analysis
  (<variant>)" — in the source's folder (Unfiled when that folder has gone),
  default settings, facing White. Then `done` with the outputs. A refused
  write fails it `storage` / `too-many`.

## 4. The Jobs screen — `/jobs`

- **The square: `JobsTable`** — newest first; each job's game (the link to
  its details, `?job=<id>`, history replace), status in words (its colour only
  repeats them), progress (`ProgressLine`, "12 of 80 positions · 7. Nf3"),
  started and finished; Resume (interrupted, failed), Cancel (not ended) and
  Delete, each named for its job. Delete asks first and keeps the job's
  outputs.
- **The panel: `JobSummary`** — the job whole: status, progress, why it
  failed, the same three actions, a link to the analysed game
  (`/tools/analysis?analysis=<source>`, where it was a saved analysis) and to
  each output, then for a done job **its report and eval graph**
  (`JobReport`): read back from its first output through `reportFromTree` /
  `evalSeriesOf` — nothing about the run is kept twice — a point of the graph
  opening that output on the Analysis Board at its move (`?at=`). An output
  deleted since says so. Then every option the job was given, the engine that
  ran it, and its times. No job open: a line asking for one; `?job=` naming
  none: "There is no such job".
- **Not seeded in the browser pass** (`e2e/a11y/routes.ts`, `jobs`): a job is
  not in the export zip (`import-export.md` §1.1), so the pass sees the empty
  list.

## 5. The shell's indicator — `JobsIndicator`

In the header, before the language switch: while a job runs, a link to
`/jobs` — a spinner with the running job's progress, "Analysing 12/80", and
its name out of sight (the accessible name starts with the visible words,
WCAG 2.5.3); with none running but some queued, "N queued"; nothing
otherwise. Under the shell's breakpoint an `IconAction` alone, named in full.
**Announced politely and only on a change of status** — a `status` region of
its own saying a job started, finished, failed or was cancelled; never the
progress, and nothing for what the first read of the store finds. The
workspace board (`analysis-board.md` §1.2) hides the header and with it the
indicator; the job runs on.

## 6. Invariants

1. **The runner is the shell's, never a board's**, one per page, one job at
   a time, one tab running jobs.
2. **The store is the only channel** between a screen and the runner.
3. **A checkpoint per finished position**, and a resume never searches a
   position that has one.
4. **Never resumed unasked**: a reload turns `running` into `interrupted`.
5. **A job builds its own engine handle** and terminates it when it ends,
   is cancelled, deleted or fails.
6. **The record keeps FENs, never node ids**; the PGN as sent is the source
   of truth for the run.
7. **Nothing at module scope.**

## 7. Testing

- **The runner** (`jobRunner.test.ts`) mocks `lib/engines/builtin` with the
  harness's `builtinEnginesMock` (each shipped engine a `FakeEngine`) and
  drives it by hand — `engine.say({ fen, depth, multipv, positionEvaluation, pv })`
  then `{ fen, bestMove }` — with `createJobRunner({ useLock: false })`,
  stopped and awaited (`idle()`) after each test; a small `silenceTimeoutMs`
  for a silent engine, `engineFor` for one that cannot be built. Wait with
  `vi.waitFor` on the store (`findJob`).
- **The teardown** (`src/test/setup.ts`) stops the page's runner
  (`stopJobRunner`) before the stores settle, then settles, resets and
  deletes `chessapp.jobs` with the others.
- **The screen** (`JobsScreen.test.tsx`) seeds the store (`addJob`) and, for a
  finished job, its output (`saveAnalysis` of a real `computerAnalysisTree`),
  mounts `/jobs` with the right panel's outlet, and asserts by role and name;
  no runner runs there.

## 8. Recipes

- **A new kind of job**: a kind in `JOB_KINDS` and its record type beside
  `ComputerAnalysisJob` (a union), its normaliser branch in `jobFrom`, a run
  branch in the runner keyed on `kind`, `jobs.kinds.<kind>` in both
  catalogs, and the summary's facts for it. The store, the cap, the lock, the
  statuses and the screen stay as they are.
- **A new option**: `lib/computerAnalysis.ts`'s (its bounds and normaliser);
  the runner reads it from `job.options`; a fact in `JobSummary`.
- **Carrying jobs in the export**: see `import-export.md` §1.1 for why they
  are not, and what that would take.
