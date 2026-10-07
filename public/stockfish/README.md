# The engines in `public/stockfish/`

Stockfish, compiled to WebAssembly, run as a Web Worker. Each build is **one
registry entry** (`src/lib/engines/builtin.ts`) and is **fetched only when it is
chosen** — a board that never picks it never downloads it. How the app uses
them, how to add one and the protocol rules are in
[`docs/engine.md`](../../docs/engine.md).

All three are **GNU GPL v3** (Stockfish is GPLv3; each build's licence text sits
beside it as `LICENSE`, the 2019 build's notice is in the header of
`stockfish.wasm.js`). Distributing the binaries means offering their source:
[official-stockfish/Stockfish](https://github.com/official-stockfish/Stockfish)
and [nmrugg/stockfish.js](https://github.com/nmrugg/stockfish.js) (the WASM
port, "Stockfish.js", © Chess.com, LLC) for the 19 builds, and
[ddugovic/Stockfish](https://github.com/ddugovic/Stockfish) for the 2019 one.

| Registry id | Files | What `uci` answers (`id name`) | Threads | Strength | Size |
| --- | --- | --- | --- | --- | --- |
| `stockfish-2019-wasm` (default) | `stockfish.wasm.js`, `stockfish.wasm` | `Stockfish 2019-08-15 64 POPCNT Multi-Variant` — classical evaluation | pinned to 1 | `Skill Level` only | 0.6 MB |
| `stockfish-19-lite-single` | `stockfish-19-lite-single/stockfish-19-lite-single.{js,wasm}` | `Stockfish 19 Lite WASM` — NNUE, the small net `nn-61e7af4bb97d` embedded | pinned to 1 | `Skill Level`, `UCI_LimitStrength` + `UCI_Elo` 1320–3190 | 1.8 MB |
| `stockfish-19-lite-multi` | `stockfish-19-lite-multi/stockfish-19-lite.{js,wasm}` | `Stockfish 19 Lite WASM Multithreaded` — the same net | adjustable, 1–32 | as the single-thread build | 1.7 MB |

The 19 builds are the **`lite`** flavours of the npm package
[`stockfish@19.0.0`](https://www.npmjs.com/package/stockfish) (GPL-3.0, tarball
`sha512-jDyYLbqNpboQcMs5HodTHI2CrKL74zkQWb1+sgoNXw5HI6avTblW4G0X7afFt3BBOc6VbTSkOV64EUxm/DWSpg==`),
copied unmodified from its `bin/`. The full-strength flavours are ~94 MB each and
were not taken: the lite net is "far stronger than any human will ever be", and a
download of that size is not modest.

## What was checked, and how

Each build was run as a worker in headless Chromium (served from this folder,
with and without COOP / COEP headers) and as a Node process, and its own `uci`
reply read — not its wasm string table. Checked on **2026-10-07** (CTA-152):

- **`uci` roster** — as the table above; `Hash` is adjustable on the 19 builds
  (1 to 33 554 432 MB declared — far more than a tab can hold; a settings UI
  clamps what it asks for), pinned to 16 on the 2019 one.
- **`setoption` during a search.** The 19 builds **keep searching**: a `stop`
  afterwards still ends in a `bestmove`. (The 2019 build did not lose the search
  to a mid-search `Skill Level` or `MultiPV` in this run either; its fatal case
  below is `Threads`.) The app's rule — buffer, post only when idle, `stop` first —
  stays generic and is applied to every engine: a hosted or future engine has not
  been measured.
- **`setoption name Threads value 1`.** Fatal on the **2019** build, idle or
  mid-search: it then never answers another search — no `bestmove`, no `info`.
  Harmless on the **19 single-thread** build, which also declares `Threads`
  pinned (`min 1 max 1`) and takes the value. The app never posts a pinned option
  regardless.
- **Multi-thread.** `setoption name Threads value 2` then a depth-12 search
  works — **only on a cross-origin-isolated page** (`Cross-Origin-Opener-Policy:
  same-origin`, `Cross-Origin-Embedder-Policy: require-corp`). On a page that is
  not, the worker dies at load with `Uncaught ReferenceError: SharedArrayBuffer
  is not defined` — no `uciok`. That is why the registry reads
  `crossOriginIsolated` at runtime and lists the build disabled where it is
  false (GitHub Pages cannot set the headers; chessapp.dev sets them on every
  response, `docs/engine.md` §3.1).

The worker script finds its `.wasm` by its own URL (`….js` → `….wasm`), so a
`.js` and its `.wasm` always stay together, and the multi-thread build starts
its helper threads from that same script URL.

## Checksums (SHA-256)

```
2f98d35d20bf435c16925f8955fe4b0c2062e66962799a407667218ff9ea709d  stockfish-19-lite-multi/stockfish-19-lite.js
18727c9ade11a8ca04391ab5a298232bc6fffebe2002e7cfffac82e7ad453447  stockfish-19-lite-multi/stockfish-19-lite.wasm
d3344124ab067fb0b90ee77873bb8e9fbf5fc01bc525fe714b0f942581e889e6  stockfish-19-lite-single/stockfish-19-lite-single.js
57ac2d72312aba346760e3f173f687a8c211208e97a87268436f7f0e10bb5387  stockfish-19-lite-single/stockfish-19-lite-single.wasm
632e59bfd48adb2b1cba8757f9195e582aa9684425f3ec5b9d4c1bd05ff0afdb  stockfish.wasm.js
45816b436eb8c180acb2c5b9fda0148101f411edbfa6bf919918e0a362eafca8  stockfish.wasm
```

## Updating a build

Take the new files from the official `stockfish` package, drop them in a folder
named by the registry id, **re-run the checks above against the new binary** (do
not assume the old build's behaviour carries over, either way), then update this
file, the descriptor's `version` and `docs/engine.md`. A stored engine id is
never renamed — a new build is a new id.
