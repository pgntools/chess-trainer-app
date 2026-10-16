import { Chess } from "chess.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FakeEngine } from "../../views/board/boardTestHarness";
import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS } from "../computerAnalysis";
import { resolveEngine } from "../engines";
import { subscribeEvalSourceUnreachable } from "../evalSources";
import { LICHESS_EVAL_API_STORAGE_KEY } from "../evalSources/lichess/settings";
import {
  EngineSessionError,
  openEngineSession,
  type EngineSession,
  type EngineSessionConfig,
  type EngineSessionDeps,
  type EngineSessionHooks,
  type EngineSessionPosition,
} from "./engineSession";

vi.mock("../engines/builtin", async (importOriginal) =>
  (await import("../../views/board/boardTestHarness")).builtinEnginesMock(importOriginal),
);

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
/** Fool's mate: White is mated. */
const MATED = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";

const position = (patch: Partial<EngineSessionPosition> = {}): EngineSessionPosition => ({
  fen: START,
  turn: "w",
  multiPv: 1,
  terminal: false,
  analysed: true,
  index: 0,
  moveLabel: "1. e4",
  ...patch,
});

const config = (patch: Partial<EngineSessionConfig> = {}): EngineSessionConfig => ({
  jobId: "job",
  name: "Alice – Bob",
  search: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, depth: 20, minDepth: 20 },
  preset: { "Move Overhead": 300 },
  ...patch,
});

/** A step's hooks over a fresh signal, every call recorded. */
const hooksOf = () => {
  const controller = new AbortController();
  const hooks = { signal: controller.signal, heartbeat: vi.fn(), live: vi.fn(), endLive: vi.fn() } satisfies EngineSessionHooks;
  return { controller, hooks };
};

const legalMove = (fen: string): string => {
  const move = new Chess(fen).moves({ verbose: true })[0];
  return `${move.from}${move.to}`;
};

let session: EngineSession | undefined;
const open = async (patch: Partial<EngineSessionConfig> = {}, deps: EngineSessionDeps = {}) =>
  (session = await openEngineSession(config(patch), deps));
const engine = () => FakeEngine.latest();
const searched = (count: number) => vi.waitFor(() => expect(engine().searches).toHaveLength(count));

/** The engine's answer about `fen`: one scored line, then its best move. */
const answer = (fen: string, depth = 20) => {
  const pv = legalMove(fen);
  engine().say({ fen, depth, multipv: 1, positionEvaluation: "20", pv, nodes: 1_500_000 });
  engine().say({ fen, bestMove: pv });
};

beforeEach(() => {
  FakeEngine.reset();
});

afterEach(() => {
  session?.close();
  session = undefined;
  vi.unstubAllGlobals();
});

describe("the engine session (CTA-218)", () => {
  describe("its engine", () => {
    it("resolves the job's engine, falling back as a board does — and builds nothing until a position needs a search", async () => {
      await open({ search: { ...config().search, engine: "gone-engine" } });
      expect(session?.engine.id).toBe(resolveEngine().id);
      expect(FakeEngine.instances).toHaveLength(0);
    });

    it("answers a mate or stalemate, and a deep enough stored eval of a position not analysed, without an engine", async () => {
      await open();
      const { hooks } = hooksOf();
      expect(await session!.evaluate(position({ fen: MATED, terminal: true }), hooks)).toEqual({
        fen: MATED,
        lines: [{ score: { kind: "mate", value: 0 }, depth: 0, pv: [] }],
      });
      const stored = { score: { kind: "cp", value: 40 }, depth: 24 } as const;
      expect(await session!.evaluate(position({ analysed: false, storedEval: stored }), hooks)).toEqual({
        fen: START,
        lines: [{ score: stored.score, depth: 24, pv: [] }],
      });
      expect(FakeEngine.instances).toHaveLength(0);
      // Shallower than asked, or a move that is judged: searched.
      const pending = session!.evaluate(position({ analysed: false, storedEval: { ...stored, depth: 12 } }), hooks);
      await searched(1);
      answer(START);
      expect((await pending)?.lines[0]).toMatchObject({ depth: 20 });
    });

    it("handshakes once, then sends Threads and Hash clamped to the engine, the job's preset, and each position's MultiPV", async () => {
      await open({ search: { ...config().search, threads: 8, hashMb: 4096 } });
      const { hooks } = hooksOf();
      const first = session!.evaluate(position({ multiPv: 300 }), hooks);
      await searched(1);
      // The single-thread build pins Threads to 1; a tab holds at most 1024 MB however much the engine declares.
      expect(engine().setOptions).toContainEqual(["Threads", 1]);
      expect(engine().setOptions).toContainEqual(["Hash", 1024]);
      expect(engine().setOptions).toContainEqual(["Move Overhead", 300]);
      expect(engine().setOptions.at(-1)).toEqual(["MultiPV", 256]);
      expect(engine().searchOptions.at(-1)).toEqual({ depth: 20, movetime: DEFAULT_COMPUTER_ANALYSIS_OPTIONS.moveTimeMs });
      answer(START);
      await first;

      const second = session!.evaluate(position({ fen: AFTER_E4, turn: "b", multiPv: 2 }), hooks);
      await searched(2);
      expect(FakeEngine.instances).toHaveLength(1);
      expect(engine().setOptions.filter(([name]) => name === "Threads")).toHaveLength(1);
      expect(engine().setOptions.at(-1)).toEqual(["MultiPV", 2]);
      answer(AFTER_E4);
      await second;
    });

    it("fails `handshake` when the engine never answers uci, and `create` when there is no handle", async () => {
      const silent = { ...resolveEngine(), create: () => Object.assign(new FakeEngine(), { whenOptionsReady: () => () => undefined }) };
      await open({}, { engineFor: async () => silent, handshakeTimeoutMs: 30 });
      await expect(session!.evaluate(position(), hooksOf().hooks)).rejects.toMatchObject({ reason: "handshake" });

      const broken = {
        ...resolveEngine(),
        create: () => {
          throw new Error("no worker");
        },
      };
      await open({}, { engineFor: async () => broken });
      const failure = await session!.evaluate(position(), hooksOf().hooks).catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(EngineSessionError);
      expect(failure).toMatchObject({ reason: "create" });
    });

    it("terminates its engine on close, and evaluates nothing after it", async () => {
      await open();
      const { hooks } = hooksOf();
      const pending = session!.evaluate(position(), hooks);
      await searched(1);
      answer(START);
      await pending;
      session!.close();
      expect(engine().terminated).toBe(true);
      expect(await session!.evaluate(position({ fen: AFTER_E4, turn: "b" }), hooks)).toBeUndefined();
      session!.close();
    });
  });

  describe("a search", () => {
    it("is line 1 first, the lines past a gap dropped, and the nodes the engine last said", async () => {
      await open();
      const { hooks } = hooksOf();
      const pending = session!.evaluate(position({ multiPv: 3 }), hooks);
      await searched(1);
      const pv = legalMove(START);
      engine().say({ fen: START, depth: 18, multipv: 1, positionEvaluation: "30", pv });
      engine().say({ fen: START, depth: 18, multipv: 3, positionEvaluation: "10", pv });
      engine().say({ fen: START, bestMove: pv });
      expect(await pending).toEqual({ fen: START, lines: [{ score: { kind: "cp", value: 30 }, depth: 18, pv: [pv] }] });
    });

    it("stops early once a line falls out of the range past the minimum depth", async () => {
      await open({ search: { ...config().search, minDepth: 10, variationRangeCp: 100 } });
      const { hooks } = hooksOf();
      const pending = session!.evaluate(position({ multiPv: 2 }), hooks);
      await searched(1);
      const pv = legalMove(START);
      engine().say({ fen: START, depth: 8, multipv: 1, positionEvaluation: "50", pv });
      engine().say({ fen: START, depth: 8, multipv: 2, positionEvaluation: "-100", pv });
      expect(engine().stops).toBe(0);
      engine().say({ fen: START, depth: 12, multipv: 2, positionEvaluation: "-100", pv });
      expect(engine().stops).toBe(1);
      engine().say({ fen: START, bestMove: pv });
      expect((await pending)?.lines).toHaveLength(2);
    });

    it("fails `no-line` when the search ends without a scored line", async () => {
      await open();
      const pending = session!.evaluate(position(), hooksOf().hooks);
      await searched(1);
      engine().say({ fen: START, bestMove: legalMove(START) });
      await expect(pending).rejects.toMatchObject({ reason: "no-line" });
    });

    it("stops the engine at once when its signal is aborted, answering nothing", async () => {
      await open();
      const { controller, hooks } = hooksOf();
      const pending = session!.evaluate(position(), hooks);
      await searched(1);
      engine().say({ fen: START, depth: 9, multipv: 1, positionEvaluation: "20", pv: legalMove(START) });
      controller.abort();
      expect(await pending).toBeUndefined();
      expect(engine().stops).toBe(1);
      expect(hooks.endLive).toHaveBeenCalledTimes(1);
      // A word after it reaches nobody.
      engine().say({ fen: START, depth: 10, nodes: 5 });
      expect(hooks.live).toHaveBeenCalledTimes(1);
    });
  });

  describe("its silence watchdog and the engine server's heartbeat (CTA-194)", () => {
    const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    it("fails `silence` when the engine says nothing about the position for longer than the timeout", async () => {
      await open({}, { silenceTimeoutMs: 80 });
      const pending = session!.evaluate(position(), hooksOf().hooks);
      await searched(1);
      // A word about another position is not one about this.
      engine().say({ fen: AFTER_E4, heartbeat: true });
      await expect(pending).rejects.toMatchObject({ reason: "silence" });
    });

    it("keeps a quiet search alive through heartbeats — each heard, no line, depth or score changed", async () => {
      let clock = Date.parse("2026-10-16T10:00:00Z");
      await open({}, { silenceTimeoutMs: 120, now: () => new Date(clock) });
      const { hooks } = hooksOf();
      const pending = session!.evaluate(position(), hooks);
      await searched(1);
      const pv = legalMove(START);
      engine().say({ fen: START, depth: 32, seldepth: 40, nodes: 9_000_000, multipv: 1, positionEvaluation: "35", pv });
      const heard = hooks.live.mock.calls.at(-1)![0];
      for (let beat = 1; beat <= 5; beat += 1) {
        await pause(60);
        clock += 15_000;
        engine().say({ fen: START, heartbeat: true });
        expect(hooks.live.mock.calls.at(-1)![0]).toMatchObject({ depth: 32, seldepth: 40, nodes: 9_000_000, score: heard.score, line: heard.line, heardAt: clock });
      }
      // Every word heard is a heartbeat of the step: the line and the five beats.
      expect(hooks.heartbeat).toHaveBeenCalledTimes(6);
      engine().say({ fen: START, bestMove: pv });
      expect((await pending)?.lines[0]).toMatchObject({ depth: 32, score: { kind: "cp", value: 35 } });
    });
  });

  describe("its live payload (CTA-190)", () => {
    it("is every word about the position — the job, its index and move, depth, nodes, nps, time, hash and the best line — ended with the search", async () => {
      // A clock that stands still: a line without a time keeps the engine's last.
      await open({}, { now: () => new Date("2026-10-16T10:00:00Z") });
      const { hooks } = hooksOf();
      const pending = session!.evaluate(position({ index: 3, moveLabel: "2... Nc6" }), hooks);
      await searched(1);
      const pv = legalMove(START);
      for (let depth = 1; depth <= 3; depth += 1) {
        engine().say({ fen: START, depth, seldepth: depth + 6, nodes: depth * 1000, nps: 500_000, time: depth * 10, hashfull: 120, multipv: 1, positionEvaluation: "35", pv });
      }
      // A `currmove` line carries no counts: the last ones stand.
      engine().say({ fen: START, depth: 3, currmove: pv, currmovenumber: 1 });
      expect(hooks.live).toHaveBeenCalledTimes(4);
      expect(hooks.live.mock.calls.at(-1)![0]).toMatchObject({
        jobId: "job",
        index: 3,
        move: "2... Nc6",
        depth: 3,
        seldepth: 9,
        nodes: 3000,
        nps: 500_000,
        hashfull: 120,
        elapsedMs: 30,
        score: { kind: "cp", value: 35 },
        line: [expect.any(String)],
      });
      expect(hooks.endLive).not.toHaveBeenCalled();
      engine().say({ fen: START, bestMove: pv });
      await pending;
      expect(hooks.endLive).toHaveBeenCalledTimes(1);
      expect(hooks.live).toHaveBeenCalledTimes(4);
    });
  });

  describe("the eval sources first (CTA-196)", () => {
    const API = "http://10.0.0.3:8000";
    const turnApiOn = (write = false, minWriteDepth = 1) =>
      localStorage.setItem(LICHESS_EVAL_API_STORAGE_KEY, JSON.stringify({ enabled: true, url: API, write, minWriteDepth }));
    const warnings = (heard: ReturnType<typeof vi.fn>) =>
      heard.mock.calls.map(([event]) => ({ jobId: event.jobId, name: event.name, kind: event.kind, source: event.source.id }));

    /** The API: a found eval at `depth` for a FEN asked, a 404 where `missing` says, a write answered `writeStatus`. */
    const apiAnswering = (missing: (fen: string) => boolean = () => false, depth = 40, writeStatus = 200) => {
      const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method === "POST") return new Response(JSON.stringify({ stored: 1, skipped: 0, results: [] }), { status: writeStatus });
        const fen = new URL(url).searchParams.get("fen") ?? "";
        if (missing(fen)) return new Response(JSON.stringify({ detail: "position not found" }), { status: 404 });
        const line = legalMove(`${fen} 0 1`);
        return new Response(
          JSON.stringify({ query: fen, positions: [{ fen, source: "lichess", evals: [{ depth, knodes: 1, pvs: [{ cp: 31, mate: null, line }] }] }] }),
          { status: 200 },
        );
      });
      vi.stubGlobal("fetch", fetchMock);
      return fetchMock;
    };
    const posted = (fetchMock: ReturnType<typeof apiAnswering>) =>
      fetchMock.mock.calls.filter(([, init]) => init?.method === "POST").map(([, init]) => JSON.parse(String(init?.body)).entries);

    it("takes a hit at the search's depth or deeper as the result — no engine built", async () => {
      turnApiOn();
      apiAnswering();
      await open();
      expect((await session!.evaluate(position(), hooksOf().hooks))?.lines[0]).toMatchObject({ score: { kind: "cp", value: 31 }, depth: 40 });
      expect(FakeEngine.instances).toHaveLength(0);
    });

    it("searches a miss, and one held shallower than asked", async () => {
      turnApiOn();
      apiAnswering(() => false, 12);
      await open();
      const pending = session!.evaluate(position(), hooksOf().hooks);
      await searched(1);
      answer(START);
      expect((await pending)?.lines[0]).toMatchObject({ depth: 20 });
    });

    it("goes on with the engine when a source does not answer — said once, and not asked again this session", async () => {
      turnApiOn(true);
      const fetchMock = vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      });
      vi.stubGlobal("fetch", fetchMock);
      const heard = vi.fn();
      const off = subscribeEvalSourceUnreachable(heard);
      await open();
      for (const [index, fen] of [START, AFTER_E4].entries()) {
        const pending = session!.evaluate(position({ fen, turn: index === 0 ? "w" : "b", index }), hooksOf().hooks);
        await searched(index + 1);
        answer(fen);
        await pending;
      }
      off();
      // One lookup, and no write either: a source that does not answer a lookup takes none.
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(warnings(heard)).toEqual([{ jobId: "job", name: "Alice – Bob", kind: "read", source: "lichess" }]);
    });

    it("sends what the engine searched back while writing is on — and, refused, says it once and sends no more", async () => {
      turnApiOn(true);
      const fetchMock = apiAnswering(() => true, 40, 403);
      const heard = vi.fn();
      const off = subscribeEvalSourceUnreachable(heard);
      await open();
      for (const [index, fen] of [START, AFTER_E4].entries()) {
        const pending = session!.evaluate(position({ fen, turn: index === 0 ? "w" : "b", index }), hooksOf().hooks);
        await searched(index + 1);
        answer(fen);
        await pending;
      }
      off();
      expect(posted(fetchMock)).toEqual([
        [{ fen: START, depth: 20, knodes: 1500, pov: "white", pvs: [{ cp: 20, line: legalMove(START) }], engine: "Stockfish 19 Lite" }],
      ]);
      expect(warnings(heard)).toEqual([{ jobId: "job", name: "Alice – Bob", kind: "write", source: "lichess" }]);
      // Lookups go on.
      expect(fetchMock.mock.calls.filter(([, init]) => init?.method !== "POST")).toHaveLength(2);
    });

    it("asks nothing while every source is off", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      await open();
      const pending = session!.evaluate(position(), hooksOf().hooks);
      await searched(1);
      answer(START);
      await pending;
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
