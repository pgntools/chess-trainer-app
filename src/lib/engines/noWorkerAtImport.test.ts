import { afterEach, describe, expect, it, vi } from "vitest";

/*
  The pre-render (`src/entry-server.tsx`, run by Node) imports every screen —
  and so the engine modules — and Node has no `Worker`. An engine, a transport
  or a registry that built a worker at module scope would crash every page's
  static build, or, in a browser, start a worker nobody asked for and leak it
  across route changes. Nothing here may run until `create()` is called.
*/

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("importing the engine layer", () => {
  it("builds no Worker — registry, descriptors, the protocol, the transport, the hook", async () => {
    const Worker = vi.fn(function () {
      throw new Error("a Worker was constructed at import time");
    });
    vi.stubGlobal("Worker", Worker);
    vi.resetModules();

    await import("../uciEngine");
    await import("../workerTransport");
    const registry = await import(".");
    await import("../../views/board/core/useEngineModule");

    // Listing, describing and resolving are reads of data.
    expect(registry.BUILTIN_ENGINES.length).toBeGreaterThan(1);
    registry.describeEngines();
    registry.resolveEngine("stockfish-19-lite-multi");

    expect(Worker).not.toHaveBeenCalled();
  });

  it("builds a Worker only when a descriptor is asked to create its engine", async () => {
    const created: string[] = [];
    vi.stubGlobal(
      "Worker",
      class {
        constructor(url: string) {
          created.push(url);
        }
        addEventListener() {}
        removeEventListener() {}
        postMessage() {}
        terminate() {}
      },
    );
    vi.resetModules();
    const { STOCKFISH_19_LITE_SINGLE } = await import(".");
    expect(created).toEqual([]);

    STOCKFISH_19_LITE_SINGLE.create().terminate();

    expect(created).toHaveLength(1);
  });
});
