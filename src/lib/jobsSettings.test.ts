import { describe, expect, it } from "vitest";

import {
  DEFAULT_JOBS_SETTINGS,
  JOBS_SETTINGS_STORAGE_KEY,
  jobsSettingsFrom,
  readJobsSettings,
  storeJobsDefaultPreset,
} from "./jobsSettings";

describe("the Jobs settings", () => {
  it("are off by default: no default engine", () => {
    expect(readJobsSettings()).toEqual(DEFAULT_JOBS_SETTINGS);
    expect(DEFAULT_JOBS_SETTINGS).toEqual({ defaultPreset: null });
  });

  it("keep the default engine and preset in localStorage, and forget it again", () => {
    storeJobsDefaultPreset({ engineId: "stockfish-19-lite-single", presetId: "deep" });
    expect(JSON.parse(localStorage.getItem(JOBS_SETTINGS_STORAGE_KEY) ?? "{}").defaultPreset).toEqual({
      engineId: "stockfish-19-lite-single",
      presetId: "deep",
    });
    expect(readJobsSettings().defaultPreset).toEqual({ engineId: "stockfish-19-lite-single", presetId: "deep" });
    storeJobsDefaultPreset(null);
    expect(readJobsSettings().defaultPreset).toBeNull();
  });

  it("are the same object until they change — a snapshot", () => {
    const first = readJobsSettings();
    expect(readJobsSettings()).toBe(first);
    storeJobsDefaultPreset({ engineId: "a", presetId: "b" });
    expect(readJobsSettings()).not.toBe(first);
  });

  it("read a stored value leniently", () => {
    expect(jobsSettingsFrom({ defaultPreset: { engineId: "", presetId: "x" } })).toEqual(DEFAULT_JOBS_SETTINGS);
    localStorage.setItem(JOBS_SETTINGS_STORAGE_KEY, "{not json");
    expect(readJobsSettings()).toEqual(DEFAULT_JOBS_SETTINGS);
  });

  it("no longer hold the lichess evaluation API (CTA-196) — and keep an old one stored, for its move to Settings → Engine", () => {
    const evalApi = { enabled: true, url: "http://10.0.0.9:8000", write: true };
    localStorage.setItem(JOBS_SETTINGS_STORAGE_KEY, JSON.stringify({ defaultPreset: null, evalApi }));
    expect(readJobsSettings()).toEqual({ defaultPreset: null });
    storeJobsDefaultPreset({ engineId: "a", presetId: "b" });
    expect(JSON.parse(localStorage.getItem(JOBS_SETTINGS_STORAGE_KEY) ?? "{}")).toEqual({
      defaultPreset: { engineId: "a", presetId: "b" },
      evalApi,
    });
  });
});
