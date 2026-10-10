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

/**
 * An engine server's engine (CTA-175) — a native Stockfish whose Threads and
 * Hash the server caps at its `maxThreads` (15) and `maxHashMb` (4096).
 */
export const HOSTED_ENGINE: ReadonlyMap<string, EngineOption> = new Map([
  spin("MultiPV", 1, 500),
  spin("Threads", 1, 15),
  spin("Hash", 1, 4096),
]);

/** What `engineLimitsOf` makes of {@link HOSTED_ENGINE}: the form's `deviceLimits`, before the handshake too. */
export const HOSTED_LIMITS = { threads: 15, hashMb: 4096 } as const;

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

/** Options for an engine server's engine — 8 threads and a 2048 MB hash, past what a tab may hold. */
export const HOSTED_OPTIONS: ComputerAnalysisOptions = { ...OPTIONS, engine: "hosted:stockfish-19", threads: 8, hashMb: 2048 };

/** No variant ticked — Start is off. */
export const NONE_TICKED: ComputerAnalysisOptions = { ...OPTIONS, outputs: [] };

/** Depth 35 with no time limit — each position searched to the depth alone. */
export const NO_TIME_LIMIT: ComputerAnalysisOptions = { ...OPTIONS, depth: 35, minDepth: 35, moveTimeMs: 0 };
