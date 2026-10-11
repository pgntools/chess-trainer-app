import { DEFAULT_ENGINE_SEARCH_SETTINGS, type EngineSearchSettings } from "../../../lib/engineSearchSettings";
import type { EngineDescriptor } from "../../../lib/engineTypes";
import type { EngineEntry } from "../../../lib/engines";

/*
  The top bar's Engine menu's sample settings and engines (CTA-181), typed
  with `src/lib/`'s own. Imported only by the block's gallery and its test.
*/

/** The defaults — depth 20, three lines, no time limit. */
export const SETTINGS: EngineSearchSettings = DEFAULT_ENGINE_SEARCH_SETTINGS;

/** A reader's own: depth 24, 1 s a move, five lines, four threads, 256 MB. */
export const TUNED: EngineSearchSettings = { multiPv: 5, depth: 24, moveTimeMs: 1000, threads: 4, hashMb: 256 };

/** Settings asked for an engine server's engine — past what an in-browser build takes. */
export const HOSTED_ASKED: EngineSearchSettings = { ...DEFAULT_ENGINE_SEARCH_SETTINGS, threads: 12, hashMb: 4096 };

/** The single-thread build on a 4 GB device: one thread, 512 MB. */
export const SINGLE_THREAD_LIMITS = { threads: 1, hashMb: 512 } as const;

/** The multi-thread build on an 8-core, 8 GB device. */
export const MULTI_THREAD_LIMITS = { threads: 7, hashMb: 1024 } as const;

/** An engine server's engine, under the server's `maxThreads` (15) and `maxHashMb` (4096). */
export const HOSTED_LIMITS = { threads: 15, hashMb: 4096 } as const;

/** A descriptor that builds nothing: a fixture is never run. */
const descriptor = (
  id: string,
  name: string,
  multiThread: boolean,
  extra: Partial<EngineDescriptor> = {},
): EngineDescriptor => ({
  id,
  name,
  version: "19",
  capabilities: { maxDepth: 99, strength: "both", multiThread },
  ...extra,
  create: () => {
    throw new Error("a fixture engine is never run");
  },
});

export const LITE = descriptor("stockfish-19-lite-single", "Stockfish 19 Lite", false);

export const LITE_MULTI = descriptor("stockfish-19-lite-multi", "Stockfish 19 Lite (multi-thread)", true, {
  requires: { crossOriginIsolated: true },
});

export const HOSTED_ENGINE = descriptor("hosted:stockfish-19", "Stockfish 19 (this computer)", true, {
  server: "http://127.0.0.1:8800",
});

/** GitHub Pages — no COOP / COEP: the multi-thread build listed, disabled, with its reason. */
export const PLAIN_HOST_ENGINES: readonly EngineEntry[] = [
  { descriptor: LITE, availability: { available: true } },
  { descriptor: LITE_MULTI, availability: { available: false, reason: "cross-origin-isolation" } },
];

/** chessapp.dev with the engine server on: every build, and the server's engine after them. */
export const SERVER_ENGINES: readonly EngineEntry[] = [
  { descriptor: LITE, availability: { available: true } },
  { descriptor: LITE_MULTI, availability: { available: true } },
  { descriptor: HOSTED_ENGINE, availability: { available: true } },
];

/** The presets — Default, in the screen's words, and two of the reader's own (one named in Hebrew). */
export const PRESETS: readonly { id: string; name: string }[] = [
  { id: "default", name: "Default" },
  { id: "p-deep", name: "deep-search" },
  { id: "p-he", name: "חיפוש מהיר" },
];
