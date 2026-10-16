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
  it("builds no Worker and asks no server — registry, descriptors, the protocol, the transport, the hook, the job runtime", async () => {
    const Worker = vi.fn(function () {
      throw new Error("a Worker was constructed at import time");
    });
    vi.stubGlobal("Worker", Worker);
    // The engine server is the reader's to turn on — and even one turned on is
    // asked only once a board or the Engine tab mounts, never at import.
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    localStorage.setItem("chessapp.engineServer", "http://127.0.0.1:8800");
    vi.resetModules();

    await import("../uciEngine");
    await import("../workerTransport");
    await import("../hostedEngine");
    await import("../engineServer");
    const registry = await import(".");
    await import("../../views/board/core/useEngineModule");
    // The background jobs (CTA-221): the page's runtime and its kinds — made lazily, started by the shell's effect, never at import.
    const runtime = await import("../jobs/runtime");
    await import("../jobs/kinds");

    // Listing, describing and resolving are reads of data.
    expect(registry.BUILTIN_ENGINES.length).toBeGreaterThan(1);
    registry.describeEngines();
    registry.resolveEngine("stockfish-19-lite-multi");
    registry.resolveEngine("hosted:stockfish-19");
    // Making the page's runtime touches nothing either — no database opened until it is started or asked.
    const open = vi.spyOn(indexedDB, "open");
    runtime.jobRuntime();
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();

    expect(Worker).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
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
