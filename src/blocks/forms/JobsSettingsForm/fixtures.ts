import type { EngineServerFormStatus } from "../EngineServerForm";
import type { EngineEntry } from "../../../lib/engines";
import type { JobsDefaultPreset } from "../../../lib/jobsSettings";

/*
  The Jobs settings' states (CTA-193) — the engines, the presets, the API's
  status. Imported only by the block's gallery and its test.
*/

export const API_URL = "http://10.0.0.3:8000";

/** A fixed moment, so the gallery and the test read the same time. */
const CHECKED_AT = new Date(2026, 9, 13, 18, 40, 12).getTime();

const fixtureEngine = (id: string, name: string, multiThread: boolean, available = true): EngineEntry => ({
  descriptor: {
    id,
    name,
    version: "19",
    capabilities: { maxDepth: 99, strength: "both", multiThread },
    create: () => {
      throw new Error("a fixture engine is never run");
    },
  },
  availability: available ? { available: true } : { available: false, reason: "cross-origin-isolation" },
});

export const ENGINES: readonly EngineEntry[] = [
  fixtureEngine("stockfish-19-lite-single", "Stockfish 19 Lite", false),
  fixtureEngine("stockfish-19-lite-multi", "Stockfish 19 Lite (multi-thread)", true, false),
];

export const PRESETS: readonly { id: string; name: string }[] = [
  { id: "default", name: "Default" },
  { id: "deep", name: "Deep — depth 30" },
];

/** The board's engine and its preset — what the switch starts from. */
export const BOARD_DEFAULT: JobsDefaultPreset = { engineId: "stockfish-19-lite-single", presetId: "default" };

export const DEEP_DEFAULT: JobsDefaultPreset = { engineId: "stockfish-19-lite-single", presetId: "deep" };

export const CONNECTING: EngineServerFormStatus = { state: "connecting", url: API_URL };

export const ONLINE: EngineServerFormStatus = { state: "online", url: API_URL, checkedAt: CHECKED_AT, latencyMs: 31 };

export const UNREACHABLE: EngineServerFormStatus = { state: "offline", url: API_URL, reason: "unreachable" };

export const NOT_AN_EVAL_API: EngineServerFormStatus = { state: "offline", url: "http://10.0.0.3:8800", reason: "not-an-eval-api" };
