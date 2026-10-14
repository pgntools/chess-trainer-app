import { describe, expect, it, vi } from "vitest";

import { askEvalSources, recordInEvalSources, reportEvalSourceUnreachable, subscribeEvalSourceUnreachable } from "./evalSources";
import { EVAL_SOURCES } from "./registry";
import type { EvalLookup, EvalSource } from "./types";

const FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const RESULT = { fen: FEN, lines: [{ score: { kind: "cp" as const, value: 31 }, depth: 40, pv: ["e2e4"] }] };

const source = (id: string, lookup: EvalLookup | Error, { enabled = true, writes = false, takes = true } = {}): EvalSource => ({
  id,
  labelKey: `test.${id}`,
  storageKeys: [],
  isEnabled: () => enabled,
  lookup: vi.fn(async () => {
    if (lookup instanceof Error) throw lookup;
    return lookup;
  }),
  writesEnabled: () => writes,
  record: vi.fn(async () => takes),
});

describe("the eval-source layer (CTA-196)", () => {
  it("registers the lichess evaluation API — the one source there is", () => {
    expect(EVAL_SOURCES.map((entry) => entry.id)).toEqual(["lichess"]);
  });

  it("asks the enabled sources in order until one holds the position — a source that fails is listed, the next asked", async () => {
    const down = source("down", { kind: "unreachable" });
    const throws = source("throws", new Error("boom"));
    const off = source("off", { kind: "found", result: RESULT }, { enabled: false });
    const missing = source("missing", { kind: "missing" });
    const holds = source("holds", { kind: "found", result: RESULT });
    const after = source("after", { kind: "found", result: RESULT });
    const answer = await askEvalSources({ fen: FEN, depth: 20, multiPv: 1 }, { sources: [down, throws, off, missing, holds, after] });
    expect(answer.found?.source).toBe(holds);
    expect(answer.found?.result).toBe(RESULT);
    expect(answer.unreachable).toEqual([down, throws]);
    expect(off.lookup).not.toHaveBeenCalled();
    expect(after.lookup).not.toHaveBeenCalled();
  });

  it("leaves out a source the caller skips, and says nothing found when none holds it", async () => {
    const holds = source("holds", { kind: "found", result: RESULT });
    const answer = await askEvalSources({ fen: FEN, depth: 20, multiPv: 1 }, { sources: [holds], skip: (entry) => entry.id === "holds" });
    expect(answer).toEqual({ unreachable: [] });
  });

  it("records only in the sources taking writes, and lists the ones that refused", async () => {
    const reader = source("reader", { kind: "missing" });
    const writer = source("writer", { kind: "missing" }, { writes: true });
    const refuses = source("refuses", { kind: "missing" }, { writes: true, takes: false });
    const refused = await recordInEvalSources(RESULT, { nodes: 1000 }, { sources: [reader, writer, refuses] });
    expect(reader.record).not.toHaveBeenCalled();
    expect(writer.record).toHaveBeenCalledWith(RESULT, { nodes: 1000 }, undefined);
    expect(refused).toEqual([refuses]);
  });

  it("hands a job's warning to every listener until it unsubscribes", () => {
    const listener = vi.fn();
    const off = subscribeEvalSourceUnreachable(listener);
    const lichess = EVAL_SOURCES[0];
    reportEvalSourceUnreachable({ jobId: "j1", name: "Alice – Bob", kind: "read", source: lichess });
    off();
    reportEvalSourceUnreachable({ jobId: "j2", name: "Carol – Dan", kind: "write", source: lichess });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ jobId: "j1", name: "Alice – Bob", kind: "read", source: lichess });
  });
});
