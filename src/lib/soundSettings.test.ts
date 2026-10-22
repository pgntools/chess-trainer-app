import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_SOUND_SETTINGS,
  readSoundSettings,
  resetSoundSettings,
  SOUND_SETTINGS_STORAGE_KEY,
  soundSettingsFrom,
  storeSoundSettings,
  subscribeSoundSettings,
} from "./soundSettings";

/* The move sounds' settings (CTA-260): a preference, read back field by field. */

afterEach(() => {
  localStorage.clear();
  resetSoundSettings();
  vi.restoreAllMocks();
});

describe("soundSettingsFrom", () => {
  it("reads nothing, or anything that is not an object, as the defaults — on, 70%, stepping on", () => {
    expect(DEFAULT_SOUND_SETTINGS).toEqual({ enabled: true, volume: 70, stepping: true });
    for (const value of [undefined, null, "on", 3, []]) expect(soundSettingsFrom(value)).toEqual(DEFAULT_SOUND_SETTINGS);
  });

  it("reads each field on its own — a bad one is its default, the others kept", () => {
    expect(soundSettingsFrom({ enabled: false, volume: "loud", stepping: 1 })).toEqual({ enabled: false, volume: 70, stepping: true });
    expect(soundSettingsFrom({ volume: Number.NaN, stepping: false })).toEqual({ enabled: true, volume: 70, stepping: false });
  });

  it("holds the volume to 0–100, a whole percent", () => {
    expect(soundSettingsFrom({ volume: 150 }).volume).toBe(100);
    expect(soundSettingsFrom({ volume: -5 }).volume).toBe(0);
    expect(soundSettingsFrom({ volume: 33.6 }).volume).toBe(34);
  });
});

describe("the preference", () => {
  it("is the defaults until the reader sets one, the same object read after read", () => {
    expect(readSoundSettings()).toEqual(DEFAULT_SOUND_SETTINGS);
    expect(readSoundSettings()).toBe(readSoundSettings());
  });

  it("keeps a change in localStorage and tells its subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSoundSettings(listener);
    storeSoundSettings({ volume: 40, stepping: false });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(SOUND_SETTINGS_STORAGE_KEY) ?? "null")).toEqual({ enabled: true, volume: 40, stepping: false });
    resetSoundSettings();
    expect(readSoundSettings()).toEqual({ enabled: true, volume: 40, stepping: false });
    unsubscribe();
  });

  it("writes nothing for a change that changes nothing, and holds what it writes", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSoundSettings(listener);
    storeSoundSettings({ enabled: true });
    expect(listener).not.toHaveBeenCalled();
    expect(localStorage.getItem(SOUND_SETTINGS_STORAGE_KEY)).toBeNull();
    storeSoundSettings({ volume: 250 });
    expect(readSoundSettings().volume).toBe(100);
    unsubscribe();
  });

  it("reads stored JSON that will not parse as the defaults", () => {
    localStorage.setItem(SOUND_SETTINGS_STORAGE_KEY, "{not json");
    expect(readSoundSettings()).toEqual(DEFAULT_SOUND_SETTINGS);
  });

  it("keeps a change for the visit when storage refuses it", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    storeSoundSettings({ enabled: false });
    expect(readSoundSettings().enabled).toBe(false);
  });

  it("follows another tab's change, through the storage event", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSoundSettings(listener);
    window.dispatchEvent(new StorageEvent("storage", { key: SOUND_SETTINGS_STORAGE_KEY }));
    window.dispatchEvent(new StorageEvent("storage", { key: "chessapp.theme" }));
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
