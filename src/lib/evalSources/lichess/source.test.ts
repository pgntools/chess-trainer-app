import { afterEach, describe, expect, it, vi } from "vitest";

import type { PositionResult } from "../../computerAnalysis";
import { LICHESS_EVAL_API_STORAGE_KEY } from "./settings";
import { lichessEvalSource } from "./source";

/*
  The lichess source's write (`record`) against a stubbed `fetch`: only a
  search at least as deep as the minimum depth to write is sent (CTA-202).
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
