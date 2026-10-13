import { afterEach, describe, expect, it, vi } from "vitest";
import { Chess } from "chess.js";

import {
  checkLichessEvalApi,
  LICHESS_EVAL_API_TIMEOUT_MS,
  lichessEvalEntryOf,
  lichessEvalFen,
  lichessEvalFrom,
  lookupLichessEval,
  positionResultOfLichessEval,
  writeLichessEval,
  type LichessEval,
} from "./lichessEvalApi";

const API = "http://10.0.0.3:8000";
const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** The API's own example answer (`api.md`): the start position, depth 75, three lines — castling written `e1h1`. */
const START_BODY = {
  query: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -",
  positions: [
    {
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -",
      source: "lichess",
      engine: null,
      updated_at: null,
      evals: [
        {
          depth: 75,
          knodes: 695524,
          pvs: [
            { cp: 19, mate: null, line: "e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 d2d3 f8c5 e1h1 d7d6" },
            { cp: 15, mate: null, line: "d2d4 g8f6 g1f3 e7e6 c2c4 d7d5 b1c3 f8b4 d1a4 b8c6" },
            { cp: 14, mate: null, line: "g1f3 d7d5 d2d4 e7e6 c2c4 g8f6 b1c3 f8b4 d1a4 b8c6" },
          ],
        },
      ],
    },
  ],
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const stubFetch = (answer: (url: string, init?: RequestInit) => Promise<Response>) => {
  const fetchMock = vi.fn(answer);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("lichessEvalFen", () => {
  it("drops the move counters", () => {
    expect(lichessEvalFen(START)).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -");
  });

  it("writes no en passant square where no capture there is legal — after 1.e4 c5, '-' not 'c6'", () => {
    const chess = new Chess();
    chess.move("e4");
    chess.move("c5");
    expect(lichessEvalFen(chess.fen())).toBe("rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -");
    // Written with the square, as a FEN from elsewhere may be.
    expect(lichessEvalFen("rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2")).toBe(
      "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -",
    );
  });

  it("keeps the en passant square where the capture is legal", () => {
    const chess = new Chess();
    for (const move of ["e4", "a6", "e5", "d5"]) chess.move(move);
    expect(lichessEvalFen(chess.fen())).toBe("rnbqkbnr/1pp1pppp/p7/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6");
  });

  it("is null for text that is not a position", () => {
    expect(lichessEvalFen("not a fen")).toBeNull();
  });
});

describe("lichessEvalFrom", () => {
  it("reads the deepest eval: its depth and each line's score and moves", () => {
    const found = lichessEvalFrom(START_BODY);
    expect(found?.depth).toBe(75);
    expect(found?.lines).toHaveLength(3);
    expect(found?.lines[0]).toEqual({ score: { kind: "cp", value: 19 }, moves: START_BODY.positions[0].evals[0].pvs[0].line.split(" ") });
  });

  it("reads a mate as a mate, signed as the API signs it (Black mating is negative)", () => {
    const body = { positions: [{ evals: [{ depth: 40, pvs: [{ cp: null, mate: -2, line: "f1g1 e8e1" }] }] }] };
    expect(lichessEvalFrom(body)?.lines[0].score).toEqual({ kind: "mate", value: -2 });
  });

  it.each([
    ["not an object", "ok"],
    ["no positions", { query: "x" }],
    ["no evals", { positions: [{ evals: [] }] }],
    ["no depth", { positions: [{ evals: [{ pvs: [{ cp: 1, line: "e2e4" }] }] }] }],
    ["a line with no score", { positions: [{ evals: [{ depth: 30, pvs: [{ cp: null, mate: null, line: "e2e4" }] }] }] }],
    ["no lines", { positions: [{ evals: [{ depth: 30, pvs: [] }] }] }],
  ])("is undefined for a body with %s", (_name, body) => {
    expect(lichessEvalFrom(body)).toBeUndefined();
  });
});

describe("lookupLichessEval", () => {
  it("asks GET /fen with the 4-field FEN and best=true, and answers the eval", async () => {
    const fetchMock = stubFetch(async () => json(START_BODY));
    const answer = await lookupLichessEval(API, START);
    expect(answer.kind).toBe("found");
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe(`${API}/fen`);
    expect(url.searchParams.get("fen")).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -");
    expect(url.searchParams.get("best")).toBe("true");
  });

  it.each([404, 422])("is missing on a %i", async (status) => {
    stubFetch(async () => json({ detail: "position not found" }, status));
    expect(await lookupLichessEval(API, START)).toEqual({ kind: "missing" });
  });

  it("is unreachable on another status, a body that is not JSON or not the API's, and a network error", async () => {
    stubFetch(async () => json({ detail: "timeout" }, 504));
    expect(await lookupLichessEval(API, START)).toEqual({ kind: "unreachable" });
    stubFetch(async () => new Response("<html>not json</html>", { status: 200 }));
    expect(await lookupLichessEval(API, START)).toEqual({ kind: "unreachable" });
    stubFetch(async () => json({ hello: "world" }));
    expect(await lookupLichessEval(API, START)).toEqual({ kind: "unreachable" });
    stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await lookupLichessEval(API, START)).toEqual({ kind: "unreachable" });
  });

  it("gives up after the timeout and is unreachable", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    stubFetch(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
    );
    const answer = lookupLichessEval(API, START);
    await vi.advanceTimersByTimeAsync(LICHESS_EVAL_API_TIMEOUT_MS);
    expect(await answer).toEqual({ kind: "unreachable" });
  });

  it("gives up at once when its caller does", async () => {
    stubFetch(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
    );
    const controller = new AbortController();
    const answer = lookupLichessEval(API, START, controller.signal);
    controller.abort();
    expect(await answer).toEqual({ kind: "unreachable" });
  });
});

describe("checkLichessEvalApi", () => {
  it("is ok for GET /health's answer", async () => {
    const fetchMock = stubFetch(async () => json({ status: "ok", positions: 416_000_000, sql_enabled: true, write_enabled: false }));
    const health = await checkLichessEvalApi(API);
    expect(health).toMatchObject({ ok: true, positions: 416_000_000, writeEnabled: false });
    expect(String(fetchMock.mock.calls[0][0])).toBe(`${API}/health`);
  });

  it("is not the API for another answer, and unreachable for none", async () => {
    stubFetch(async () => json({ engines: [] }));
    expect(await checkLichessEvalApi(API)).toEqual({ ok: false, reason: "not-an-eval-api" });
    stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await checkLichessEvalApi(API)).toEqual({ ok: false, reason: "unreachable" });
  });
});

describe("positionResultOfLichessEval", () => {
  const found = lichessEvalFrom(START_BODY) as LichessEval;

  it("takes an eval as deep as asked: its lines up to the MultiPV, each at its depth", () => {
    const result = positionResultOfLichessEval({ fen: START, multiPv: 2 }, found, 30);
    expect(result?.fen).toBe(START);
    expect(result?.lines).toHaveLength(2);
    expect(result?.lines[0]).toMatchObject({ score: { kind: "cp", value: 19 }, depth: 75 });
    expect(result?.lines[1].pv[0]).toBe("d2d4");
  });

  it("takes as many lines as the eval has when the MultiPV asks for more", () => {
    expect(positionResultOfLichessEval({ fen: START, multiPv: 5 }, found, 30)?.lines).toHaveLength(3);
  });

  it("is undefined for a shallower eval", () => {
    expect(positionResultOfLichessEval({ fen: START, multiPv: 1 }, found, 76)).toBeUndefined();
    expect(positionResultOfLichessEval({ fen: START, multiPv: 1 }, found, 75)).toBeDefined();
  });

  it("writes the API's king-takes-rook castling as the engine's king move", () => {
    const pv = positionResultOfLichessEval({ fen: START, multiPv: 1 }, found, 1)?.lines[0].pv;
    expect(pv?.[8]).toBe("e1g1");
    expect(pv).toHaveLength(10);
  });

  it("ends a line at a move that does not play, and drops a line with none", () => {
    const broken: LichessEval = {
      depth: 40,
      lines: [
        { score: { kind: "cp", value: 20 }, moves: ["e2e4", "e2e4", "e7e5"] },
        { score: { kind: "cp", value: 10 }, moves: ["a1a8"] },
        { score: { kind: "cp", value: 5 }, moves: ["d2d4"] },
      ],
    };
    const result = positionResultOfLichessEval({ fen: START, multiPv: 3 }, broken, 30);
    expect(result?.lines).toEqual([{ score: { kind: "cp", value: 20 }, depth: 40, pv: ["e2e4"] }]);
    const none: LichessEval = { depth: 40, lines: [{ score: { kind: "cp", value: 0 }, moves: [] }] };
    expect(positionResultOfLichessEval({ fen: START, multiPv: 1 }, none, 30)).toBeUndefined();
  });
});

describe("lichessEvalEntryOf", () => {
  it("writes a searched result as a POST /evals entry — White's view, its lines' moves, line 1's depth, nodes in thousands", () => {
    const entry = lichessEvalEntryOf(
      {
        fen: START,
        lines: [
          { score: { kind: "cp", value: 31 }, depth: 22, pv: ["e2e4", "e7e5"] },
          { score: { kind: "mate", value: -3 }, depth: 22, pv: ["f2f3", "e7e5"] },
        ],
      },
      { nodes: 1_234_567, engine: "Stockfish 19 Lite" },
    );
    expect(entry).toEqual({
      fen: START,
      depth: 22,
      knodes: 1235,
      pov: "white",
      pvs: [
        { cp: 31, line: "e2e4 e7e5" },
        { mate: -3, line: "f2f3 e7e5" },
      ],
      engine: "Stockfish 19 Lite",
    });
  });

  it("is nothing for a result without a line to send — a finished position, a stored eval", () => {
    expect(lichessEvalEntryOf({ fen: START, lines: [{ score: { kind: "mate", value: 0 }, depth: 0, pv: [] }] }, {})).toBeUndefined();
    expect(lichessEvalEntryOf({ fen: START, lines: [{ score: { kind: "cp", value: 10 }, depth: 30, pv: [] }] }, {})).toBeUndefined();
  });
});

describe("writeLichessEval", () => {
  const entry = { fen: START, depth: 22, knodes: 1, pov: "white" as const, pvs: [{ cp: 31, line: "e2e4" }] };

  it("POSTs the entry to /evals as JSON, and is true once the API took it", async () => {
    const fetchMock = stubFetch(async () => json({ stored: 1, skipped: 0, results: [] }));
    expect(await writeLichessEval(API, entry)).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API}/evals`);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ entries: [entry] });
  });

  it("is false when the API is not in write mode, wants a token, refuses the entry or does not answer", async () => {
    for (const status of [403, 401, 422]) {
      stubFetch(async () => json({ detail: "no" }, status));
      expect(await writeLichessEval(API, entry)).toBe(false);
    }
    stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await writeLichessEval(API, entry)).toBe(false);
  });
});
