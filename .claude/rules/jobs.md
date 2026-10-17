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
| `package.json` | `"@pgntools/jobs-runtime": "^0.2.1"` — from npm (published from the runtime's CI with provenance; `npm audit signatures`). A dev build is a git tag carrying `dist/` (`github:pgntools/jobs-runtime#v0.3.0-dev.N`). |
| `src/lib/jobs/runtime.ts` | **The page's one runtime**: `jobRuntime()` (made lazily, touching nothing), `startJobRuntime()` (the shell's effect), `stopJobRuntime()` / `deleteJobsDb()` (tests). Namespace and database `chessapp.backgroundJobs`, one lane `{ engine: 1 }` (the `cpu` lane went with the merge, CTA-232), at most 200 jobs, the browser adapters (`indexedDbJobStore`, `webLocksLeader`, `broadcastBus`), `newRecordId` ids. |
| `src/lib/jobs/kinds/index.ts` | **The kind registry** — `jobKinds(deps)`, one line per kind; `JOB_KIND_LOCALE_KEYS`; `RETIRED_JOB_KIND_LOCALE_KEYS` (a retired kind's old name, CTA-232) and `isRegisteredJobKind`. A factory: a test hands in an engine. |
| `src/lib/jobs/kinds/<kind>/` | **A kind**: `core.ts` (pure: input and state types, lenient parsers, plan, one step, the outputs planned), `kind.ts` (the `JobKind` adapter over the core and the app's stores), their tests. `computerAnalysis/` (with `liveAnalysis.ts`, a running job's results so far), `repertoireEvaluation/`. |
| `src/lib/jobs/engineSession.ts` | **The engine work every engine-lane kind shares** (CTA-218): the engine resolved (as a board falls back; a `hosted:…` id waiting for the engine server's list), the `uci` handshake, Threads / Hash / MultiPV clamped to what it declared, the job's preset, the eval sources asked first and written back, the silence timeout fed by `info` lines and an engine server's heartbeat, the live payload (`EngineSessionLive`). |
| `src/lib/jobs/kinds/engineRuns.ts` | One engine session per job **run**, kept across its steps by job id and closed when a step's signal aborts, a step throws, or at `finalize`; an engine server's engine failing becomes the retryable `EngineServerUnreachableError`. |
| `src/lib/jobs/entityTypes.ts`, `entities.ts` | **The entity registry**: `analysis-case`, `analysis-project`, `repertoire`, `library-collection` — each a label, an app path and an existence check over its store's snapshot; `subscribeJobEntities`. A kind names types and never imports a screen. `library-collection` no kind applies to since CTA-232: it stays for a reader's stored merge jobs (their subjects named and linked, an unfinished one deleted with its collection). |
| `src/lib/jobs/subjectDeletion.ts` | **The deletion rule's hook**: the stores call `removeUnfinishedJobsOf`; the runtime registers itself (a delete before it exists is held). |
| `src/views/jobs/` | **The screens**: `JobsScreen` (`/jobs`), `JobScreen` (`/jobs/<id>`), `JobsSettingsScreen` (`/jobs/settings`), `JobsShell` (the runtime's start, the eval sources' warning, the header indicator), `useJobs.ts` (the runtime's React hooks over the page's runtime), `jobViews.ts` (a record mapped onto the blocks' view models), `kindViews.ts` + `kindViewTypes.ts` (each kind's views), `kinds/` (those views), `useNewJob.ts` + `NewJobHost.tsx`, `paths.ts`, `useJobsSettings.ts`. |
| `src/blocks/…` | The generic blocks (CTA-217) — `JobQueueTable` (its filters in its headers since CTA-221, `JobQueueFilters` gone), `JobDetailsPanel`, `JobOutputsList`, `JobHistory`, `NewJobFrame`, `JobsIndicatorView` — and `EntityJobs` (CTA-221); the kinds' — `ComputerAnalysisForm`, `JobTargetFields`, `JobEngineProgress`, `ComputerAnalysisReport`, `EvalGraph`, `RepertoireEvaluationForm` / `Report`; `JobsSettingsForm`. (`CollectionMergeForm` is the Library's since CTA-232, in its `CollectionMergeDialog`; `CollectionMergeSummary` is gone.) Block-local view models: no block imports the runtime. |
| `src/test/jobsKit.ts` | The kinds' test kit (§6). |

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

## 3. The two kinds

| Kind | Lane | Applies to | Resumes by itself | Retry | Outputs |
| --- | --- | --- | --- | --- | --- |
| `analysis.computer-analysis` | engine | a Case | no — interrupted, Resume asked | an engine server gone: 3 attempts from 30 s; anything else fails at once | per ticked variant a Game Case (`<jobId>:<variant>`) linked from the source, or the one variant merged into the source Case (by the job's id in its `merges`) |
| `repertoire.evaluation` | engine | a repertoire | no | as above | the report (data, `repertoire.evaluation.report@1`); ticked, a repertoire "<name> — evaluated" (`r<jobId>e`) and the annotated PGN as a file |

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
- **`/jobs/settings`** — `JobsSettingsForm`: the default engine and preset
  for new engine jobs (`chessapp.jobsSettings`, the key kept from CTA-193),
  and the link to Settings → Engine for the eval sources.
- **The header indicator** — `JobsIndicatorView` over the runtime: the
  running job's title and progress, or the queued count; the engine kinds'
  beat and live words (`liveSummary`); announced politely only on a change of
  status (`useJobStatusAnnouncement`).
- **New job** — `useNewJob(testId)` → `{ open(subjects, context?), dialog }`:
  the kinds whose `appliesTo` holds the entity's type, the first that can
  start chosen; the chosen kind's `NewJob` view renders `NewJobFrame` itself
  (its own state, its own Start); Start queues, the dialog closes, a snackbar's
  **Open job** leads to `/jobs/<id>`. Entry points: a Case's Jobs tab
  (`EntityJobs`, the Case's jobs; its tree as the board holds it, as
  `context`) and the repertoire player's Jobs tab (*Evaluate with
  engine…*). The Library's picks' *Merge collections…* and a collection
  page's Jobs tab (CTA-221, CTA-231) went with the merge kind (CTA-232):
  merging is the Library's own action, and a collection page has no Jobs
  tab.

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
5. **Jobs are not exported** (`import-export.md`): a job is work in flight on
   this device, its outputs are the reader's data and are exported as such.
6. **Blocks never import the runtime**; the screens map its records onto the
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
