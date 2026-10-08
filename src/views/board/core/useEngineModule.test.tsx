import { StrictMode, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { DEFAULT_ENGINE_ID, STOCKFISH_19_LITE_MULTI } from "../../../lib/engines";
import { FakeEngine } from "../boardTestHarness";
import { useEngineModule, type EngineModuleStart } from "./useEngineModule";

/*
  The engine capability's own behaviour (CTA-152): which engine it builds, and
  that changing the choice replaces it. The boards' tests cover everything else
  through the same seam — the shipped descriptors, each building a `FakeEngine`
  that declares what its build declares (`builtinEnginesMock`).
*/

vi.mock("../../../lib/engines/builtin", async (importOriginal) =>
  (await import("../boardTestHarness")).builtinEnginesMock(importOriginal),
);

/** The multi-thread build: `Threads` adjustable (1–32), and runnable only on an isolated page. */
const MULTI = STOCKFISH_19_LITE_MULTI.id;

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const live = () => FakeEngine.instances.filter((engine) => !engine.terminated);

/*
  `uciOptions` must be a stable object (the hook documents it: three effects
  depend on it), so the default is one constant — a fresh `{}` per render would
  republish the options on every render and never settle.
*/
const NO_OPTIONS: Readonly<Record<string, number>> = {};

const start = (overrides: Partial<EngineModuleStart> = {}): EngineModuleStart => ({
  enabled: true,
  fen: START,
  depth: 12,
  moveTimeMs: 0,
  uciOptions: NO_OPTIONS,
  ...overrides,
});

/** The hook under test, its start arguments held by the renderer so they stay stable. */
const mount = (initialProps: EngineModuleStart, options: { wrapper?: ({ children }: { children: ReactNode }) => ReactNode } = {}) =>
  renderHook((props: EngineModuleStart) => useEngineModule(props), { initialProps, ...options });

beforeEach(() => {
  FakeEngine.reset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The engine a `FakeEngine` was built for. */
const builtFor = (engine: FakeEngine) => engine.descriptor?.id;

describe("useEngineModule — which engine", () => {
  it("builds the default engine when no choice is made", () => {
    const { result } = mount(start());

    expect(FakeEngine.instances).toHaveLength(1);
    expect(FakeEngine.latest().lastSearch).toBe(START);
    expect(result.current.descriptor.id).toBe(DEFAULT_ENGINE_ID);
    expect(builtFor(FakeEngine.latest())).toBe(DEFAULT_ENGINE_ID);
  });

  it("falls back to the default for an id the app does not ship — the retired 2019 build's too", () => {
    for (const engine of ["no-such-engine", "stockfish-2019-wasm"]) {
      FakeEngine.reset();
      const { result, unmount } = mount(start({ engine }));

      expect(result.current.descriptor.id).toBe(DEFAULT_ENGINE_ID);
      expect(FakeEngine.instances.map(builtFor)).toEqual([DEFAULT_ENGINE_ID]);
      unmount();
    }
  });

  it("falls back for an engine this page cannot run — and builds nothing for it", () => {
    // jsdom is not cross-origin isolated.
    const { result } = mount(start({ engine: MULTI }));

    expect(result.current.descriptor.id).toBe(DEFAULT_ENGINE_ID);
    expect(FakeEngine.instances.map(builtFor)).toEqual([DEFAULT_ENGINE_ID]);
  });

  it("builds the engine the choice names, where the page can run it", () => {
    vi.stubGlobal("crossOriginIsolated", true);
    const { result } = mount(start({ engine: MULTI }));

    expect(result.current.descriptor.id).toBe(MULTI);
    expect(FakeEngine.instances.map(builtFor)).toEqual([MULTI]);
    expect(FakeEngine.latest().lastSearch).toBe(START);
  });
});

describe("useEngineModule — changing the engine", () => {
  // The multi-thread build is the other engine to switch to, so the page is isolated.
  beforeEach(() => {
    vi.stubGlobal("crossOriginIsolated", true);
  });

  const switching = () => mount(start());

  it("terminates the old handle and builds the new one — one engine at a time", () => {
    const { rerender } = switching();
    const first = FakeEngine.latest();
    expect(live()).toEqual([first]);

    rerender(start({ engine: MULTI }));

    expect(first.terminated).toBe(true);
    expect(FakeEngine.instances).toHaveLength(2);
    expect(live()).toHaveLength(1);
    expect(builtFor(live()[0])).toBe(MULTI);
  });

  it("never has two engines alive, however often the choice changes", () => {
    const { rerender } = switching();

    for (const engine of [MULTI, undefined, MULTI, "no-such-engine", MULTI]) {
      rerender(start({ engine }));
      expect(live().length).toBeLessThanOrEqual(1);
    }
    expect(live()).toHaveLength(1);
  });

  it("does not build a second engine when the choice resolves to the one running", () => {
    const { rerender } = switching();

    // An unknown id resolves to the default, which is already running.
    rerender(start({ engine: "no-such-engine" }));
    rerender(start({ engine: DEFAULT_ENGINE_ID }));

    expect(FakeEngine.instances).toHaveLength(1);
  });

  it("searches the position on screen with the new engine", () => {
    const { rerender } = switching();
    const afterMove = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

    rerender(start({ engine: MULTI, fen: afterMove }));

    expect(FakeEngine.latest().searches).toEqual([afterMove]);
  });

  it("runs the handshake again: publishes the new engine's options and pushes the settings to it", () => {
    const uciOptions = { Threads: 4 };
    const { result, rerender } = mount(start({ uciOptions }));
    // The default build pins Threads to 1.
    expect(result.current.engineOptions.get("Threads")).toMatchObject({ min: 1, max: 1 });

    rerender(start({ uciOptions, engine: MULTI }));

    expect(result.current.engineOptions.get("Threads")).toMatchObject({ min: 1, max: 32 });
    expect(FakeEngine.latest().setOptions).toContainEqual(["Threads", 4]);
  });

  it("clamps the requested settings to what the new engine declares", () => {
    const uciOptions = { Threads: 4 };
    const onUciOptionsReady = vi.fn();
    const { rerender } = mount(start({ uciOptions, onUciOptionsReady }));
    // Pinned to 1 on the default build: the request is pulled down.
    expect(onUciOptionsReady).toHaveBeenLastCalledWith({ Threads: 1 });
    onUciOptionsReady.mockClear();

    // A screen that took the clamp asks for 1; the multi-thread engine keeps it as is.
    const taken = { Threads: 1 };
    rerender(start({ uciOptions: taken, onUciOptionsReady, engine: MULTI }));
    expect(onUciOptionsReady).not.toHaveBeenCalled();

    // And a request beyond its own bound is pulled to it.
    const tooMany = { Threads: 64 };
    rerender(start({ uciOptions: tooMany, onUciOptionsReady, engine: MULTI }));
    expect(onUciOptionsReady).toHaveBeenLastCalledWith({ Threads: 32 });
  });

  it("drops the previous engine's lines, and ignores anything the terminated one still says", () => {
    const { result, rerender } = switching();
    const first = FakeEngine.latest();
    act(() => {
      first.say({
        uciMessage: "info depth 12 score cp 30 pv e2e4 e7e5",
        fen: START,
        depth: 12,
        positionEvaluation: "30",
        pv: "e2e4 e7e5",
      });
    });
    expect(result.current.analysis.lines).toHaveLength(1);

    rerender(start({ engine: MULTI }));
    expect(result.current.analysis.lines).toHaveLength(0);

    act(() => {
      first.say({ uciMessage: "info depth 13", fen: START, depth: 13, positionEvaluation: "99", pv: "d2d4" });
    });
    expect(result.current.analysis.lines).toHaveLength(0);
  });

  it("keeps the scores already recorded for positions — the move list's marks", () => {
    const { result, rerender } = switching();
    act(() => {
      FakeEngine.latest().say({
        uciMessage: "info depth 12 score cp 30 pv e2e4",
        fen: START,
        depth: 12,
        positionEvaluation: "30",
        pv: "e2e4",
      });
      FakeEngine.latest().say({ uciMessage: "bestmove e2e4", fen: START, bestMove: "e2e4" });
    });
    expect(result.current.evalsByFen.has(START)).toBe(true);

    rerender(start({ engine: MULTI }));

    expect(result.current.evalsByFen.has(START)).toBe(true);
  });

  it("delivers the new engine's best move to the board that plays", () => {
    const onBestMove = vi.fn();
    const { rerender } = mount(start({ onBestMove }));

    rerender(start({ onBestMove, engine: MULTI }));
    act(() => {
      FakeEngine.latest().say({ uciMessage: "bestmove e2e4", fen: START, bestMove: "e2e4" });
    });

    expect(onBestMove).toHaveBeenCalledWith("e2e4", START);
  });
});

describe("useEngineModule — lifecycle", () => {
  it("terminates the running engine on unmount", () => {
    const { unmount } = mount(start());

    unmount();

    expect(live()).toHaveLength(0);
  });

  it("leaves one live engine under StrictMode's mount, unmount, mount", () => {
    vi.stubGlobal("crossOriginIsolated", true);
    const wrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;

    mount(start({ engine: MULTI }), { wrapper });

    expect(live()).toHaveLength(1);
    expect(builtFor(live()[0])).toBe(MULTI);
    expect(live()[0].lastSearch).toBe(START);
  });

  it("searches nothing while switched off", () => {
    // The options handshake still builds an engine — the Engine tab reads what it declares.
    mount(start({ enabled: false }));
    expect(FakeEngine.latest().searches).toEqual([]);
  });

  it("searches to the depth and time asked, or until stopped while infinite (CTA-160)", () => {
    const { rerender } = mount(start({ depth: 20, moveTimeMs: 0 }));
    const engine = FakeEngine.latest();
    expect(engine.searchOptions.at(-1)).toEqual({ depth: 20, movetime: 0 });

    rerender(start({ depth: 20, moveTimeMs: 0, infinite: true }));
    expect(engine.searchOptions.at(-1)).toEqual({ infinite: true });

    rerender(start({ depth: 20, moveTimeMs: 0, infinite: false }));
    expect(engine.searchOptions.at(-1)).toEqual({ depth: 20, movetime: 0 });
  });

  it("stops the engine when switched off, and searches the position on screen when switched back on", () => {
    const { rerender } = mount(start());
    const engine = FakeEngine.latest();

    rerender(start({ enabled: false }));
    expect(engine.stops).toBe(1);

    rerender(start());
    expect(engine.searches).toEqual([START, START]);
  });
});
