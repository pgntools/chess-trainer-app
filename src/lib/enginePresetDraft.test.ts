import { describe, expect, it, vi } from "vitest";

import {
  draftEnginePresetGroup,
  draftEnginePresetSearch,
  draftEnginePresetValue,
  draftEngineResources,
  enginePresetDraftOf,
  presetInEffectOf,
  presetValuesInEffect,
  saveEnginePresetDraft,
  saveEnginePresetDraftAsNew,
  subscribeEnginePresetDraft,
} from "./enginePresetDraft";
import { DEFAULT_PRESET_ID, MAX_ENGINE_PRESETS, selectedPresetOf } from "./enginePresets";
import {
  createEnginePreset,
  enginePresetSelectionsSnapshot,
  enginePresetsSnapshot,
  loadEnginePresetSelections,
  loadEnginePresets,
  selectEnginePreset,
  setEnginePresetValue,
} from "./enginePresetStore";
import { ENGINE_SEARCH_SETTINGS_STORAGE_KEY, readSearchPreferences } from "./engineSearchSettings";
import { DEFAULT_ENGINE_ID } from "./engines";

/*
  An engine preset's unsaved draft (CTA-185): edits held in memory, in effect
  at once, written only by Save or Save as new preset.
*/

const ENGINE = DEFAULT_ENGINE_ID;

const loaded = () => Promise.all([loadEnginePresets(), loadEnginePresetSelections()]);

/** What the engine runs, as the stores hold it. */
const saved = () => selectedPresetOf(enginePresetsSnapshot() ?? [], enginePresetSelectionsSnapshot() ?? [], ENGINE);

/** What the engine runs with its draft over it. */
const inEffect = () => presetInEffectOf(enginePresetsSnapshot() ?? [], enginePresetSelectionsSnapshot() ?? [], ENGINE);

describe("an engine preset's unsaved draft (CTA-185)", () => {
  it("holds an option, a group, the search limits and Threads / Hash — in effect at once, nothing written", async () => {
    await loaded();
    const listener = vi.fn();
    const unsubscribe = subscribeEnginePresetDraft(listener);
    draftEnginePresetValue(ENGINE, "Contempt", 20);
    draftEnginePresetGroup(ENGINE, "syzygy", true);
    draftEnginePresetSearch(ENGINE, { depth: 30 });
    draftEngineResources(ENGINE, { hashMb: 256 });
    expect(listener).toHaveBeenCalledTimes(4);
    expect(enginePresetDraftOf(ENGINE)).toMatchObject({
      presetId: DEFAULT_PRESET_ID,
      edit: { values: { Contempt: 20 }, groups: { syzygy: true }, search: { depth: 30, moveTimeMs: 0 } },
      resources: { threads: 1, hashMb: 256 },
    });
    expect(inEffect()).toMatchObject({ id: DEFAULT_PRESET_ID, values: { Contempt: 20 }, groups: { syzygy: true } });
    expect(presetValuesInEffect(enginePresetsSnapshot(), enginePresetSelectionsSnapshot(), ENGINE)).toEqual({ Contempt: 20 });
    // Nothing stored: Default is not, the preference is not.
    expect(enginePresetsSnapshot()).toEqual([]);
    expect(localStorage.getItem(ENGINE_SEARCH_SETTINGS_STORAGE_KEY)).toBeNull();
    unsubscribe();
  });

  it("sends the same values object from read to read until an edit", async () => {
    await loaded();
    draftEnginePresetValue(ENGINE, "Contempt", 20);
    const read = () => presetValuesInEffect(enginePresetsSnapshot(), enginePresetSelectionsSnapshot(), ENGINE);
    const first = read();
    expect(read()).toBe(first);
    draftEnginePresetValue(ENGINE, "Contempt", 30);
    expect(read()).not.toBe(first);
  });

  it("is no draft once every edit is back to what is saved", async () => {
    await loaded();
    await setEnginePresetValue(DEFAULT_PRESET_ID, "Contempt", 10);
    draftEnginePresetValue(ENGINE, "Contempt", 20);
    draftEngineResources(ENGINE, { threads: 2 });
    expect(enginePresetDraftOf(ENGINE)).toBeDefined();
    draftEnginePresetValue(ENGINE, "Contempt", 10);
    expect(enginePresetDraftOf(ENGINE)).toBeDefined();
    draftEngineResources(ENGINE, { threads: 1 });
    expect(enginePresetDraftOf(ENGINE)).toBeUndefined();
  });

  it("is dropped, silently, when the engine runs another preset", async () => {
    await loaded();
    const made = await createEnginePreset("blitz");
    if (!("id" in made)) throw new Error("the preset was not made");
    draftEnginePresetValue(ENGINE, "Contempt", 20);
    await selectEnginePreset(ENGINE, made.id);
    expect(enginePresetDraftOf(ENGINE)).toBeUndefined();
    // Coming back finds the preset as saved.
    await selectEnginePreset(ENGINE, DEFAULT_PRESET_ID);
    expect(enginePresetDraftOf(ENGINE)).toBeUndefined();
    expect(inEffect().values).toEqual({});
  });

  it("is another engine's to nobody else", async () => {
    await loaded();
    draftEnginePresetValue(ENGINE, "Contempt", 20);
    expect(enginePresetDraftOf("stockfish-19-lite-multi")).toBeUndefined();
  });

  it("Save writes it into the preset and Threads / Hash into the preference, then is no draft", async () => {
    await loaded();
    draftEnginePresetValue(ENGINE, "Contempt", 20);
    draftEnginePresetSearch(ENGINE, { moveTimeMs: 5000 });
    draftEngineResources(ENGINE, { threads: 3 });
    expect(await saveEnginePresetDraft()).toBeUndefined();
    expect(enginePresetDraftOf(ENGINE)).toBeUndefined();
    expect(saved()).toMatchObject({ id: DEFAULT_PRESET_ID, values: { Contempt: 20 }, search: { depth: 20, moveTimeMs: 5000 } });
    expect(readSearchPreferences().threads).toBe(3);
  });

  it("Save as new preset keeps the preset as it was and runs a new one with the changes", async () => {
    await loaded();
    await setEnginePresetValue(DEFAULT_PRESET_ID, "Contempt", 10);
    draftEnginePresetValue(ENGINE, "Contempt", 20);
    draftEnginePresetGroup(ENGINE, "syzygy", true);
    draftEngineResources(ENGINE, { hashMb: 128 });
    expect(await saveEnginePresetDraftAsNew("Sharper")).toBeUndefined();
    expect(enginePresetDraftOf(ENGINE)).toBeUndefined();
    expect(saved()).toMatchObject({ name: "Sharper", values: { Contempt: 20 }, groups: { syzygy: true } });
    expect(enginePresetsSnapshot()?.find((preset) => preset.id === DEFAULT_PRESET_ID)?.values).toEqual({ Contempt: 10 });
    expect(readSearchPreferences().hashMb).toBe(128);
  });

  it(`Save as new preset past ${MAX_ENGINE_PRESETS} presets says so, and keeps the draft`, async () => {
    await loaded();
    for (let made = 1; made < MAX_ENGINE_PRESETS; made += 1) await createEnginePreset(`p${made}`);
    draftEnginePresetValue(ENGINE, "Contempt", 20);
    expect(await saveEnginePresetDraftAsNew("one too many")).toBe("too-many");
    expect(enginePresetDraftOf(ENGINE)).toBeDefined();
  });
});
