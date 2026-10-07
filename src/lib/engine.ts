import { UciEngine } from "./uciEngine";
import { WorkerTransport } from "./workerTransport";

/*
 * Stockfish.js (http://github.com/nmrugg/stockfish.js)
 * License: GPL
 */

/**
 * **The 2019 build's engine** — `new Engine()` is a {@link UciEngine} over a
 * {@link WorkerTransport} to the `stockfish.wasm.js` + `stockfish.wasm` pair in
 * `public/stockfish/`, and its default export is what it always was.
 *
 * Since CTA-152 the protocol lives in `lib/uciEngine.ts`, the worker in
 * `lib/workerTransport.ts` and the choice between builds in `lib/engines/`
 * (the registry, [`docs/engine.md`](../../docs/engine.md)). This file stays as
 * the registry's `stockfish-2019-wasm` entry and so that every `import Engine
 * from "../lib/engine"` — and every test's `vi.mock("../lib/engine")` — still
 * means what it did. The types and `parseEngineOption` are re-exported for the
 * same reason.
 *
 * The URL is built from `BASE_URL` (which always ends in a slash) and never
 * hardcoded to the site root — see {@link WorkerTransport}.
 */
const STOCKFISH_2019_URL = `${import.meta.env.BASE_URL}stockfish/stockfish.wasm.js`;

export default class Engine extends UciEngine {
  constructor(url: string = STOCKFISH_2019_URL) {
    // One dedicated worker per Engine instance — the transport makes it, and it
    // is made here, never at module scope.
    super(new WorkerTransport(url));
  }
}

export { parseEngineOption } from "./uciEngine";
export type {
  EngineHandle,
  EngineMessage,
  EngineOption,
  SearchOptions,
} from "./engineTypes";
