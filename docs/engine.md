# The engine

How the app talks to a chess engine, which engines ship, and how to add one.
Written for CTA-151 (pluggable engines) / CTA-152 (this layer: the abstraction,
the registry and the newer builds), reviewed and trimmed in CTA-160 (the 2019
build removed, the test seam moved onto the registry — §12). The boards' side
of it — the lifecycle rules `useEngineModule` keeps — is §4 and §9.2.1 of
[`.claude/rules/chessboard.md`](../.claude/rules/chessboard.md).

## 1. The layers

```
 a board                useEngineModule ─────▶ EngineHandle ◀───── UciEngine ─────▶ UciTransport ◀───── WorkerTransport
 (composes it)          (src/views/board/       (the surface a      (the UCI         (the wire:           (a local Web Worker;
                         core/)                  board may ask)      protocol)        lines in / out)      the only place a Worker is made)
                              │
                              └── resolveEngine(id) ──▶ the registry (src/lib/engines/) ──▶ EngineDescriptor.create()
```

| Piece | File | What it is |
| --- | --- | --- |
| `EngineHandle` | `src/lib/engineTypes.ts` | `search(fen, {depth, movetime})`, `stop()`, `setOption(name, value) => boolean`, `options`, `whenOptionsReady(cb)`, `onMessage(cb) => unsubscribe`, `terminate()`. **All a board depends on.** |
| `UciTransport` | `src/lib/engineTypes.ts` | `send(line)`, `onLine(cb) => unsubscribe`, `close()`. The wire, nothing about how it travels. |
| `UciEngine` | `src/lib/uciEngine.ts` | The UCI protocol over a transport: option discovery, the `setoption` / `stop` deferral, the pinned-option rule, FEN stamping, the depth clamp (`maxDepth`, default `DEFAULT_MAX_DEPTH` = 99), `go infinite`. Also `parseEngineOption`, pure. |
| `WorkerTransport` | `src/lib/workerTransport.ts` | `new Worker(url)` as a transport. **Nothing outside it may assume a Worker.** |
| `EngineDescriptor` | `src/lib/engineTypes.ts` | `{ id, name, version, requires?, capabilities: { maxDepth, strength, multiThread }, create() }`. |
| the registry | `src/lib/engines/` | `ids.ts` (the default's id, name and version — what a record and a preference name it by), `builtin.ts` (the shipped descriptors — and the tests' seam, §11), `registry.ts` (get, availability, describe, resolve), `index.ts`. |
| the eval sources | `src/lib/evalSources/` | `withEvalSources(handle)` — the `EngineHandle` every board's engine is built behind (`useEngineModule`): an analysis search asks the enabled eval sources (the lichess evaluation API) first, the engine only on a miss (CTA-196, §10). |

**Nothing runs at module scope.** A descriptor is data until `create()`; a
transport makes its Worker in its constructor. The pre-render
(`src/entry-server.tsx`, Node) imports all of this, and
`src/lib/engines/noWorkerAtImport.test.ts` holds it to that.

## 2. The engines that ship

Files, versions, licences, sizes, checksums and what was measured on each are in
[`public/stockfish/README.md`](../public/stockfish/README.md). In short:

| Registry id | Engine | Threads | Strength knobs it declares | Needs |
| --- | --- | --- | --- | --- |
| `stockfish-19-lite-single` — **the default** | Stockfish 19, lite NNUE net, single-thread | pinned 1 | `Skill Level`, `UCI_LimitStrength`, `UCI_Elo` 1320–3190 | — |
| `stockfish-19-lite-multi` | the same, multi-thread (`SharedArrayBuffer`) | 1–32 | as the single-thread build | a **cross-origin-isolated** page (COOP + COEP) |

Both GPLv3, each in its own folder under `public/stockfish/`, fetched **only
when chosen** — nothing references a build until its `create()`.

**The 2019 build is gone** (CTA-160): Stockfish 2019-08-15, the app's first
engine and its default until then. Its id, `stockfish-2019-wasm`, is the one
thing left, as a migration: a preference naming it resolves to the default
(§3), and a played game naming it — or naming no engine, as every game from
before CTA-153 does — is read as the default's (§4).

## 3. The registry

```ts
import { describeEngines, resolveEngine, getEngine, BUILTIN_ENGINES } from "src/lib/engines";
```

- **A fixed list — the shipped builds**, `BUILTIN_ENGINES`, the default first.
- **Availability is read at runtime**, from `crossOriginIsolated` — never a build
  flag. The same bundle runs on GitHub Pages (which cannot set the headers: the
  multi-thread build is *listed*, **unavailable**, reason
  `"cross-origin-isolation"`) and on the chessapp.dev host (which sets them, CTA-154:
  it is selectable). `describeEngines()` is the list a picker draws, each row
  with its availability, so a disabled engine can say why.
- **An id that cannot run falls back to the default**, `resolveEngine(id)`: an
  unknown id (a stored preference for an engine that is gone — the 2019 build's
  among them), an engine this page cannot run, `undefined`, `""`. A board
  therefore always has an engine.
- **An id is stored** (a preference, a played game) **and is never renamed.** A
  new build of the same engine is a new id; `version` is what a reader sees.

### 3.1 Cross-origin isolation on chessapp.dev (CTA-154)

The multi-thread build runs only on a **cross-origin-isolated** page. The swa
build (`DEPLOY_TARGET=swa`, chessapp.dev) writes, into
`staticwebapp.config.json`'s `globalHeaders`, **every response**:

```
Cross-Origin-Opener-Policy:   same-origin
Cross-Origin-Embedder-Policy: require-corp
```

(`scripts/crossOriginIsolation.mjs`; reasoning, what could break it and how
`yarn check:pages` guards it: [`static-pages.md`](../.claude/rules/static-pages.md)
§5.) Every response matters: a dedicated worker is isolated by its **own
script's** COEP, so the worker `.js` carries the headers too, and the `.wasm`
and the helper threads it starts are same-origin. Checked 2026-10-07 in
Chromium against the production swa build served with those headers:
`self.crossOriginIsolated === true` on every page tried (front page, `/he/`,
the Blog, Library, Openings, Settings), every engine gives lines on the
Analysis Board of the time (the multi-thread one starts its helper workers), and nothing is
logged or blocked.

- **GitHub Pages is unchanged**: no headers, `crossOriginIsolated` false, the
  multi-thread build listed disabled with its reason. Nothing else about the
  app depends on isolation.
- The headers are the host's. Only a deploy proves Azure sends them; afterwards
  `curl -sI https://chessapp.dev/` shows both and the console says
  `crossOriginIsolated` → `true`.
- **A new cross-origin sub-resource** (a font, image, embed, script from
  another site) is blocked by `require-corp` unless that host sends
  `Cross-Origin-Resource-Policy: cross-origin` — see `static-pages.md`.

## 4. The reader's choice (CTA-153)

Settings → Engine (`/settings/engine`, [`settings.md`](../.claude/rules/settings.md)
§4) lists the registry (`describeEngines()`) with the `EnginePicker` block — an
engine the page cannot run is listed disabled with its reason — and keeps the
choice in `localStorage` (`chessapp.engine`, `lib/engineChoice.ts`). The store
keeps the **raw** id; `engineChoiceId()` is what boards read — the shipped,
runnable engine, else the default — so a stored id that is gone or cannot run
here falls back *without being discarded* and returns where it can run. Every
board passes `useEngineChoice().engineId` to `useEngineModule({ engine })`, so
the choice reaches it from its next search. A **game against the engine** reads
it once as it begins and **records the engine** on the game
(`PlayedGame.engine`: id, name, version, how strength was set); absent — or the
retired 2019 build's id — means the default engine, labelled and resumed as
such, and a resumed game goes on with its own engine, falling back — with a
notice — where that one cannot run.

**Strength follows what the engine declares.** An engine with `UCI_Elo` and
`UCI_LimitStrength` — every shipped one — is strengthened by an Elo
(`EngineSettings.elo`, a request clamped to its range); one without by
`Skill Level`, its Elo shown as an estimate (`approximateElo`). Both are
requested — `uciOptionsOf` — and the engine keeps what it has; `UciEngine`
writes a `check` option as `true` / `false`. The settings form shows the Elo
slider until the handshake says otherwise.

## 5. How a board picks one

`useEngineModule({ engine?: string, … })` — `engine` is a descriptor id; absent
is the default engine. It returns `descriptor`, the engine actually running
(after any fallback), alongside the lines, evals and `engineOptions`.

Changing the choice **terminates the old handle and builds the new one** — one
engine at a time — and then does what a fresh mount does: the options handshake
is read again (`engineOptions` is the *new* engine's), the requested settings
are **clamped to what the new engine declares** and reported through
`onUciOptionsReady`, the options are pushed, and the position on screen is
searched. The previous engine's lines are dropped; the per-FEN scores already
recorded stay (the move list's marks) and are overwritten as the new engine
finishes each position.

> **Settings are requests.** A stored setting is what the reader asked for, not
> what the engine took. A screen that writes the clamped value back loses the
> wider request when it moves to a narrower engine and back; a screen that
> wants to keep it keeps the request and clamps at use. That is the settings'
> decision (CTA-153); this layer only reports. **The search settings keep the
> request** (CTA-181): they are the reader's one global set
> (`lib/engineSearchSettings.ts`, §5.2), never cut back in the store — Threads
> and Hash held to the engine running when used (`analysisUciOptionsOf`,
> `uciOptionsOf` and the module's clamp) and shown held in the menu. Only Play's
> strength takes the clamp back (`withClampedStrength`).

### 5.1 How long a search runs (CTA-160)

A search is **to a depth** — `{ depth, movetime? }`, whichever comes first,
the depth always the board's own setting (never a default of the wrapper's) —
or **until stopped**: `{ infinite: true }`, `go infinite`. `useEngineModule`
takes `infinite?: boolean` beside `depth` and `moveTimeMs`.

- **The limits were the 2019 build's, not Stockfish's.** Depth stopped at 24
  and move time at 10 s while the default engine had a 16 MB hash table and
  one thread. They are now: the wrapper's clamp `DEFAULT_MAX_DEPTH` = **99**
  (each descriptor's `capabilities.maxDepth`; past any search a browser runs,
  so a request is never cut short), and what the forms **offer**,
  `ENGINE_SETTING_BOUNDS`: depth **1–99** (typed — the slider stops at 50,
  `DEPTH_SLIDER_MAX`; 1–40 until CTA-185, which a job keeps), move time **0 s – 24 h** (typed, up to 86,400 s;
  the snap-to-mark slider's last time mark is 600 s — 300 s from CTA-163 —
  and a longer time sits there; a job keeps 0–600 s) — **every board's** since CTA-181, one global set in the top bar's
  Engine menu (the analysis boards' own 0–60 s went with their Engine tab).
  The move time is lichess's marked slider: marks 1, 5, 10, 30, 60, 300, 600
  seconds (CTA-185; 0, 5, 10, 20, 30, 60, 120, 300 before) and an **∞ mark**
  for "no limit" (`moveTimeMs` 0). 0 seconds — typed in the move-time box —
  is the instant reply, stored as 1 ms, since 0 was already "no limit"; the
  slider shows it, and anything under a second, on its first mark. A stored
  value off the marks is shown where it falls between them and snaps onto a
  mark on the next drag.
- **Every search stops** — at the depth or the move time, whichever comes
  first: **depth 20 and no time limit** by default, where it was depth 16 cut
  off after one second. **There is no infinite analysis** (CTA-185): its
  switch (CTA-160, lichess's; the top bar's Engine menu since CTA-181) is
  gone — the reader wants a hard stop — and a stored `infinite` (the
  preference, an older saved analysis) is read as nothing. The engine layer
  still speaks `go infinite` (`{ infinite: true }`, `useEngineModule`'s
  optional `infinite`), but no board asks for it.
- **The move list's scores** are recorded when a search ends (§4.1 of
  `chessboard.md`) — at its depth or time, or early, when the reader leaves
  the position: the deepest it reached.
- **Hash and Threads follow the device.** `ENGINE_SETTING_BOUNDS` holds the
  ceilings — Threads 32 (the multi-thread build's own top), **Hash 1024 MB**:
  1024 held and **2048 crashed the tab** (WebAssembly's memory, whatever the
  engine declares), and `uciOptionsOf` holds every request to them, a stored
  or imported game's too. The Engine menu offers less where the device is
  smaller (`deviceEngineLimits`: threads one fewer than the cores, at most 8;
  hash by `navigator.deviceMemory` — 1024 at 8 GB, 512 at 4, 128 below, 256
  where the browser does not say), and one thread to a single-thread build
  (`searchSettingLimitsOf`). **Every board alike** — one global set since
  CTA-181 (1 thread, 16 MB by default; `analysisUciOptionsOf` / `uciOptionsOf`
  holding them to the same ceilings), so a multi-thread engine chosen in
  Settings → Engine searches on as many threads on every board. Those ceilings
  and the device's limits are the **in-browser builds'**; an engine server's
  engine is offered what it declares (§8, CTA-175).

What was measured (CTA-160, headless Chromium on a 20-core desktop, a
middlegame position; times to *reach* each depth — a laptop or phone is
slower):

| | depth 18 | 20 | 22 | 24 | 26 |
| --- | --- | --- | --- | --- | --- |
| 19 single-thread, Hash 16 | 0.6 s | 3.4 s | 5.7 s | 14 s | 34 s |
| 19 single-thread, Hash 256 | 1.0 s | 3.6 s | 4.5 s | 14 s | 42 s |
| 19 multi-thread, 2 threads, Hash 64 | 1.5 s | 4.7 s | 9.2 s | 21 s | — |
| 19 multi-thread, 4 threads, Hash 64 | 1.1 s | 6.9 s | 22 s | — | — |

The multi-thread build ran more nodes a second (1.3 M at 4 threads against
0.45 M) but reached no depth sooner in these runs, and 8 threads did worse
than 4 — which is why the offer stops at 8. Headless and noisy: measure on a
real browser before tuning further.

### 5.2 The search settings — one set, the top bar's (CTA-181)

The settings a search runs under — **lines (MultiPV), depth, move time,
Threads and Hash** (infinite analysis too until CTA-185) — are **one set for
every board**, not a board's (`EngineSearchSettings`, the defaults the
legacy Analysis Board's own — depth 20, three lines, no time limit, one thread,
16 MB), kept in **two homes since CTA-185**:

- **the lines, Threads and Hash** — a preference in `localStorage`
  (`chessapp.engineSettings`, beside the engine choice; not in the export
  zip), `lib/engineSearchSettings.ts` (`readSearchPreferences` /
  `storeSearchPreferences`);
- **the depth and the move time** — **the selected preset of the engine the
  reader chose** (`EnginePreset.search`, §9; Settings → Engine), so switching
  the preset, or the engine, switches them, and they travel in the Export zip
  with the presets. A preset that never set them reads the defaults
  (`PRESET_SEARCH_DEFAULTS`, depth 20, no time limit); a depth or move time an
  older build stored in the preference is read as nothing.

`lib/engineSearchInEffect.ts` puts the two together — `readEngineSearchSettings`
/ `storeEngineSearchSettings` / `subscribeEngineSearchSettings` (the
preference, the presets, the selections and the engine choice) — read through
`useEngineSearchSettings` (`useSyncExternalStore`), so every mounted board and
the top bar follow a change, from the next search. **A change of the depth,
the move time, Threads or Hash is not written** (CTA-185): it edits the
preset's unsaved draft (`lib/enginePresetDraft.ts`, §9), read here over what
is saved and in effect at once, until Save or Save as new preset writes it —
the preset's two into the preset, Threads and Hash into the preference — or a
reload, or a switch of preset or engine, drops it. The lines are written at
once. A route that opens a record and compares its
settings ("Engine options changed", below) waits for the presets first
(`engineSearchSettingsRead` / `loadEngineSearchSettings` — `AnalysisBoardRoute`,
`PlayedGameRead`).

- **Set in the top bar's Engine menu** (`views/main/EngineMenu.tsx`, beside the
  language button — a robot and "Engine", drawn as the language switch is, the
  robot alone under the shell's breakpoint, CTA-185): the
  `EngineSearchSettingsForm` block, under **the engine and its preset, each a
  select** (CTA-185) — the engine from `describeEngines()` (the page's builds
  and, while it answers, the engine server's; one this page cannot run listed
  disabled with its reason), stored through `useEngineChoice().setEngineId` as
  Settings → Engine stores it; the preset one of that engine's, selected with
  `selectEnginePreset` as Settings → Engine's presets section does — and an
  "Advanced settings" link to Settings → Engine at the popup's foot (CTA-189).
  **The depth and move time sit under the
  preset**, theirs (`SearchLimitsFields`, the block Settings → Engine's preset
  form shows too); a change in the menu edits that preset's unsaved draft,
  and the `EnginePresetChanges` actions in the title row — Save, Save as new
  preset, no strip, no texts (CTA-189; a strip under the preset select until
  then, CTA-185) — save it.
  Threads and Hash are offered up to what the engine running takes
  (`searchSettingLimitsOf`: one thread for a single-thread build, the device's
  for a multi-thread one, an engine server's declaration) — a stored value
  past it shown held, never cut back — and, since CTA-185, each has a number
  box going past the slider's device top to what the engine declares
  (`searchSettingTypedLimitsOf`: a multi-thread build's 32 threads, an
  in-browser Hash's 1024 MB — 2048 crashed the tab — an engine server's
  engine its own tops), a value past the slider shown at its end — Hash
  snapped to the powers of two from 16 MB, each where its size falls,
  labelled in GB (`hashSlots.ts`) —
  (`EngineResourceSlider`, which Settings → Engine's preset form shows in
  its search limits too, under the move time — the same global request). **Depth and move time can be typed**
  (CTA-185): a number box at each slider's end (`SliderField`'s `input`, in
  `SearchLimitsFields`),
  depth a whole number held to 1–99 (the slider stops at 50 and shows a deeper
  one at its end), move time seconds held to 0–86,400 — 24 hours (the slider's last time
  mark is 600 s; a longer time is shown there; a job keeps 0–600) — a value
  off the slider's marks kept, the slider showing where it falls
  (`moveTimeSliderValueOf`), 0 the instant reply; on the slider's ∞ mark (no
  limit) the move-time box is off; depth's never is — every search stops at
  one or the other.
- **Every board reads it**: Analysis's Case board, the Library's game and the
  Openings explorer (`useAnalysisSession`), the repertoire player, Play with
  Engine and Masked Pieces (`usePlayGame`), and the Lobby's new-game form's
  handshake. No board has an Engine tab for them any more; Play's keeps the
  opponent's strength.
- **The board's engine is on or off from its header** — a play / pause
  (`BoardEngineControls`, with a menu for the eval bar and, on the Analysis
  Board, Write evaluations). Each board publishes its engine's state —
  off, on, searching (`useEngineModule`'s `searching`) — to the shell
  (`views/main/boardEngineState.ts`), and the top bar's button shows it: neutral
  while off (or with no board), the theme's primary while on. It breathes
  while an engine searches anywhere (CTA-242, `views/main/engineSearching.ts`)
  — this board, a board in another tab (`lib/searchingTabs.ts`, a
  `BroadcastChannel`) or a running engine job in any tab, the job named in
  its name — still under `prefers-reduced-motion` (the theme's durations).
- **Records keep what they ran with.** A saved analysis writes its
  `AnalysisSettings` (the search settings in effect, with its `writeEvals`),
  a played game its `EngineSettings` (with its strength and side). Opening
  one — a saved analysis, a played game resumed — whose settings differ from
  the ones in effect asks once, **"Engine options changed"**
  (`searchSettingsChanges`: only the six fields; one a record did not carry,
  read as its default by its normaliser, is never a difference —
  `lib/recordedFields.ts`): Dismiss, or Use these settings — the record's back
  in the global set, held to the engine running (`heldToEngine`), the dialog
  saying beforehand what would be held.
- **A job is not a board**: the job runner keeps a job's own options from its
  record. The New Job dialog's first options (`computerAnalysisSeed`) are the
  global settings.

## 6. The protocol discipline

**Generic** — it lives in `UciEngine`, not in any build's quirks (§4.1 of
`chessboard.md`):

- nothing is posted before `uciok`;
- nothing is posted into a running search: **one** `stop` goes, and the
  `bestmove` that ends the search resumes the queue — options first, then the
  newest waiting search (a search asked for while another waits replaces it);
- an option the engine did not declare, or declared with `min` equal to `max`
  (pinned), is never sent — and, once the roster is known, never queued, so it
  stops no search;
- an option is posted only when its value changes (a board re-requests every
  option when any setting moves, and `setoption name Hash` clears the hash
  table);
- `stop()` drops a waiting search as well as ending the running one — what a
  board does when its engine is switched off, so a position asked for just
  before is not searched after.

What was measured on 2026-10-07, in Chromium and Node, on each build's own `uci`
reply (detail in `public/stockfish/README.md`):

| | 19 single-thread | 19 multi-thread |
| --- | --- | --- |
| `setoption Threads value 1` | harmless (and pinned, so never sent) | harmless |
| `setoption` mid-search | search survives, `stop` still ends it | same |
| loads without cross-origin isolation | yes | **no** — `SharedArrayBuffer is not defined`, no `uciok` |

The shipped builds would survive without the deferral; it stays anyway. UCI
only permits `setoption` while idle, an earlier build lost searches to it (and
stopped answering for good after `setoption name Threads value 1`, its own
pinned default — the reason for the pinned-option rule), and a hosted or future
engine has not been measured. **Re-test every new binary** rather than trusting
this table.

## 7. Adding an engine

1. **Local WASM build**: put the worker script and its `.wasm` (same base name —
   the script loads `….wasm` from beside itself) in `public/stockfish/<id>/`,
   with the licence. Do not commit a build you have not run.
2. **Run it and read its own `uci` reply** (a worker in a browser, or `node
   <script>` and type `uci`): record `id name`, the option roster, and
   re-test `setoption` mid-search, `Threads`, and loading without COOP/COEP.
   Put the results, version, source, licence and SHA-256 in
   `public/stockfish/README.md`.
3. **A descriptor** in `src/lib/engines/builtin.ts` — `create` builds
   `new UciEngine(new WorkerTransport(url), { maxDepth })` (`localStockfish`
   does it for a build under `public/stockfish/`), the URL from
   `import.meta.env.BASE_URL`; `requires` what the page must be;
   `capabilities` what its `uci` showed. Add it to `BUILTIN_ENGINES`, and its
   files to `scripts/check-dist-pages.js`.
4. **Tests**: `registry.test.ts` already checks every built-in descriptor's
   worker script, `.wasm` and `LICENSE` exist on disk. If its roster differs
   from the 19 builds', teach `FakeEngine` (`boardTestHarness.tsx`) to declare
   it for that descriptor.
5. Nothing else for the Engine tab: it lists the registry, so the new engine
   appears (the picker's words are `enginePicker.*`; the engine's name is its
   own).

An engine that is not a Web Worker needs a transport, not a new engine class:
implement `UciTransport` and pass it to `UciEngine`.

## 8. The engine server — native engines on the reader's computer

Native Stockfish binaries on the reader's own machine, searched over HTTP
instead of in a Worker — Stockfish 18 and 19 with every thread, ~2× the
WASM build's speed and more. **The server** is a Python service in this
repository, run beside the dev server with `yarn api:start` (`127.0.0.1:8800`;
[`server/engine-api/README.md`](../server/engine-api/README.md) is its whole
reference: configuration, endpoints, the stream). **This side** is three
modules and no board change:

| Module | What it is |
| --- | --- |
| `lib/engineServer.ts` | The preference (`chessapp.engineServer`, the address — **absent unless the reader turns it on** in Settings → Engine) and the status, read and never stored: `off`, `connecting`, `online` with the engines `GET /v1/engines` lists, `offline` with a reason. |
| `lib/engines/hosted.ts` | The status's engines as registry entries, `hosted:<server id>` (`hosted:stockfish-19`) — after the shipped ones in `describeEngines()`, found by `getEngine` / `resolveEngine`. `descriptor.server` is the address. |
| `lib/hostedEngine.ts` | `HostedEngine`, the `EngineHandle` over the server's `/v1` API. |

- **Off unless turned on, and asked nothing until a board or the tab
  mounts.** A deployed site that probed `127.0.0.1` would probe every
  visitor's machine (and Chrome would ask each of them for local-network
  access); the pre-render reads the status as off. The first check is made by
  `useEngineModule` and the Engine tab (`useEngineServer`), from an effect;
  another on a new address, on Try again, and when a request fails —
  **keeping the engines listed while it re-checks**.
- **One session per handle** — one engine process on the server, opened at the
  first search, deleted at `terminate()` (a `keepalive` DELETE; the server's
  idle timeout is the backstop). The engine's memory therefore carries over
  from position to position, measured ~1.5–1.7× faster through a game
  ([`docs/eval-examples/`](eval-examples/README.md)).
- **A search is a request**, its answer NDJSON, each event with the engine's
  raw line — read by `parseEngineLine`, the worker's own parser, and stamped
  with the event's FEN. **The server keeps §6's discipline** (a new search
  stops the running one, which still ends with its `bestmove`; options applied
  only between searches and only when changed), and every request carries a
  rising `seq`, so one overtaken in flight by a newer one is ignored there.
- **A quiet search is heard as alive** (CTA-194). Stockfish prints nothing
  while it searches one root move — at depth 32+ with several lines and one
  thread, minutes — so when its engine has said nothing for `heartbeatS`
  (15 s by default) the server asks it `isready` mid-search (UCI allows it;
  Stockfish 18 and 19 answer at once), consumes the `readyok` and sends a
  `heartbeat` event, `{type, fen}` — proof the engine's UCI loop answers, not
  just that its process exists; a hung or dead engine sends none. `HostedEngine`
  hands it on as an `EngineMessage` with `heartbeat: true`, an empty
  `uciMessage` and the FEN, nothing else: `useEngineModule` drops it, and only
  the engine jobs' session reads it (`lib/jobs/engineSession.ts`) — its
  silence timer (120 s) starts again, the step's `ctx.heartbeat()` is called
  and its live payload's `heardAt` moves on, a job page's engine section and
  the header indicator beating with it ([`jobs.md`](../.claude/rules/jobs.md) §3).
  An older server and every in-browser engine send none, and are held to the
  silence timeout as before. (The wait for `readyok` after a large `Hash`,
  before the search starts, sends none: it is bounded at 30 s, inside the
  runner's 120.)
- **Options travel with every search**; whether one is taken is judged
  against what the binary declared, by `UciEngine`'s rule (`isSettableOption`).
  They are there at once (`whenOptionsReady` fires immediately) — the server's
  list carries them, `Threads` and `Hash` under its ceilings.
- **When it goes away**: a session the server no longer has is replaced once,
  silently; anything else re-checks the server, and an unreachable one takes
  its engines out of the registry — `resolveEngine` then falls back to the
  default and every board switches (`useEngineModule` renders on the status).
  A stored `hosted:…` choice, or a played game's engine, comes back with the
  server, as the multi-thread build does on an isolated host.
- **Its Threads and Hash are its own** (CTA-175): every engine form — the
  top bar's Engine menu (CTA-181; the boards' Engine tabs before), the New
  Job dialog — offers them up to what the engine **declares**, which is the
  server's `maxThreads` / `maxHashMb` (`engineLimitsOf(descriptor)`,
  `searchSettingLimitsOf`), never this browser's device nor the WebAssembly
  1024 MB. The server's list rides on the descriptor (`options`), so the
  range is right **before** the board's first handshake too. Nothing cuts a
  value set back to 1024: `uciOptionsOf`, `analysisUciOptionsOf`, a
  new-game link (`newGameRequestOf`) and a computer analysis' options
  (`computerAnalysisOptionsFrom`, so a job's record too) hold a `hosted:…`
  engine to `HOSTED_ENGINE_SETTING_BOUNDS` (Stockfish's own 1–1024 threads,
  1–33,554,432 MB — `engineSettingBoundsOf`), and the engine module and the
  job runner clamp to what it declared. Where such a choice falls back to an
  in-browser build (the server gone), the bounds are the build's: the screens
  pass the engine that runs, and the runner holds a job to the running
  engine's bounds before its declaration.

## 9. Option presets (CTA-179)

Every board sets three options from the reader's global search settings —
Threads, Hash, MultiPV (the top bar's Engine menu, §5.2, CTA-181) — and Play
with Engine and Masked Pieces the Elo (`UCI_Elo`; `Skill Level` too on an
engine strengthened by it alone). **Every other option an engine declares** —
Move Overhead, nodestime, UCI_ShowWDL, Ponder, UCI_Chess960,
**UCI_LimitStrength** (every board's, Play's included, since CTA-181), Skill
Level on an Elo engine, the native build's Syzygy options, NumaPolicy, … — is set through
**named presets**, in Settings → Engine's right-hand panel (the
`EnginePresetForm` block, `views/settings/EnginePresetsSection.tsx`). Every
option is explained for readers in the Blog's *Understanding Stockfish UCI
options* (`guides/understanding-stockfish-uci-options.mdx`).

- **One library, a selection per engine.** The presets are shared
  (`lib/enginePresets.ts`, the store `lib/enginePresetStore.ts`, IndexedDB
  `chessapp.enginePresets`: `presets` and `selections`); each engine — by
  registry id, `hosted:<id>` too — runs its own selected one, Default where it
  has none. Default always exists, cannot be deleted, and is stored only once
  edited; a deleted preset's engines go back to it. At most
  `MAX_ENGINE_PRESETS` (50). They are the reader's data, so the Export zip
  carries them (`engine-presets.json`, [`import-export.md`](../.claude/rules/import-export.md)).
- **A preset keeps only what the reader set**; the rest stays at the engine's
  own default. One preset therefore serves every engine: each takes what it
  declares.
- **And where its searches stop** (CTA-185): `search` — a depth and a move
  time, each absent until set (then depth 20, no time limit), each a whole
  number held to `ENGINE_SETTING_BOUNDS` (`presetSearchFrom`). Every board
  searches to the running engine's selected preset's (§5.2). Edited in the top
  bar's Engine menu and above the options in Settings → Engine's form (a
  "Search limits" section, `SearchLimitsFields`), into the preset's unsaved
  draft and stored on Save (`saveEnginePresetEdit`, below); a duplicate copies them; the export carries them in
  `engine-presets.json` (an optional field: no format bump).
- **Data-driven, never a roster.** The form lists what the chosen engine
  declares — a page's build from its own `uci` reply (the form builds it,
  switched off, through `useEngineModule`, as the Lobby's form does), an engine
  server's engine from the server's list — in its UCI type: a spin a number in
  its range, a check a switch, a combo a select, a string words. A button
  (Clear Hash) is an action, not a value: listed, never kept.
- **Three tabs, by name** (`OPTION_TABS`, `optionTabOf`): **Basic** (Threads,
  Hash, MultiPV, Skill Level, UCI_LimitStrength, UCI_Elo), **System**
  (`NumaPolicy`, `Clear Hash`, and a file path outside a group — `EvalFile`,
  `EvalFileSmall`, `Debug Log File`) and **Advanced** — everything else, so an
  option an engine declares that no list names still has a place.
- **Options that act only while another is on** (`OPTION_DEPENDENCIES`,
  Stockfish's own rules, keyed on its names): `UCI_Elo` limits the engine only
  with `UCI_LimitStrength` on — off, the form shows it disabled at its top,
  full strength; `SyzygyProbeDepth`, `Syzygy50MoveRule` and `SyzygyProbeLimit`
  do nothing without a `SyzygyPath`. Such a value is kept and **not sent**
  (`resolveEnginePreset` gives it the `inactive` limit), and the rule is off
  where the caller sets the controlling option itself. (Until CTA-181 Play's
  boards set the limit themselves; now **the preset's `UCI_LimitStrength`
  decides whether Play's Elo applies** — `presetLimitsStrength`: off, the
  engine plays at the preset's strength and Play's Elo slider is off, with a
  note and a link here; on, the slider sets `UCI_Elo` for the game.)
- **Option groups behind one switch** (`OPTION_GROUPS`, a preset's `groups`,
  absent is off): **Syzygy** — every `Syzygy…` option — off by default, its
  options shown only while on and none of them sent while off
  (`presetSentValues`, which `selectedPresetValues` hands the engine module and
  the job runner — the same object per preset, so their effects stay keyed);
  the values stay in the preset for when it is turned back on.
- **The limits, said where they apply** (`resolveEnginePreset`,
  `enginePresetRows`): a value held to the engine's range (a spin clamped);
  **Hash at most 1024 MB in the browser** (`BROWSER_HASH_CEILING_MB`); **no
  file path in a browser build** — the WebAssembly builds have no file system,
  and `setoption name EvalFile` kills the worker — so `EvalFile`,
  `EvalFileSmall` and `Debug Log File` (`isFilePathOption`; the builds declare
  no Syzygy options) are read-only there, and the builds' `UciEngine` refuses them whatever asks
  (`UciEngineConfig.refuses`, `lib/engines/builtin.ts`); a pinned option; an
  option the engine does not declare (absent — removable from the preset).
- **The boards' own options win.** Threads, Hash and MultiPV
  (`BOARD_OWNED_OPTIONS`) are never a preset's values and never sent from a
  preset: MultiPV is read-only in the form, its note pointing at the top
  bar's Engine menu (CTA-181), and Threads and Hash are sliders there that
  edit the one global request (CTA-185, `EngineResourceSlider`) — Skill Level
  a 0–20 slider beside them; every
  name in a board's `uciOptions` is left out of it too, so on the Play boards
  their Elo wins (`playOwnedOptionsOf`: `UCI_Elo`, and `Skill Level` only on
  an engine without one — editable with a note); `UCI_LimitStrength` carries
  the note that it turns Play's Elo on (`play-strength`).
- **Edited as a draft, saved by hand** (CTA-185, `lib/enginePresetDraft.ts`).
  Settings → Engine's form and the top bar's Engine menu write nothing as it
  changes: one in-memory draft of the chosen engine's selected preset holds
  the options, groups and search limits changed (and the global Threads and
  Hash), in effect at once (`presetInEffectOf`, `presetValuesInEffect`).
  **Save** writes it into the preset in one write (`saveEnginePresetEdit`) and
  Threads and Hash into the preference; **Save as new preset** creates one
  with it and selects it for the engine, leaving the preset edited as it was
  saved. A reload, or another preset or engine chosen, drops it, silently; an
  edit back to what is saved leaves no draft.
- **Where it is applied.** `useEngineModule` reads the running engine's
  selected preset — its unsaved draft over it — and, once the handshake lands (`whenOptionsReady`), sends
  what `resolveEnginePreset` gives beside the board's options — every board,
  with no line of its own. A value the preset stops setting goes back to the
  engine's declared default. A change applies from the next search: the search
  effect keys on it, and the handle's discipline (§6) holds it until the
  engine is idle. `UciEngine` holds what the `uciok` callbacks ask for until
  they are all in, so the first search already runs under the preset. The
  **job runner** sends the job's engine's **saved** preset (a job outlives a
  reload, the draft does not) after its handshake, its own Threads, Hash and
  lines winning.
- **Values are typed end to end** (`UciOptionValue`: a number, a boolean,
  words): `useEngineModule`'s `uciOptions`, `EngineHandle.setOption`,
  `UciEngine` (a check as `true` / `false`; words refused when a line break
  would split the command), `HostedEngine` (a check a boolean in the request's
  `options`, a spin its number, words as they are; a button refused, as the
  server refuses one).

## 10. Eval sources — evaluations asked before the engine (CTA-196)

An **eval source** is somewhere positions have already been searched — today
one, the **lichess evaluation API** (CTA-193: a server over lichess's
Stockfish-evaluated positions, `lichess-eval-db-api`, run by the reader). Every
analysis search the app runs **asks the enabled sources first**, whichever
engine runs (a shipped WASM build or an engine server's), and the engine
searches only what no source holds deep enough. The layer is generic and names
no source; each source is **a plugin**.

```
                         src/lib/evalSources/
useEngineModule ──▶ withEvalSources(handle) ──┐
                     (the decorator)           ├──▶ askEvalSources / recordInEvalSources ──▶ EVAL_SOURCES (registry.ts)
engineSession (jobs) ────────────────────────┘                                              └─ lichess/   (the plugin)
EngineTab ──▶ a tab per source (EvalSourceTab) ──▶ its SettingsSection (lazy)
```

### 10.1 The layer — `src/lib/evalSources/`

| File | What |
| --- | --- |
| `types.ts` | `EvalSource`: `id`, `labelKey` (its name in a warning), `titleKey` (its name as its tab's title), `storageKeys` (what it keeps — the legal pages must name each; `legalDocuments.test.ts` reads them from the registry), `isEnabled()` (**off, never contacted**), `lookup({ fen, depth, multiPv }, signal)` → `found` (a `PositionResult`: lines at `depth` or deeper, line 1 first, UCI moves as the engine writes them, scores White's view) / `missing` (absent, or shallower) / `unreachable` (no usable answer) — never throws; optional `writesEnabled()` and `record(result, meta, signal)` (write-back), `SettingsSection` (its own inner tab of Settings → Engine, beside Stockfish connectors — `?source=<id>` opens on it; a lazy component), `reset()` (tests). |
| `registry.ts` | `EVAL_SOURCES` — the order they are asked in. **One line per source.** |
| `evalSources.ts` | `askEvalSources(query, { signal, skip })` — the enabled sources in order until one is `found`, listing the `unreachable`; `recordInEvalSources(result, meta)` — to every source taking writes, the refusers returned; `reportEvalSourceUnreachable` / `subscribeEvalSourceUnreachable` — a job's warning (the shell's snackbar, naming the source, linking to Settings → Engine); `resetEvalSources()` (the test teardown). |
| `backOff.ts` | **The boards' back-off**: a source that did not answer a board's lookup (or refused its write) is left alone by every board for `EVAL_SOURCE_BACKOFF_MS` (60 s) — one 5 s timeout a minute, not one per move; a failed read stops writes too. A source's settings changing clears it (`clearEvalSourceBackOff`). |
| `withEvalSources.ts` | **The decorator** — an `EngineHandle` over another (below). |

### 10.2 The decorator — `withEvalSources(handle, { engine, maxDepth })`

`useEngineModule` builds every board's engine behind it (`ensureEngine`), so
`useEngineModule`, `scoreFromUci`, the variations box, the eval chips, the
CTA-195 depth progress, Play and `onSearchFinished` read it unchanged.

- **On `search(fen, options)`, for an eligible search**, it asks the sources
  (the target `min(depth, maxDepth)`, the `MultiPV` last set through it). A
  **hit** comes out of `onMessage` as the engine's own would: an `info depth …
  multipv … score … pv …` line per line — the score **the side to move's**, as
  UCI writes it (`scoreFromUci` flips it back) — then a `bestmove`, each
  stamped with the searched `fen` and **`evalSource`** (the source's id; absent
  on an engine's message). The engine is not asked. A **miss** — a shallower
  eval, too few lines (the lichess source's rule, §10.3) — or **no answer**:
  the engine searches, as it would have. While the
  sources are asked, the previous position's engine search is stopped.
- **No stale answer**: a new `search`, a `stop()` or `terminate()` aborts the
  lookup in flight (its `AbortSignal`) and ignores its answer — a position
  navigated away from never shows its lines on the next one or plays its
  move.
- **Write-back**: an eligible search **the engine** finished **at its target
  depth** (line 1's depth ≥ the target at its `bestmove`) is sent to every
  source taking writes, in the background (`recordInEvalSources`) — never a
  source's own answer, never a search stopped short. A source may keep a
  floor of its own: the lichess API takes nothing shallower than its
  **minimum depth to write** (35 by default, CTA-202; §10.3).
- `setOption`, `options`, `whenOptionsReady`, `terminate` are the engine's.

**Eligibility — the one rule, in the decorator and nowhere else.** A search is
asked about (and written back) when it is:

1. **bounded** — to a depth, never `infinite`;
2. **not an engine choosing its move in a game** — `SearchOptions.evalSources`
   is not `false`. `useEngineModule`'s `evalSources` start field (default
   `true`) sets it; **`usePlayGame` passes `false`**, so Play with Engine's and
   Masked Pieces' engine always searches. (An analysis board's Play toggle —
   the Case board, the Library, the Openings explorer — plays from its
   analysis search, a source's hit included: the engine at full strength
   would.)
3. **on an engine not limited in strength** — no `UCI_LimitStrength` on, no
   `Skill Level` below its top, as last set through the handle (a preset may
   set them on any board).

**The engine jobs' session** (`lib/jobs/engineSession.ts`, every engine-lane
job kind's — [`jobs.md`](../.claude/rules/jobs.md)) calls the layer itself — it asks before it builds an
engine at all (a job a source answers whole starts none) — and keeps CTA-193's
rule: a source that does not answer is said once
(`reportEvalSourceUnreachable`, `kind: "read"`) and skipped for the rest of
the run, writes to it too; a write refused is said once (`kind: "write"`) and
not tried again that run.

### 10.3 The lichess evaluation API — `src/lib/evalSources/lichess/`

| File | What |
| --- | --- |
| `api.ts` | The client (CTA-193): `lichessEvalFen` (the 4-field FEN, en passant only where a capture is legal), `lookupLichessEval` (`GET /fen?fen=…` — **every eval** of the position, no `best=true` since CTA-253, read by `lichessEvalsFrom`, a malformed eval dropped and not the answer; 404 / 422 `missing`), `checkLichessEvalApi` (`GET /health`, `write_enabled`), `positionResultOfLichessEval` (**the lookup rule**, below; the API's king-takes-rook castling turned into the engine's), `lichessEvalEntryOf` / `writeLichessEval` (`POST /evals`). 5 s per request. |
| `settings.ts` | `chessapp.lichessEvalApi` (`localStorage`): `{ enabled, url, write, minWriteDepth }`, **off by default**; `minWriteDepth` (CTA-202) the shallowest search written — 35 by default (the lichess database's own shallowest), a missing or unreadable value 35, a number held to 1–99, so settings stored before it need no migration; its status (`connectLichessEvalApi`, read never stored); **the migration** — a reader's `chessapp.jobsSettings.evalApi` moved here on the first read, the field taken out of the Jobs settings (which keep any field they do not read until then). A change clears the boards' back-off. |
| `source.ts` | `lichessEvalSource` — the `EvalSource`. Its `record` sends nothing whose line 1 is shallower than `minWriteDepth` (CTA-202) — the one write path, the boards' and the jobs' — and answers `true`: too shallow is not a refusal (no back-off, no warning). |
| `LichessEvalApiSection.tsx` | Its tab of Settings → Engine, *Lichess evaluation API* (lazy): `EngineServerForm` with its words (`localeKey` `evalSources.lichess`), Connect, the chip, *Enable evaluations Write API*, *Minimum depth to write* (a number, disabled while writing is not ticked, CTA-202) and *Test connection*. |

**The lookup rule — every eval at the target depth merged** (CTA-253,
`positionResultOfLichessEval`). Lichess's deepest eval of a position mostly
has the fewest lines (the start position: d75/3, d65/5, d50/10, d32/20), so
the source takes them all: the evals at depth ≥ the search's target, deepest
first, each giving its lines in its own order until `MultiPV` are shown — a
line whose first move a deeper eval already showed skipped, every line
keeping its own eval's depth and score (its `[%eval]` written with that
depth), its moves as the engine writes them, no line spliced from two evals;
a line with no playable move ends its eval's part. **A hit only when that
fills `min(MultiPV, legal moves)` lines**; fewer is `missing`, and the engine
searches it — write-back then sends its whole search. So with the source on
every consumer's lines (boards, jobs, Find Best Move's grading) come
deeper-first, not strictly by score. The API's answer is read as one position
(`positions[0].evals`), whether its local row shadows lichess's or sits
beside it.

Locale keys: `evalSources.lichess.*` (the plugin's), `evalSources.*` (the
layer's warnings), `settings.engine.evalSources.intro` (the tab's line).
`yarn lint`'s MUI lock covers `src/lib/evalSources/**/*.tsx` as it does a
screen.

### 10.4 Adding or removing a source

- **Adding**: a folder beside `lichess/` with its `EvalSource` (and, if it has
  settings, its `SettingsSection` — lazy, its own tab, titled by `titleKey` — and its keys under
  `evalSources.<id>`), and **one line in `registry.ts`**. Its stored keys go in
  `storageKeys` and in both legal pages, in both languages. Nothing in the
  engine layer, `useEngineModule`, the boards, the runner or Settings → Engine
  changes.
- **Removing** the lichess evaluation API: delete `src/lib/evalSources/lichess/`,
  its line in `registry.ts`, and its locale keys (`evalSources.lichess` in
  `en.ts` and `he.ts`) — the app builds and the boards search with the engine
  alone. (Its tests are in the folder; the legal pages' line about it is then
  out of date and worth removing too — the test no longer requires it.)

### 10.5 Testing

`src/lib/evalSources/withEvalSources.test.ts` (a hit at depth, a shallower one
and a miss, no answer and the back-off, a superseding search, `stop()`
mid-lookup, the eligibility rule, write-back — never of a hit, a game's or a
short search), `evalSources.test.ts` (the order, the skip, the writes),
`lichess/api.test.ts` (the client), `lichess/settings.test.ts` (the settings,
the status, the migration, the minimum depth to write), `lichess/source.test.ts`
(the write held to the minimum depth), `lichess/LichessEvalApiSection.test.tsx` (Settings
→ Engine), the board end to end in `views/board/core/useEngineModule.test.tsx`,
the engine session's in `lib/jobs/engineSession.test.ts`.

## 11. Testing

- `src/lib/uciEngine.test.ts` — `UciEngine` over a fake transport (no Worker):
  the option parser, discovery, the discipline, searching, stamping, teardown,
  the depth limit. `src/lib/workerTransport.test.ts` — the Worker.
- `src/lib/engines/registry.test.ts` — the shipped list, availability,
  fallback (the 2019 id included), and the built-in files on disk.
  `src/lib/engines/noWorkerAtImport.test.ts` — no Worker, and no request to
  the engine server, at import.
- The engine server's side (§8): `src/lib/hostedEngine.test.ts` —
  `HostedEngine` over a fake `fetch` (the session, the stream, `seq`, a
  dropped session replaced, failures, teardown); `src/lib/engineServer.test.ts`
  — the address, the status, the engines in the registry and a choice of one
  coming and going; **`src/lib/hostedEngine.live.test.ts`** — against a real
  server, skipped unless `ENGINE_API_URL` names one
  (`ENGINE_API_URL=http://127.0.0.1:8800 npx vitest run src/lib/hostedEngine.live.test.ts`
  with `yarn api:start` running). The server's own: `yarn api:test`.
- `src/views/board/core/useEngineModule.test.tsx` — which engine, switching
  (terminate / build / handshake / clamp), switching off, StrictMode, and the
  engine's preset (CTA-179: sent beside the board's options, which win; no
  file path to a browser build; a change from the next search, a dropped
  option back to its default).
- The search settings (§5.2, CTA-181): `src/lib/engineSearchSettings.test.ts`
  (the preference, the normaliser, the engine's limits, a record's settings
  against the ones in effect, a field it did not carry skipped),
  `src/views/main/EngineMenu.test.tsx` (the top bar's menu, its button, the
  engine and preset chosen in it, depth and move time typed — CTA-185), the
  blocks' own tests (`EngineSearchSettingsForm`, `BoardEngineControls`,
  `EngineOptionsChangedDialog`), and every board's in
  `src/views/board/boards.test.tsx` (the settings reach it, its state reaches
  the top bar); the dialog on Play with Engine's own
  tests.
- The presets (§9): `src/lib/enginePresets.test.ts` (the records, the
  selection, `resolveEnginePreset`, the form's rows, the dependencies, the
  groups, the tabs, Play's strength — `playOwnedOptionsOf`,
  `presetLimitsStrength`), `enginePresetStore.test.ts`
  (create, rename, duplicate, delete, select, the cap, the import's write),
  `blocks/forms/EnginePresetForm/EnginePresetForm.test.tsx`, and Settings →
  Engine's `EngineTab.test.tsx`; the engine jobs' in `lib/jobs/engineSession.test.ts`.
- **The seam every board's test stubs is the registry's** — `lib/engines/builtin`,
  replaced with the shared harness's `builtinEnginesMock` (`boardTestHarness.tsx`,
  `chessboard.md` §8):

  ```ts
  vi.mock("../../lib/engines/builtin", async (importOriginal) =>
    (await import("../board/boardTestHarness")).builtinEnginesMock(importOriginal),
  );
  ```

  Each shipped descriptor keeps its identity and capabilities, and its
  `create()` returns a `FakeEngine` (an `EngineHandle`) that declares what that
  build declares and remembers which descriptor it was built for
  (`engine.descriptor?.id`). The default engine, a reader's choice and a switch
  between them are therefore faked the same way: a test that wants the
  multi-thread build stubs `crossOriginIsolated` and stores the choice.
- jsdom has no `Worker` and no cross-origin isolation; for the real thing, drive
  the worker in a browser (see `public/stockfish/README.md`).

## 12. The review of CTA-160 — what was decided

| Finding | Decision |
| --- | --- |
| The test seam was the 2019 build's default export (`lib/engine.ts`, mocked in 28 files) | **Moved** to the registry's descriptors (§11); `lib/engine.ts` and `engine.test.ts` deleted (its cases are `uciEngine.test.ts`'s, over a transport). |
| `UciEngine`'s dead surface — public `isReady`, `onReady()`, `init()`, `supportsOption()` | **Cut.** The handshake is `uci` alone (`isready` / `readyok` were read by nothing). |
| Runtime registration (`registerEngine`, `subscribeEngines`, `listEngines`) and `EngineKind` | **Cut** — only tests used them. The engine server (§8) lists its engines through `lib/engines/hosted.ts` instead. |
| `useEngineModule`'s local `getEngine` shadowing the registry's export | **Renamed** `ensureEngine`. |
| Search depth: `go depth 12` defaulted in `UciEngine`, 24 the clamp, 14 / 16 the boards' settings; move time at most 10 s | **Single-sourced and raised** (§5.1): depth is a required argument (or the search is `infinite`); `DEFAULT_MAX_DEPTH` (99) is the clamp, `ENGINE_SETTING_BOUNDS` (depth 1–40, move time 0–300 s, CTA-163) what the engine form offers — the analysis boards keep their own 0–60 s; the analysis boards gained **infinite analysis** and stop at depth 20 rather than after a second. |
| The protocol bookkeeping | **Fixed**: `stop()` dropped no waiting search, so switching the engine off right after a move searched that move anyway; a `stop` went out on every request during a search; an option the engine cannot take was still queued (and stopped the search); an unchanged option was re-posted (`Hash` clearing the table). §6. |
| The Engine tab's Threads and Hash sliders took the engine's own maximum (32 threads, 33,554,432 MB) | **Capped by the device** (`deviceEngineLimits`) under hard ceilings — 32 threads, 1024 MB, where 2048 crashed the tab (§5.1); an engine server's engine by what it declares (§8, CTA-175). |
| Skill Level vs Elo | **Kept generic** — read off what the engine declares. The Elo slider now stands in before the handshake (every shipped engine's). Defaults kept: Elo 2100, Skill Level 10 (`approximateElo(10)` = 2100, so a Skill-Level-only engine starts alike). |
| The default engine's special label ("Stockfish (level N)") | **Gone**: every engine is named by its build ("Stockfish 19 Lite (Elo 2100)"); `playedGames.engine` left the catalogs. |
