import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ENGINE_STORAGE_KEY,
  engineChoiceId,
  readStoredEngineId,
  storeEngineId,
  subscribeEngineChoice,
} from "./engineChoice";
import type { EngineDescriptor, EngineHandle } from "./engineTypes";
import { DEFAULT_ENGINE_ID, registerEngine } from "./engines";

/*
  The engine preference (CTA-153): a `localStorage` id, read as "the registered
  engine this page can run, else the default". Tests clear `localStorage`
  between files' tests (`src/test/setup.ts`), so each starts with no choice.
*/

const fake = (id: string, requires?: EngineDescriptor["requires"]): EngineDescriptor => ({
  id,
  name: id,
  version: "1",
  kind: "local",
  ...(requires === undefined ? {} : { requires }),
  capabilities: { maxDepth: 24, strength: "skill", multiThread: false },
  create: () => ({}) as EngineHandle,
});

const removers: (() => void)[] = [];
afterEach(() => {
  removers.splice(0).forEach((remove) => remove());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the engine preference", () => {
  it("is the default engine when nothing was chosen", () => {
    expect(readStoredEngineId()).toBeUndefined();
    expect(engineChoiceId()).toBe(DEFAULT_ENGINE_ID);
  });

  it("keeps a chosen registered engine in localStorage, and reads it back", () => {
    storeEngineId("stockfish-19-lite-single");

    expect(localStorage.getItem(ENGINE_STORAGE_KEY)).toBe("stockfish-19-lite-single");
    expect(readStoredEngineId()).toBe("stockfish-19-lite-single");
    expect(engineChoiceId()).toBe("stockfish-19-lite-single");
  });

  it("reads an id that names no registered engine as the default — and leaves it stored", () => {
    localStorage.setItem(ENGINE_STORAGE_KEY, "stockfish-9000");

    expect(engineChoiceId()).toBe(DEFAULT_ENGINE_ID);
    // Not overwritten: should that engine be registered later, the choice comes back.
    expect(localStorage.getItem(ENGINE_STORAGE_KEY)).toBe("stockfish-9000");
  });

  it("ignores a write of an id nobody registered", () => {
    storeEngineId("stockfish-9000");

    expect(localStorage.getItem(ENGINE_STORAGE_KEY)).toBeNull();
  });

  it("falls back for an engine this page cannot run, and returns to it where it can", () => {
    storeEngineId("stockfish-19-lite-multi");

    // jsdom is not cross-origin isolated.
    expect(engineChoiceId()).toBe(DEFAULT_ENGINE_ID);
    expect(readStoredEngineId()).toBe("stockfish-19-lite-multi");

    vi.stubGlobal("crossOriginIsolated", true);
    expect(engineChoiceId()).toBe("stockfish-19-lite-multi");
  });

  it("resolves a stored id once the registry has the engine — an engine added at runtime", () => {
    localStorage.setItem(ENGINE_STORAGE_KEY, "hosted-later");
    expect(engineChoiceId()).toBe(DEFAULT_ENGINE_ID);

    removers.push(registerEngine(fake("hosted-later")));

    expect(engineChoiceId()).toBe("hosted-later");
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

    expect(() => storeEngineId("stockfish-19-lite-single")).not.toThrow();
    expect(readStoredEngineId()).toBe("stockfish-19-lite-single");
    expect(engineChoiceId()).toBe("stockfish-19-lite-single");
  });
});

describe("subscribeEngineChoice", () => {
  it("tells a subscriber about a choice, and stops after the unsubscribe", () => {
    const listener = vi.fn();
    const stop = subscribeEngineChoice(listener);

    storeEngineId("stockfish-19-lite-single");
    expect(listener).toHaveBeenCalledTimes(1);

    stop();
    storeEngineId(DEFAULT_ENGINE_ID);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("tells a subscriber when the registry grows, which can make a stored id resolvable", () => {
    const listener = vi.fn();
    const stop = subscribeEngineChoice(listener);

    removers.push(registerEngine(fake("grown")));

    expect(listener).toHaveBeenCalled();
    stop();
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
