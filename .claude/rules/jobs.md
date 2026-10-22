---
paths:
  - "src/lib/jobs/**"
  - "src/views/jobs/**"
  - "src/test/jobsKit.ts"
  - "src/lib/jobsSettings*"
  - "src/blocks/tables/JobQueueTable/**"
  - "src/blocks/panels/JobDetailsPanel/**"
  - "src/blocks/lists/JobOutputsList/**"
  - "src/blocks/lists/JobHistory/**"
  - "src/blocks/lists/EntityJobs/**"
  - "src/blocks/dialogs/NewJobFrame/**"
  - "src/blocks/dialogs/JobSettingsChangedDialog/**"
  - "src/blocks/panels/JobsIndicatorView/**"
  - "src/blocks/panels/JobEngineProgress/**"
  - "src/blocks/forms/JobsSettingsForm/**"
  - "src/blocks/forms/JobTargetFields/**"
  - "src/blocks/forms/ComputerAnalysisForm/**"
  - "src/blocks/forms/RepertoireEvaluationForm/**"
  - "src/blocks/panels/RepertoireEvaluationReport/**"
---

# Jobs — the app's background work (CTA-215, CTA-221)

**Jobs is a module of its own**: durable background work over any of the
app's entities — a Case's computer analysis, a repertoire's evaluation —
resumable from its checkpoint, controlled from any tab, its outputs
collected from its page. It replaced Jobs V2 (CTA-188 to CTA-196), which
lived inside Analysis and knew one kind. **Library collections merged were
its third kind until CTA-232**, which retired it: merging is a Library
action now (`game-collections.md` §6.5.1) — §3.1 says what became of a
reader's stored merge jobs.

**The execution is not ours.** The queue, the leases, the leader election
across tabs, the state machine, the retries, the outbox, the artifacts and
the live feed are the **`@pgntools/jobs-runtime`** package (its own
repository, `pgntools/jobs-runtime`; its README and ARCHITECTURE.md are in
`node_modules/@pgntools/jobs-runtime/`). This repository holds the kinds, the
entity registry, the screens and the wiring. **Nothing in `src/` may
re-implement any of the runtime's parts**, and `yarn lint` forbids importing
the package's internals: only `@pgntools/jobs-runtime`, `/browser`, `/react`
and `/testing` (`eslint.config.js`, `JOBS_RUNTIME_INTERNALS`).

---

## 0. Where to look

| Path | What lives there |
| --- | --- |
| `package.json` | `"@pgntools/jobs-runtime": "github:pgntools/jobs-runtime#v0.3.0-dev.2"` — **a dev build** (a git tag carrying `dist/`) for the queue hold (JBR-3, CTA-258) until 0.3.0 is on npm; then back to a range from npm (published from the runtime's CI with provenance; `npm audit signatures`). |
| `src/lib/jobs/runtime.ts` | **The page's one runtime**: `jobRuntime()` (made lazily, touching nothing), `startJobRuntime()` (the shell's effect), `stopJobRuntime()` / `deleteJobsDb()` (tests). Namespace and database `chessapp.backgroundJobs`, one lane `{ engine: 1 }` (the `cpu` lane went with the merge, CTA-232), at most 200 jobs, the browser adapters (`indexedDbJobStore`, `webLocksLeader`, `broadcastBus`), `newRecordId` ids. |
| `src/lib/jobs/kinds/index.ts` | **The kind registry** — `jobKinds(deps)`, one line per kind; `JOB_KIND_LOCALE_KEYS`; `RETIRED_JOB_KIND_LOCALE_KEYS` (a retired kind's old name, CTA-232) and `isRegisteredJobKind`. A factory: a test hands in an engine. |
| `src/lib/jobs/kinds/<kind>/` | **A kind**: `core.ts` (pure: input and state types, lenient parsers, plan, one step, the outputs planned), `kind.ts` (the `JobKind` adapter over the core and the app's stores), their tests. `computerAnalysis/` (with `liveAnalysis.ts`, a running job's results so far), `repertoireEvaluation/`, `evaluatePosition/` (CTA-238, dev-only — §3.2). |
| `src/lib/jobs/engineSession.ts` | **The engine work every engine-lane kind shares** (CTA-218): the engine resolved (as a board falls back; a `hosted:…` id waiting for the engine server's list), the `uci` handshake, Threads / Hash / MultiPV clamped to what it declared, the job's preset, the eval sources asked first and written back, the silence timeout fed by `info` lines and an engine server's heartbeat, the live payload (`EngineSessionLive`). |
| `src/lib/jobs/engineJobSettings.ts`, `continueJob.ts` | **Resume against the settings in effect** (CTA-236, §4.1): `jobEngineChanges` (a job's engine, preset values, depth, move time, Threads and Hash against the current ones — pure), `currentJobEngineSettings` (what a new job would be given now), `JobContinuation`; `resumeChangesOf` (what Resume asks about) and `continueWithCurrentSettings` (a new job queued, then the old one removed), one entry per engine kind. |
| `src/lib/jobs/kinds/engineRuns.ts` | One engine session per job **run**, kept across its steps by job id and closed when a step's signal aborts, a step throws, or at `finalize`; an engine server's engine failing becomes the retryable `EngineServerUnreachableError`. |
| `src/lib/jobs/entityTypes.ts`, `entities.ts` | **The entity registry**: `analysis-case`, `analysis-project`, `repertoire`, `library-collection` — each a label, an app path and an existence check over its store's snapshot; `subscribeJobEntities`. A kind names types and never imports a screen. `library-collection` no kind applies to since CTA-232: it stays for a reader's stored merge jobs (their subjects named and linked, an unfinished one deleted with its collection). |
| `src/lib/jobs/subjectDeletion.ts` | **The deletion rule's hook**: the stores call `removeUnfinishedJobsOf`; the runtime registers itself (a delete before it exists is held). |
| `src/views/jobs/` | **The screens**: `JobsScreen` (`/jobs`), `JobScreen` (`/jobs/<id>`), `JobsSettingsScreen` (`/jobs/settings`), `JobsShell` (the runtime's start, the eval sources' warning, the header indicator), `useJobs.ts` (the runtime's React hooks over the page's runtime, and `useJobQueueHeld` — the queue hold, CTA-258), `jobViews.ts` (a record mapped onto the blocks' view models), `kindViews.ts` + `kindViewTypes.ts` (each kind's views), `kinds/` (those views), `useNewJob.ts` + `NewJobHost.tsx`, `useResumeJob.ts` (Resume, asking first — CTA-236), `paths.ts`, `useJobsSettings.ts`. |
| `src/blocks/…` | The generic blocks (CTA-217) — `JobQueueTable` (its filters in its headers since CTA-221, `JobQueueFilters` gone), `JobDetailsPanel`, `JobOutputsList`, `JobHistory`, `NewJobFrame`, `JobsIndicatorView` — and `EntityJobs` (CTA-221), `JobSettingsChangedDialog` (CTA-236); the kinds' — `ComputerAnalysisForm`, `JobTargetFields`, `JobEngineProgress`, `ComputerAnalysisReport`, `EvalGraph`, `RepertoireEvaluationForm` / `Report`, `JobEngineSettings` (the Evaluate Position job's engine settings plate, CTA-248); `JobsSettingsForm`. (`CollectionMergeForm` is the Library's since CTA-232, in its `CollectionMergeDialog`; `CollectionMergeSummary` is gone.) Block-local view models: no block imports the runtime. |
| `src/test/jobsKit.ts` | The kinds' test kit (§6); its answering engine in `src/test/answeringEngine.ts` (no runtime import — a screen test mocking the registry imports it from its mock). |

Routes and nav: `/jobs`, `/jobs/settings` and `/jobs/<id>` (full width,
`pages.jobs`, `pages.jobsSettings`, `pages.job`). The sidebar's **Jobs** is
one top-level row straight to `/jobs` (CTA-228): the folder `jobs`
(`nav.folders.jobs`) is `singleEntry`, folded to its one screen (`nav.jobs`,
declared but not drawn) under its own name and icon, as Analysis is — no
toggle, no nested *Settings*; active on `/jobs` only. The Jobs settings are
reached from the Jobs screen's header (its Settings button,
`JOBS_SETTINGS_PATH`) and return by their *Back to Jobs*; a job's page from
its row. Locale keys: `jobs.*` (`jobs.kinds.<key>.*`
a kind's own). `/analysis/jobs` is an unknown route.

---

## 1. The architecture

```
 a screen ──useNewJob(entity)──▶ NewJobHost ──kind's NewJob view──▶ jobRuntime().enqueue(kind, input)
                                                                        │
 any tab: pause · resume · cancel · remove · removeUnfinishedOf ──────▶ │  @pgntools/jobs-runtime
 any tab: hold · release (the whole queue, CTA-258) ────────────────────▶ │
                                                                        ▼  (IndexedDB chessapp.backgroundJobs,
 the leader tab (Web Lock): lane engine ──▶ kind.plan / step / finalize / applyOutput   Web Lock, BroadcastChannel)
                                                        │                       │
                                              engineSession       the app's stores (Cases, repertoires)
                                                        │                  — outputs, idempotent by id
                                           ctx.live / ctx.heartbeat / ctx.artifacts
                                                        ▼
 every tab: useJobs · useJob · useJobLive ──▶ /jobs · /jobs/<id> · the indicator · a Case's / repertoire's Jobs tab
```

- **One runtime per page**, made lazily and started by the shell in an effect
  (`JobRuntimeStarter`, mounted by `Layout.tsx`) — never at import (the
  `noWorkerAtImport` test opens no database by making it), never during the
  pre-render, never stopped by an effect cleanup. A screen reading jobs
  starts it too (`useJobRecords`, idempotent), so a screen works in a test
  without the shell. The records are read only once it is started.
- **The store is the only channel.** Pause, Resume, Cancel and Delete are
  the runtime's commands — store writes any tab makes; the tab holding the
  lock acts on them within one step. The live progress is broadcast to every
  tab and never stored.
- **One lane**: `engine` (the computer analysis, the repertoire evaluation),
  one job at a time. The `cpu` lane was the merge's alone and went with it
  (CTA-232); a kind that needs one again declares it in `JOB_LANES`.
- **Retention**: 200 jobs; past it the oldest finished go with their files;
  an enqueue is refused (`too-many`) when every one is unfinished.
- **The queue hold** (CTA-258, the runtime's `hold()` / `release()` /
  `held()`, JBR-3) — §4.2.

---

## 2. Adding a kind — the checklist

1. `src/lib/jobs/kinds/<kind>/core.ts` (pure) and `kind.ts` (the adapter),
   with their tests — including the crash-between-writes test (§6).
2. One line in `kinds/index.ts` (`jobKinds`) and its locale key in
   `JOB_KIND_LOCALE_KEYS`.
3. `jobs.kinds.<key>.*` in both catalogs: at least `name`, `description` and
   an `errors.<code>` per error code (`kinds/index.test.ts` holds it).
4. Its blocks (form, report) — gallery-first on fixtures — and one line in
   `views/jobs/kindViews.ts`.
5. An entry point on its entity's screen: `useNewJob(…)`.

**No change to the runtime, the store, the Jobs screens or the shell.** A kind
without views still lists, runs and offers its outputs generically.

**First ask whether it is a job at all** (CTA-232's lesson): a job is work
that outlives the tab and wants a checkpoint — an engine searching for
minutes or hours. Work a screen does in seconds plus an index pass (the
collection merge: joining and hashing ~0.02 ms a game) is that screen's own
action, over `useCancellableJob` and a `ProgressDialog`, not a kind.

**Retiring a kind** (CTA-232): remove its folder, its line in `jobKinds`, its
`JOB_KIND_LOCALE_KEYS` entry, its views (`kindViews.ts`), its blocks and its
`jobs.kinds.<key>.*` words — and move its id to
`RETIRED_JOB_KIND_LOCALE_KEYS` with a name under `jobs.retiredKinds.<key>`
(both catalogs; `kinds/index.test.ts` holds it), so a reader's stored jobs
of it still read (§3.1). Its lane goes if nothing else uses it.

### 2.1 A kind's contract (the runtime's `JobKind`)

- `parseInput` lenient and total (`undefined` = refused, `invalid`);
  `parseState(value, fromVersion)` lenient, `undefined` = re-plan; bump
  `version` when the state changes shape.
- **`step` is at-least-once**: safe to re-run from the state it was given; it
  returns the next state, the progress and `done`. Files are written as parts
  (`ctx.artifacts.writePart(key, seq, …)` — idempotent by `(key, seq)`).
- **`finalize` decides, `applyOutput` applies.** `finalize` returns the
  outbox (`OutputPlan`s, which may seal artifacts); `applyOutput` applies one
  **idempotently by its key** — every entity an output makes has an id derived
  from the job's (`<jobId>:<variant>` Cases, `r<jobId>e` repertoires,
  `u<jobId>` collections), and the store treats that id already there as
  success (`addAnalysisCases`, `addRepertoires`, `addCollection`). `applyOutput`
  sees no state: a plan carries what it needs.
- `classifyError` maps an error to `{ code, retryable }`; the codes are the
  kind's `jobs.kinds.<key>.errors.<code>`.

---

## 3. The kinds

| Kind | Lane | Applies to | Resumes by itself | Retry | Outputs |
| --- | --- | --- | --- | --- | --- |
| `analysis.computer-analysis` | engine | a Case | no — interrupted, Resume asked | an engine server gone: 3 attempts from 30 s; anything else fails at once | per ticked variant a Game Case (`<jobId>:<variant>`) linked from the source, or the one variant merged into the source Case (by the job's id in its `merges`) |
| `repertoire.evaluation` | engine | a repertoire | no | as above | the report (data, `repertoire.evaluation.report@1`); ticked, a repertoire "<name> — evaluated" (`r<jobId>e`) and the annotated PGN as a file |
| `analysis.evaluate-session-position` (CTA-238, its input a session's key since CTA-244, **dev-only**, §3.2) | engine | none offered (`appliesTo` empty) — its subject a Case | **yes** — one search, re-queued after a lost lease (`autoResume`) | as above | the search's result (data, `analysis.evaluate-position.result@1`), then the session's record taking it (`editSessionCase` — `engineSearched`, an event: no merge id) |

- **The computer analysis** is Jobs V2's behaviour (its input, its
  positions-and-checkpoint state, its error codes `source`, `engine`,
  `storage`, `target` — `too-many` went with the app's cap of Cases, CTA-225:
  a Case is never refused for a count); its state adds the engine that ran it,
  the annotator its outputs — and an open board's merge — name. An open Case
  board takes a merge its record lists in (`CaseWorkspace`, `analysisOf` over
  the job's record).
- **The repertoire evaluation**: every unique position up to the ply limit,
  deduplicated by FEN; one position a step. The report's moves link to the
  repertoire at the move (`?at=` its SAN path).
- **Each kind's input snapshots its engine settings** when it is queued and
  runs with them however the reader's change: the computer analysis its
  `options` (`engine`, `depth`, `moveTimeMs`, `threads`, `hashMb` — and the
  rest of the form) and its `preset` (`id`, `name`, `values` — the values it
  sends, `presetSentValues`); the repertoire evaluation its `engine`,
  `preset` and `search`. Both inputs take two optional fields since CTA-236,
  written only by *Continue with current settings* (§4.1): **`continues`**
  (`{ jobId, title, createdAt }` — the job it continues, removed since; its
  page's parameters say it, "Continues") and **`seed`** (that job's results —
  the computer analysis's a list of `PositionResult`s, matched by FEN; the
  repertoire evaluation's by position key): **the plan gives each planned
  position the seed's result for it**, so only the rest is searched. Both
  read leniently — a seed's result for no planned position, under another
  key or with no line is ignored. The repertoire evaluation's new input plans
  its own fingerprint, so `stateFor` keeps the seeded state.
- **The eval sources** (`lib/evalSources/`, set in Settings → Engine): an
  engine job asks them first, as every board does; a source that does not
  answer is said once per run — the shell's warning snackbar
  (`JobRuntimeStarter`), naming it, a link to its settings.

### 3.1 A retired kind's stored jobs — `library.collection-merge` (CTA-232)

The collection merge (CTA-220, CTA-221: `cpu` lane, two or more collections,
the merged PGN, optionally a Library collection `u<jobId>`, a summary) was
retired when merging became a Library action. **A reader's merge jobs are
left as they are** — no migration, no deletion — and read as follows:

- **The runtime** keeps a record of an unregistered kind and never claims
  it (`kindOf` is undefined; its lane loops skip it): a queued one stays
  queued, a running one is stalled to `interrupted` once its lease runs out.
  Pause, Resume and Cancel answer `not-allowed`; **Delete** works.
- **The screens** offer only Delete (`jobViews.ts`' `canPause` / `canResume`
  / `canCancel` check `isRegisteredJobKind`), name the kind "Merge
  collections (retired)" (`jobs.retiredKinds.collectionMerge`, any other
  unknown kind "Unknown kind (<id>)"), list it in the kind filter while a
  job of it exists, and draw its outputs generically: the merged PGN
  downloads, a collection it made links through the entity registry, its
  summary is a data output with no view. **The header indicator** counts
  only jobs of registered kinds, so a queued orphan is not "waiting".
- **The deletion rule** still holds: deleting a collection removes its
  unfinished merge jobs (`library-collection` stays in the entity registry).

### 3.2 Evaluate Position — `analysis.evaluate-session-position` (CTA-238; CTA-244, dev-only)

**One position searched once**, for the Accuracy Trainer's Find Best Move
v4 ([`accuracy-trainer.md`](./accuracy-trainer.md) §6, §8), which alone queues
it — no New-job dialog offers it (`appliesTo: []`) and it has no form. Like
its screen it is **dev-only**: its line in `jobKinds`, its
`JOB_KIND_LOCALE_KEYS` entry and its views are spreads under
`import.meta.env.DEV`, so a production build has no code of it (its words
stay in the catalogs, as the dev screens' do).

- **Input**, `version: 2` (`EVALUATE_POSITION_INPUT_VERSION`): the session's
  Case (`caseId`, its one subject — deleted, its unfinished jobs go), the
  session's **position key** (`key` — the ply of its move in the session's
  recorded game), the position's
  `fen`, the move's `label`, the engine, its preset (id, name, values sent)
  and the search — the **top bar's Engine menu's** depth, move time, Threads
  and Hash, MultiPV the session's *Moves to find* (`core.ts`, read leniently;
  another version refused).
- **One step**: the search to the depth asked, no early stop; the state its
  result and the engine. `resumable: false` (nothing to resume from),
  `autoResume: true` — cheap, so a lost lease re-queues it. Errors
  `engine`, `storage`, `target` (the Case gone, or no longer a session).
- **Outputs**: `result` (data) — the trainer's engine unit
  (`useSessionEngine`) reads it from the job's record and echoes it; then
  `case` — **the session's record takes it**: `editSessionCase(caseId,
  [engineSearched(key, jobId, result)])`, the session's one writer
  (`lib/findBestMove/store.ts`), the lines merged into the position's in the
  Case's tags and the movetext re-derived. An event applied to the record as
  stored — it commutes with the trainer's writes, needs no merge id, and lands
  with the trainer closed. Applied twice, written once.
- **Its page** (`/jobs/<id>`, CTA-248): the live engine while it runs
  (`EngineLiveView`) and, as its Parameters, **the engine settings it
  started with as a plate** — `JobEngineSettings` (`blocks/cards/`), read
  through `parseEvaluatePositionInput` (and the state's `RanEngine`) by
  `views/jobs/kinds/EvaluatePositionViews.tsx`: the engine (the one that ran
  it by name, else the registry id asked for), the preset (or *None
  recorded*), depth, time per move (or *No limit*), lines, Threads, Hash,
  and the UCI option values the preset sent, name → value (or the words that
  it sent none) — numbers and option names pinned LTR. Its words
  `jobs.engineSettings.*` and `jobs.facts.*`. Dev-only with the kind's other
  views. The other two engine kinds keep their own `KeyValueList`s — their
  parameters mix the engine with the rest of their form.
- **Not in Resume's comparison** (§4.1): one search, re-planned anyway.
- Tests: `kinds/evaluatePosition/core.test.ts`,
  `kind.test.ts` (the run into the record, the crash between every pair of
  writes, the deletion rule, a Case gone or no session); the plate's
  `JobEngineSettings.test.tsx` and its page in `views/jobs/Jobs.test.tsx`.

---

## 4. The screens

- **`/jobs`** — `JobQueueTable`, full width: title (its page), kind,
  status, progress, created — **every column sortable** (newest first to
  start), **paged** (25 / 50 / 100 / 250, 50 to start); **the filters stand
  over their columns** — the status under Status's label, the kind under
  Kind's (`DataTable`'s `column.filter`), Clear above the table while one is
  on; per row Pause / Resume / Cancel / Delete; picks to delete several.
  Every delete asks first. What a job is applied to is its page's, not a
  column.
- **`/jobs/<id>`** — `JobDetailsPanel` (the title the page's `h1` and its
  title, `usePageTitle`): status and actions; progress, the kind's live view
  under it while it runs (the engine kinds' `JobEngineProgress`); why it
  failed or waits (a scheduled retry counting down, "Retrying in 40 s —
  attempt 2 of 3"); subjects; the kind's details and parameters; then
  `JobOutputsList` — an entity opens, an artifact downloads (named and sized,
  `runtime.readArtifact` → an object URL, `downloadBlob`), a data output drawn
  by its kind's view — and `JobHistory`.
- **Resume asks first when the settings changed** (§4.1) — on both screens.
- **`/jobs/settings`** — `JobsSettingsForm`: the default engine and preset
  for new engine jobs (`chessapp.jobsSettings`, the key kept from CTA-193),
  and the link to Settings → Engine for the eval sources.
- **The header indicator** — `JobsIndicatorView` over the runtime: the
  running job's title and progress, or the queued count; the engine kinds'
  beat and live words (`liveSummary`); announced politely only on a change of
  status (`useJobStatusAnnouncement`). While the queue is held (§4.2),
  "Jobs paused" (and the count queued) with a pause icon, on every screen,
  even with nothing waiting.
- **New job** — `useNewJob(testId)` → `{ open(subjects, context?), dialog }`:
  the kinds whose `appliesTo` holds the entity's type, the first that can
  start chosen; the chosen kind's `NewJob` view renders `NewJobFrame` itself
  (its own state, its own Start); Start queues, the dialog closes, a snackbar's
  **Open job** leads to `/jobs/<id>`. Entry points: a Case's Jobs tab
  (`EntityJobs`, the Case's jobs; its tree as the board holds it, as
  `context` — its button and the dialog's title **Computer analysis**,
  CTA-241) and the repertoire player's Jobs tab (*Evaluate with
  engine…*). **The engine forms' Engine section folds** (CTA-241): in
  `ComputerAnalysisForm` and `RepertoireEvaluationForm` the
  `SettingsSection` over `EngineSearchFields` (engine, preset, Threads, Hash,
  depth, time per move, lines) starts folded — its heading a disclosure
  (`aria-expanded`, `SettingsSection`'s `fold`) and beside it one line,
  `EngineSearchSummary`: "Stockfish 19 Lite · Default · depth 20 · 5 s a
  move" (`computerAnalysis.form.summary.*`); `engineExpanded` opens it at
  first (the galleries' engine demos). The Library's picks' merge and a collection
  page's Jobs tab (CTA-221, CTA-231) went with the merge kind (CTA-232):
  merging is the Library's own action, and a collection page has no Jobs
  tab.

### 4.1 Resume against the settings in effect (CTA-236)

Resume on an engine job — paused, interrupted or failed, from a `/jobs` row
or the `/jobs/<id>` page (`useResumeJob`) — compares the settings it was
queued with against **what a new job of its kind would be given now**: the
Jobs default engine and preset (else the board's engine and its selected
preset), the preset's depth and move time, the Engine menu's Threads and
Hash, held to the engine as the New-job forms hold them
(`currentJobEngineSettings` over `useEngineJobChoice`'s seed — the forms'
own). Compared: **the engine, the preset's option values, depth, move time,
Threads and Hash** (`jobEngineChanges`) — not the lines or the rest of the
form, which the job keeps; another preset sending the same values is no
difference; **a field the stored input does not carry is never different**
(an older record's).

- **The same** → it resumes at once (`runtime.resume`), as before. So does a
  job of a kind not compared (a retired kind's offers no Resume anyway), and
  one whose search is done (phase `finalize` or `outputs`, or every position
  searched — only its outputs are left, which the settings do not touch).
- **Different** → `JobSettingsChangedDialog`: a row per setting — the job's
  value, then the current one (the engine by name, the preset by name and
  each option sent differently, depth, move time, Threads, Hash) — and
  **Continue with the job's settings** (`runtime.resume`, unchanged),
  **Continue with current settings**, or Cancel (nothing happens).
- **Continue with current settings** (`continueWithCurrentSettings`). The
  runtime keeps an input immutable and `resume(id)` takes none, so the job
  is **queued again as a new job** of the same kind: the old one's source,
  target and form, today's engine, preset and search (held to that engine's
  bounds; the computer analysis's early-stop depth no deeper than the new
  depth), `continues` naming it and its results so far as the `seed`
  (§3) — the positions it searched are kept, only the rest searched with
  the new settings. **Only once that enqueue succeeds is the old job
  removed**; refused (`too-many`, `invalid`, `storage`), the old job is left
  as it was and the dialog says why (`jobs.newJob.problem.*`). The new job
  has a new id, so its outputs' ids are its own (`<newJobId>:<variant>`
  Cases, `r<newJobId>e`). A snackbar's **Open job** leads to it, and
  `/jobs/<id>` follows to its page. The dialog re-reads the job before
  queueing: one another tab resumed meanwhile is left alone.
- Words: `jobs.settingsChanged.*`, the parameters' `jobs.facts.continues*`.
- Tests: `lib/jobs/engineJobSettings.test.ts` (the comparison),
  `continueJob.test.ts` (both kinds on the real runtime — paused part-way,
  continued, only the rest searched, the old job gone; a refusal leaving it),
  each kind's `core.test.ts` (the seed planned, read leniently),
  `JobSettingsChangedDialog.test.tsx`, `views/jobs/Jobs.test.tsx` (both
  screens).

### 4.2 Pause queue — the whole queue held (CTA-258)

Pausing a running job only lets the lane claim the next one, so **the whole
queue is paused by the runtime's queue hold** (`@pgntools/jobs-runtime`
0.3, JBR-3 — not an app-side loop over `pause(id)`, which would neither stop
a job queued afterwards nor tell a reader's own pauses from its own).

- **The runtime**: `hold()` writes one durable runtime-wide value (the
  store's `meta`; `indexedDbJobStore` at database version 2) — every tab's
  lanes stop claiming, and the running job's step is aborted and the job
  handed back to **`queued`** from its checkpoint (history `held`, attempt
  outcome `held`, no attempt spent). `release()` lets the queue go on in its
  usual order; **a job the reader paused stays paused** — per-job statuses
  are never touched by the hold. An enqueue while held waits as queued
  (a Find Best Move session's Evaluate Position job too). Per-job Pause /
  Resume / Cancel / Delete keep working; a row's Resume while held puts its
  job back in the queue, waiting. `held()` is `undefined` until the first
  read, and `subscribe()` hears it change, in every tab; it survives a
  reload and a leader handover.
- **The app**: `useJobQueueHeld()` (`views/jobs/useJobs.ts`, over
  `jobRuntime().subscribe` / `held()`); the Jobs screen's header toggles
  **Pause queue** / **Resume queue** (`jobRuntime().hold()` / `release()`;
  a refusal is an error snackbar, `jobs.screen.holdFailed` /
  `releaseFailed`) and, while held, an `InlineAlert` notice — nothing starts
  until resumed, the stopped job waits in the queue, jobs paused one by one
  stay paused; the header indicator (`JobsIndicatorView`'s `held`) shows it
  on every screen, and `useJobStatusAnnouncement(jobs, held)` says "Job queue
  paused." / "Job queue resumed." (never on the first read); a history's
  `held` event and attempt outcome have their words
  (`jobs.history.eventTypes.held`, `jobs.history.outcome.held`).
- **The top bar's robot** (`views/main/engineSearching.ts`) breathes for no
  job while the queue is held — the running one is going back to the queue
  (`useEngineGateHeld`, `views/board/core/engineGateJobs.ts`; the board
  harness's `engineJobsStub.setHeld`). The engine gate itself (invariant 5)
  is unchanged: the held job is `queued` within its step.
- Words: `jobs.screen.holdQueue`, `releaseQueue`, `heldTitle`, `heldNotice`,
  `holdFailed`, `releaseFailed`; `jobs.indicator.held`, `heldQueued`,
  `heldAnnounced`, `releasedAnnounced`.

---

## 5. Invariants

1. **The runtime is the package's.** No queue, lease, state machine, retry or
   live feed in `src/`; only its public entry points imported.
2. **Nothing at import; the shell starts it in an effect.**
3. **A step is safe to re-run; an output is applied once** — ids derived from
   the job's, an id already there success.
4. **One deletion rule**: deleting a Case, a Project, a repertoire or a
   collection removes its **unfinished** jobs (a running one aborted —
   `runtime.removeUnfinishedOf`, through `subjectDeletion.ts`); finished jobs
   stay, their outputs on their own, a deleted subject read as "deleted".
   (Jobs V2 deleted even a Case's finished jobs; that change is deliberate.)
5. **One engine at a time, a job's or a board's** (CTA-237): while an engine
   job runs, in any tab, no board engine searches — a board asks before its
   engine goes on (Pause the job / Wait for it to finish), and a job starting
   switches every board engine off. The gate is the board core's
   (`useEngineGate`, `chessboard.md` §9.2.7); the runtime is untouched.
6. **Jobs are not exported** (`import-export.md`): a job is work in flight on
   this device, its outputs are the reader's data and are exported as such.
7. **Blocks never import the runtime**; the screens map its records onto the
   blocks' view models (`jobViews.ts`).

---

## 6. Testing

- **The kinds** run on the real runtime with its testing kit
  (`@pgntools/jobs-runtime/testing`: `memoryJobStore`, `memoryLock`,
  `manualClock`, `runUntilIdle`) and ours (`src/test/jobsKit.ts`):
  `AnsweringEngine` (a `FakeEngine` answering every search in a microtask),
  `engineDeps`, `testRuntime`, `runToEnd` (settle, move the clock, breathe —
  the Library's indexer yields on real timers), `crashingStore` and
  **`crashThenRecover`** — a store that fails every write after the Nth, the
  dead tab stopped, a second runtime over the surviving store taking over once
  the lease has run out (resuming an engine job, as the reader would). Each
  kind's `kind.test.ts` counts an uncrashed run's writes and **crashes between
  every pair of them**, asserting the job ends done and every output exists
  exactly once.
- **Two tabs**: two runtimes over one `memoryJobStore` and one `memoryLock` —
  one pauses, the other's step aborts and its engine is terminated; Resume
  goes on from the checkpoint (`computerAnalysis/kind.test.ts`).
- **The queue hold** (`lib/jobs/queueHold.test.ts`, CTA-258): two tabs, one
  holding — the running job back to queued at its checkpoint, nothing
  starting, a job queued meanwhile waiting, Resume queue going on from the
  checkpoint; a job paused before or during the hold still paused after;
  the hold kept across a reload of the page's runtime (fake-indexeddb); and
  **the crash kit through a hold** — an engine that holds the queue at its
  second position, the run counted, then the tab dying after every write,
  the second tab releasing and finishing: done, each Case once.
  `crashingStore` passes the store's `getMeta` / `putMeta` on (`putMeta` a
  counted write). Evaluate Position waiting while held:
  `evaluatePosition/kind.test.ts`; the screen: `views/jobs/Jobs.test.tsx`.
- **The registry** (`kinds/index.test.ts`): every kind's words in both
  catalogs, its entity types, `parseState(plan().state)` round-tripping.
- **The screens** (`views/jobs/Jobs.test.tsx`) mount the real routes over the
  page's runtime (fake-indexeddb): a job seeded with `runAfter` an hour on
  stays queued; **a retired kind's jobs** (§3.1) are seeded by a runtime
  that still registers a stand-in of the merge kind over the same database
  (`seedRetiredMerge` — queued, or run to its end with its file and its
  summary), then read by the page's, which does not: its row, its page, Delete
  alone, the indicator not counting it.
- **The teardown** (`src/test/setup.ts`) stops the page's runtime
  (`stopJobRuntime`) before the stores settle, then deletes
  `chessapp.backgroundJobs` (`deleteJobsDb`).
- jsdom has no Web Locks: the runtime runs in lease-only mode there.
