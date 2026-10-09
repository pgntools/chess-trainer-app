import { afterEach, describe, expect, it } from "vitest";

import type { EngineMessage } from "./engineTypes";
import { HostedEngine, hostedEnginesFrom, type HostedEngineInfo } from "./hostedEngine";

/*
  `HostedEngine` against a **running engine server** — the real wire, the real
  Stockfish. Skipped unless `ENGINE_API_URL` names one, so CI needs no server:

      yarn api:start      # another console
      ENGINE_API_URL=http://127.0.0.1:8800 npx vitest run src/lib/hostedEngine.live.test.ts

  The fake-fetch tests (`hostedEngine.test.ts`) pin the protocol; this one
  proves the two sides agree.
*/
const SERVER = process.env.ENGINE_API_URL;

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

const engines: HostedEngine[] = [];

afterEach(() => {
  engines.splice(0).forEach((engine) => engine.terminate());
});

const firstEngine = async (): Promise<HostedEngineInfo> => {
  const list = hostedEnginesFrom(await (await fetch(`${SERVER}/v1/engines`)).json());
  if (!list?.length) throw new Error(`${SERVER} lists no engines`);
  return list[0];
};

const open = async () => {
  const engine = new HostedEngine(SERVER!, await firstEngine());
  engines.push(engine);
  const messages: EngineMessage[] = [];
  engine.onMessage((message) => messages.push(message));
  /** Resolves with the `bestmove` stamped with `fen`. */
  const bestMoveFor = (fen: string) =>
    new Promise<EngineMessage>((resolve) => {
      const unsubscribe = engine.onMessage((message) => {
        if (message.bestMove && message.fen === fen) {
          unsubscribe();
          resolve(message);
        }
      });
    });
  const scored = (fen: string) =>
    new Promise<void>((resolve) => {
      const unsubscribe = engine.onMessage((message) => {
        if (message.fen === fen && message.positionEvaluation !== undefined) {
          unsubscribe();
          resolve();
        }
      });
    });
  return { engine, messages, bestMoveFor, scored };
};

const sessions = async (): Promise<number> => (await (await fetch(`${SERVER}/v1/health`)).json()).sessions;

describe.skipIf(!SERVER)("HostedEngine against a running engine server", () => {
  it("searches to a depth with two lines, every message stamped with its position", async () => {
    const { engine, messages, bestMoveFor } = await open();
    expect(engine.setOption("MultiPV", 2)).toBe(true);
    expect(engine.setOption("No Such Option", 1)).toBe(false);
    const done = bestMoveFor(START);
    engine.search(START, { depth: 10 });
    expect((await done).bestMove).toMatch(/^[a-h][1-8][a-h][1-8]/);
    const atDepth10 = messages.filter((m) => m.depth === 10 && m.positionEvaluation !== undefined);
    expect(new Set(atDepth10.map((m) => m.multipv))).toEqual(new Set([1, 2]));
    expect(messages.every((m) => m.fen === START)).toBe(true);
  });

  it("a new search ends the running one — which still answers — and stop ends an infinite one", async () => {
    const { engine, bestMoveFor, scored } = await open();
    const first = bestMoveFor(START);
    const running = scored(START);
    engine.search(START, { infinite: true });
    await running;
    const second = bestMoveFor(AFTER_E4);
    engine.search(AFTER_E4, { depth: 8 });
    expect((await first).fen).toBe(START);
    expect((await second).fen).toBe(AFTER_E4);

    const third = bestMoveFor(START);
    const again = scored(START);
    engine.search(START, { infinite: true });
    await again;
    engine.stop();
    expect((await third).bestMove).toBeTruthy();
  });

  it("opens a new session when the server has dropped its own, and deletes it on terminate", async () => {
    const { engine, bestMoveFor } = await open();
    const first = bestMoveFor(START);
    engine.search(START, { depth: 6 });
    await first;
    const before = await sessions();
    // The server forgets it (an expiry, a restart): the next search must still answer.
    const id = (engine as unknown as { sessionId: string }).sessionId;
    await fetch(`${SERVER}/v1/sessions/${id}`, { method: "DELETE" });
    const second = bestMoveFor(AFTER_E4);
    engine.search(AFTER_E4, { depth: 6 });
    expect((await second).fen).toBe(AFTER_E4);
    expect(await sessions()).toBe(before);

    engine.terminate();
    await expect.poll(sessions).toBe(before - 1);
  });
});
