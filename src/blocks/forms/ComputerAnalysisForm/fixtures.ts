import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS, type ComputerAnalysisOptions } from "../../../lib/computerAnalysis";
import type { EngineOption } from "../../../lib/engineTypes";

/*
  The computer analysis form's sample engines and options (CTA-174), typed
  with `src/lib/`'s own. Imported only by the block's gallery and its test.
*/

const spin = (name: string, min: number, max: number): [string, EngineOption] => [name, { name, type: "spin", min, max }];

/** The default build, Stockfish 19 single-thread: Threads pinned at 1, Hash far past a tab, MultiPV to 256. */
export const SINGLE_THREAD: ReadonlyMap<string, EngineOption> = new Map([
  spin("MultiPV", 1, 256),
  spin("Threads", 1, 1),
  spin("Hash", 1, 33554432),
]);

/** The multi-thread build: Threads 1–32. */
export const MULTI_THREAD: ReadonlyMap<string, EngineOption> = new Map([...SINGLE_THREAD, spin("Threads", 1, 32)]);

/** An engine with no Hash and no MultiPV. */
export const NO_HASH: ReadonlyMap<string, EngineOption> = new Map([spin("Threads", 1, 8)]);

export const BEFORE_HANDSHAKE: ReadonlyMap<string, EngineOption> = new Map();

/** The defaults, as a board seeds them: the light variant ticked. */
export const OPTIONS: ComputerAnalysisOptions = { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, depth: 18, minDepth: 18, moveTimeMs: 5000 };

/** Black's moves only, from 12... to 30, all three variants. */
export const RANGED: ComputerAnalysisOptions = {
  ...OPTIONS,
  side: "b",
  fromMove: 12,
  fromColour: "b",
  toMove: 30,
  multiPv: 3,
  outputs: ["light", "medium", "full"],
};

/** No variant ticked — Start is off. */
export const NONE_TICKED: ComputerAnalysisOptions = { ...OPTIONS, outputs: [] };
