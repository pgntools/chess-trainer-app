import Engine from "../engine";
import type { EngineDescriptor } from "../engineTypes";
import { UciEngine, DEFAULT_MAX_DEPTH } from "../uciEngine";
import { WorkerTransport } from "../workerTransport";

/**
 * **The engines that ship with the app** — one descriptor each, and nothing
 * here runs until `create()` is called (CTA-152): no `Worker` at module scope,
 * because the pre-render imports this under Node. The builds' files, versions
 * and licences are in `public/stockfish/README.md`; how to add one is in
 * [`docs/engine.md`](../../../docs/engine.md).
 *
 * `import Engine from "../engine"` is the **default export only**, on purpose:
 * a test's `vi.mock("../lib/engine", () => ({ default: FakeEngine }))` has
 * nothing else, and it is what makes the shared `FakeEngine` harness stand in
 * for the default engine on every board.
 */

/** The engine every board used before there was a choice — and the fallback for any id that cannot run. */
export const DEFAULT_ENGINE_ID = "stockfish-2019-wasm";

/** `public/stockfish/<folder>/<file>.js`, served under the deployment's `base`. */
const stockfishWorkerUrl = (folder: string, file: string): string =>
  `${import.meta.env.BASE_URL}stockfish/${folder}/${file}.js`;

export const STOCKFISH_2019: EngineDescriptor = {
  id: DEFAULT_ENGINE_ID,
  name: "Stockfish 2019",
  version: "2019-08-15",
  kind: "local",
  // Declares `Skill Level` and nothing else of strength; `Threads` pinned to 1.
  capabilities: { maxDepth: DEFAULT_MAX_DEPTH, strength: "skill", multiThread: false },
  create: () => new Engine(),
};

export const STOCKFISH_19_LITE_SINGLE: EngineDescriptor = {
  id: "stockfish-19-lite-single",
  name: "Stockfish 19 Lite",
  version: "19",
  kind: "local",
  capabilities: { maxDepth: DEFAULT_MAX_DEPTH, strength: "both", multiThread: false },
  create: () =>
    new UciEngine(
      new WorkerTransport(
        stockfishWorkerUrl("stockfish-19-lite-single", "stockfish-19-lite-single"),
      ),
      { maxDepth: DEFAULT_MAX_DEPTH },
    ),
};

export const STOCKFISH_19_LITE_MULTI: EngineDescriptor = {
  id: "stockfish-19-lite-multi",
  name: "Stockfish 19 Lite (multi-thread)",
  version: "19",
  kind: "local",
  // `SharedArrayBuffer` — the page must be cross-origin isolated (COOP / COEP).
  requires: { crossOriginIsolated: true },
  capabilities: { maxDepth: DEFAULT_MAX_DEPTH, strength: "both", multiThread: true },
  create: () =>
    new UciEngine(
      new WorkerTransport(
        stockfishWorkerUrl("stockfish-19-lite-multi", "stockfish-19-lite"),
      ),
      { maxDepth: DEFAULT_MAX_DEPTH },
    ),
};

/** In the order a picker lists them: the default first. */
export const BUILTIN_ENGINES: readonly EngineDescriptor[] = [
  STOCKFISH_2019,
  STOCKFISH_19_LITE_SINGLE,
  STOCKFISH_19_LITE_MULTI,
];
