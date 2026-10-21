import { afterEach, describe, expect, it, vi } from "vitest";

import type { PositionResult } from "../../computerAnalysis";
import { LICHESS_EVAL_API_STORAGE_KEY } from "./settings";
import { lichessEvalSource } from "./source";

/*
  The lichess source against a stubbed `fetch`: its lookup asks for the evals
  at the target depth (`min_depth`, CTA-256), merges them and answers only a
  full set of lines (CTA-253); its write (`record`) sends only a search at
  least as deep as the minimum depth to write (CTA-202).
*/

const API = "http://10.0.0.3:8000";
const FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

const resultAt = (depth: number): PositionResult => ({
  fen: FEN,
  lines: [{ score: { kind: "cp", value: -31 }, depth, pv: ["e7e5", "g1f3"] }],
});

/** The API on, writing ticked, its minimum depth `minWriteDepth` (absent: never stored — the default). */
const writing = (minWriteDepth?: number) => {
  localStorage.setItem(
    LICHESS_EVAL_API_STORAGE_KEY,
    JSON.stringify({ enabled: true, url: API, write: true, ...(minWriteDepth === undefined ? {} : { minWriteDepth }) }),
  );
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ stored: 1 }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the lichess source's write (CTA-202)", () => {
  it("does not send a search shallower than the minimum — and says it was not a refusal", async () => {
    const fetchMock = writing();
    await expect(lichessEvalSource.record?.(resultAt(24), { nodes: 1000 })).resolves.toBe(true);
    await expect(lichessEvalSource.record?.(resultAt(34), { nodes: 1000 })).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends a search at the minimum or deeper to POST /evals", async () => {
    const fetchMock = writing();
    await expect(lichessEvalSource.record?.(resultAt(35), { nodes: 1000 })).resolves.toBe(true);
    await expect(lichessEvalSource.record?.(resultAt(41), { nodes: 1000 })).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${API}/evals`);
    expect(JSON.parse(String(init.body))).toMatchObject({ entries: [{ fen: FEN, depth: 35 }] });
  });

  it("reads the reader's own minimum", async () => {
    const fetchMock = writing(20);
    await lichessEvalSource.record?.(resultAt(19), { nodes: 1000 });
    expect(fetchMock).not.toHaveBeenCalled();
    await lichessEvalSource.record?.(resultAt(20), { nodes: 1000 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("the lichess source's lookup — every eval at the target depth merged (CTA-253)", () => {
  /** The API on, answering `GET /fen` with these evals of `FEN` — whatever `min_depth` it was sent, as an API without the parameter does. */
  const answering = (evals: { depth: number; pvs: { cp: number; line: string }[] }[]) => {
    localStorage.setItem(LICHESS_EVAL_API_STORAGE_KEY, JSON.stringify({ enabled: true, url: API }));
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(
      async () => new Response(JSON.stringify({ positions: [{ fen: FEN, evals }] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  };
  const d45 = { depth: 45, pvs: [{ cp: -20, line: "c7c5 g1f3" }] };
  const d35 = {
    depth: 35,
    pvs: ["c7c5 g1f3", "e7e5 g1f3", "e7e6 d2d4", "c7c6 d2d4", "d7d6 d2d4"].map((line, i) => ({ cp: -25 - i, line })),
  };

  it("is found with line 1 from d45 and lines 2–5 from d35, the duplicate first move left out", async () => {
    answering([d45, d35]);
    const answer = await lichessEvalSource.lookup({ fen: FEN, depth: 35, multiPv: 5 });
    expect(answer.kind).toBe("found");
    const lines = answer.kind === "found" ? answer.result.lines : [];
    expect(lines.map(({ pv, depth }) => [pv[0], depth])).toEqual([
      ["c7c5", 45],
      ["e7e5", 35],
      ["e7e6", 35],
      ["c7c6", 35],
      ["d7d6", 35],
    ]);
  });

  it("is missing when the evals at the target depth hold too few lines — the engine searches", async () => {
    answering([d45, d35]);
    // Only d45's one line is as deep as 40.
    await expect(lichessEvalSource.lookup({ fen: FEN, depth: 40, multiPv: 5 })).resolves.toEqual({ kind: "missing" });
    await expect(lichessEvalSource.lookup({ fen: FEN, depth: 40, multiPv: 1 })).resolves.toMatchObject({ kind: "found" });
  });

  it("asks GET /fen for the search's depth and deeper — min_depth (CTA-256)", async () => {
    const fetchMock = answering([d45, d35]);
    await lichessEvalSource.lookup({ fen: FEN, depth: 35, multiPv: 5 });
    expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get("min_depth")).toBe("35");
  });

  it("never fills the lines from a shallower eval an API without min_depth sent — d45/1 and d28/5 at 35 is missing", async () => {
    const d28 = { ...d35, depth: 28 };
    answering([d45, d28]);
    await expect(lichessEvalSource.lookup({ fen: FEN, depth: 35, multiPv: 5 })).resolves.toEqual({ kind: "missing" });
  });

  it("is missing on the 404 an API answers when no eval is that deep", async () => {
    localStorage.setItem(LICHESS_EVAL_API_STORAGE_KEY, JSON.stringify({ enabled: true, url: API }));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ detail: "not found" }), { status: 404 })));
    await expect(lichessEvalSource.lookup({ fen: FEN, depth: 35, multiPv: 5 })).resolves.toEqual({ kind: "missing" });
  });
});
