import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkerTransport } from "./workerTransport";

/** Records what the transport does to its worker, and lets a test speak for it. */
class FakeWorker implements Partial<Worker> {
  static last: FakeWorker | null = null;
  static urls: string[] = [];

  readonly posted: string[] = [];
  terminated = false;
  private listeners = new Map<string, Set<(event: unknown) => void>>();

  constructor(url: string | URL) {
    FakeWorker.last = this;
    FakeWorker.urls.push(String(url));
  }

  postMessage(message: string) {
    this.posted.push(message);
  }

  addEventListener(type: string, listener: (event: unknown) => void) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: (event: unknown) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  terminate() {
    this.terminated = true;
  }

  emit(type: string, event: unknown) {
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }
}

beforeEach(() => {
  FakeWorker.last = null;
  FakeWorker.urls = [];
  vi.stubGlobal("Worker", FakeWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("WorkerTransport", () => {
  it("makes its worker from the URL it is given, and only when constructed", () => {
    expect(FakeWorker.urls).toEqual([]);
    new WorkerTransport("/base/stockfish/x.js");
    expect(FakeWorker.urls).toEqual(["/base/stockfish/x.js"]);
  });

  it("posts a line as a message and hands each message back as a line", () => {
    const transport = new WorkerTransport("/x.js");
    const lines: string[] = [];
    transport.onLine((line) => lines.push(line));

    transport.send("uci");
    FakeWorker.last?.emit("message", { data: "uciok" });

    expect(FakeWorker.last?.posted).toEqual(["uci"]);
    expect(lines).toEqual(["uciok"]);
  });

  it("stops delivering after the unsubscribe", () => {
    const transport = new WorkerTransport("/x.js");
    const callback = vi.fn();
    const unsubscribe = transport.onLine(callback);

    unsubscribe();
    FakeWorker.last?.emit("message", { data: "readyok" });

    expect(callback).not.toHaveBeenCalled();
  });

  it("terminates the worker on close", () => {
    const transport = new WorkerTransport("/x.js");
    transport.close();
    expect(FakeWorker.last?.terminated).toBe(true);
  });

  it("names the URL when the worker fails to load — it never throws", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    new WorkerTransport("/missing.js");

    FakeWorker.last?.emit("error", { message: "boom" });

    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("/missing.js"),
      "boom",
    );
  });
});
