import { describe, expect, it } from "vitest";

import {
  analysisSettingsFrom,
  analysisSettingsOf,
  analysisUciOptionsOf,
  DEFAULT_ANALYSIS_SETTINGS,
  sameAnalysisSettings,
} from "./analysisSettings";
import { DEFAULT_ENGINE_SEARCH_SETTINGS } from "./engineSearchSettings";
import { DEFAULT_ENGINE_SETTINGS } from "./engineSettings";
import { missingFieldsOf } from "./recordedFields";

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

  it("count as a change of settings", () => {
    expect(sameAnalysisSettings(DEFAULT_ANALYSIS_SETTINGS, { ...DEFAULT_ANALYSIS_SETTINGS, hashMb: 64 })).toBe(false);
    expect(sameAnalysisSettings(DEFAULT_ANALYSIS_SETTINGS, { ...DEFAULT_ANALYSIS_SETTINGS })).toBe(true);
  });
});

describe("a session's settings — the global search settings and its own evaluations switch (CTA-181)", () => {
  it("are the search settings in effect, with writeEvals beside them", () => {
    const search = { ...DEFAULT_ENGINE_SEARCH_SETTINGS, depth: 24, infinite: true };
    expect(analysisSettingsOf(search, true)).toEqual({ ...search, writeEvals: true });
    expect(DEFAULT_ANALYSIS_SETTINGS).toEqual({ ...DEFAULT_ENGINE_SEARCH_SETTINGS, writeEvals: false });
  });

  it("read back from a record mark the fields the record did not carry, and only those", () => {
    const older = analysisSettingsFrom({ depth: 18, multiPv: 2, moveTimeMs: 0 });
    expect(older.threads).toBe(DEFAULT_ANALYSIS_SETTINGS.threads);
    expect([...missingFieldsOf(older)].sort()).toEqual(["hashMb", "infinite", "threads", "writeEvals"]);
    expect(missingFieldsOf(analysisSettingsFrom({ ...DEFAULT_ANALYSIS_SETTINGS })).size).toBe(0);
    // Built in the app, not read back: nothing is missing.
    expect(missingFieldsOf(analysisSettingsOf(DEFAULT_ENGINE_SEARCH_SETTINGS, false)).size).toBe(0);
  });
});
