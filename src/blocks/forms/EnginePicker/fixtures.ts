import type { EngineDescriptor } from "../../../lib/engineTypes";
import type { EngineEntry } from "../../../lib/engines";

/*
  The engine picker's sample engines (CTA-153), typed with `src/lib/engineTypes.ts`'s
  own descriptor and `src/lib/engines/`'s entry — the registry's shapes, without
  the registry. Imported only by the block's gallery and its test.
*/

/** A descriptor that builds nothing: a fixture is never run. */
const descriptor = (
  id: string,
  name: string,
  version: string,
  capabilities: EngineDescriptor["capabilities"],
  requires?: EngineDescriptor["requires"],
): EngineDescriptor => ({
  id,
  name,
  version,
  capabilities,
  ...(requires === undefined ? {} : { requires }),
  create: () => {
    throw new Error("a fixture engine is never run");
  },
});

export const STOCKFISH_19_SINGLE = descriptor("stockfish-19-lite-single", "Stockfish 19 Lite", "19", {
  maxDepth: 24,
  strength: "both",
  multiThread: false,
});

export const STOCKFISH_19_MULTI = descriptor(
  "stockfish-19-lite-multi",
  "Stockfish 19 Lite (multi-thread)",
  "19",
  { maxDepth: 24, strength: "both", multiThread: true },
  { crossOriginIsolated: true },
);

/** An engine only an Elo sets, with a long name — the wrapping case. */
export const LONG_NAMED = descriptor(
  "hosted-stockfish-19-full-strength-nnue-big-net",
  "Stockfish 19 Full Strength NNUE (hosted, big net, many threads)",
  "19.0.0-rc.2",
  { maxDepth: 40, strength: "elo", multiThread: true },
);

/** An engine on the engine server (`lib/engines/hosted.ts`) — the server's address beside its facts. */
export const ON_ENGINE_SERVER: EngineDescriptor = {
  ...descriptor("hosted:stockfish-18", "Stockfish 18", "18", { maxDepth: 99, strength: "both", multiThread: true }),
  server: "http://127.0.0.1:8800",
};

/** A name in Hebrew, as a reader's own engine might be called. */
export const HEBREW_NAMED = descriptor("my-engine", "מנוע אישי", "2", {
  maxDepth: 24,
  strength: "skill",
  multiThread: false,
});

const available = (engine: EngineDescriptor): EngineEntry => ({ descriptor: engine, availability: { available: true } });

/** A host that sets COOP / COEP: every build can run. */
export const ISOLATED_HOST: readonly EngineEntry[] = [
  available(STOCKFISH_19_SINGLE),
  available(STOCKFISH_19_MULTI),
];

/** GitHub Pages — no headers: the multi-thread build is listed, disabled, with its reason. */
export const PLAIN_HOST: readonly EngineEntry[] = [
  available(STOCKFISH_19_SINGLE),
  {
    descriptor: STOCKFISH_19_MULTI,
    availability: { available: false, reason: "cross-origin-isolation" },
  },
];

/** The default engine alone — what a registry with nothing else offers. */
export const DEFAULT_ONLY: readonly EngineEntry[] = [available(STOCKFISH_19_SINGLE)];

/** Engines beside the shipped ones (a hosted engine, one day): long-named, Skill-Level-only, named in Hebrew. */
export const WITH_ADDED: readonly EngineEntry[] = [
  ...PLAIN_HOST,
  available(LONG_NAMED),
  available(HEBREW_NAMED),
];

/** The shipped builds and the engine server's — what a reader who turned the server on sees. */
export const WITH_ENGINE_SERVER: readonly EngineEntry[] = [...PLAIN_HOST, available(ON_ENGINE_SERVER)];
