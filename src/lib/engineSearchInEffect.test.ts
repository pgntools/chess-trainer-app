import { afterEach, describe, expect, it, vi } from "vitest";

import { storeEngineId } from "./engineChoice";
import { selectedPresetOf } from "./enginePresets";
import { enginePresetDraftOf, saveEnginePresetDraft } from "./enginePresetDraft";
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
  preference, the depth and move time the chosen engine's selected preset's —
  and over both, the preset's unsaved draft.
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

  it("put the depth and move time in the chosen engine's preset's draft — in effect at once, written nowhere until Save", async () => {
    await loadEngineSearchSettings();
    const listener = vi.fn();
    const unsubscribe = subscribeEngineSearchSettings(listener);
    storeEngineSearchSettings({ depth: 30, moveTimeMs: 60000 });
    // Read at once: a slider, a board re-searching, see it on the next read.
    expect(readEngineSearchSettings()).toMatchObject({ depth: 30, moveTimeMs: 60000 });
    expect(listener).toHaveBeenCalled();
    await settledEnginePresets();
    // Nothing stored: Default is not, the preference keeps no depth.
    expect(enginePresetsSnapshot()).toEqual([]);
    expect(localStorage.getItem(ENGINE_SEARCH_SETTINGS_STORAGE_KEY)).toBeNull();
    // Save: Default's first save stores it, with its limits.
    await saveEnginePresetDraft();
    expect(selected().search).toEqual({ depth: 30, moveTimeMs: 60000 });
    expect(enginePresetDraftOf(DEFAULT_ENGINE_ID)).toBeUndefined();
    expect(readEngineSearchSettings()).toMatchObject({ depth: 30, moveTimeMs: 60000 });
    unsubscribe();
  });

  it("hold Threads and Hash with the draft — the global request, written on Save", async () => {
    await loadEngineSearchSettings();
    storeEngineSearchSettings({ threads: 4, hashMb: 256 });
    expect(readEngineSearchSettings()).toMatchObject({ threads: 4, hashMb: 256 });
    expect(localStorage.getItem(ENGINE_SEARCH_SETTINGS_STORAGE_KEY)).toBeNull();
    await saveEnginePresetDraft();
    expect(JSON.parse(localStorage.getItem(ENGINE_SEARCH_SETTINGS_STORAGE_KEY) ?? "{}")).toEqual({ multiPv: 3, threads: 4, hashMb: 256 });
    // The preset keeps no Threads or Hash.
    expect(selected().values).toEqual({});
  });

  it("write the lines into the preference at once — never into the draft", async () => {
    await loadEngineSearchSettings();
    storeEngineSearchSettings({ multiPv: 5, depth: 12 });
    await settledEnginePresets();
    expect(JSON.parse(localStorage.getItem(ENGINE_SEARCH_SETTINGS_STORAGE_KEY) ?? "{}")).toEqual({ multiPv: 5, threads: 1, hashMb: 16 });
    expect(readEngineSearchSettings()).toEqual({ ...DEFAULT_ENGINE_SEARCH_SETTINGS, multiPv: 5, depth: 12 });
    expect(enginePresetDraftOf(DEFAULT_ENGINE_ID)?.edit.search).toEqual({ depth: 12, moveTimeMs: 0 });
  });

  it("hold a depth and move time to their bounds, and keep no draft for a change that changes nothing", async () => {
    await loadEngineSearchSettings();
    storeEngineSearchSettings({ depth: 150, moveTimeMs: 999_999_999 });
    expect(readEngineSearchSettings()).toMatchObject({ depth: 99, moveTimeMs: 86_400_000 });
    // Back to what is saved: no draft at all.
    storeEngineSearchSettings({ depth: 20, moveTimeMs: 0 });
    expect(enginePresetDraftOf(DEFAULT_ENGINE_ID)).toBeUndefined();
    storeEngineSearchSettings({ depth: 20 });
    expect(enginePresetDraftOf(DEFAULT_ENGINE_ID)).toBeUndefined();
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
    // A change edits the running engine's preset, never the other engine's.
    storeEngineSearchSettings({ depth: 14 });
    expect(enginePresetDraftOf(MULTI)?.presetId).toBe(made.id);
    await saveEnginePresetDraft();
    expect(selected(MULTI).search).toEqual({ depth: 14, moveTimeMs: 1000 });
    expect(selected(DEFAULT_ENGINE_ID).search).toEqual({});
  });

  it("drop the draft when the reader chooses another engine — silently", async () => {
    vi.stubGlobal("crossOriginIsolated", true);
    await loadEngineSearchSettings();
    storeEngineSearchSettings({ depth: 33, threads: 2 });
    storeEngineId(MULTI);
    storeEngineId(DEFAULT_ENGINE_ID);
    expect(enginePresetDraftOf(DEFAULT_ENGINE_ID)).toBeUndefined();
    expect(readEngineSearchSettings()).toEqual(DEFAULT_ENGINE_SEARCH_SETTINGS);
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
