import { afterEach, describe, expect, it, vi } from "vitest";

import { FakeEngine } from "../../views/board/boardTestHarness";
import type { PositionResult } from "../computerAnalysis";
import type { EngineMessage } from "../engineTypes";
import { EVAL_SOURCE_BACKOFF_MS, evalSourceBackedOff, resetEvalSourceBackOff } from "./backOff";
import type { EvalLookup, EvalQuery, EvalSource } from "./types";
import { withEvalSources } from "./withEvalSources";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

/** A source under the test's hand: each lookup waits until the test answers it. */
const stubSource = ({ enabled = true, writes = false, takes = true } = {}) => {
  const asked: { query: EvalQuery; signal?: AbortSignal; answer: (lookup: EvalLookup) => void }[] = [];
  const recorded: PositionResult[] = [];
  const source: EvalSource = {
    id: "stub",
    labelKey: "evalSources.lichess.name",
    titleKey: "evalSources.lichess.title",
    storageKeys: [],
    isEnabled: () => enabled,
    lookup: (query, signal) => new Promise((resolve) => asked.push({ query, signal, answer: resolve })),
    writesEnabled: () => writes,
    record: async (result) => {
      recorded.push(result);
      return takes;
    },
  };
  return { source, asked, recorded };
};

/** The engine and the decorator over it, every message the decorator sends kept. */
const wrap = (sources: readonly EvalSource[], maxDepth = 99) => {
  const engine = new FakeEngine();
  const handle = withEvalSources(engine, { engine: "Stockfish 19 Lite", maxDepth, sources });
  const heard: EngineMessage[] = [];
  handle.onMessage((message) => heard.push(message));
  return { engine, handle, heard };
};

/** Let the lookup's promise chain settle. */
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const found = (fen: string, depth: number, lines: PositionResult["lines"] = [{ score: { kind: "cp", value: 31 }, depth, pv: ["e2e4", "e7e5"] }]): EvalLookup => ({
  kind: "found",
  result: { fen, lines },
});

afterEach(() => {
  resetEvalSourceBackOff();
  FakeEngine.instances.length = 0;
});

describe("withEvalSources (CTA-196)", () => {
  it("answers from a source at the search's depth or deeper — the engine's own lines, never the engine", async () => {
    const { source, asked } = stubSource();
    const { engine, handle, heard } = wrap([source]);
    handle.setOption("MultiPV", 2);
    handle.search(START, { depth: 20, movetime: 0 });
    expect(engine.searches).toEqual([]);
    expect(asked[0].query).toEqual({ fen: START, depth: 20, multiPv: 2 });
    asked[0].answer(
      found(START, 36, [
        { score: { kind: "cp", value: 31 }, depth: 36, pv: ["e2e4", "e7e5"] },
        { score: { kind: "mate", value: -3 }, depth: 36, pv: ["d2d4"] },
      ]),
    );
    await settle();
    expect(engine.searches).toEqual([]);
    expect(heard.map((message) => message.uciMessage)).toEqual([
      "info depth 36 multipv 1 score cp 31 pv e2e4 e7e5",
      "info depth 36 multipv 2 score mate -3 pv d2d4",
      "bestmove e2e4",
    ]);
    expect(heard.every((message) => message.fen === START && message.evalSource === "stub")).toBe(true);
    expect(heard[0]).toMatchObject({ depth: 36, multipv: 1, positionEvaluation: "31", pv: "e2e4 e7e5" });
    expect(heard[2].bestMove).toBe("e2e4");
  });

  it("writes the score from the side to move's view, as UCI does — Black to move flips it", async () => {
    const { source, asked } = stubSource();
    const { handle, heard } = wrap([source]);
    handle.search(AFTER_E4, { depth: 20 });
    asked[0].answer(found(AFTER_E4, 30, [{ score: { kind: "cp", value: 31 }, depth: 30, pv: ["c7c5"] }]));
    await settle();
    expect(heard[0].positionEvaluation).toBe("-31");
  });

  it("holds the target to the engine's deepest search", () => {
    const { source, asked } = stubSource();
    const { handle } = wrap([source], 30);
    handle.search(START, { depth: 99 });
    expect(asked[0].query.depth).toBe(30);
  });

  it("searches with the engine on a miss — a shallower eval is the source's miss", async () => {
    const { source, asked } = stubSource();
    const { engine, handle, heard } = wrap([source]);
    handle.search(START, { depth: 20, movetime: 500, evalSources: true });
    asked[0].answer({ kind: "missing" });
    await settle();
    expect(engine.searches).toEqual([START]);
    // The engine is never told about the sources.
    expect(engine.searchOptions).toEqual([{ depth: 20, movetime: 500 }]);
    engine.say({ fen: START, depth: 20, pv: "e2e4", positionEvaluation: "20" });
    expect(heard.at(-1)).toMatchObject({ fen: START, pv: "e2e4" });
    expect(heard.at(-1)?.evalSource).toBeUndefined();
  });

  it("searches with the engine when the source does not answer — and the boards leave it alone a while", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const { source, asked } = stubSource();
      const { engine, handle } = wrap([source]);
      handle.search(START, { depth: 20 });
      asked[0].answer({ kind: "unreachable" });
      await settle();
      expect(engine.searches).toEqual([START]);
      expect(evalSourceBackedOff("stub", "read")).toBe(true);
      // The next position goes straight to the engine: no timeout on every move.
      handle.search(AFTER_E4, { depth: 20 });
      await settle();
      expect(asked).toHaveLength(1);
      expect(engine.searches).toEqual([START, AFTER_E4]);
      vi.setSystemTime(Date.now() + EVAL_SOURCE_BACKOFF_MS + 1);
      handle.search(START, { depth: 20 });
      expect(asked).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("drops a lookup a new search supersedes — no stale lines on the next position, no stale move", async () => {
    const { source, asked } = stubSource();
    const { engine, handle, heard } = wrap([source]);
    handle.search(START, { depth: 20 });
    handle.search(AFTER_E4, { depth: 20 });
    expect(asked[0].signal?.aborted).toBe(true);
    asked[0].answer(found(START, 40));
    await settle();
    expect(heard).toEqual([]);
    asked[1].answer({ kind: "missing" });
    await settle();
    expect(engine.searches).toEqual([AFTER_E4]);
  });

  it("drops a lookup on stop() — nothing comes out, the engine is not started", async () => {
    const { source, asked } = stubSource();
    const { engine, handle, heard } = wrap([source]);
    handle.search(START, { depth: 20 });
    handle.stop();
    expect(asked[0].signal?.aborted).toBe(true);
    asked[0].answer(found(START, 40));
    await settle();
    expect(heard).toEqual([]);
    expect(engine.searches).toEqual([]);
  });

  it("stops the previous position's engine search while the sources are asked", async () => {
    const { source, asked } = stubSource();
    const { engine, handle } = wrap([source]);
    handle.search(START, { depth: 20 });
    asked[0].answer({ kind: "missing" });
    await settle();
    expect(engine.searches).toEqual([START]);
    handle.search(AFTER_E4, { depth: 20 });
    expect(engine.stops).toBe(1);
  });

  it.each([
    ["an engine choosing its move in a game", { depth: 20, evalSources: false }, undefined],
    ["infinite analysis", { infinite: true as const }, undefined],
    ["a strength-limited engine", { depth: 20 }, ["UCI_LimitStrength", true] as const],
    ["an engine below its top Skill Level", { depth: 20 }, ["Skill Level", 5] as const],
  ])("never asks the sources for %s — the engine searches", (_, options, option) => {
    const { source, asked } = stubSource();
    const { engine, handle } = wrap([source]);
    if (option !== undefined) handle.setOption(option[0], option[1]);
    handle.search(START, options);
    expect(asked).toEqual([]);
    expect(engine.searches).toEqual([START]);
  });

  it("asks nothing while every source is off", () => {
    const { source, asked } = stubSource({ enabled: false });
    const { engine, handle } = wrap([source]);
    handle.search(START, { depth: 20 });
    expect(asked).toEqual([]);
    expect(engine.searches).toEqual([START]);
  });

  describe("write-back", () => {
    const searchWithEngine = async (writes = true, takes = true) => {
      const stub = stubSource({ writes, takes });
      const wrapped = wrap([stub.source]);
      wrapped.handle.setOption("MultiPV", 2);
      wrapped.handle.search(START, { depth: 20 });
      stub.asked[0].answer({ kind: "missing" });
      await settle();
      return { ...stub, ...wrapped };
    };

    it("sends a search the engine finished at its target depth — its lines, White's view", async () => {
      const { engine, recorded } = await searchWithEngine();
      engine.say({ fen: START, depth: 19, multipv: 1, positionEvaluation: "25", pv: "e2e4 e7e5" });
      engine.say({ fen: START, depth: 20, multipv: 1, positionEvaluation: "30", pv: "e2e4 e7e5", nodes: 1_000_000 });
      engine.say({ fen: START, depth: 20, multipv: 2, positionEvaluation: "20", pv: "d2d4" });
      engine.say({ fen: START, bestMove: "e2e4" });
      await settle();
      expect(recorded).toEqual([
        {
          fen: START,
          lines: [
            { score: { kind: "cp", value: 30 }, depth: 20, pv: ["e2e4", "e7e5"] },
            { score: { kind: "cp", value: 20 }, depth: 20, pv: ["d2d4"] },
          ],
        },
      ]);
    });

    it("never sends a search stopped short of its target, or while writing is off", async () => {
      const short = await searchWithEngine();
      short.engine.say({ fen: START, depth: 12, multipv: 1, positionEvaluation: "30", pv: "e2e4" });
      short.engine.say({ fen: START, bestMove: "e2e4" });
      await settle();
      expect(short.recorded).toEqual([]);
      const off = await searchWithEngine(false);
      off.engine.say({ fen: START, depth: 20, multipv: 1, positionEvaluation: "30", pv: "e2e4" });
      off.engine.say({ fen: START, bestMove: "e2e4" });
      await settle();
      expect(off.recorded).toEqual([]);
    });

    it("never sends what a source answered", async () => {
      const { source, asked, recorded } = stubSource({ writes: true });
      const { handle } = wrap([source]);
      handle.search(START, { depth: 20 });
      asked[0].answer(found(START, 40));
      await settle();
      expect(recorded).toEqual([]);
    });

    it("never sends a game's search (an engine choosing its move)", async () => {
      const { source, recorded } = stubSource({ writes: true });
      const { engine, handle } = wrap([source]);
      handle.search(START, { depth: 20, evalSources: false });
      engine.say({ fen: START, depth: 20, multipv: 1, positionEvaluation: "30", pv: "e2e4" });
      engine.say({ fen: START, bestMove: "e2e4" });
      await settle();
      expect(recorded).toEqual([]);
    });

    it("leaves a source that refused a write alone a while", async () => {
      const { engine } = await searchWithEngine(true, false);
      engine.say({ fen: START, depth: 20, multipv: 1, positionEvaluation: "30", pv: "e2e4" });
      engine.say({ fen: START, bestMove: "e2e4" });
      await settle();
      expect(evalSourceBackedOff("stub", "write")).toBe(true);
      expect(evalSourceBackedOff("stub", "read")).toBe(false);
    });
  });

  it("passes options, the handshake and terminate through to the engine", () => {
    const { engine, handle } = wrap([]);
    expect(handle.options).toBe(engine.options);
    const ready = vi.fn();
    handle.whenOptionsReady(ready);
    expect(ready).toHaveBeenCalled();
    expect(handle.setOption("Hash", 64)).toBe(true);
    expect(engine.setOptions).toContainEqual(["Hash", 64]);
    handle.terminate();
    expect(engine.terminated).toBe(true);
  });
});
