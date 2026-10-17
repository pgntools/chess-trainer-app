import type { EngineEntry } from "../../../lib/engines";
import type { EngineServerFormStatus } from "./EngineServerForm";

/*
  The engine server form's states (Settings → Engine) — what `lib/engineServer.ts`'s
  status reads as. Imported only by the block's gallery and its test.
*/

export const EXAMPLE_URL = "http://127.0.0.1:8800";

/** A fixed moment, so the gallery and the test read the same time. */
const CHECKED_AT = new Date(2026, 9, 9, 21, 15, 3).getTime();

export const CONNECTING: EngineServerFormStatus = { state: "connecting", url: EXAMPLE_URL };

export const ONLINE: EngineServerFormStatus = {
  state: "online",
  url: EXAMPLE_URL,
  checkedAt: CHECKED_AT,
  latencyMs: 4,
};


export const UNREACHABLE: EngineServerFormStatus = { state: "offline", url: EXAMPLE_URL, reason: "unreachable" };

export const NOT_AN_ENGINE_SERVER: EngineServerFormStatus = {
  state: "offline",
  url: "http://127.0.0.1:5173",
  reason: "not-an-engine-server",
};

/** A long address on another machine — the wrapping case. */
export const LONG_ADDRESS = "https://engines.example-chess-club.org/stockfish/api/v1-compatible";

/** The server's engines as Settings → Engine lists them under the form — one fixture engine, built never. */
export const SERVER_ENGINES: readonly EngineEntry[] = [
  {
    descriptor: {
      id: "hosted:stockfish-18",
      name: "Stockfish 18",
      version: "18",
      server: EXAMPLE_URL,
      capabilities: { maxDepth: 99, strength: "both", multiThread: true },
      create: () => {
        throw new Error("a fixture engine is never run");
      },
    },
    availability: { available: true },
  },
  {
    descriptor: {
      id: "hosted:stockfish-19",
      name: "Stockfish 19",
      version: "19",
      server: EXAMPLE_URL,
      capabilities: { maxDepth: 99, strength: "both", multiThread: true },
      create: () => {
        throw new Error("a fixture engine is never run");
      },
    },
    availability: { available: true },
  },
];
