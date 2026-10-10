import { DEFAULT_ANALYSIS_SETTINGS, type AnalysisSettings } from "../../../lib/analysisSettings";
import type { EngineOption } from "../../../lib/engineTypes";

/*
  The analysis engine form's sample engines and settings (CTA-113), typed
  with `src/lib/`'s own. Imported only by the block's gallery and its test.
*/

const spin = (name: string, min: number, max: number): [string, EngineOption] => [name, { name, type: "spin", min, max }];

/** The default build, Stockfish 19 single-thread: MultiPV to 256 (the slider stops at 10), Threads pinned, Hash far past a tab. */
export const SHIPPED: ReadonlyMap<string, EngineOption> = new Map([
  spin("MultiPV", 1, 256),
  spin("Threads", 1, 1),
  spin("Hash", 1, 33554432),
]);

/** The multi-thread build: Threads 1–32. */
export const MULTI_THREAD: ReadonlyMap<string, EngineOption> = new Map([...SHIPPED, spin("Threads", 1, 32)]);

/** A build that pins MultiPV at one line. */
export const PINNED: ReadonlyMap<string, EngineOption> = new Map([spin("MultiPV", 1, 1)]);

/** A build with no MultiPV at all. */
export const ABSENT: ReadonlyMap<string, EngineOption> = new Map([spin("Threads", 1, 1)]);

export const BEFORE_HANDSHAKE: ReadonlyMap<string, EngineOption> = new Map();

/** An engine server's engine (CTA-175): Threads and Hash under the server's `maxThreads` (15) and `maxHashMb` (4096). */
export const HOSTED: ReadonlyMap<string, EngineOption> = new Map([
  spin("MultiPV", 1, 500),
  spin("Threads", 1, 15),
  spin("Hash", 1, 4096),
]);

/** What `engineLimitsOf` makes of {@link HOSTED}: the form's `deviceLimits`. */
export const HOSTED_LIMITS = { threads: 15, hashMb: 4096 } as const;

export const SETTINGS: AnalysisSettings = { ...DEFAULT_ANALYSIS_SETTINGS, depth: 18, moveTimeMs: 1500, multiPv: 3 };
