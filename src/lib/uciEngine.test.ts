import { describe, expect, it, vi } from "vitest";
import type { EngineHandle, UciTransport } from "./engineTypes";
import { DEFAULT_MAX_DEPTH, UciEngine } from "./uciEngine";

/*
  `UciEngine` over a transport that is only a log and a way to say things back:
  no `Worker`, no jsdom stand-in for one. That nothing here mentions a Worker is
  the point (CTA-152) — the protocol discipline belongs to the engine, and the
  wire is replaceable. `engine.test.ts` covers the same class through the
  default `Engine`, over a fake worker.
*/

class FakeTransport implements UciTransport {
  readonly sent: string[] = [];
  closed = false;
  private listeners = new Set<(line: string) => void>();

  send(line: string) {
    this.sent.push(line);
  }

  onLine(callback: (line: string) => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  close() {
    this.closed = true;
  }

  /** The engine says one line. */
  say(line: string) {
    [...this.listeners].forEach((listener) => listener(line));
  }

  get listenerCount() {
    return this.listeners.size;
  }

  /** What a Stockfish 19 single-thread build declares: `Threads` pinned, Elo present. */
  completeHandshake() {
    this.say("id name Stockfish 19 Lite WASM");
    this.say("option name Threads type spin default 1 min 1 max 1");
    this.say("option name Hash type spin default 16 min 1 max 33554432");
    this.say("option name MultiPV type spin default 1 min 1 max 256");
    this.say("option name Skill Level type spin default 20 min 0 max 20");
    this.say("option name UCI_LimitStrength type check default false");
    this.say("option name UCI_Elo type spin default 1320 min 1320 max 3190");
    this.say("uciok");
  }
}

const build = (config?: ConstructorParameters<typeof UciEngine>[1]) => {
  const transport = new FakeTransport();
  const engine = new UciEngine(transport, config);
  return { engine, transport };
};

const ready = (config?: ConstructorParameters<typeof UciEngine>[1]) => {
  const { engine, transport } = build(config);
  transport.completeHandshake();
  transport.sent.length = 0;
  return { engine, transport };
};

describe("UciEngine over a transport", () => {
  it("is an EngineHandle — the surface a board depends on", () => {
    const { engine } = build();
    const handle: EngineHandle = engine;
    expect(typeof handle.search).toBe("function");
    expect(typeof handle.stop).toBe("function");
    expect(typeof handle.setOption).toBe("function");
    expect(typeof handle.whenOptionsReady).toBe("function");
    expect(typeof handle.onMessage).toBe("function");
    expect(typeof handle.terminate).toBe("function");
    expect(handle.options).toBeInstanceOf(Map);
  });

  it("subscribes to the wire before it says anything, then opens the handshake", () => {
    const { transport } = build();
    expect(transport.listenerCount).toBe(1);
    expect(transport.sent).toEqual(["uci", "isready"]);
  });

  it("collects the declared options and reports them once at uciok", () => {
    const { engine, transport } = build();
    const onReady = vi.fn();
    engine.whenOptionsReady(onReady);

    expect(onReady).not.toHaveBeenCalled();
    transport.completeHandshake();

    expect(onReady).toHaveBeenCalledTimes(1);
    expect(engine.options.get("UCI_Elo")).toMatchObject({ min: 1320, max: 3190 });
    expect(engine.options.get("Threads")).toMatchObject({ min: 1, max: 1 });
  });

  it("sends nothing but the handshake before uciok, then options first and the search after", () => {
    const { engine, transport } = build();
    transport.sent.length = 0;

    engine.setOption("MultiPV", 3);
    engine.search("fen-a", { depth: 12 });
    expect(transport.sent).toEqual([]);

    transport.completeHandshake();
    expect(transport.sent).toEqual([
      "setoption name MultiPV value 3",
      "position fen fen-a",
      "go depth 12",
    ]);
  });

  it("never sends a pinned option, nor one the engine does not have", () => {
    const { engine, transport } = ready();

    expect(engine.setOption("Threads", 1)).toBe(false);
    expect(engine.setOption("Nonsense", 1)).toBe(false);
    expect(engine.setOption("UCI_Elo", 1800)).toBe(true);

    expect(transport.sent).toEqual(["setoption name UCI_Elo value 1800"]);
  });

  it("holds an option back from a running search and stops it instead", () => {
    const { engine, transport } = ready();
    engine.search("fen-a");
    transport.sent.length = 0;

    engine.setOption("Skill Level", 5);
    expect(transport.sent).toEqual(["stop"]);

    transport.say("bestmove e2e4");
    expect(transport.sent).toContain("setoption name Skill Level value 5");
  });

  it("stamps a result with the position it was searched for", () => {
    const { engine, transport } = ready();
    const seen: (string | undefined)[] = [];
    engine.onMessage((message) => seen.push(message.fen));

    engine.search("fen-a");
    transport.say("info depth 12 score cp 40 pv e2e4 e7e5");

    expect(seen.at(-1)).toBe("fen-a");
  });

  it("closes the wire on terminate, after asking the engine to quit", () => {
    const { engine, transport } = ready();
    const listener = vi.fn();
    engine.onMessage(listener);

    engine.terminate();

    expect(transport.sent).toContain("quit");
    expect(transport.closed).toBe(true);
    expect(transport.listenerCount).toBe(0);

    transport.say("info depth 1 score cp 0 pv e2e4");
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("UciEngine's depth limit — the descriptor's maxDepth", () => {
  it("defaults to 24", () => {
    const { engine, transport } = ready();
    engine.search("fen", { depth: 99 });
    expect(DEFAULT_MAX_DEPTH).toBe(24);
    expect(transport.sent.at(-1)).toBe("go depth 24");
  });

  it("takes the engine's own limit, lower or higher", () => {
    const low = ready({ maxDepth: 10 });
    low.engine.search("fen", { depth: 20 });
    expect(low.transport.sent.at(-1)).toBe("go depth 10");

    const high = ready({ maxDepth: 40 });
    high.engine.search("fen", { depth: 35 });
    expect(high.transport.sent.at(-1)).toBe("go depth 35");
    high.transport.say("bestmove e2e4");
    high.engine.search("fen", { depth: 99 });
    expect(high.transport.sent.at(-1)).toBe("go depth 40");
  });
});
