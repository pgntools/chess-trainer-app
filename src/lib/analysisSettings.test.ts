import { describe, expect, it } from "vitest";

import {
  analysisUciOptionsOf,
  DEFAULT_ANALYSIS_SETTINGS,
  sameAnalysisSettings,
  withClampedAnalysisUciOptions,
} from "./analysisSettings";
import { DEFAULT_ENGINE_SETTINGS } from "./engineSettings";

/*
  The analysis boards' engine knobs (CTA-160): Threads and Hash as Play with
  Engine has them — the same defaults, the same ceilings, the same clamp.
*/

describe("the analysis boards' Threads and Hash", () => {
  it("start where Play with Engine's do", () => {
    expect(DEFAULT_ANALYSIS_SETTINGS.threads).toBe(DEFAULT_ENGINE_SETTINGS.threads);
    expect(DEFAULT_ANALYSIS_SETTINGS.hashMb).toBe(DEFAULT_ENGINE_SETTINGS.hashMb);
  });

  it("are asked of the engine beside the lines, held to the ceilings whatever a record says", () => {
    expect(analysisUciOptionsOf({ multiPv: 3, threads: 4, hashMb: 256 })).toEqual({ MultiPV: 3, Threads: 4, Hash: 256 });
    expect(analysisUciOptionsOf({ multiPv: 3, threads: 128, hashMb: 4096 })).toEqual({ MultiPV: 3, Threads: 32, Hash: 1024 });
  });

  it("hold an engine server's engine to its own range, an in-browser build still to the tab's (CTA-175)", () => {
    expect(analysisUciOptionsOf({ multiPv: 3, threads: 12, hashMb: 4096 }, "hosted:stockfish-19")).toEqual({
      MultiPV: 3,
      Threads: 12,
      Hash: 4096,
    });
    expect(analysisUciOptionsOf({ multiPv: 3, threads: 128, hashMb: 4096 }, "stockfish-19-lite-multi")).toEqual({
      MultiPV: 3,
      Threads: 32,
      Hash: 1024,
    });
  });

  it("take what the running engine clamped them to — the same object when nothing moved", () => {
    const settings = { ...DEFAULT_ANALYSIS_SETTINGS, threads: 4 };
    expect(withClampedAnalysisUciOptions(settings, { MultiPV: 3, Threads: 4, Hash: 16 })).toBe(settings);
    expect(withClampedAnalysisUciOptions(settings, { Threads: 1 })).toEqual({ ...settings, threads: 1 });
  });

  it("count as a change of settings", () => {
    expect(sameAnalysisSettings(DEFAULT_ANALYSIS_SETTINGS, { ...DEFAULT_ANALYSIS_SETTINGS, hashMb: 64 })).toBe(false);
    expect(sameAnalysisSettings(DEFAULT_ANALYSIS_SETTINGS, { ...DEFAULT_ANALYSIS_SETTINGS })).toBe(true);
  });
});
