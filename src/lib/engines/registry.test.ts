import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EngineDescriptor, EngineHandle } from "../engineTypes";
import {
  BUILTIN_ENGINES,
  DEFAULT_ENGINE_ID,
  STOCKFISH_19_LITE_MULTI,
  STOCKFISH_19_LITE_SINGLE,
  describeEngines,
  engineAvailability,
  getEngine,
  listEngines,
  registerEngine,
  resolveEngine,
  subscribeEngines,
} from ".";

/*
  The registry is data and a few pure reads — availability is *computed* from
  `crossOriginIsolated`, never stored — so these tests pass the page's isolation
  in, as the functions allow, and stub the global where a caller reads it.
*/

const fake = (id: string, overrides: Partial<EngineDescriptor> = {}): EngineDescriptor => ({
  id,
  name: id,
  version: "1",
  kind: "local",
  capabilities: { maxDepth: 24, strength: "skill", multiThread: false },
  create: () => ({}) as EngineHandle,
  ...overrides,
});

const unregister: (() => void)[] = [];
const register = (descriptor: EngineDescriptor) => {
  unregister.push(registerEngine(descriptor));
  return descriptor;
};

afterEach(() => {
  unregister.splice(0).forEach((remove) => remove());
  vi.unstubAllGlobals();
});

describe("the shipped engines", () => {
  it("lists the 2019 build first, then the single-thread and multi-thread builds", () => {
    expect(listEngines().map((d) => d.id)).toEqual([
      "stockfish-2019-wasm",
      "stockfish-19-lite-single",
      "stockfish-19-lite-multi",
    ]);
    expect(DEFAULT_ENGINE_ID).toBe("stockfish-2019-wasm");
  });

  it("declares what each build is, as measured from its own uci reply", () => {
    const byId = Object.fromEntries(listEngines().map((d) => [d.id, d]));
    expect(byId["stockfish-2019-wasm"]).toMatchObject({
      version: "2019-08-15",
      capabilities: { strength: "skill", multiThread: false },
    });
    expect(byId["stockfish-19-lite-single"]).toMatchObject({
      version: "19",
      capabilities: { strength: "both", multiThread: false },
    });
    expect(byId["stockfish-19-lite-multi"]).toMatchObject({
      version: "19",
      requires: { crossOriginIsolated: true },
      capabilities: { strength: "both", multiThread: true },
    });
  });

  it("gives every engine a depth limit", () => {
    for (const descriptor of BUILTIN_ENGINES) {
      expect(descriptor.capabilities.maxDepth).toBeGreaterThan(0);
    }
  });
});

describe("the worker files of the shipped engines", () => {
  /*
    A descriptor names a URL under `public/stockfish/`; a typo is a board that
    never evaluates and an `error` event nobody reads. Build each handle with a
    Worker stub, take the URL it asked for, and look for that file — and the
    `.wasm` the worker script loads from beside it — on disk, with the licence.
  */
  const requested: string[] = [];
  beforeEach(() => {
    requested.length = 0;
    vi.stubGlobal(
      "Worker",
      class {
        constructor(url: string) {
          requested.push(url);
        }
        addEventListener() {}
        removeEventListener() {}
        postMessage() {}
        terminate() {}
      },
    );
  });

  it.each(BUILTIN_ENGINES.map((d) => [d.id, d] as const))(
    "%s: the worker script and its wasm exist",
    (_id, descriptor) => {
      descriptor.create().terminate();

      expect(requested).toHaveLength(1);
      const script = resolve("public", requested[0].replace(/^\//, ""));
      expect(existsSync(script)).toBe(true);
      // `x.js` and the 2019 build's `x.wasm.js` both load `x.wasm` from beside them.
      expect(existsSync(script.replace(/(\.wasm)?\.js$/, ".wasm"))).toBe(true);
    },
  );

  it.each([STOCKFISH_19_LITE_SINGLE, STOCKFISH_19_LITE_MULTI].map((d) => [d.id, d] as const))(
    "%s: a LICENSE (GPLv3) sits beside the binaries, and the README records the version",
    (id) => {
      const license = readFileSync(resolve("public/stockfish", id, "LICENSE"), "utf8");
      expect(license).toContain("GNU GENERAL PUBLIC LICENSE");
      expect(license).toContain("Version 3");

      const readme = readFileSync(resolve("public/stockfish/README.md"), "utf8");
      expect(readme).toContain(id);
    },
  );
});

describe("availability — read at runtime", () => {
  it("lists the multi-thread build as unavailable, with its reason, on a page that is not isolated", () => {
    expect(engineAvailability(STOCKFISH_19_LITE_MULTI, false)).toEqual({
      available: false,
      reason: "cross-origin-isolation",
    });
    expect(engineAvailability(STOCKFISH_19_LITE_SINGLE, false)).toEqual({ available: true });
  });

  it("makes it available once the page is cross-origin isolated", () => {
    expect(engineAvailability(STOCKFISH_19_LITE_MULTI, true)).toEqual({ available: true });
  });

  it("reads `crossOriginIsolated` from the page when not told", () => {
    // jsdom has no such global: not isolated.
    expect(engineAvailability(STOCKFISH_19_LITE_MULTI).available).toBe(false);

    vi.stubGlobal("crossOriginIsolated", true);
    expect(engineAvailability(STOCKFISH_19_LITE_MULTI).available).toBe(true);

    vi.stubGlobal("crossOriginIsolated", false);
    expect(engineAvailability(STOCKFISH_19_LITE_MULTI).available).toBe(false);
  });

  it("describes every engine with its availability, unavailable ones included", () => {
    const rows = describeEngines(false);
    expect(rows.map((r) => r.descriptor.id)).toEqual(listEngines().map((d) => d.id));
    expect(rows.find((r) => r.descriptor.id === "stockfish-19-lite-multi")?.availability).toEqual({
      available: false,
      reason: "cross-origin-isolation",
    });
    expect(rows.find((r) => r.descriptor.id === DEFAULT_ENGINE_ID)?.availability.available).toBe(true);
  });
});

describe("resolveEngine — an id that cannot run falls back to the default", () => {
  it("returns the engine asked for when it is registered and available", () => {
    expect(resolveEngine("stockfish-19-lite-single", false).id).toBe("stockfish-19-lite-single");
    expect(resolveEngine("stockfish-19-lite-multi", true).id).toBe("stockfish-19-lite-multi");
  });

  it("falls back for an unknown id", () => {
    expect(resolveEngine("stockfish-9000", true).id).toBe(DEFAULT_ENGINE_ID);
  });

  it("falls back for an engine this page cannot run", () => {
    expect(resolveEngine("stockfish-19-lite-multi", false).id).toBe(DEFAULT_ENGINE_ID);
  });

  it("is the default when there is no preference — today's behaviour", () => {
    expect(resolveEngine().id).toBe(DEFAULT_ENGINE_ID);
    expect(resolveEngine(undefined).id).toBe(DEFAULT_ENGINE_ID);
    expect(resolveEngine(null).id).toBe(DEFAULT_ENGINE_ID);
    expect(resolveEngine("").id).toBe(DEFAULT_ENGINE_ID);
  });
});

describe("a list that grows at runtime", () => {
  it("takes a registered engine, finds it by id and resolves to it", () => {
    const remote = register(fake("hosted-stockfish-18"));

    expect(getEngine("hosted-stockfish-18")).toBe(remote);
    expect(listEngines().at(-1)).toBe(remote);
    expect(resolveEngine("hosted-stockfish-18", false)).toBe(remote);
  });

  it("applies the same availability rule to an engine that arrived later", () => {
    register(fake("hosted-mt", { requires: { crossOriginIsolated: true } }));

    expect(resolveEngine("hosted-mt", false).id).toBe(DEFAULT_ENGINE_ID);
    expect(resolveEngine("hosted-mt", true).id).toBe("hosted-mt");
  });

  it("hands out the same array until the list changes (a stable snapshot)", () => {
    const before = listEngines();
    expect(listEngines()).toBe(before);

    register(fake("later"));
    expect(listEngines()).not.toBe(before);
  });

  it("tells subscribers about an addition and a removal, and stops after unsubscribe", () => {
    const listener = vi.fn();
    const stop = subscribeEngines(listener);

    const remove = registerEngine(fake("temp"));
    expect(listener).toHaveBeenCalledTimes(1);

    remove();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(getEngine("temp")).toBeUndefined();

    stop();
    register(fake("after"));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("replaces an engine registered under the same id, and lets only the owner remove it", () => {
    const first = fake("dup", { version: "1" });
    const second = fake("dup", { version: "2" });
    const removeFirst = registerEngine(first);
    unregister.push(registerEngine(second));

    expect(getEngine("dup")).toBe(second);
    expect(listEngines().filter((d) => d.id === "dup")).toHaveLength(1);

    removeFirst(); // replaced since — not its to remove
    expect(getEngine("dup")).toBe(second);
  });

  it("never removes the default engine — it is every fallback", () => {
    const replacement = fake(DEFAULT_ENGINE_ID);
    registerEngine(replacement)();

    expect(getEngine(DEFAULT_ENGINE_ID)).toBe(replacement);
    expect(resolveEngine("nope").id).toBe(DEFAULT_ENGINE_ID);
    // put the shipped one back for the tests after this
    registerEngine(BUILTIN_ENGINES[0]);
    expect(getEngine(DEFAULT_ENGINE_ID)).toBe(BUILTIN_ENGINES[0]);
  });
});
