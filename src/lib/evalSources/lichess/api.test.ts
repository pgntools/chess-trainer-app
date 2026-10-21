import { afterEach, describe, expect, it, vi } from "vitest";
import { Chess } from "chess.js";

import {
  checkLichessEvalApi,
  LICHESS_EVAL_API_TIMEOUT_MS,
  lichessEvalEntryOf,
  lichessEvalFen,
  lichessEvalsFrom,
  lookupLichessEval,
  positionResultOfLichessEval,
  writeLichessEval,
  type LichessEval,
} from "./api";

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

describe("lichessEvalsFrom", () => {
  it("reads an eval: its depth and each line's score and moves", () => {
    const evals = lichessEvalsFrom(START_BODY);
    expect(evals).toHaveLength(1);
    expect(evals?.[0].depth).toBe(75);
    expect(evals?.[0].lines).toHaveLength(3);
    expect(evals?.[0].lines[0]).toEqual({ score: { kind: "cp", value: 19 }, moves: START_BODY.positions[0].evals[0].pvs[0].line.split(" ") });
  });

  it("reads every eval of the position, in the API's order (CTA-253)", () => {
    const body = {
      positions: [
        {
          evals: [
            { depth: 45, pvs: [{ cp: 20, line: "e2e4" }] },
            { depth: 35, pvs: [{ cp: 18, line: "e2e4" }, { cp: 12, line: "d2d4" }] },
          ],
        },
      ],
    };
    expect(lichessEvalsFrom(body)?.map(({ depth, lines }) => [depth, lines.length])).toEqual([
      [45, 1],
      [35, 2],
    ]);
  });

  it("drops a malformed eval, not the whole answer", () => {
    const body = {
      positions: [
        {
          evals: [
            { depth: 45, pvs: [{ cp: null, mate: null, line: "e2e4" }] },
            { pvs: [{ cp: 1, line: "e2e4" }] },
            { depth: 30, pvs: [] },
            { depth: 35, pvs: [{ cp: 18, line: "e2e4" }] },
          ],
        },
      ],
    };
    expect(lichessEvalsFrom(body)?.map(({ depth }) => depth)).toEqual([35]);
  });

  it("reads a mate as a mate, signed as the API signs it (Black mating is negative)", () => {
    const body = { positions: [{ evals: [{ depth: 40, pvs: [{ cp: null, mate: -2, line: "f1g1 e8e1" }] }] }] };
    expect(lichessEvalsFrom(body)?.[0].lines[0].score).toEqual({ kind: "mate", value: -2 });
  });

  it.each([
    ["not an object", "ok"],
    ["no positions", { query: "x" }],
    ["no evals", { positions: [{ evals: [] }] }],
    ["no depth", { positions: [{ evals: [{ pvs: [{ cp: 1, line: "e2e4" }] }] }] }],
    ["a line with no score", { positions: [{ evals: [{ depth: 30, pvs: [{ cp: null, mate: null, line: "e2e4" }] }] }] }],
    ["no lines", { positions: [{ evals: [{ depth: 30, pvs: [] }] }] }],
  ])("is undefined for a body with %s", (_name, body) => {
    expect(lichessEvalsFrom(body)).toBeUndefined();
  });
});

describe("lookupLichessEval", () => {
  it("asks GET /fen with the 4-field FEN — every eval, no best=true — and answers the evals", async () => {
    const fetchMock = stubFetch(async () => json(START_BODY));
    const answer = await lookupLichessEval(API, START);
    expect(answer).toMatchObject({ kind: "found", evals: [{ depth: 75 }] });
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe(`${API}/fen`);
    expect(url.searchParams.get("fen")).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -");
    expect(url.searchParams.has("best")).toBe(false);
    expect(url.searchParams.has("min_depth")).toBe(false);
  });

  it("asks only for the evals at least as deep as minDepth — min_depth (CTA-256)", async () => {
    const fetchMock = stubFetch(async () => json(START_BODY));
    await lookupLichessEval(API, START, undefined, 35);
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("fen")).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -");
    expect(url.searchParams.get("min_depth")).toBe("35");
  });

  it("answers every eval an API without min_depth still sends, shallower ones too — the merge holds them to the depth (CTA-256)", async () => {
    const shallow = { depth: 28, knodes: 1, pvs: [{ cp: 20, mate: null, line: "e2e4 e7e5" }] };
    stubFetch(async () => json({ ...START_BODY, positions: [{ ...START_BODY.positions[0], evals: [...START_BODY.positions[0].evals, shallow] }] }));
    const answer = await lookupLichessEval(API, START, undefined, 35);
    expect(answer).toMatchObject({ kind: "found", evals: [{ depth: 75 }, { depth: 28 }] });
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
  const found = lichessEvalsFrom(START_BODY) as LichessEval[];
  const cp = (value: number) => ({ kind: "cp" as const, value });
  /** An eval at `depth` of the start position, a line per first move, its score `cp`. */
  const evalOf = (depth: number, lines: [string, number][]): LichessEval => ({
    depth,
    lines: lines.map(([line, value]) => ({ score: cp(value), moves: line.split(" ") })),
  });
  const firstMoves = (result: ReturnType<typeof positionResultOfLichessEval>) => result?.lines.map(({ pv, depth }) => [pv[0], depth]);

  it("takes an eval as deep as asked: its lines up to the MultiPV, each at its depth", () => {
    const result = positionResultOfLichessEval({ fen: START, multiPv: 2 }, found, 30);
    expect(result?.fen).toBe(START);
    expect(result?.lines).toHaveLength(2);
    expect(result?.lines[0]).toMatchObject({ score: { kind: "cp", value: 19 }, depth: 75 });
    expect(result?.lines[1].pv[0]).toBe("d2d4");
  });

  it("merges the evals deepest first: d45/1 and d35/5 give line 1 from d45, lines 2–5 from d35 (CTA-253)", () => {
    const d35 = evalOf(35, [
      ["e2e4 e7e5", 25],
      ["d2d4 d7d5", 22],
      ["g1f3 d7d5", 20],
      ["c2c4 e7e5", 18],
      ["e2e3 e7e5", 10],
    ]);
    const d45 = evalOf(45, [["e2e4 c7c5", 30]]);
    // The API's order is not trusted: the shallower first here.
    const result = positionResultOfLichessEval({ fen: START, multiPv: 5 }, [d35, d45], 35);
    expect(firstMoves(result)).toEqual([
      ["e2e4", 45],
      ["d2d4", 35],
      ["g1f3", 35],
      ["c2c4", 35],
      ["e2e3", 35],
    ]);
    // Line 1 is d45's own, its score and its moves — never spliced with d35's e4 line.
    expect(result?.lines[0]).toEqual({ score: cp(30), depth: 45, pv: ["e2e4", "c7c5"] });
    expect(result?.lines[1]).toEqual({ score: cp(22), depth: 35, pv: ["d2d4", "d7d5"] });
  });

  it("skips a line whose first move a deeper eval already shows", () => {
    const deep = evalOf(50, [
      ["d2d4", 20],
      ["e2e4", 18],
    ]);
    const shallow = evalOf(40, [
      ["e2e4 e7e5", 25],
      ["g1f3", 15],
      ["d2d4 g8f6", 14],
      ["c2c4", 12],
    ]);
    const result = positionResultOfLichessEval({ fen: START, multiPv: 4 }, [deep, shallow], 30);
    expect(firstMoves(result)).toEqual([
      ["d2d4", 50],
      ["e2e4", 50],
      ["g1f3", 40],
      ["c2c4", 40],
    ]);
  });

  it("is missing with too few lines — one eval or merged", () => {
    expect(positionResultOfLichessEval({ fen: START, multiPv: 5 }, found, 30)).toBeUndefined();
    const other = evalOf(40, [["e2e4", 20]]);
    expect(positionResultOfLichessEval({ fen: START, multiPv: 5 }, [...found, other], 30)).toBeUndefined();
    expect(positionResultOfLichessEval({ fen: START, multiPv: 3 }, found, 30)?.lines).toHaveLength(3);
  });

  it("is a hit with every legal move when there are fewer than the MultiPV — 2 moves, 5 asked", () => {
    const twoMoves = "7k/8/8/8/8/8/r7/K7 w - - 0 1";
    const both: LichessEval = {
      depth: 60,
      lines: [
        { score: cp(-900), moves: ["a1a2", "h8g7"] },
        { score: cp(-2000), moves: ["a1b1", "a2a1"] },
      ],
    };
    expect(positionResultOfLichessEval({ fen: twoMoves, multiPv: 5 }, [both], 30)?.lines).toHaveLength(2);
    const one: LichessEval = { depth: 60, lines: [both.lines[0]] };
    expect(positionResultOfLichessEval({ fen: twoMoves, multiPv: 5 }, [one], 30)).toBeUndefined();
  });

  it("ignores an eval shallower than the target", () => {
    expect(positionResultOfLichessEval({ fen: START, multiPv: 1 }, found, 76)).toBeUndefined();
    expect(positionResultOfLichessEval({ fen: START, multiPv: 1 }, found, 75)).toBeDefined();
    const shallow = evalOf(30, [
      ["d2d4", 15],
      ["c2c4", 12],
    ]);
    // d30's lines would fill five, but the target is 40: only d75's three count.
    expect(positionResultOfLichessEval({ fen: START, multiPv: 5 }, [...found, shallow], 40)).toBeUndefined();
    expect(firstMoves(positionResultOfLichessEval({ fen: START, multiPv: 4 }, [...found, shallow], 30))).toEqual([
      ["e2e4", 75],
      ["d2d4", 75],
      ["g1f3", 75],
      ["c2c4", 30],
    ]);
  });

  it("writes the API's king-takes-rook castling as the engine's king move", () => {
    const pv = positionResultOfLichessEval({ fen: START, multiPv: 1 }, found, 1)?.lines[0].pv;
    expect(pv?.[8]).toBe("e1g1");
    expect(pv).toHaveLength(10);
  });

  it("ends a line at a move that does not play, and a line with none ends its eval's part", () => {
    const broken: LichessEval = {
      depth: 40,
      lines: [
        { score: cp(20), moves: ["e2e4", "e2e4", "e7e5"] },
        { score: cp(10), moves: ["a1a8"] },
        { score: cp(5), moves: ["d2d4"] },
      ],
    };
    expect(positionResultOfLichessEval({ fen: START, multiPv: 1 }, [broken], 30)?.lines).toEqual([
      { score: cp(20), depth: 40, pv: ["e2e4"] },
    ]);
    // d4, after the gap, is not taken: one line where two are asked.
    expect(positionResultOfLichessEval({ fen: START, multiPv: 2 }, [broken], 30)).toBeUndefined();
    // A shallower eval still gives its lines after a deeper one's gap.
    const next = evalOf(35, [["d2d4", 8]]);
    expect(firstMoves(positionResultOfLichessEval({ fen: START, multiPv: 2 }, [broken, next], 30))).toEqual([
      ["e2e4", 40],
      ["d2d4", 35],
    ]);
    const none: LichessEval = { depth: 40, lines: [{ score: cp(0), moves: [] }] };
    expect(positionResultOfLichessEval({ fen: START, multiPv: 1 }, [none], 30)).toBeUndefined();
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
