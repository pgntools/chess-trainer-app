import { describe, expect, it } from "vitest";

import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS } from "./computerAnalysis";
import {
  canCancelJob,
  canResumeJob,
  computerAnalysisJobOf,
  jobFrom,
  jobOutputName,
  jobProgress,
  withCheckpoint,
  type ComputerAnalysisRequest,
} from "./jobs";

const PGN = '[White "Alice"]\n[Black "Bob"]\n\n1. e4 e5 2. Nf3 Nc6 *';
const NOW = new Date("2026-10-10T12:00:00Z");

const request = (overrides: Partial<ComputerAnalysisRequest["options"]> = {}, pgn = PGN): ComputerAnalysisRequest => ({
  source: { analysisId: "a1", name: " Alice – Bob ", folderId: "f1", pgn },
  options: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, outputs: ["light", "full"], ...overrides },
});

describe("a computer analysis job (CTA-173)", () => {
  it("is queued with a position per searched position, an empty checkpoint and the source as sent", () => {
    const job = computerAnalysisJobOf("j1", request(), NOW)!;
    expect(job).toMatchObject({
      id: "j1",
      kind: "computer-analysis",
      status: "queued",
      createdAt: NOW.toISOString(),
      startedAt: null,
      finishedAt: null,
      engine: null,
      outputs: [],
      error: null,
      source: { analysisId: "a1", name: "Alice – Bob", folderId: "f1", pgn: PGN },
    });
    // Four moves: the start position and the one after each.
    expect(job.positions.map((position) => [position.ply, position.san ?? null, position.analysed])).toEqual([
      [0, "e4", true],
      [1, "e5", true],
      [2, "Nf3", true],
      [3, "Nc6", true],
      [4, null, false],
    ]);
    expect(job.checkpoint).toEqual([null, null, null, null, null]);
  });

  it("is nothing to run without a variant, a move to analyse, or a PGN that reads", () => {
    expect(computerAnalysisJobOf("j", request({ outputs: [] }))).toBeUndefined();
    expect(computerAnalysisJobOf("j", request({}, '[FEN "8/8/8/8/8/8/8/K6k w - - 0 1"]\n\n*'))).toBeUndefined();
    expect(computerAnalysisJobOf("j", request({ fromMove: 40 }))).toBeUndefined();
    expect(computerAnalysisJobOf("j", request({}, "1. e4 e5 2. Ke9 *"))).toBeUndefined();
  });

  it("names its outputs after the source and the variant", () => {
    expect(jobOutputName("Alice – Bob", "medium")).toBe("Alice – Bob — computer analysis (medium)");
  });

  it("counts its progress off the checkpoint, the current move the first without a result", () => {
    let job = computerAnalysisJobOf("j1", request(), NOW)!;
    expect(jobProgress(job)).toEqual({ done: 0, total: 5, current: job.positions[0], percent: 0 });
    const result = { fen: job.positions[0].fen, lines: [{ score: { kind: "cp" as const, value: 30 }, depth: 20, pv: ["e2e4"] }] };
    job = withCheckpoint(job, 0, result, NOW);
    expect(jobProgress(job)).toMatchObject({ done: 1, total: 5, current: { san: "e5" }, percent: 20 });
  });

  it("is cancelled while it has not ended, and resumed when a reload or a failure stopped it", () => {
    expect(["queued", "running", "interrupted"].every((status) => canCancelJob({ status } as never))).toBe(true);
    expect(["done", "failed", "cancelled"].some((status) => canCancelJob({ status } as never))).toBe(false);
    expect(["interrupted", "failed"].every((status) => canResumeJob({ status } as never))).toBe(true);
    expect(["queued", "running", "done", "cancelled"].some((status) => canResumeJob({ status } as never))).toBe(false);
  });
});

describe("jobFrom — a stored job read back", () => {
  const job = computerAnalysisJobOf("j1", request(), NOW)!;

  it("round-trips a record", () => {
    expect(jobFrom(JSON.parse(JSON.stringify(job)))).toEqual(job);
  });

  it("drops a record with no id, an unknown kind, no source or unreadable positions", () => {
    expect(jobFrom(null)).toBeUndefined();
    expect(jobFrom({ ...job, id: "" })).toBeUndefined();
    expect(jobFrom({ ...job, kind: "export" })).toBeUndefined();
    expect(jobFrom({ ...job, source: { name: "x" } })).toBeUndefined();
    expect(jobFrom({ ...job, positions: [{ ply: 0 }] })).toBeUndefined();
  });

  it("reads an unknown status as interrupted, never as something to run", () => {
    expect(jobFrom({ ...job, status: "paused" })?.status).toBe("interrupted");
  });

  it("keeps a checkpoint entry only for its own position, and pads the checkpoint to the positions", () => {
    const line = { score: { kind: "cp", value: 12 }, depth: 18, pv: ["e7e5"] };
    const stored = {
      ...job,
      checkpoint: [
        { fen: job.positions[0].fen, lines: [line] },
        { fen: "another fen", lines: [line] },
        { fen: job.positions[2].fen, lines: [{ score: { kind: "pawns", value: 1 } }] },
      ],
    };
    const read = jobFrom(stored)!;
    expect(read.checkpoint).toEqual([{ fen: job.positions[0].fen, lines: [line] }, null, null, null, null]);
  });

  it("holds the options to their bounds and the outputs to the known variants", () => {
    const read = jobFrom({ ...job, options: { ...job.options, depth: 400, outputs: ["full", "huge"] } })!;
    expect(read.options.depth).toBe(40);
    expect(read.options.outputs).toEqual(["full"]);
  });

  it("keeps an engine server's engine's Hash and Threads, sent and read back, an in-browser build's still cut to 1024 (CTA-175)", () => {
    const hosted = computerAnalysisJobOf("j2", request({ engine: "hosted:stockfish-19", threads: 12, hashMb: 4096 }), NOW)!;
    expect(hosted.options).toMatchObject({ threads: 12, hashMb: 4096 });
    expect(jobFrom(JSON.parse(JSON.stringify(hosted)))?.options).toMatchObject({ threads: 12, hashMb: 4096 });
    expect(computerAnalysisJobOf("j3", request({ hashMb: 4096 }), NOW)!.options.hashMb).toBe(1024);
  });
});
