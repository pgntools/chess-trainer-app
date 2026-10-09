# The engine

How the app talks to a chess engine, which engines ship, and how to add one.
Written for CTA-151 (pluggable engines) / CTA-152 (this layer: the abstraction,
the registry and the newer builds), reviewed and trimmed in CTA-160 (the 2019
build removed, the test seam moved onto the registry — §10). The boards' side
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
| the registry | `src/lib/engines/` | `ids.ts` (the default's id, name and version — what a record and a preference name it by), `builtin.ts` (the shipped descriptors — and the tests' seam, §9), `registry.ts` (get, availability, describe, resolve), `index.ts`. |

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
Analysis Board (the multi-thread one starts its helper workers), and nothing is
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
> what the engine took. A screen that writes the clamped value back (as Play with
> Engine does) loses the wider request when it moves to a narrower engine and
> back; a screen that wants to keep it keeps the request and clamps at use. That
> is the settings tab's decision (CTA-153); this layer only reports.

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
  `ENGINE_SETTING_BOUNDS`: depth **1–40**, move time **0–300 s** — Play with
  Engine's (the snap-to-mark slider's last time mark, CTA-163); the analysis
  boards keep their own **0–60 s** (`ANALYSIS_SETTING_BOUNDS`). Play with
  Engine's move time is lichess's marked slider: marks 0, 5, 10, 20, 30, 60,
  120, 300 seconds and an **∞ mark** for "no limit" (`moveTimeMs` 0); the
  0-seconds mark is the instant reply, stored as 1 ms — 0 was already
  "no limit". A stored value off the marks is shown where it falls between
  them and snaps onto a mark on the next drag.
- **Infinite analysis** — the analysis boards' Engine tab (the Analysis Board,
  the Library's game, the Openings explorer, the repertoire player), lichess's
  switch, **off by default** (`AnalysisSettings.infinite`, saved with an
  analysis; an older record reads it off). On, the engine deepens the position
  on screen until it changes or the engine is switched off. Off, a search stops
  at the depth and move time — **now depth 20 and no time limit** by default,
  where it was depth 16 cut off after one second. **Play needs a search that
  ends with a move**, so while Play is on the board searches to the depth and
  time whatever the switch says (`useAnalysisSession`: `infinite && !playing`).
- **The move list's scores** are recorded when a search ends (§4.1 of
  `chessboard.md`): an infinite search ends when the reader leaves the
  position, so its score is kept then — the deepest it reached.
- **Hash and Threads follow the device.** `ENGINE_SETTING_BOUNDS` holds the
  ceilings — Threads 32 (the multi-thread build's own top), **Hash 1024 MB**:
  1024 held and **2048 crashed the tab** (WebAssembly's memory, whatever the
  engine declares), and `uciOptionsOf` holds every request to them, a stored
  or imported game's too. The Engine tab offers less where the device is
  smaller (`deviceEngineLimits`: threads one fewer than the cores, at most 8;
  hash by `navigator.deviceMemory` — 1024 at 8 GB, 512 at 4, 128 below, 256
  where the browser does not say). **Every board alike**: the analysis boards
  have Play with Engine's Threads and Hash too (`AnalysisSettings.threads` /
  `hashMb`, the same defaults — 1 thread, 16 MB — the same sliders and ids,
  `analysisUciOptionsOf` holding them to the same ceilings, saved with an
  analysis), so a multi-thread engine chosen in Settings → Engine searches on
  as many threads on the Analysis Board as in a game.

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
- **Not yet**: the board's Engine tab still caps Threads and Hash by this
  browser's device (`deviceEngineLimits`, at most 8 threads and 1024 MB) — for
  an engine on the server the server's own ceilings would be the right ones.

## 9. Testing

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
  (terminate / build / handshake / clamp), switching off, StrictMode.
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

## 10. The review of CTA-160 — what was decided

| Finding | Decision |
| --- | --- |
| The test seam was the 2019 build's default export (`lib/engine.ts`, mocked in 28 files) | **Moved** to the registry's descriptors (§9); `lib/engine.ts` and `engine.test.ts` deleted (its cases are `uciEngine.test.ts`'s, over a transport). |
| `UciEngine`'s dead surface — public `isReady`, `onReady()`, `init()`, `supportsOption()` | **Cut.** The handshake is `uci` alone (`isready` / `readyok` were read by nothing). |
| Runtime registration (`registerEngine`, `subscribeEngines`, `listEngines`) and `EngineKind` | **Cut** — only tests used them. The engine server (§8) lists its engines through `lib/engines/hosted.ts` instead. |
| `useEngineModule`'s local `getEngine` shadowing the registry's export | **Renamed** `ensureEngine`. |
| Search depth: `go depth 12` defaulted in `UciEngine`, 24 the clamp, 14 / 16 the boards' settings; move time at most 10 s | **Single-sourced and raised** (§5.1): depth is a required argument (or the search is `infinite`); `DEFAULT_MAX_DEPTH` (99) is the clamp, `ENGINE_SETTING_BOUNDS` (depth 1–40, move time 0–300 s, CTA-163) what the engine form offers — the analysis boards keep their own 0–60 s; the analysis boards gained **infinite analysis** and stop at depth 20 rather than after a second. |
| The protocol bookkeeping | **Fixed**: `stop()` dropped no waiting search, so switching the engine off right after a move searched that move anyway; a `stop` went out on every request during a search; an option the engine cannot take was still queued (and stopped the search); an unchanged option was re-posted (`Hash` clearing the table). §6. |
| The Engine tab's Threads and Hash sliders took the engine's own maximum (32 threads, 33,554,432 MB) | **Capped by the device** (`deviceEngineLimits`) under hard ceilings — 32 threads, 1024 MB, where 2048 crashed the tab (§5.1). |
| Skill Level vs Elo | **Kept generic** — read off what the engine declares. The Elo slider now stands in before the handshake (every shipped engine's). Defaults kept: Elo 2100, Skill Level 10 (`approximateElo(10)` = 2100, so a Skill-Level-only engine starts alike). |
| The default engine's special label ("Stockfish (level N)") | **Gone**: every engine is named by its build ("Stockfish 19 Lite (Elo 2100)"); `playedGames.engine` left the catalogs. |
