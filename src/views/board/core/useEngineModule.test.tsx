import { StrictMode, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { EngineDescriptor, EngineHandle } from "../../../lib/engineTypes";
import { registerEngine } from "../../../lib/engines";
import { FakeEngine } from "../boardTestHarness";
import { useEngineModule, type EngineModuleStart } from "./useEngineModule";

/*
  The engine capability's own behaviour (CTA-152): which engine it builds, and
  that changing the choice replaces it. The boards' tests cover everything else
  through the same `FakeEngine`, standing in for the default engine as it always
  has — which is why the default must still be `lib/engine`'s default export.
*/

vi.mock("../../../lib/engine", async () => ({
  default: (await import("../boardTestHarness")).FakeEngine,
}));

/** An engine that declares what the multi-thread build does: `Threads` adjustable. */
class WideEngine extends FakeEngine {
  override readonly options = new Map([
    ["Threads", { name: "Threads", type: "spin", min: 1, max: 32 }],
    ["UCI_Elo", { name: "UCI_Elo", type: "spin", min: 1320, max: 3190 }],
  ]);
}

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/*
  The harness's `FakeEngine` is looser than `EngineHandle` (its messages are
  plain records), by design — every board's tests build it through
  `vi.mock("lib/engine")`. A descriptor hands it out as the handle it stands in for.
*/
const descriptor = (
  id: string,
  create: () => FakeEngine,
  overrides: Partial<EngineDescriptor> = {},
): EngineDescriptor => ({
  id,
  name: id,
  version: "1",
  kind: "local",
  capabilities: { maxDepth: 24, strength: "both", multiThread: true },
  create: () => create() as unknown as EngineHandle,
  ...overrides,
});

const removers: (() => void)[] = [];
const register = (d: EngineDescriptor) => {
  removers.push(registerEngine(d));
  return d;
};

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
  removers.splice(0).forEach((remove) => remove());
  vi.unstubAllGlobals();
});

describe("useEngineModule — which engine", () => {
  it("builds the default engine when no choice is made — today's behaviour", () => {
    const { result } = mount(start());

    expect(FakeEngine.instances).toHaveLength(1);
    expect(FakeEngine.latest().lastSearch).toBe(START);
    expect(result.current.descriptor.id).toBe("stockfish-2019-wasm");
  });

  it("builds the engine the choice names", () => {
    const wide = register(descriptor("wide", () => new WideEngine()));
    const { result } = mount(start({ engine: "wide" }));

    expect(FakeEngine.instances).toHaveLength(1);
    expect(FakeEngine.latest()).toBeInstanceOf(WideEngine);
    expect(FakeEngine.latest().lastSearch).toBe(START);
    expect(result.current.descriptor).toBe(wide);
  });

  it("falls back to the default for an id nobody registered", () => {
    const { result } = mount(start({ engine: "no-such-engine" }));

    expect(FakeEngine.latest()).not.toBeInstanceOf(WideEngine);
    expect(result.current.descriptor.id).toBe("stockfish-2019-wasm");
  });

  it("falls back for an engine this page cannot run — and builds nothing for it", () => {
    const create = vi.fn(() => new WideEngine());
    register(descriptor("needs-isolation", create, { requires: { crossOriginIsolated: true } }));

    // jsdom is not cross-origin isolated.
    const { result } = mount(start({ engine: "needs-isolation" }));

    expect(create).not.toHaveBeenCalled();
    expect(result.current.descriptor.id).toBe("stockfish-2019-wasm");
  });

  it("uses an engine that needs isolation once the page has it", () => {
    vi.stubGlobal("crossOriginIsolated", true);
    const wide = register(
      descriptor("needs-isolation", () => new WideEngine(), { requires: { crossOriginIsolated: true } }),
    );

    const { result } = mount(start({ engine: "needs-isolation" }));

    expect(result.current.descriptor).toBe(wide);
    expect(FakeEngine.latest()).toBeInstanceOf(WideEngine);
  });
});

describe("useEngineModule — changing the engine", () => {
  const switching = () => {
    register(descriptor("wide", () => new WideEngine()));
    return mount(start());
  };

  it("terminates the old handle and builds the new one — one engine at a time", () => {
    const { rerender } = switching();
    const first = FakeEngine.latest();
    expect(live()).toEqual([first]);

    rerender(start({ engine: "wide" }));

    expect(first.terminated).toBe(true);
    expect(FakeEngine.instances).toHaveLength(2);
    expect(live()).toHaveLength(1);
    expect(live()[0]).toBeInstanceOf(WideEngine);
  });

  it("never has two engines alive, however often the choice changes", () => {
    const { rerender } = switching();

    for (const engine of ["wide", undefined, "wide", "no-such-engine", "wide"]) {
      rerender(start({ engine }));
      expect(live().length).toBeLessThanOrEqual(1);
    }
    expect(live()).toHaveLength(1);
  });

  it("does not build a second engine when the choice resolves to the one running", () => {
    const { rerender } = switching();

    // An unknown id resolves to the default, which is already running.
    rerender(start({ engine: "no-such-engine" }));
    rerender(start({ engine: "stockfish-2019-wasm" }));

    expect(FakeEngine.instances).toHaveLength(1);
  });

  it("searches the position on screen with the new engine", () => {
    const { rerender } = switching();
    const afterMove = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

    rerender(start({ engine: "wide", fen: afterMove }));

    expect(FakeEngine.latest().searches).toEqual([afterMove]);
  });

  it("runs the handshake again: publishes the new engine's options and pushes the settings to it", () => {
    const uciOptions = { Threads: 4 };
    register(descriptor("wide", () => new WideEngine()));
    const { result, rerender } = mount(start({ uciOptions }));
    // The default build pins Threads to 1.
    expect(result.current.engineOptions.get("Threads")).toMatchObject({ min: 1, max: 1 });

    rerender(start({ uciOptions, engine: "wide" }));

    expect(result.current.engineOptions.get("Threads")).toMatchObject({ min: 1, max: 32 });
    expect(result.current.engineOptions.has("UCI_Elo")).toBe(true);
    expect(FakeEngine.latest().setOptions).toContainEqual(["Threads", 4]);
  });

  it("clamps the requested settings to what the new engine declares", () => {
    const uciOptions = { Threads: 4 };
    const onUciOptionsReady = vi.fn();
    register(descriptor("wide", () => new WideEngine()));
    const { rerender } = mount(start({ uciOptions, onUciOptionsReady }));
    // Pinned to 1 on the default build: the request is pulled down.
    expect(onUciOptionsReady).toHaveBeenLastCalledWith({ Threads: 1 });
    onUciOptionsReady.mockClear();

    // A screen that took the clamp asks for 1; the wide engine keeps it as is.
    const taken = { Threads: 1 };
    rerender(start({ uciOptions: taken, onUciOptionsReady, engine: "wide" }));
    expect(onUciOptionsReady).not.toHaveBeenCalled();

    // And a request beyond the wide engine's own bound is pulled to it.
    const tooMany = { Threads: 64 };
    rerender(start({ uciOptions: tooMany, onUciOptionsReady, engine: "wide" }));
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

    rerender(start({ engine: "wide" }));
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

    rerender(start({ engine: "wide" }));

    expect(result.current.evalsByFen.has(START)).toBe(true);
  });

  it("delivers the new engine's best move to the board that plays", () => {
    const onBestMove = vi.fn();
    register(descriptor("wide", () => new WideEngine()));
    const { rerender } = mount(start({ onBestMove }));

    rerender(start({ onBestMove, engine: "wide" }));
    act(() => {
      FakeEngine.latest().say({ uciMessage: "bestmove e2e4", fen: START, bestMove: "e2e4" });
    });

    expect(onBestMove).toHaveBeenCalledWith("e2e4", START);
  });
});

describe("useEngineModule — lifecycle", () => {
  it("terminates the running engine on unmount", () => {
    register(descriptor("wide", () => new WideEngine()));
    const { unmount } = mount(start({ engine: "wide" }));

    unmount();

    expect(live()).toHaveLength(0);
  });

  it("leaves one live engine under StrictMode's mount, unmount, mount", () => {
    register(descriptor("wide", () => new WideEngine()));
    const wrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;

    mount(start({ engine: "wide" }), { wrapper });

    expect(live()).toHaveLength(1);
    expect(live()[0]).toBeInstanceOf(WideEngine);
    expect(live()[0].lastSearch).toBe(START);
  });

  it("searches nothing while switched off", () => {
    // The options handshake still builds an engine — the Engine tab reads what it declares.
    mount(start({ enabled: false }));
    expect(FakeEngine.latest().searches).toEqual([]);
  });
});
