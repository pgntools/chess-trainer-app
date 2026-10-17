import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BUILTIN_ENGINES,
  DEFAULT_ENGINE_ID,
  STOCKFISH_19_LITE_MULTI,
  STOCKFISH_19_LITE_SINGLE,
  describeEngines,
  engineAvailability,
  getEngine,
  resolveEngine,
} from ".";
import { DEFAULT_ENGINE_NAME, DEFAULT_ENGINE_VERSION } from "./ids";

/*
  The registry is data and a few pure reads — availability is *computed* from
  `crossOriginIsolated`, never stored — so these tests pass the page's isolation
  in, as the functions allow, and stub the global where a caller reads it.
*/

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the shipped engines", () => {
  it("lists the single-thread build first — the default — then the multi-thread one", () => {
    expect(BUILTIN_ENGINES.map((d) => d.id)).toEqual([
      "stockfish-19-lite-single",
      "stockfish-19-lite-multi",
    ]);
    expect(DEFAULT_ENGINE_ID).toBe("stockfish-19-lite-single");
  });

  it("builds the default's descriptor from the identity a record and a preference name it by", () => {
    expect(getEngine(DEFAULT_ENGINE_ID)).toMatchObject({
      name: DEFAULT_ENGINE_NAME,
      version: DEFAULT_ENGINE_VERSION,
    });
  });

  it("declares what each build is, as measured from its own uci reply", () => {
    expect(STOCKFISH_19_LITE_SINGLE).toMatchObject({
      version: "19",
      capabilities: { strength: "both", multiThread: false },
    });
    expect(STOCKFISH_19_LITE_SINGLE.requires).toBeUndefined();
    expect(STOCKFISH_19_LITE_MULTI).toMatchObject({
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
      // `x.js` loads `x.wasm` from beside it.
      expect(existsSync(script.replace(/\.js$/, ".wasm"))).toBe(true);
    },
  );

  it.each(BUILTIN_ENGINES.map((d) => [d.id, d] as const))(
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
    expect(rows.map((r) => r.descriptor)).toEqual(BUILTIN_ENGINES);
    expect(rows.find((r) => r.descriptor.id === "stockfish-19-lite-multi")?.availability).toEqual({
      available: false,
      reason: "cross-origin-isolation",
    });
    expect(rows.find((r) => r.descriptor.id === DEFAULT_ENGINE_ID)?.availability.available).toBe(true);
  });
});

describe("resolveEngine — an id that cannot run falls back to the default", () => {
  it("returns the engine asked for when it is shipped and available", () => {
    expect(resolveEngine("stockfish-19-lite-single", false).id).toBe("stockfish-19-lite-single");
    expect(resolveEngine("stockfish-19-lite-multi", true).id).toBe("stockfish-19-lite-multi");
  });

  it("falls back for an unknown id — the retired 2019 build's among them (CTA-160)", () => {
    expect(resolveEngine("stockfish-9000", true).id).toBe(DEFAULT_ENGINE_ID);
    expect(resolveEngine("stockfish-2019-wasm", true).id).toBe(DEFAULT_ENGINE_ID);
    expect(getEngine("stockfish-2019-wasm")).toBeUndefined();
  });

  it("falls back for an engine this page cannot run", () => {
    expect(resolveEngine("stockfish-19-lite-multi", false).id).toBe(DEFAULT_ENGINE_ID);
  });

  it("is the default when there is no preference", () => {
    expect(resolveEngine().id).toBe(DEFAULT_ENGINE_ID);
    expect(resolveEngine(undefined).id).toBe(DEFAULT_ENGINE_ID);
    expect(resolveEngine(null).id).toBe(DEFAULT_ENGINE_ID);
    expect(resolveEngine("").id).toBe(DEFAULT_ENGINE_ID);
  });
});
