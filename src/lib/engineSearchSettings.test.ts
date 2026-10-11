import { afterEach, describe, expect, it, vi } from "vitest";

import { analysisSettingsFrom } from "./analysisSettings";
import {
  DEFAULT_ENGINE_SEARCH_SETTINGS,
  ENGINE_SEARCH_SETTINGS_STORAGE_KEY,
  engineSearchSettingsFrom,
  heldToEngine,
  readSearchPreferences,
  resetSearchPreferences,
  searchSettingLimitsOf,
  searchSettingsChanges,
  storeSearchPreferences,
  subscribeSearchPreferences,
  withRecordedSettings,
} from "./engineSearchSettings";
import { engineSettingsFrom } from "./engineSettings";

/*
  The engine's search settings, one set for every board (CTA-181): the
  preference (the lines, Threads and Hash — the depth and move time are the
  preset's since CTA-185, `engineSearchInEffect.test.ts`), the normaliser,
  what the engine running takes, and a record's settings against the ones in
  effect.
*/

afterEach(() => {
  localStorage.clear();
  resetSearchPreferences();
});

describe("the preference — lines, Threads and Hash", () => {
  it("is the defaults until the reader sets one — the Analysis Board's own", () => {
    expect(readSearchPreferences()).toEqual({ multiPv: 3, threads: 1, hashMb: 16 });
    expect(readSearchPreferences()).toBe(readSearchPreferences());
  });

  it("keeps a change in localStorage, beside the engine choice, and tells its subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSearchPreferences(listener);
    storeSearchPreferences({ multiPv: 5, hashMb: 64 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(readSearchPreferences()).toEqual({ multiPv: 5, threads: 1, hashMb: 64 });
    expect(JSON.parse(localStorage.getItem(ENGINE_SEARCH_SETTINGS_STORAGE_KEY) ?? "{}")).toEqual({ multiPv: 5, threads: 1, hashMb: 64 });
    // The same object until it changes again: what useSyncExternalStore needs.
    expect(readSearchPreferences()).toBe(readSearchPreferences());
    // A patch that changes nothing writes nothing.
    storeSearchPreferences({ multiPv: 5 });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("reads a depth or move time an older build stored as nothing — the preset's now (CTA-185)", () => {
    localStorage.setItem(ENGINE_SEARCH_SETTINGS_STORAGE_KEY, JSON.stringify({ depth: 24, moveTimeMs: 5000, multiPv: 4 }));
    expect(readSearchPreferences()).toEqual({ multiPv: 4, threads: 1, hashMb: 16 });
  });

  it("hears another tab's write", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSearchPreferences(listener);
    window.dispatchEvent(new StorageEvent("storage", { key: ENGINE_SEARCH_SETTINGS_STORAGE_KEY }));
    window.dispatchEvent(new StorageEvent("storage", { key: "chessapp.theme" }));
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("reads unreadable text as the defaults", () => {
    localStorage.setItem(ENGINE_SEARCH_SETTINGS_STORAGE_KEY, "{not json");
    expect(readSearchPreferences()).toEqual({ multiPv: 3, threads: 1, hashMb: 16 });
  });
});

describe("engineSearchSettingsFrom — the normaliser", () => {
  it("fills what is missing or mistyped with the default and holds a number to its bounds", () => {
    expect(engineSearchSettingsFrom({ depth: 120, multiPv: 0, moveTimeMs: 999_999_999, infinite: "yes", threads: 2.6 })).toEqual({
      ...DEFAULT_ENGINE_SEARCH_SETTINGS,
      depth: 99,
      multiPv: 1,
      moveTimeMs: 86_400_000,
      threads: 3,
    });
    expect(engineSearchSettingsFrom(null)).toEqual(DEFAULT_ENGINE_SEARCH_SETTINGS);
  });

  it("keeps Threads and Hash as asked, past the in-browser ceilings — never cut back in the store", () => {
    expect(engineSearchSettingsFrom({ threads: 48, hashMb: 4096 })).toMatchObject({ threads: 48, hashMb: 4096 });
  });
});

describe("what the engine running takes", () => {
  const device = { hardwareConcurrency: 8, deviceMemory: 4 };

  it("a single-thread build: one thread, the device's Hash", () => {
    expect(searchSettingLimitsOf({ id: "stockfish-19-lite-single", capabilities: { maxDepth: 245, strength: "both", multiThread: false } }, device)).toEqual({
      threads: 1,
      hashMb: 512,
    });
  });

  it("a multi-thread build: what the device gives it", () => {
    expect(searchSettingLimitsOf({ id: "stockfish-19-lite-multi", capabilities: { maxDepth: 245, strength: "both", multiThread: true } }, device)).toEqual({
      threads: 7,
      hashMb: 512,
    });
  });

  it("holds a request to them, saying which moved", () => {
    const settings = { ...DEFAULT_ENGINE_SEARCH_SETTINGS, threads: 4, hashMb: 1024 };
    expect(heldToEngine(settings, { threads: 1, hashMb: 512 })).toEqual({
      settings: { ...settings, threads: 1, hashMb: 512 },
      held: ["threads", "hashMb"],
    });
    const fits = { ...DEFAULT_ENGINE_SEARCH_SETTINGS };
    expect(heldToEngine(fits, { threads: 8, hashMb: 512 }).settings).toBe(fits);
    expect(heldToEngine(fits, { threads: 8, hashMb: 512 }).held).toEqual([]);
  });
});

describe("searchSettingsChanges — a record's settings against the ones in effect", () => {
  const current = { ...DEFAULT_ENGINE_SEARCH_SETTINGS, depth: 24 };

  it("lists each setting that differs, the record's value and the current one, in the menu's order", () => {
    const recorded = analysisSettingsFrom({ depth: 18, multiPv: 2, moveTimeMs: 0, infinite: false, threads: 1, hashMb: 64, writeEvals: true });
    expect(searchSettingsChanges(recorded, current)).toEqual([
      { field: "multiPv", recorded: 2, current: 3 },
      { field: "depth", recorded: 18, current: 24 },
      { field: "hashMb", recorded: 64, current: 16 },
    ]);
  });

  it("is empty where they agree", () => {
    expect(searchSettingsChanges(analysisSettingsFrom({ ...current, writeEvals: false }), current)).toEqual([]);
  });

  it("skips a field the stored record did not carry — read as its default, never chosen", () => {
    // A record from before Threads and Hash (CTA-160).
    const older = analysisSettingsFrom({ depth: 24, multiPv: 3, moveTimeMs: 0 });
    expect(searchSettingsChanges(older, { ...current, threads: 4, hashMb: 256 })).toEqual([]);
  });

  it("compares a played game's settings", () => {
    const game = engineSettingsFrom({ skillLevel: 10, elo: 1800, depth: 14, multiPv: 3, moveTimeMs: 1000, threads: 1, hashMb: 16, playAs: "white" });
    expect(searchSettingsChanges(game, DEFAULT_ENGINE_SEARCH_SETTINGS)).toEqual([
      { field: "depth", recorded: 14, current: 20 },
      { field: "moveTimeMs", recorded: 1000, current: 0 },
    ]);
  });

  it("puts the record's values back into the settings in effect", () => {
    const changes = [
      { field: "depth", recorded: 18, current: 24 },
      { field: "moveTimeMs", recorded: 5000, current: 0 },
    ] as const;
    expect(withRecordedSettings(current, changes)).toEqual({ ...current, depth: 18, moveTimeMs: 5000 });
  });
});

describe("infinite analysis, gone (CTA-185)", () => {
  it("reads a stored infinite as nothing — every search stops at its depth or move time", () => {
    localStorage.setItem(ENGINE_SEARCH_SETTINGS_STORAGE_KEY, JSON.stringify({ multiPv: 4, infinite: true }));
    expect(readSearchPreferences()).toEqual({ multiPv: 4, threads: 1, hashMb: 16 });
    expect(engineSearchSettingsFrom({ infinite: true })).toEqual(DEFAULT_ENGINE_SEARCH_SETTINGS);
  });

  it("never names an older record's infinite as a change", () => {
    expect(searchSettingsChanges(analysisSettingsFrom({ ...DEFAULT_ENGINE_SEARCH_SETTINGS, infinite: true }), DEFAULT_ENGINE_SEARCH_SETTINGS)).toEqual([]);
  });
});
