import { afterEach, describe, expect, it, vi } from "vitest";

import { indexCollection } from "./indexCollection";

/*
  The index pass's worker (CTA-141): jsdom has none, so each test stands one
  in that fails the way a browser's can — and the pass must still come back
  with the rows, run on the page, the worker's failure logged.
*/

const GAMES = ['[Event "A"]\n\n1. e4 e5 *', '[Event "B"]\n[FEN "8/8/2k5/3r4/4Q3/5K2/8/8 w - - 1 1"]\n[SetUp "1"]\n\n1. Qh4 *'];

/** A worker that, once sent the games, fires `fail` at itself. */
const failingWorker = (fail: (worker: FakeWorker) => void) =>
  class extends FakeWorker {
    postMessage() {
      queueMicrotask(() => fail(this));
    }
  };

class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  terminated = false;
  postMessage() {}
  terminate() {
    this.terminated = true;
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("indexCollection — a worker that fails", () => {
  it.each([
    ["will not start", (worker: FakeWorker) => worker.onerror?.(new Event("error"))],
    [
      "throws",
      (worker: FakeWorker) => worker.onerror?.(new ErrorEvent("error", { message: "boom", filename: "w.js", lineno: 3 })),
    ],
    ["answers an error", (worker: FakeWorker) => worker.onmessage?.(new MessageEvent("message", { data: { type: "error", message: "bad" } }))],
    ["answers what cannot be read", (worker: FakeWorker) => worker.onmessageerror?.(new MessageEvent("messageerror"))],
  ])("that %s is logged, and the games are indexed on the page", async (_, fail) => {
    vi.stubGlobal("Worker", failingWorker(fail));
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    const rows = await indexCollection(GAMES, () => {});

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ event: "A", moves: 1 });
    expect(rows[1]).toMatchObject({ event: "B", moves: 1 });
    expect(logged).toHaveBeenCalledWith(expect.stringContaining("indexing on the page"), expect.any(Error));
  });

  it("is not retried once cancelled", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const controller = new AbortController();

    const pass = indexCollection(GAMES, () => {}, controller.signal);
    controller.abort();

    await expect(pass).rejects.toMatchObject({ name: "AbortError" });
    expect(logged).not.toHaveBeenCalled();
  });
});
