import { afterEach, describe, expect, it, vi } from "vitest";

import { storeEngineId } from "./engineChoice";
import { selectedPresetOf } from "./enginePresets";
import {
  createEnginePreset,
  enginePresetSelectionsSnapshot,
  enginePresetsSnapshot,
  selectEnginePreset,
  setEnginePresetSearch,
  settledEnginePresets,
} from "./enginePresetStore";
import {
  loadEngineSearchSettings,
  readEngineSearchSettings,
  storeEngineSearchSettings,
  subscribeEngineSearchSettings,
} from "./engineSearchInEffect";
import { DEFAULT_ENGINE_SEARCH_SETTINGS, ENGINE_SEARCH_SETTINGS_STORAGE_KEY } from "./engineSearchSettings";
import { DEFAULT_ENGINE_ID } from "./engines";

/*
  The search settings in effect (CTA-185): the lines, Threads and Hash a
  preference, the depth and move time the chosen engine's selected preset's.
*/

const MULTI = "stockfish-19-lite-multi";

/** The chosen engine's selected preset, as the store holds it. */
const selected = (engineId = DEFAULT_ENGINE_ID) =>
  selectedPresetOf(enginePresetsSnapshot() ?? [], enginePresetSelectionsSnapshot() ?? [], engineId);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the search settings in effect (CTA-185)", () => {
  it("are the defaults until the reader sets any — a preset that never set its limits reads depth 20, no time limit", async () => {
    await loadEngineSearchSettings();
    expect(readEngineSearchSettings()).toEqual(DEFAULT_ENGINE_SEARCH_SETTINGS);
    expect(readEngineSearchSettings()).toBe(readEngineSearchSettings());
  });

  it("write the depth and move time into the chosen engine's preset — at once, before the store has committed", async () => {
    await loadEngineSearchSettings();
    const listener = vi.fn();
    const unsubscribe = subscribeEngineSearchSettings(listener);
    storeEngineSearchSettings({ depth: 30, moveTimeMs: 60000 });
    // Read at once: a slider, a board re-searching, see it on the next read.
    expect(readEngineSearchSettings()).toMatchObject({ depth: 30, moveTimeMs: 60000 });
    expect(listener).toHaveBeenCalled();
    await settledEnginePresets();
    // Default's first change stores it, with its limits; the preference keeps no depth.
    expect(selected().search).toEqual({ depth: 30, moveTimeMs: 60000 });
    expect(readEngineSearchSettings()).toMatchObject({ depth: 30, moveTimeMs: 60000 });
    expect(localStorage.getItem(ENGINE_SEARCH_SETTINGS_STORAGE_KEY)).toBeNull();
    unsubscribe();
  });

  it("keep the lines, Threads and Hash in the preference", async () => {
    await loadEngineSearchSettings();
    storeEngineSearchSettings({ multiPv: 5, depth: 12 });
    await settledEnginePresets();
    expect(JSON.parse(localStorage.getItem(ENGINE_SEARCH_SETTINGS_STORAGE_KEY) ?? "{}")).toEqual({ multiPv: 5, threads: 1, hashMb: 16 });
    expect(readEngineSearchSettings()).toEqual({ ...DEFAULT_ENGINE_SEARCH_SETTINGS, multiPv: 5, depth: 12 });
  });

  it("hold a depth and move time to their bounds, and write nothing for a change that changes nothing", async () => {
    await loadEngineSearchSettings();
    storeEngineSearchSettings({ depth: 150, moveTimeMs: 9_000_000 });
    await settledEnginePresets();
    expect(readEngineSearchSettings()).toMatchObject({ depth: 99, moveTimeMs: 600000 });
    const before = enginePresetsSnapshot();
    storeEngineSearchSettings({ depth: 99 });
    await settledEnginePresets();
    expect(enginePresetsSnapshot()).toBe(before);
  });

  it("follow the preset — choosing another switches the depth and move time", async () => {
    await loadEngineSearchSettings();
    const made = await createEnginePreset("deep-search", {}, {}, { depth: 34, moveTimeMs: 300000 });
    if (!("id" in made)) throw new Error("the preset was not made");
    await selectEnginePreset(DEFAULT_ENGINE_ID, made.id);
    expect(readEngineSearchSettings()).toMatchObject({ depth: 34, moveTimeMs: 300000 });
    await selectEnginePreset(DEFAULT_ENGINE_ID, "default");
    expect(readEngineSearchSettings()).toMatchObject({ depth: 20, moveTimeMs: 0 });
  });

  it("follow the engine — each runs its own preset", async () => {
    vi.stubGlobal("crossOriginIsolated", true);
    await loadEngineSearchSettings();
    const made = await createEnginePreset("blitz", {}, {}, { depth: 10, moveTimeMs: 1000 });
    if (!("id" in made)) throw new Error("the preset was not made");
    await selectEnginePreset(MULTI, made.id);
    expect(readEngineSearchSettings()).toMatchObject({ depth: 20, moveTimeMs: 0 });
    storeEngineId(MULTI);
    expect(readEngineSearchSettings()).toMatchObject({ depth: 10, moveTimeMs: 1000 });
    // A write goes into the running engine's preset, never the other engine's.
    storeEngineSearchSettings({ depth: 14 });
    await settledEnginePresets();
    expect(selected(MULTI).search).toEqual({ depth: 14, moveTimeMs: 1000 });
    expect(selected(DEFAULT_ENGINE_ID).search).toEqual({});
  });

  it("hear the preset changed elsewhere — Settings → Engine", async () => {
    await loadEngineSearchSettings();
    const listener = vi.fn();
    const unsubscribe = subscribeEngineSearchSettings(listener);
    await setEnginePresetSearch("default", { moveTimeMs: 5000 });
    expect(listener).toHaveBeenCalled();
    expect(readEngineSearchSettings()).toMatchObject({ depth: 20, moveTimeMs: 5000 });
    unsubscribe();
  });
});
