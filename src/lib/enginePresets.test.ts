import { describe, expect, it } from "vitest";

import {
  BROWSER_HASH_CEILING_MB,
  DEFAULT_PRESET_ID,
  defaultEnginePreset,
  enginePresetFrom,
  enginePresetRows,
  enginePresetSelectionFrom,
  isFilePathOption,
  optionDefaultValue,
  presetResetValue,
  resolveEnginePreset,
  selectedPresetOf,
  selectedPresetValues,
  withDefaultPreset,
  type EnginePreset,
} from "./enginePresets";
import type { EngineOption } from "./engineTypes";

const AT = "2026-10-10T10:00:00.000Z";

/** What the Stockfish 19 Lite single-thread build declares (CTA-179's investigation). */
const LITE: EngineOption[] = [
  { name: "Threads", type: "spin", defaultValue: "1", min: 1, max: 1 },
  { name: "Hash", type: "spin", defaultValue: "16", min: 1, max: 33554432 },
  { name: "Clear Hash", type: "button" },
  { name: "MultiPV", type: "spin", defaultValue: "1", min: 1, max: 256 },
  { name: "Skill Level", type: "spin", defaultValue: "20", min: 0, max: 20 },
  { name: "Move Overhead", type: "spin", defaultValue: "10", min: 0, max: 5000 },
  { name: "UCI_LimitStrength", type: "check", defaultValue: "false" },
  { name: "UCI_ShowWDL", type: "check", defaultValue: "false" },
  { name: "EvalFile", type: "string", defaultValue: "nn-37f18f62d772.nnue" },
];

/** The native build adds file paths a browser cannot take, and a combo. */
const NATIVE: EngineOption[] = [
  ...LITE.filter((option) => option.name !== "Threads"),
  { name: "Threads", type: "spin", defaultValue: "1", min: 1, max: 16 },
  { name: "SyzygyPath", type: "string", defaultValue: "<empty>" },
  { name: "Debug Log File", type: "string", defaultValue: "<empty>" },
  { name: "NumaPolicy", type: "string", defaultValue: "auto" },
  { name: "Style", type: "combo", defaultValue: "Normal", vars: ["Solid", "Normal", "Risky"] },
];

const preset = (id: string, values: EnginePreset["values"] = {}): EnginePreset => ({
  id,
  name: id,
  values,
  groups: {},
  savedAt: AT,
  updatedAt: AT,
});

describe("the presets and each engine's selection", () => {
  it("always has Default first — the stored one, or an empty one never stored", () => {
    expect(withDefaultPreset([])).toEqual([defaultEnginePreset()]);
    const stored = preset(DEFAULT_PRESET_ID, { UCI_ShowWDL: true });
    expect(withDefaultPreset([preset("deep"), stored]).map((p) => p.id)).toEqual([DEFAULT_PRESET_ID, "deep"]);
    expect(withDefaultPreset([preset("deep"), stored])[0]).toBe(stored);
  });

  it("gives each engine its own selection, and Default where it has none or its preset is gone", () => {
    const presets = [preset("deep"), preset("lite")];
    const selections = [
      { id: "stockfish-19-lite-single", presetId: "deep", updatedAt: AT },
      { id: "hosted:sf19", presetId: "gone", updatedAt: AT },
    ];
    expect(selectedPresetOf(presets, selections, "stockfish-19-lite-single").id).toBe("deep");
    expect(selectedPresetOf(presets, selections, "stockfish-19-lite-multi").id).toBe(DEFAULT_PRESET_ID);
    expect(selectedPresetOf(presets, selections, "hosted:sf19").id).toBe(DEFAULT_PRESET_ID);
  });

  it("hands the engine module the same values object from read to read, and none before both reads", () => {
    expect(selectedPresetValues(undefined, [], "x")).toBe(selectedPresetValues([], undefined, "y"));
    expect(selectedPresetValues([], [], "x")).toBe(selectedPresetValues([], [], "y"));
    const deep = preset("deep", { "Move Overhead": 50 });
    expect(selectedPresetValues([deep], [{ id: "x", presetId: "deep", updatedAt: AT }], "x")).toBe(deep.values);
  });

  it("reads a stored preset leniently: no id is dropped, a value that cannot be sent is", () => {
    expect(enginePresetFrom({ name: "x" })).toBeUndefined();
    expect(enginePresetFrom("nope")).toBeUndefined();
    expect(
      enginePresetFrom({
        id: "deep",
        name: "  deep-analysis  ",
        values: { Hash: 64, UCI_ShowWDL: true, SyzygyPath: "/tb", Bad: { nested: 1 }, Nan: Number.NaN, Line: "a\nb" },
        savedAt: AT,
      }),
    ).toEqual({
      id: "deep",
      name: "deep-analysis",
      values: { Hash: 64, UCI_ShowWDL: true, SyzygyPath: "/tb" },
      savedAt: AT,
      updatedAt: AT,
    });
    expect(enginePresetFrom({ id: DEFAULT_PRESET_ID })?.name).toBe("Default");
    expect(enginePresetSelectionFrom({ id: "e", presetId: "p" })).toEqual({ id: "e", presetId: "p", updatedAt: "" });
    expect(enginePresetSelectionFrom({ id: "e" })).toBeUndefined();
  });
});

describe("a preset against one engine (resolveEnginePreset)", () => {
  it("sends what the engine declares, in its type, and says why it skips the rest", () => {
    const { send, limits } = resolveEnginePreset(
      {
        "Move Overhead": 100,
        UCI_ShowWDL: "true",
        "Skill Level": 25,
        Threads: 4,
        Hash: 512,
        "Clear Hash": true,
        EvalFile: "custom.nnue",
        Contempt: 24,
      },
      LITE,
      { inBrowser: true },
    );
    expect(send).toEqual({ "Move Overhead": 100, UCI_ShowWDL: true, "Skill Level": 20 });
    expect(limits).toEqual({
      "Skill Level": { kind: "clamped", to: 20, min: 0, max: 20, browser: false },
      Threads: { kind: "board-owned" },
      Hash: { kind: "board-owned" },
      "Clear Hash": { kind: "button" },
      EvalFile: { kind: "browser-file" },
      Contempt: { kind: "absent" },
    });
  });

  it("never sends a file path to a browser build, and sends one to an engine server's", () => {
    const values = { SyzygyPath: "/tb/syzygy", "Debug Log File": "/tmp/sf.log", EvalFile: "nn.nnue" };
    expect(resolveEnginePreset(values, NATIVE, { inBrowser: true }).send).toEqual({});
    expect(resolveEnginePreset(values, NATIVE, { inBrowser: false }).send).toEqual(values);
    expect(isFilePathOption({ name: "NumaPolicy", type: "string" })).toBe(false);
    expect(isFilePathOption({ name: "EvalFileSmall", type: "string" })).toBe(true);
  });

  it("holds Hash under the browser's ceiling where the caller does not own it", () => {
    const { send, limits } = resolveEnginePreset({ Hash: 4096 }, LITE, { inBrowser: true, owned: [] });
    expect(send).toEqual({ Hash: BROWSER_HASH_CEILING_MB });
    expect(limits.Hash).toEqual({ kind: "clamped", to: 1024, min: 1, max: 1024, browser: true });
    expect(resolveEnginePreset({ Hash: 4096 }, NATIVE, { inBrowser: false, owned: [] }).send).toEqual({ Hash: 4096 });
  });

  it("refuses a value that is not of the option's type, and reads a combo's word in any case", () => {
    const { send, limits } = resolveEnginePreset(
      { Style: "risky", UCI_ShowWDL: "maybe", "Move Overhead": "lots", NumaPolicy: "none" },
      NATIVE,
      { inBrowser: false },
    );
    expect(send).toEqual({ Style: "Risky", NumaPolicy: "none" });
    expect(limits).toEqual({ UCI_ShowWDL: { kind: "invalid" }, "Move Overhead": { kind: "invalid" } });
  });

  it("leaves the caller's own names out — the boards' always win", () => {
    const { send, limits } = resolveEnginePreset({ "Skill Level": 5, UCI_ShowWDL: true }, LITE, {
      inBrowser: true,
      owned: ["Skill Level"],
    });
    expect(send).toEqual({ UCI_ShowWDL: true });
    expect(limits["Skill Level"]).toEqual({ kind: "board-owned" });
  });

  it("puts an option back with the default it declared, and nothing for one that cannot be sent", () => {
    const context = { inBrowser: true };
    expect(presetResetValue(LITE.find((o) => o.name === "Move Overhead"), context)).toBe(10);
    expect(presetResetValue(LITE.find((o) => o.name === "UCI_ShowWDL"), context)).toBe(false);
    expect(presetResetValue(LITE.find((o) => o.name === "EvalFile"), context)).toBeUndefined();
    expect(presetResetValue(LITE.find((o) => o.name === "Clear Hash"), context)).toBeUndefined();
    expect(presetResetValue(LITE.find((o) => o.name === "Hash"), context)).toBeUndefined();
    expect(presetResetValue(NATIVE.find((o) => o.name === "SyzygyPath"), { inBrowser: false })).toBe("");
  });

  it("reads each type's default", () => {
    expect(optionDefaultValue({ name: "a", type: "spin", defaultValue: "16" })).toBe(16);
    expect(optionDefaultValue({ name: "b", type: "check", defaultValue: "true" })).toBe(true);
    expect(optionDefaultValue({ name: "c", type: "string", defaultValue: "<empty>" })).toBe("");
    expect(optionDefaultValue({ name: "d", type: "button" })).toBeUndefined();
  });
});

describe("the form's rows (enginePresetRows)", () => {
  it("lists every declared option in order, the boards' own and a browser's file path read-only, then what the engine does not declare", () => {
    const rows = enginePresetRows({ "Move Overhead": 100, Contempt: 24 }, LITE, { inBrowser: true });
    expect(rows.map((row) => row.name)).toEqual([...LITE.map((option) => option.name), "Contempt"]);
    const byName = new Map(rows.map((row) => [row.name, row]));
    expect(byName.get("Move Overhead")).toMatchObject({ value: 100, set: true, editable: true, range: { min: 0, max: 5000 } });
    expect(byName.get("UCI_ShowWDL")).toMatchObject({ value: false, set: false, editable: true });
    expect(byName.get("Threads")).toMatchObject({ editable: false, note: "board-owned" });
    expect(byName.get("Hash")).toMatchObject({ editable: false, note: "board-owned", range: { min: 1, max: 1024 } });
    expect(byName.get("Clear Hash")).toMatchObject({ editable: false, note: "button" });
    expect(byName.get("EvalFile")).toMatchObject({ editable: false, note: "browser-file" });
    expect(byName.get("Skill Level")).toMatchObject({ editable: true, note: "play-owned", value: 20 });
    expect(byName.get("Contempt")).toMatchObject({ value: 24, set: true, editable: false, note: "absent" });
  });

  it("offers a file path on an engine server, and says when a value was held to the range", () => {
    const rows = enginePresetRows({ SyzygyPath: "/tb", "Move Overhead": 9999 }, NATIVE, { inBrowser: false });
    const byName = new Map(rows.map((row) => [row.name, row]));
    expect(byName.get("SyzygyPath")).toMatchObject({ editable: true, value: "/tb", set: true });
    expect(byName.get("Move Overhead")).toMatchObject({ value: 5000, note: "clamped" });
    expect(byName.get("Style")).toMatchObject({ editable: true, value: "Normal" });
  });
});
