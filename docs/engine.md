# The engine

How the app talks to a chess engine, which engines ship, and how to add one.
Written for CTA-151 (pluggable engines) / CTA-152 (this layer: the abstraction,
the registry and the newer builds). The boards' side of it — the lifecycle
rules `useEngineModule` keeps — is §4 and §9.2.1 of
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
| `UciEngine` | `src/lib/uciEngine.ts` | The UCI protocol over a transport: option discovery, the `setoption` / `stop` deferral, the pinned-option rule, FEN stamping, the depth clamp (`maxDepth`, default 24). Was one class with a `Worker` inside. |
| `WorkerTransport` | `src/lib/workerTransport.ts` | `new Worker(url)` as a transport. **Nothing outside it may assume a Worker.** |
| `Engine` (default export) | `src/lib/engine.ts` | `UciEngine` over a `WorkerTransport` to the 2019 build. Kept so `import Engine from "…/lib/engine"` and every test's `vi.mock("…/lib/engine")` mean what they did. Re-exports the types and `parseEngineOption`. |
| `EngineDescriptor` | `src/lib/engineTypes.ts` | `{ id, name, version, kind, requires?, capabilities: { maxDepth, strength, multiThread }, create() }`. |
| the registry | `src/lib/engines/` | `builtin.ts` (the shipped descriptors), `registry.ts` (list, get, register, availability, resolve), `index.ts`. |

**Nothing runs at module scope.** A descriptor is data until `create()`; a
transport makes its Worker in its constructor. The pre-render
(`src/entry-server.tsx`, Node) imports all of this, and
`src/lib/engines/noWorkerAtImport.test.ts` holds it to that.

## 2. The engines that ship

Files, versions, licences, sizes, checksums and what was measured on each are in
[`public/stockfish/README.md`](../public/stockfish/README.md). In short:

| Registry id | Engine | Threads | Strength knobs it declares | Needs |
| --- | --- | --- | --- | --- |
| `stockfish-2019-wasm` — **the default** | Stockfish 2019-08-15 Multi-Variant, classical evaluation | pinned 1 | `Skill Level` | — |
| `stockfish-19-lite-single` | Stockfish 19, lite NNUE net, single-thread | pinned 1 | `Skill Level`, `UCI_LimitStrength`, `UCI_Elo` 1320–3190 | — |
| `stockfish-19-lite-multi` | the same, multi-thread (`SharedArrayBuffer`) | 1–32 | as the single-thread build | a **cross-origin-isolated** page (COOP + COEP) |

All GPLv3. The 19 builds are fetched **only when chosen** — they live in their
own folders under `public/stockfish/`, and nothing references them until
`create()`.

The 2019 build stays where it always was (`public/stockfish/stockfish.wasm.js`),
so its URL — and any cached copy — does not change.

## 3. The registry

```ts
import {
  describeEngines, resolveEngine, registerEngine, listEngines, subscribeEngines,
} from "src/lib/engines";
```

- **Availability is read at runtime**, from `crossOriginIsolated` — never a build
  flag. The same bundle runs on GitHub Pages (which cannot set the headers: the
  multi-thread build is *listed*, **unavailable**, reason
  `"cross-origin-isolation"`) and on the chessapp.dev host (which sets them, CTA-154:
  it is selectable). `describeEngines()` is the list a picker draws, each row
  with its availability, so a disabled engine can say why.
- **An id that cannot run falls back to the default**, `resolveEngine(id)`: an
  unknown id (a stored preference for an engine that is gone), an engine this
  page cannot run, `undefined`, `""`. A board therefore always has an engine.
- **The list grows at runtime.** `registerEngine(descriptor)` adds — or replaces,
  by id — and returns an unregister function; `subscribeEngines(cb)` +
  `listEngines()` (the same array until the list changes) are a valid
  `useSyncExternalStore` pair. This is how a hosted engine's list will join the
  shipped ones. The default engine cannot be unregistered: it is every fallback.
- **An id is stored** (a preference, a played game) **and is never renamed.** A
  new build of the same engine is a new id; `version` is what a reader sees.

## 4. How a board picks one

`useEngineModule({ engine?: string, … })` — `engine` is a descriptor id; absent
is today's behaviour (the default engine). It returns `descriptor`, the engine
actually running (after any fallback), alongside the lines, evals and
`engineOptions`.

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

The depth clamp of 24 is each engine's `capabilities.maxDepth`, handed to its
`UciEngine` by the descriptor's `create()`.

## 5. The protocol discipline

Unchanged, and **generic** — it lives in `UciEngine`, not in any build's
quirks (§4.1 of `chessboard.md`): nothing is posted before `uciok`; nothing is
posted into a running search (a `stop` goes, and the `bestmove` resumes the
queue); an option whose `min` equals its `max` is never sent.

What was measured on 2026-10-07, in Chromium and Node, on each build's own `uci`
reply (detail in `public/stockfish/README.md`):

| | 2019 | 19 single-thread | 19 multi-thread |
| --- | --- | --- | --- |
| `setoption Threads value 1` | **fatal** — the search never answers again | harmless (and pinned, so never sent) | harmless |
| `setoption` mid-search | `Skill Level` / `MultiPV`: the search survived this run; `Threads`: fatal | search survives, `stop` still ends it | same |
| loads without cross-origin isolation | yes | yes | **no** — `SharedArrayBuffer is not defined`, no `uciok` |

The 19 builds do not share the 2019 build's quirks, and the rule stays anyway:
it costs nothing, and a hosted or future engine has not been measured. **Re-test
every new binary** rather than trusting this table.

## 6. Adding an engine

1. **Local WASM build**: put the worker script and its `.wasm` (same base name —
   the script loads `….wasm` from beside itself) in `public/stockfish/<id>/`,
   with the licence. Do not commit a build you have not run.
2. **Run it and read its own `uci` reply** (a worker in a browser, or `node
   <script>` and type `uci`): record `id name`, the option roster, and
   re-test `setoption` mid-search, `Threads`, and loading without COOP/COEP.
   Put the results, version, source, licence and SHA-256 in
   `public/stockfish/README.md`.
3. **A descriptor** in `src/lib/engines/builtin.ts` — `create` builds
   `new UciEngine(new WorkerTransport(url), { maxDepth })`, the URL from
   `import.meta.env.BASE_URL`; `requires` what the page must be;
   `capabilities` what its `uci` showed. Add it to `BUILTIN_ENGINES`.
4. **Tests**: `registry.test.ts` already checks every built-in descriptor's
   worker script, `.wasm` and (for the 19 builds) `LICENSE` exist on disk.
5. Locale keys for its name/threading, if the Engine tab shows it (CTA-153).

An engine that is not a Web Worker needs a transport, not a new engine class:
implement `UciTransport` and pass it to `UciEngine`.

## 7. The future: a hosted engine (not built)

A backend evaluation API (hosted Stockfish 18/19 over the network) is planned
for a later phase, and this layer is shaped so it plugs in **without touching a
board**:

- `WebSocketTransport` implements `UciTransport` — `send` writes a frame,
  `onLine` delivers one, `close` closes the socket — and `UciEngine` runs over it
  unchanged. The deferral rules are the same; a hosted engine's own protocol
  quirks are the transport's to hide.
- Its engines are listed by `GET /engines` and joined with `registerEngine(…)`
  (and `subscribeEngines` tells the picker). `EngineDescriptor.kind` gains
  `"remote"`; a descriptor's `create()` opens the socket, so a remote engine
  costs nothing until chosen, like a worker.
- Availability gains a reason (offline, not signed in) next to
  `"cross-origin-isolation"`; `resolveEngine` already falls back to the default
  for anything unavailable.
- A remote search has a latency a worker does not: the FEN stamp on every
  message already makes a late result harmless, and `search()`'s "a newer
  position replaces a waiting one" is what keeps the wire from queueing.

**Not in this layer:** the Settings → Engine tab and the stored preference
(CTA-153), the COOP / COEP headers on the swa host (CTA-154), any remote
transport, per-board engine choice, cloud eval.

## 8. Testing

- `src/lib/uciEngine.test.ts` — `UciEngine` over a fake transport (no Worker).
  `src/lib/engine.test.ts` — the same class through the default `Engine`, over a
  fake worker (**unchanged** by CTA-152). `src/lib/workerTransport.test.ts`.
- `src/lib/engines/registry.test.ts` — availability, fallback, runtime
  registration, and the built-in files on disk.
  `src/lib/engines/noWorkerAtImport.test.ts` — no Worker at import.
- `src/views/board/core/useEngineModule.test.tsx` — which engine, switching
  (terminate / build / handshake / clamp), StrictMode.
- A board's own test still stubs `lib/engine`'s default export with the shared
  `FakeEngine` (`boardTestHarness.tsx`, `chessboard.md` §8): it stands in for the
  default engine exactly as before.
- jsdom has no `Worker` and no cross-origin isolation; for the real thing, drive
  the worker in a browser (see `public/stockfish/README.md`).
