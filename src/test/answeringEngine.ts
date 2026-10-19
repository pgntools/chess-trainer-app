import { Chess } from "chess.js";

import type { SearchOptions } from "../lib/engineTypes";
import { resolveEngine } from "../lib/engines";
import type { EngineSessionDeps } from "../lib/jobs/engineSession";
import { FakeEngine } from "../views/board/boardTestHarness";

/*
  **An engine that answers every search at once**, and the engine session's
  deps built on it — the jobs kit's (`jobsKit.ts` re-exports them), in a
  module of their own that imports no runtime: a screen test mocking the kind
  registry (`lib/jobs/kinds`) to hand the page's runtime this engine can
  import it from the mock without importing the registry back (CTA-238).
*/

/** A legal move from `fen`, as UCI — a line for the engine to answer with. */
export const legalMove = (fen: string): string => {
  const move = new Chess(fen).moves({ verbose: true })[0];
  return move === undefined ? "" : `${move.from}${move.to}${move.promotion ?? ""}`;
};

/**
 * **An engine that answers every search at once** — in a microtask, so a
 * step's search ends before the runtime looks for its next unit of work: a
 * scored line at depth 20 (+0.20, a legal move), then its best move.
 */
export class AnsweringEngine extends FakeEngine {
  override search(fen: string, options: SearchOptions) {
    super.search(fen, options);
    queueMicrotask(() => {
      const pv = legalMove(fen);
      this.say({ fen, depth: 20, multipv: 1, positionEvaluation: "20", pv });
      this.say({ fen, bestMove: pv });
    });
  }
}

/** The engine session's deps for a kind under test: the default engine, built as `make` says. */
export const engineDeps = (make: () => FakeEngine = () => new AnsweringEngine()): EngineSessionDeps => {
  const engine = resolveEngine();
  return { engineFor: async () => ({ ...engine, create: () => make() }) };
};
