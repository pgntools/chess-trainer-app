import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ENGINE_STORAGE_KEY,
  engineChoiceId,
  readStoredEngineId,
  storeEngineId,
  subscribeEngineChoice,
} from "./engineChoice";
import { DEFAULT_ENGINE_ID } from "./engines";

/*
  The engine preference (CTA-153): a `localStorage` id, read as "the shipped
  engine this page can run, else the default". Tests clear `localStorage`
  between files' tests (`src/test/setup.ts`), so each starts with no choice.
*/

const MULTI = "stockfish-19-lite-multi";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the engine preference", () => {
  it("is the default engine when nothing was chosen", () => {
    expect(readStoredEngineId()).toBeUndefined();
    expect(engineChoiceId()).toBe(DEFAULT_ENGINE_ID);
  });

  it("keeps a chosen engine in localStorage, and reads it back", () => {
    vi.stubGlobal("crossOriginIsolated", true);
    storeEngineId(MULTI);

    expect(localStorage.getItem(ENGINE_STORAGE_KEY)).toBe(MULTI);
    expect(readStoredEngineId()).toBe(MULTI);
    expect(engineChoiceId()).toBe(MULTI);
  });

  it("reads an id that names no shipped engine as the default — and leaves it stored", () => {
    localStorage.setItem(ENGINE_STORAGE_KEY, "stockfish-9000");

    expect(engineChoiceId()).toBe(DEFAULT_ENGINE_ID);
    // Not overwritten: a stored choice is the reader's, not the build's.
    expect(localStorage.getItem(ENGINE_STORAGE_KEY)).toBe("stockfish-9000");
  });

  it("reads the retired 2019 build's id as the default, without error (CTA-160)", () => {
    localStorage.setItem(ENGINE_STORAGE_KEY, "stockfish-2019-wasm");
    expect(engineChoiceId()).toBe(DEFAULT_ENGINE_ID);
  });

  it("ignores a write of an id the app does not ship", () => {
    storeEngineId("stockfish-9000");

    expect(localStorage.getItem(ENGINE_STORAGE_KEY)).toBeNull();
  });

  it("falls back for an engine this page cannot run, and returns to it where it can", () => {
    storeEngineId(MULTI);

    // jsdom is not cross-origin isolated.
    expect(engineChoiceId()).toBe(DEFAULT_ENGINE_ID);
    expect(readStoredEngineId()).toBe(MULTI);

    vi.stubGlobal("crossOriginIsolated", true);
    expect(engineChoiceId()).toBe(MULTI);
  });

  it("treats an empty stored value as no choice", () => {
    localStorage.setItem(ENGINE_STORAGE_KEY, "");
    expect(readStoredEngineId()).toBeUndefined();
  });

  it("still applies to this visit where storage refuses the write", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    vi.stubGlobal("crossOriginIsolated", true);
    expect(() => storeEngineId(MULTI)).not.toThrow();
    expect(readStoredEngineId()).toBe(MULTI);
    expect(engineChoiceId()).toBe(MULTI);
  });
});

describe("subscribeEngineChoice", () => {
  it("tells a subscriber about a choice, and stops after the unsubscribe", () => {
    const listener = vi.fn();
    const stop = subscribeEngineChoice(listener);

    storeEngineId(MULTI);
    expect(listener).toHaveBeenCalledTimes(1);

    stop();
    storeEngineId(DEFAULT_ENGINE_ID);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("follows another tab's write to the key (a `storage` event), and no other key", () => {
    const listener = vi.fn();
    const stop = subscribeEngineChoice(listener);

    window.dispatchEvent(new StorageEvent("storage", { key: "chessapp.theme" }));
    expect(listener).not.toHaveBeenCalled();

    window.dispatchEvent(new StorageEvent("storage", { key: ENGINE_STORAGE_KEY }));
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
  });
});
