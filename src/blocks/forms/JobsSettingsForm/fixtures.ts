import type { EngineEntry } from "../../../lib/engines";
import type { JobsDefaultPreset } from "../../../lib/jobsSettings";

/*
  The Jobs settings' states (CTA-193) — the engines and the presets.
  Imported only by the block's gallery and its test.
*/

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

/** Settings → Engine, as a plain link — where the eval sources are set (CTA-196). */
export const EVAL_SOURCES_LINK = { href: "#settings-engine" };
