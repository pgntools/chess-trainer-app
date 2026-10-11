import { DEFAULT_ENGINE_SEARCH_SETTINGS, type EngineSearchSettings } from "../../../lib/engineSearchSettings";

/*
  The top bar's Engine menu's sample settings and engines (CTA-181), typed
  with `src/lib/`'s own. Imported only by the block's gallery and its test.
*/

/** The defaults — depth 20, three lines, no time limit. */
export const SETTINGS: EngineSearchSettings = DEFAULT_ENGINE_SEARCH_SETTINGS;

/** A reader's own: infinite analysis, 1 s a move, five lines, four threads, 256 MB. */
export const TUNED: EngineSearchSettings = { multiPv: 5, depth: 24, moveTimeMs: 1000, infinite: true, threads: 4, hashMb: 256 };

/** Settings asked for an engine server's engine — past what an in-browser build takes. */
export const HOSTED_ASKED: EngineSearchSettings = { ...DEFAULT_ENGINE_SEARCH_SETTINGS, threads: 12, hashMb: 4096 };

/** The single-thread build on a 4 GB device: one thread, 512 MB. */
export const SINGLE_THREAD_LIMITS = { threads: 1, hashMb: 512 } as const;

/** The multi-thread build on an 8-core, 8 GB device. */
export const MULTI_THREAD_LIMITS = { threads: 7, hashMb: 1024 } as const;

/** An engine server's engine, under the server's `maxThreads` (15) and `maxHashMb` (4096). */
export const HOSTED_LIMITS = { threads: 15, hashMb: 4096 } as const;

export const LITE = { name: "Stockfish 19 Lite", version: "19" } as const;

export const HOSTED_ENGINE = { name: "Stockfish 19 (this computer)", version: "19" } as const;

/** Settings → Engine, as a plain link. */
export const SETTINGS_LINK = { href: "/settings/engine" } as const;
