import { describe, expect, it } from "vitest";

import { DEFAULT_PRESET_ID, MAX_ENGINE_PRESETS, selectedPresetOf, withDefaultPreset } from "./enginePresets";
import {
  createEnginePreset,
  deleteEnginePreset,
  duplicateEnginePreset,
  enginePresetSelectionsSnapshot,
  enginePresetsSnapshot,
  importEnginePresets,
  loadEnginePresetSelections,
  loadEnginePresets,
  renameEnginePreset,
  resetEnginePresetSelectionStore,
  resetEnginePresetStore,
  selectEnginePreset,
  setEnginePresetGroup,
  setEnginePresetValue,
} from "./enginePresetStore";

const SINGLE = "stockfish-19-lite-single";
const MULTI = "stockfish-19-lite-multi";

/** A reload: forget what was read, and read it back from IndexedDB. */
const reload = async () => {
  resetEnginePresetStore();
  resetEnginePresetSelectionStore();
  return { presets: await loadEnginePresets(), selections: await loadEnginePresetSelections() };
};

const created = async (name: string) => {
  const result = await createEnginePreset(name);
  if (!("id" in result)) throw new Error(`not created: ${result.problem}`);
  return result.id;
};

describe("the engine preset store (CTA-179)", () => {
  it("holds nothing until Default is edited — and keeps it once it is", async () => {
    expect(await loadEnginePresets()).toEqual([]);
    expect(await setEnginePresetValue(DEFAULT_PRESET_ID, "UCI_ShowWDL", true)).toBeUndefined();
    const { presets } = await reload();
    expect(presets).toHaveLength(1);
    expect(presets[0]).toMatchObject({ id: DEFAULT_PRESET_ID, name: "Default", values: { UCI_ShowWDL: true } });
  });

  it("sets and puts back one option, and writes nothing for the same value", async () => {
    const id = await created("deep-analysis");
    await setEnginePresetValue(id, "Move Overhead", 100);
    const before = enginePresetsSnapshot();
    await setEnginePresetValue(id, "Move Overhead", 100);
    expect(enginePresetsSnapshot()).toBe(before);

    await setEnginePresetValue(id, "Move Overhead", undefined);
    const { presets } = await reload();
    expect(presets.find((preset) => preset.id === id)?.values).toEqual({});
  });

  it("creates, renames and duplicates — a copy with every value", async () => {
    const id = await created("  lite-play ");
    await setEnginePresetValue(id, "Skill Level", 5);
    await renameEnginePreset(id, "lite");
    const copy = await duplicateEnginePreset(id, "lite (copy)");
    if (!("id" in copy)) throw new Error("no copy");

    const { presets } = await reload();
    expect(presets.map((preset) => [preset.name, preset.values])).toEqual([
      ["lite", { "Skill Level": 5 }],
      ["lite (copy)", { "Skill Level": 5 }],
    ]);
    // A blank name renames nothing.
    const kept = enginePresetsSnapshot();
    await renameEnginePreset(id, "   ");
    expect(enginePresetsSnapshot()).toBe(kept);
  });

  it("turns a group on and off, keeping its values — a copy keeps the groups too", async () => {
    const id = await created("tablebases");
    await setEnginePresetValue(id, "SyzygyPath", "/tb");
    expect(await setEnginePresetGroup(id, "syzygy", true)).toBeUndefined();
    const before = enginePresetsSnapshot();
    await setEnginePresetGroup(id, "syzygy", true);
    expect(enginePresetsSnapshot()).toBe(before);

    const copy = await duplicateEnginePreset(id, "tablebases (copy)");
    if (!("id" in copy)) throw new Error("no copy");
    await setEnginePresetGroup(id, "syzygy", false);

    const { presets } = await reload();
    expect(presets.map((preset) => [preset.name, preset.values, preset.groups])).toEqual([
      ["tablebases", { SyzygyPath: "/tb" }, {}],
      ["tablebases (copy)", { SyzygyPath: "/tb" }, { syzygy: true }],
    ]);
  });

  it("stores Default at its first group change", async () => {
    await setEnginePresetGroup(DEFAULT_PRESET_ID, "syzygy", true);
    const { presets } = await reload();
    expect(presets).toEqual([expect.objectContaining({ id: DEFAULT_PRESET_ID, groups: { syzygy: true } })]);
  });

  it("selects per engine — one engine's choice leaves another's as it was", async () => {
    const deep = await created("deep");
    const lite = await created("lite");
    await selectEnginePreset(SINGLE, deep);
    await selectEnginePreset(MULTI, lite);
    await selectEnginePreset(SINGLE, lite);

    const { presets, selections } = await reload();
    expect(selectedPresetOf(presets, selections, SINGLE).id).toBe(lite);
    expect(selectedPresetOf(presets, selections, MULTI).id).toBe(lite);
    expect(selectedPresetOf(presets, selections, "hosted:sf19").id).toBe(DEFAULT_PRESET_ID);
  });

  it("never deletes Default; deleting another sends its engines back to Default", async () => {
    expect(await deleteEnginePreset(DEFAULT_PRESET_ID)).toBe("default");
    const deep = await created("deep");
    await selectEnginePreset(SINGLE, deep);
    expect(await deleteEnginePreset(deep)).toBeUndefined();

    const { presets, selections } = await reload();
    expect(presets).toEqual([]);
    expect(selections).toEqual([]);
    expect(withDefaultPreset(presets).map((preset) => preset.id)).toEqual([DEFAULT_PRESET_ID]);
  });

  it(`keeps at most ${MAX_ENGINE_PRESETS} presets, Default among them`, async () => {
    for (let n = 1; n < MAX_ENGINE_PRESETS; n += 1) await created(`p${n}`);
    expect(await createEnginePreset("one too many")).toEqual({ problem: "too-many" });
    expect(enginePresetsSnapshot()).toHaveLength(MAX_ENGINE_PRESETS - 1);
  });

  it("imports presets and selections in one go, replacing an id it has", async () => {
    const deep = await created("deep");
    expect(
      await importEnginePresets({
        add: [{ id: deep, name: "deep (imported)", values: { Hash: 64 }, groups: {}, savedAt: "", updatedAt: "" }],
        remove: [],
        select: [{ id: SINGLE, presetId: deep, updatedAt: "" }],
      }),
    ).toBeUndefined();
    expect(enginePresetsSnapshot()?.map((preset) => preset.name)).toEqual(["deep (imported)"]);
    expect(enginePresetSelectionsSnapshot()).toEqual([{ id: SINGLE, presetId: deep, updatedAt: "" }]);
  });
});
