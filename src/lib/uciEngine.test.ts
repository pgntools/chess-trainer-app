import { describe, expect, it, vi } from "vitest";
import type { EngineHandle, EngineMessage, UciTransport } from "./engineTypes";
import { DEFAULT_MAX_DEPTH, parseEngineOption, UciEngine } from "./uciEngine";

/*
  `UciEngine` over a transport that is only a log and a way to say things back:
  no `Worker`, no jsdom stand-in for one. That nothing here mentions a Worker is
  the point (CTA-152) — the protocol discipline belongs to the engine, and the
  wire is replaceable (`workerTransport.test.ts` covers the Worker).
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

  /** What the Stockfish 19 single-thread build declares: `Threads` pinned, Elo present. */
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

/**
 * An engine past its handshake and idle, with the log cleared — the state most
 * of these tests are about. Nothing goes on the wire before `uciok`, so a
 * search test that skipped this would be asserting on an engine still starting up.
 */
const ready = (config?: ConstructorParameters<typeof UciEngine>[1]) => {
  const { engine, transport } = build(config);
  transport.completeHandshake();
  transport.sent.length = 0;
  return { engine, transport };
};

const collect = (engine: UciEngine) => {
  const seen: EngineMessage[] = [];
  engine.onMessage((message) => seen.push(message));
  return seen;
};

describe("parseEngineOption", () => {
  it("keeps a multi-word option name together", () => {
    // The reason this is tokenised rather than one regex: "Skill Level" and
    // "Debug Log File" are single option names with spaces in them.
    expect(parseEngineOption("option name Skill Level type spin default 20 min 0 max 20"))
      .toMatchObject({ name: "Skill Level", type: "spin", min: 0, max: 20 });
  });

  it("reads a spin's bounds and default", () => {
    expect(
      parseEngineOption("option name Threads type spin default 1 min 1 max 128"),
    ).toMatchObject({ name: "Threads", defaultValue: "1", min: 1, max: 128 });
  });

  it("collects a combo's permitted values", () => {
    expect(
      parseEngineOption(
        "option name Analysis Contempt type combo default Both var Off var White var Black var Both",
      ),
    ).toMatchObject({
      name: "Analysis Contempt",
      type: "combo",
      vars: ["Off", "White", "Black", "Both"],
    });
  });

  it("leaves bounds undefined when the engine gave none", () => {
    const option = parseEngineOption("option name Ponder type check default false");
    expect(option?.min).toBeUndefined();
    expect(option?.max).toBeUndefined();
  });

  it("ignores every line that is not an option declaration", () => {
    expect(parseEngineOption("uciok")).toBeNull();
    expect(parseEngineOption("info depth 12 score cp 30")).toBeNull();
    expect(parseEngineOption("option name Broken")).toBeNull();
  });
});

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
    expect(transport.sent).toEqual(["uci"]);
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

describe("UciEngine option discovery", () => {
  it("collects the declared options and reports them once at uciok", () => {
    const { engine, transport } = build();
    const onReady = vi.fn();
    engine.whenOptionsReady(onReady);

    expect(onReady).not.toHaveBeenCalled();
    expect(engine.options.size).toBe(0);
    transport.completeHandshake();

    expect(onReady).toHaveBeenCalledTimes(1);
    expect(engine.options.get("UCI_Elo")).toMatchObject({ min: 1320, max: 3190 });
    // Declared but immovable is a different answer from absent; the settings
    // tab tells the two apart by these bounds.
    expect(engine.options.get("Threads")).toMatchObject({ min: 1, max: 1 });
  });

  it("runs a late subscriber immediately", () => {
    const { engine, transport } = build();
    transport.completeHandshake();

    const onReady = vi.fn();
    engine.whenOptionsReady(onReady);

    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it("forgets a subscriber that left before uciok", () => {
    const { engine, transport } = build();
    const onReady = vi.fn();
    engine.whenOptionsReady(onReady)();

    transport.completeHandshake();
    expect(onReady).not.toHaveBeenCalled();
  });

  it("never sends a pinned option, nor one the engine does not have", () => {
    /*
      Not tidiness — an earlier build stopped answering for good after
      `setoption name Threads value 1`, its own pinned default. A pinned option
      has one legal value, so refusing to send it costs nothing.
    */
    const { engine, transport } = ready();

    expect(engine.setOption("Threads", 1)).toBe(false);
    expect(engine.setOption("Nonsense", 1)).toBe(false);
    expect(engine.setOption("UCI_Elo", 1800)).toBe(true);

    expect(transport.sent).toEqual(["setoption name UCI_Elo value 1800"]);
  });

  it("holds pre-handshake options back, then sends only the ones it can take", () => {
    const { engine, transport } = build();

    expect(engine.setOption("MultiPV", 3)).toBe(true);
    // Optimistic until the roster is known.
    expect(engine.setOption("Nonsense", 1)).toBe(true);
    expect(transport.sent.filter((line) => line.startsWith("setoption"))).toEqual([]);

    transport.completeHandshake();

    expect(transport.sent.filter((line) => line.startsWith("setoption"))).toEqual([
      "setoption name MultiPV value 3",
    ]);
  });

  it("writes a check option as true / false — a number request of 1 or 0 is not UCI", () => {
    // UCI_LimitStrength is a check; `setoption … value 1` reads as false.
    const { engine, transport } = ready();

    engine.setOption("UCI_LimitStrength", 1);
    engine.search("fen-a", { depth: 12 });
    expect(transport.sent).toEqual([
      "setoption name UCI_LimitStrength value true",
      "position fen fen-a",
      "go depth 12",
    ]);

    transport.say("bestmove e2e4");
    transport.sent.length = 0;
    engine.setOption("UCI_LimitStrength", 0);
    engine.search("fen-b", { depth: 12 });
    expect(transport.sent[0]).toBe("setoption name UCI_LimitStrength value false");
  });

  it("leaves a spin's number as it is", () => {
    const { engine, transport } = ready();
    engine.setOption("UCI_Elo", 1);
    expect(transport.sent).toEqual(["setoption name UCI_Elo value 1"]);
  });

  it("takes a preset's typed values: a boolean, and words (CTA-179)", () => {
    const { engine, transport } = build();
    transport.say("option name UCI_ShowWDL type check default false");
    transport.say("option name NumaPolicy type string default auto");
    transport.say("option name Style type combo default Normal var Solid var Normal var Risky");
    transport.say("uciok");
    transport.sent.length = 0;

    expect(engine.setOption("UCI_ShowWDL", true)).toBe(true);
    expect(engine.setOption("NumaPolicy", "none")).toBe(true);
    expect(engine.setOption("Style", "Risky")).toBe(true);
    expect(transport.sent).toEqual([
      "setoption name UCI_ShowWDL value true",
      "setoption name NumaPolicy value none",
      "setoption name Style value Risky",
    ]);
  });

  it("refuses words a line break would cut into a second command", () => {
    const { engine, transport } = build();
    transport.say("option name NumaPolicy type string default auto");
    transport.say("uciok");
    transport.sent.length = 0;

    expect(engine.setOption("NumaPolicy", "none\nquit")).toBe(false);
    expect(transport.sent).toEqual([]);
  });

  it("never sends a button, nor an option its descriptor refuses — a browser build's file path", () => {
    const { engine, transport } = build({ refuses: (option) => option.name === "EvalFile" });
    transport.say("option name Clear Hash type button");
    transport.say("option name EvalFile type string default nn-37f18f62d772.nnue");
    transport.say("option name Hash type spin default 16 min 1 max 33554432");
    transport.say("uciok");
    transport.sent.length = 0;

    expect(engine.setOption("Clear Hash", true)).toBe(false);
    expect(engine.setOption("EvalFile", "custom.nnue")).toBe(false);
    expect(engine.setOption("Hash", 32)).toBe(true);
    expect(transport.sent).toEqual(["setoption name Hash value 32"]);
  });

  it("drops a refused option asked for before the handshake, at uciok", () => {
    const { engine, transport } = build({ refuses: (option) => option.name === "EvalFile" });
    engine.setOption("EvalFile", "custom.nnue");
    engine.search("fen-a", { depth: 10 });
    transport.say("option name EvalFile type string default nn.nnue");
    transport.say("uciok");
    expect(transport.sent.filter((line) => line.startsWith("setoption"))).toEqual([]);
    expect(transport.sent.at(-1)).toBe("go depth 10");
  });

  it("sends what uciok's callbacks ask for with the rest the handshake held, before the waiting search", () => {
    // The engine module pushes a preset there, one option at a time: the first must not start the search.
    const { engine, transport } = build();
    engine.setOption("Hash", 64);
    engine.search("fen-a", { depth: 10 });
    engine.whenOptionsReady(() => {
      engine.setOption("Skill Level", 5);
      engine.setOption("UCI_LimitStrength", true);
    });
    transport.sent.length = 0;
    transport.completeHandshake();

    expect(transport.sent).toEqual([
      "setoption name Hash value 64",
      "setoption name Skill Level value 5",
      "setoption name UCI_LimitStrength value true",
      "position fen fen-a",
      "go depth 10",
    ]);
  });

  it("posts a value the engine already has only once", () => {
    // A board re-requests every option when any setting moves; `Hash` again
    // would clear the engine's table.
    const { engine, transport } = ready();

    engine.setOption("Hash", 64);
    engine.setOption("Hash", 64);
    engine.setOption("Hash", 32);

    expect(transport.sent).toEqual([
      "setoption name Hash value 64",
      "setoption name Hash value 32",
    ]);
  });
});

describe("UciEngine searching", () => {
  it("posts the position and a depth-limited go", () => {
    const { engine, transport } = ready();

    engine.search("some-fen", { depth: 16 });

    expect(transport.sent).toEqual(["position fen some-fen", "go depth 16"]);
  });

  it("adds a movetime only when one was asked for", () => {
    const { engine, transport } = ready();

    engine.search("fen-a", { depth: 10, movetime: 1500 });
    expect(transport.sent.at(-1)).toBe("go depth 10 movetime 1500");

    transport.say("bestmove e2e4");
    engine.search("fen-b", { depth: 10, movetime: 0 });
    expect(transport.sent.at(-1)).toBe("go depth 10");
  });

  it("stops a running search once, and starts the next one only when it has ended", () => {
    const { engine, transport } = ready();

    engine.search("fen-a", { depth: 12 });
    engine.search("fen-b", { depth: 12 });
    engine.search("fen-c", { depth: 12 });

    // A `go` sent into a busy engine is not a second search, so the new position
    // waits behind a `stop` — one, however often it is asked.
    expect(transport.sent.filter((line) => line === "stop")).toHaveLength(1);
    expect(transport.sent).not.toContain("position fen fen-b");

    transport.say("bestmove e2e4");

    // Nobody is looking at fen-b any more; running it would only delay fen-c.
    expect(transport.sent).not.toContain("position fen fen-b");
    expect(transport.sent).toContain("position fen fen-c");
  });

  it("drops a waiting search on stop, and ends the running one", () => {
    // Switching the engine off while a newer position waits: nothing more is searched.
    const { engine, transport } = ready();
    engine.search("fen-a", { depth: 12 });
    engine.search("fen-b", { depth: 12 });

    engine.stop();
    transport.say("bestmove e2e4");

    expect(transport.sent.filter((line) => line === "stop")).toHaveLength(1);
    expect(transport.sent).not.toContain("position fen fen-b");
  });

  it("sends no stop to an idle engine", () => {
    const { engine, transport } = ready();
    engine.stop();
    expect(transport.sent).toEqual([]);
  });
});

describe("UciEngine protocol discipline", () => {
  /*
    The bug these exist for, found by driving a real worker (an earlier build):
    an engine that takes a `setoption` mid-search badly abandons the search. No
    error, no bestmove, no further info, and the board silently never evaluates
    again. The discipline is generic, so every engine gets it.
  */

  it("sends nothing at all before the handshake has finished, then options first and the search after", () => {
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

  it("never posts an option into a running search", () => {
    const { engine, transport } = ready();
    engine.search("fen-a", { depth: 12 });
    transport.sent.length = 0;

    engine.setOption("Skill Level", 5);

    // Stopped and held, not sent.
    expect(transport.sent).toEqual(["stop"]);

    transport.say("bestmove e2e4");
    expect(transport.sent).toContain("setoption name Skill Level value 5");
  });

  it("stops no search for an option it would not send", () => {
    const { engine, transport } = ready();
    engine.search("fen-a", { depth: 12 });
    transport.sent.length = 0;

    engine.setOption("Threads", 1);
    expect(transport.sent).toEqual([]);
  });

  it("re-runs the search under the new setting once the option has landed", () => {
    const { engine, transport } = ready();
    engine.search("fen-a", { depth: 12 });
    transport.sent.length = 0;

    engine.setOption("MultiPV", 3);
    engine.search("fen-a", { depth: 12 });
    transport.say("bestmove e2e4");

    // The option must be in place before the `go` that is supposed to honour it.
    expect(transport.sent.indexOf("setoption name MultiPV value 3")).toBeLessThan(
      transport.sent.indexOf("go depth 12"),
    );
  });
});

describe("UciEngine message stamping", () => {
  it("stamps results with the position they were searched for", () => {
    const { engine, transport } = ready();
    const seen = collect(engine);

    engine.search("fen-a", { depth: 12 });
    transport.say("info depth 12 score cp 40 pv e2e4 e7e5");

    expect(seen.at(-1)).toMatchObject({
      fen: "fen-a",
      depth: 12,
      positionEvaluation: "40",
      pv: "e2e4 e7e5",
    });
  });

  it("keeps stamping the old position while its search drains", () => {
    /*
      The case the stamp exists for. A newer position has already been asked for,
      but the engine is still finishing the previous search — those lines belong
      to the *previous* position, and labelling them with the new one is how a
      screen ends up playing a move computed for a position nobody is on.
    */
    const { engine, transport } = ready();
    const seen = collect(engine);

    engine.search("fen-a", { depth: 12 });
    engine.search("fen-b", { depth: 12 });

    transport.say("info depth 9 score cp 10 pv d2d4");
    expect(seen.at(-1)?.fen).toBe("fen-a");

    // The old search ends — its bestmove still fen-a's; from here on the engine is on fen-b.
    transport.say("bestmove d2d4");
    expect(seen.at(-1)).toMatchObject({ bestMove: "d2d4", fen: "fen-a" });

    transport.say("info depth 9 score cp 20 pv g1f3");
    expect(seen.at(-1)?.fen).toBe("fen-b");
  });

  it("reads a mate and a centipawn score as alternatives, never both", () => {
    const { engine, transport } = ready();
    const seen = collect(engine);

    engine.search("fen", { depth: 12 });
    transport.say("info depth 20 score mate 3 pv e2e4");

    expect(seen.at(-1)?.possibleMate).toBe("3");
    expect(seen.at(-1)?.positionEvaluation).toBeUndefined();

    transport.say("info depth 21 score cp 250 pv d2d4");
    expect(seen.at(-1)?.positionEvaluation).toBe("250");
    // A stale mate left standing under a centipawn line is the bug this avoids.
    expect(seen.at(-1)?.possibleMate).toBeUndefined();
  });

  it("reads the MultiPV rank, and leaves it out of a single-PV line", () => {
    const { engine, transport } = ready();
    const seen = collect(engine);

    engine.search("fen", { depth: 12 });

    transport.say("info depth 14 multipv 2 score cp -15 pv c2c4 e7e5");
    expect(seen.at(-1)?.multipv).toBe(2);

    transport.say("info depth 14 score cp 30 pv e2e4");
    expect(seen.at(-1)?.multipv).toBeUndefined();
  });

  it("reads depth, not seldepth", () => {
    const { engine, transport } = ready();
    const seen = collect(engine);

    engine.search("fen", { depth: 12 });
    transport.say("info depth 12 seldepth 21 score cp 5 pv e2e4");

    expect(seen.at(-1)?.depth).toBe(12);
  });

  it("unsubscribes cleanly", () => {
    const { engine, transport } = ready();
    const listener = vi.fn();
    const unsubscribe = engine.onMessage(listener);

    transport.say("info depth 1 score cp 0 pv e2e4");
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    transport.say("info depth 2 score cp 0 pv e2e4");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("UciEngine's depth limit — the descriptor's maxDepth", () => {
  it("defaults to 99 — past any search a browser runs, so a request is never cut short", () => {
    const { engine, transport } = ready();
    expect(DEFAULT_MAX_DEPTH).toBe(99);
    engine.search("fen", { depth: 40 });
    expect(transport.sent.at(-1)).toBe("go depth 40");
    transport.say("bestmove e2e4");
    engine.search("fen", { depth: 500 });
    expect(transport.sent.at(-1)).toBe("go depth 99");
  });

  it("searches until stopped on an infinite request, unclamped, and ends it with one stop", () => {
    const { engine, transport } = ready({ maxDepth: 10 });
    engine.search("fen-a", { infinite: true });
    expect(transport.sent).toEqual(["position fen fen-a", "go infinite"]);

    engine.search("fen-b", { infinite: true });
    expect(transport.sent.at(-1)).toBe("stop");
    transport.say("bestmove e2e4");
    expect(transport.sent.slice(-2)).toEqual(["position fen fen-b", "go infinite"]);
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
