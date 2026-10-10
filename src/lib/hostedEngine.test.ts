import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EngineMessage } from "./engineTypes";
import { HostedEngine, hostedEngineInfoFrom, hostedEnginesFrom, type HostedEngineInfo } from "./hostedEngine";

/*
  `HostedEngine` over a fake `fetch` — the engine server's protocol
  (`server/engine-api/README.md`) as this side speaks it. The real wire is
  `hostedEngine.live.test.ts`'s, against a running server.
*/
const SERVER = "http://127.0.0.1:8800";
const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

const INFO: HostedEngineInfo = {
  id: "stockfish-19",
  name: "Stockfish 19",
  version: "19",
  maxDepth: 40,
  options: [
    { name: "Threads", type: "spin", defaultValue: "1", min: 1, max: 8 },
    { name: "MultiPV", type: "spin", defaultValue: "1", min: 1, max: 256 },
    { name: "UCI_LimitStrength", type: "check", defaultValue: "false" },
    { name: "Pinned", type: "spin", min: 1, max: 1 },
    { name: "SyzygyPath", type: "string", defaultValue: "<empty>" },
    { name: "Clear Hash", type: "button" },
  ],
};

type Call = { method: string; path: string; body?: Record<string, unknown>; keepalive?: boolean };

/** The NDJSON a search answers with, as one stream that may arrive in pieces. */
const ndjson = (events: object[], chunks = 1): Response => {
  const text = events.map((e) => JSON.stringify(e) + "\n").join("");
  const size = Math.ceil(text.length / chunks);
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (let i = 0; i < text.length; i += size) controller.enqueue(encoder.encode(text.slice(i, i + size)));
        controller.close();
      },
    }),
    { status: 200, headers: { "Content-Type": "application/x-ndjson" } },
  );
};

const searchEvents = (fen: string, best = "e2e4") => [
  { type: "start", fen, engine: "stockfish-19", applied: {}, refused: [] },
  { type: "info", fen, depth: 1, score: { cp: 20 }, pv: [best], uci: `info depth 1 multipv 1 score cp 20 pv ${best}` },
  { type: "bestmove", fen, bestmove: best, ponder: null, stopped: false, uci: `bestmove ${best}` },
];

let calls: Call[];
let analyse: (body: Record<string, unknown>, n: number) => Response | Promise<Response>;
let sessionsOpened: number;

beforeEach(() => {
  calls = [];
  sessionsOpened = 0;
  analyse = (body) => ndjson(searchEvents(body.fen as string));
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const path = url.slice(SERVER.length);
      const body = init.body ? (JSON.parse(init.body as string) as Record<string, unknown>) : undefined;
      calls.push({ method: init.method ?? "GET", path, body, keepalive: init.keepalive });
      if (path === "/v1/sessions") return Response.json({ session: `s${++sessionsOpened}` }, { status: 201 });
      if (path.endsWith("/analyse")) return analyse(body!, calls.filter((c) => c.path.endsWith("/analyse")).length);
      return new Response(null, { status: 204 });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const engineWith = (onFailure = vi.fn()) => {
  const engine = new HostedEngine(SERVER, INFO, { onFailure });
  const messages: EngineMessage[] = [];
  engine.onMessage((message) => messages.push(message));
  return { engine, messages, onFailure };
};

const analyseCalls = () => calls.filter((c) => c.path.endsWith("/analyse"));

describe("reading the server's list", () => {
  it("takes each engine with its options, its limits and its version", () => {
    const info = hostedEngineInfoFrom({
      id: "stockfish-18",
      name: "Stockfish 18",
      version: "18",
      options: [{ name: "Hash", type: "spin", default: "16", min: 1, max: 4096 }, { name: "Clear Hash", type: "button" }],
      limits: { maxDepth: 99, maxMovetimeMs: 600000 },
    });
    expect(info).toEqual({
      id: "stockfish-18",
      name: "Stockfish 18",
      version: "18",
      maxDepth: 99,
      options: [
        { name: "Hash", type: "spin", defaultValue: "16", min: 1, max: 4096, vars: undefined },
        { name: "Clear Hash", type: "button", defaultValue: undefined, min: undefined, max: undefined, vars: undefined },
      ],
    });
  });

  it("drops what is not an engine, and refuses what is not a list", () => {
    expect(hostedEnginesFrom([{ id: "a", name: "A" }, { name: "no id" }, "x", null])?.map((e) => e.id)).toEqual(["a"]);
    expect(hostedEnginesFrom({ engines: [] })).toBeNull();
    expect(hostedEnginesFrom([])).toEqual([]);
  });
});

describe("HostedEngine", () => {
  it("has its options at once, and refuses one it does not declare or has pinned", () => {
    const { engine } = engineWith();
    const ready = vi.fn();
    engine.whenOptionsReady(ready);
    expect(ready).toHaveBeenCalledOnce();
    expect(engine.options.get("Threads")?.max).toBe(8);
    expect(engine.setOption("MultiPV", 3)).toBe(true);
    expect(engine.setOption("No Such", 1)).toBe(false);
    expect(engine.setOption("Pinned", 1)).toBe(false);
    expect(calls).toEqual([]); // nothing goes out until a search
  });

  it("opens one session, then streams a search's lines as messages stamped with its position", async () => {
    const { engine, messages } = engineWith();
    engine.setOption("MultiPV", 2);
    engine.setOption("UCI_LimitStrength", 1); // the module asks with numbers; a check goes as a boolean
    engine.search(START, { depth: 12, movetime: 500 });
    await vi.waitFor(() => expect(messages.at(-1)?.bestMove).toBe("e2e4"));

    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual(["POST /v1/sessions", "POST /v1/sessions/s1/analyse"]);
    expect(calls[0].body).toEqual({ engine: "stockfish-19" });
    expect(calls[1].body).toEqual({
      fen: START,
      limit: { depth: 12, movetimeMs: 500 },
      options: { MultiPV: 2, UCI_LimitStrength: true },
      seq: 1,
    });
    // `start` carries no engine line, so it is no message.
    expect(messages.map((m) => m.uciMessage)).toEqual(["info depth 1 multipv 1 score cp 20 pv e2e4", "bestmove e2e4"]);
    expect(messages[0]).toMatchObject({ fen: START, depth: 1, multipv: 1, positionEvaluation: "20", pv: "e2e4" });
    expect(messages.every((m) => m.fen === START)).toBe(true);
  });

  it("sends a preset's typed values with the search — a boolean, a file path; never a button or a broken line (CTA-179)", async () => {
    const { engine, messages } = engineWith();
    expect(engine.setOption("UCI_LimitStrength", false)).toBe(true);
    expect(engine.setOption("SyzygyPath", "/tb/syzygy")).toBe(true);
    expect(engine.setOption("Clear Hash", true)).toBe(false);
    expect(engine.setOption("SyzygyPath", "/tb\nquit")).toBe(false);
    engine.search(START, { depth: 8 });
    await vi.waitFor(() => expect(messages.at(-1)?.bestMove).toBe("e2e4"));

    expect(analyseCalls()[0].body?.options).toEqual({ UCI_LimitStrength: false, SyzygyPath: "/tb/syzygy" });
  });

  it("reads lines however the stream is cut", async () => {
    analyse = (body) => ndjson(searchEvents(body.fen as string), 7);
    const { engine, messages } = engineWith();
    engine.search(START, { depth: 5 });
    await vi.waitFor(() => expect(messages.at(-1)?.bestMove).toBe("e2e4"));
    expect(messages).toHaveLength(2);
  });

  it("clamps the depth to the server's, and asks for infinite as infinite", async () => {
    const { engine, messages } = engineWith();
    engine.search(START, { depth: 99 });
    await vi.waitFor(() => expect(messages.at(-1)?.bestMove).toBeTruthy());
    engine.search(AFTER_E4, { infinite: true });
    await vi.waitFor(() => expect(analyseCalls()).toHaveLength(2));
    expect(analyseCalls().map((c) => c.body?.limit)).toEqual([{ depth: 40 }, { infinite: true }]);
  });

  it("sends only the newest of several searches asked for before the session opened", async () => {
    const { engine, messages } = engineWith();
    engine.search(START, { depth: 5 });
    engine.search(AFTER_E4, { depth: 5 });
    await vi.waitFor(() => expect(messages.at(-1)?.bestMove).toBeTruthy());
    expect(analyseCalls().map((c) => c.body?.fen)).toEqual([AFTER_E4]);
  });

  it("numbers every request, so the server can order ones that overtake each other", async () => {
    const { engine, messages } = engineWith();
    engine.search(START, { depth: 5 });
    await vi.waitFor(() => expect(messages.at(-1)?.bestMove).toBeTruthy());
    engine.search(AFTER_E4, { depth: 5 });
    await vi.waitFor(() => expect(analyseCalls()).toHaveLength(2));
    engine.stop();
    await vi.waitFor(() => expect(calls.some((c) => c.path.endsWith("/stop"))).toBe(true));
    expect(analyseCalls().map((c) => c.body?.seq)).toEqual([1, 2]);
    expect(calls.find((c) => c.path.endsWith("/stop"))?.body).toEqual({ seq: 3 });
  });

  it("asks nothing of the server to stop before it has a session", () => {
    const { engine } = engineWith();
    engine.stop();
    expect(calls).toEqual([]);
  });

  it("drops a search that has not gone out yet when stopped — as UciEngine drops a waiting one", async () => {
    const { engine } = engineWith();
    engine.search(START, { depth: 5 });
    engine.stop();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(analyseCalls()).toEqual([]);
  });

  it("opens a new session once when the server has dropped its own", async () => {
    analyse = (body, n) => (n === 1 ? new Response(null, { status: 404 }) : ndjson(searchEvents(body.fen as string)));
    const { engine, messages, onFailure } = engineWith();
    engine.search(START, { depth: 5 });
    await vi.waitFor(() => expect(messages.at(-1)?.bestMove).toBe("e2e4"));
    expect(calls.map((c) => c.path)).toEqual([
      "/v1/sessions",
      "/v1/sessions/s1/analyse",
      "/v1/sessions",
      "/v1/sessions/s2/analyse",
    ]);
    expect(onFailure).not.toHaveBeenCalled();
  });

  it("reports a failure — a refusal, a second missing session, an engine that died, a server gone", async () => {
    analyse = () => new Response(null, { status: 404 });
    const first = engineWith();
    first.engine.search(START, { depth: 5 });
    await vi.waitFor(() => expect(first.onFailure).toHaveBeenCalledOnce());

    analyse = (body) =>
      ndjson([{ type: "start", fen: body.fen }, { type: "error", fen: body.fen, detail: "engine process exited" }]);
    const died = engineWith();
    died.engine.search(START, { depth: 5 });
    await vi.waitFor(() => expect(died.onFailure).toHaveBeenCalledOnce());
    // The next search opens a new session for a new engine.
    analyse = (body) => ndjson(searchEvents(body.fen as string));
    died.engine.search(AFTER_E4, { depth: 5 });
    await vi.waitFor(() => expect(died.messages.at(-1)?.bestMove).toBeTruthy());
    expect(calls.filter((c) => c.path === "/v1/sessions")).toHaveLength(4);

    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))));
    const gone = engineWith();
    gone.engine.search(START, { depth: 5 });
    await vi.waitFor(() => expect(gone.onFailure).toHaveBeenCalledOnce());
  });

  it("on terminate deletes its session, drops its stream and tells no one", async () => {
    let release: () => void = () => {};
    analyse = (body) =>
      new Promise<Response>((resolve) => {
        release = () => resolve(ndjson(searchEvents(body.fen as string)));
      });
    const { engine, messages, onFailure } = engineWith();
    engine.search(START, { depth: 5 });
    await vi.waitFor(() => expect(analyseCalls()).toHaveLength(1));
    engine.terminate();
    release();
    expect(calls.at(-1)).toEqual({ method: "DELETE", path: "/v1/sessions/s1", body: undefined, keepalive: false });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(messages).toEqual([]);
    expect(onFailure).not.toHaveBeenCalled();
    engine.search(AFTER_E4, { depth: 5 });
    expect(analyseCalls()).toHaveLength(1);
  });

  it("asks for its delete to outlive the page only while the page is leaving", async () => {
    const { engine, messages } = engineWith();
    engine.search(START, { depth: 5 });
    await vi.waitFor(() => expect(messages.at(-1)?.bestMove).toBeTruthy());
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    engine.terminate();
    vi.restoreAllMocks();
    expect(calls.at(-1)).toMatchObject({ method: "DELETE", path: "/v1/sessions/s1", keepalive: true });
  });

  it("deletes a session that opens after it was terminated", async () => {
    const { engine } = engineWith();
    engine.search(START, { depth: 5 });
    engine.terminate();
    await vi.waitFor(() => expect(calls.at(-1)).toMatchObject({ method: "DELETE", path: "/v1/sessions/s1" }));
    expect(analyseCalls()).toEqual([]);
  });
});
