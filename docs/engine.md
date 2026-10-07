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
| `UciEngine` | `src/lib/uciEngine.ts` | The UCI protocol over a transport: option discovery, the `setoption` / `stop` deferral, the pinned-option rule, FEN stamping, the depth clamp (`maxDepth`, default `DEFAULT_MAX_DEPTH` = 24). Also `parseEngineOption`, pure. |
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

**Depth is single-sourced** (CTA-160). `search()` takes the depth as a
required argument — always the board's own setting (Play with Engine's 14, the
Analysis Board's 16), never a default of the wrapper's — and `UciEngine` clamps
it to the descriptor's `capabilities.maxDepth`, which every shipped build sets
to `DEFAULT_MAX_DEPTH` (24). The settings forms offer depth up to the same
constant (`ENGINE_SETTING_BOUNDS.depth`).

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

## 8. The future: a hosted engine (not built)

A backend evaluation API (hosted Stockfish 18/19 over the network) is planned
for a later phase, and this layer is shaped so it plugs in **without touching a
board**:

- `WebSocketTransport` implements `UciTransport` — `send` writes a frame,
  `onLine` delivers one, `close` closes the socket — and `UciEngine` runs over it
  unchanged. The deferral rules are the same; a hosted engine's own protocol
  quirks are the transport's to hide.
- **Its engines join the list at runtime.** The registry is a fixed list today
  (CTA-160 cut the runtime registration CTA-152 had built ahead of this, which
  only tests used): the hosted engine brings back a `registerEngine(descriptor)`
  over the shipped list, a subscription the Engine tab and `engineChoice.ts`
  listen to (so a stored id that becomes resolvable is picked up), and — if a
  screen needs to tell them apart — a `kind: "local" | "remote"` on the
  descriptor. A descriptor's `create()` opens the socket, so a remote engine
  costs nothing until chosen, like a worker.
- Availability gains a reason (offline, not signed in) next to
  `"cross-origin-isolation"`; `resolveEngine` already falls back to the default
  for anything unavailable.
- A remote search has a latency a worker does not: the FEN stamp on every
  message already makes a late result harmless, and `search()`'s "a newer
  position replaces a waiting one" is what keeps the wire from queueing.

**Not in this layer:** any remote transport, per-board engine choice, cloud eval.

## 9. Testing

- `src/lib/uciEngine.test.ts` — `UciEngine` over a fake transport (no Worker):
  the option parser, discovery, the discipline, searching, stamping, teardown,
  the depth limit. `src/lib/workerTransport.test.ts` — the Worker.
- `src/lib/engines/registry.test.ts` — the shipped list, availability,
  fallback (the 2019 id included), and the built-in files on disk.
  `src/lib/engines/noWorkerAtImport.test.ts` — no Worker at import.
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
| Runtime registration (`registerEngine`, `subscribeEngines`, `listEngines`) and `EngineKind` | **Cut** — only tests used them; §8 says what the hosted engine brings back. |
| `useEngineModule`'s local `getEngine` shadowing the registry's export | **Renamed** `ensureEngine`. |
| Search depth: `go depth 12` defaulted in `UciEngine`, 24 the clamp, 14 / 16 the boards' settings | **Single-sourced** (§5): depth is a required argument; `DEFAULT_MAX_DEPTH` is the clamp and the settings' top. |
| The protocol bookkeeping | **Fixed**: `stop()` dropped no waiting search, so switching the engine off right after a move searched that move anyway; a `stop` went out on every request during a search; an option the engine cannot take was still queued (and stopped the search); an unchanged option was re-posted (`Hash` clearing the table). §6. |
| The Engine tab's Threads and Hash sliders took the engine's own maximum (32 threads, 33,554,432 MB) | **Capped** at `ENGINE_SETTING_BOUNDS` (4, 256 MB), as the lines already were. |
| Skill Level vs Elo | **Kept generic** — read off what the engine declares. The Elo slider now stands in before the handshake (every shipped engine's). Defaults kept: Elo 2100, Skill Level 10 (`approximateElo(10)` = 2100, so a Skill-Level-only engine starts alike). |
| The default engine's special label ("Stockfish (level N)") | **Gone**: every engine is named by its build ("Stockfish 19 Lite (Elo 2100)"); `playedGames.engine` left the catalogs. |
