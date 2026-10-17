import { isFilePathOption } from "../enginePresets";
import type { EngineDescriptor } from "../engineTypes";
import { UciEngine, DEFAULT_MAX_DEPTH } from "../uciEngine";
import { WorkerTransport } from "../workerTransport";
import { DEFAULT_ENGINE_ID, DEFAULT_ENGINE_NAME, DEFAULT_ENGINE_VERSION } from "./ids";

/**
 * **The engines that ship with the app** — one descriptor each, and nothing
 * here runs until `create()` is called (CTA-152): no `Worker` at module scope,
 * because the pre-render imports this under Node. The builds' files, versions
 * and licences are in `public/stockfish/README.md`; how to add one is in
 * [`docs/engine.md`](../../../docs/engine.md).
 *
 * **This module is the tests' engine seam**: a test replaces it with
 * `builtinEnginesMock` (`views/board/boardTestHarness.tsx`), which keeps every
 * descriptor's identity and capabilities and swaps its `create()` for a
 * `FakeEngine` that declares what that build declares. So keep every engine a
 * board can run in {@link BUILTIN_ENGINES}, and build one nowhere else.
 */

/** `public/stockfish/<folder>/<file>.js`, served under the deployment's `base`. */
const stockfishWorkerUrl = (folder: string, file: string): string =>
  `${import.meta.env.BASE_URL}stockfish/${folder}/${file}.js`;

/**
 * A Stockfish WASM worker from `public/stockfish/`, spoken to over UCI. It has
 * no file system — `setoption name EvalFile` kills the worker — so no
 * file-path option (`EvalFile`, `SyzygyPath`, `Debug Log File`) is ever sent
 * to it, whatever a preset says (CTA-179).
 */
const localStockfish = (folder: string, file: string) => (): UciEngine =>
  new UciEngine(new WorkerTransport(stockfishWorkerUrl(folder, file)), {
    maxDepth: DEFAULT_MAX_DEPTH,
    refuses: isFilePathOption,
  });

/** The default engine — every host can run it. */
export const STOCKFISH_19_LITE_SINGLE: EngineDescriptor = {
  id: DEFAULT_ENGINE_ID,
  name: DEFAULT_ENGINE_NAME,
  version: DEFAULT_ENGINE_VERSION,
  // `Threads` pinned to 1; `Skill Level`, `UCI_LimitStrength` and `UCI_Elo` declared.
  capabilities: { maxDepth: DEFAULT_MAX_DEPTH, strength: "both", multiThread: false },
  create: localStockfish("stockfish-19-lite-single", "stockfish-19-lite-single"),
};

export const STOCKFISH_19_LITE_MULTI: EngineDescriptor = {
  id: "stockfish-19-lite-multi",
  name: "Stockfish 19 Lite (multi-thread)",
  version: "19",
  // `SharedArrayBuffer` — the page must be cross-origin isolated (COOP / COEP).
  requires: { crossOriginIsolated: true },
  capabilities: { maxDepth: DEFAULT_MAX_DEPTH, strength: "both", multiThread: true },
  create: localStockfish("stockfish-19-lite-multi", "stockfish-19-lite"),
};

/** In the order a picker lists them: the default first. */
export const BUILTIN_ENGINES: readonly EngineDescriptor[] = [
  STOCKFISH_19_LITE_SINGLE,
  STOCKFISH_19_LITE_MULTI,
];
