import { describe, expect, it } from "vitest";

import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS, type PositionResult } from "./computerAnalysis";
import type { Score } from "./engineAnalysis";
import { computerAnalysisJobOf, withCheckpoint, type Job } from "./jobs";
import { jobLiveAnalysis } from "./jobLiveAnalysis";

/** Black's 3... Nf6 lets 4. Qxf7# in: a blunder. */
const PGN = "1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# *";

const jobOf = (): Job => {
  const job = computerAnalysisJobOf("j1", {
    source: { analysisId: "a1", name: "Scholar's mate", folderId: null, pgn: PGN },
    options: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, depth: 16, minDepth: 16, outputs: ["light"] },
  });
  if (job === undefined) throw new Error("no job");
  return job;
};

/** What the engine says for position `index` — line 1 only, White's view. */
const SCORES: Record<number, { score: Score; pv: string[] }> = {
  0: { score: { kind: "cp", value: 20 }, pv: ["e2e4"] },
  1: { score: { kind: "cp", value: 25 }, pv: ["e7e5"] },
  2: { score: { kind: "cp", value: 30 }, pv: ["g1f3"] },
  3: { score: { kind: "cp", value: -40 }, pv: ["b8c6"] },
  4: { score: { kind: "cp", value: -30 }, pv: ["f1c4"] },
  5: { score: { kind: "cp", value: -20 }, pv: ["g7g6", "h5f3", "g8f6"] },
  6: { score: { kind: "mate", value: 1 }, pv: ["h5f7"] },
};

/** The job with positions `indices` finished. */
const checkpointed = (job: Job, indices: readonly number[]): Job =>
  indices.reduce((current, index) => {
    const result: PositionResult = { fen: current.positions[index].fen, lines: [{ ...SCORES[index], depth: 16 }] };
    return withCheckpoint(current, index, result);
  }, job);

describe("jobLiveAnalysis (CTA-174)", () => {
  it("has nothing to draw before the first position is finished", () => {
    const live = jobLiveAnalysis(jobOf());
    expect(live?.points).toEqual([]);
    expect(live?.verdicts).toEqual([]);
    expect(live?.latest).toBeUndefined();
  });

  it("draws every finished position, in ply order, and the latest one's eval and numbered line", () => {
    const live = jobLiveAnalysis(checkpointed(jobOf(), [0, 1, 2]));
    expect(live?.points.map((point) => [point.ply, point.san, point.side, point.cp])).toEqual([
      [0, undefined, undefined, 20],
      [1, "e4", "w", 25],
      [2, "e5", "b", 30],
    ]);
    expect(live?.latest).toEqual({
      move: "1... e5",
      line: { score: { kind: "cp", value: 30 }, depth: 16, pv: ["g1f3"] },
      moves: "2. Nf3",
    });
  });

  it("judges only the moves whose positions before and after are both finished", () => {
    // Position 3 is not finished: neither 2. Qh5 (ply 3) nor 2... Nc6 (ply 4) can be judged yet.
    const live = jobLiveAnalysis(checkpointed(jobOf(), [0, 1, 2, 4]));
    expect(live?.verdicts.map((verdict) => verdict.ply)).toEqual([1, 2]);
    expect(live?.report.w?.moves).toBe(1);
    expect(live?.report.b?.moves).toBe(1);
  });

  it("marks a verdict on its point and counts it in the report", () => {
    const live = jobLiveAnalysis(checkpointed(jobOf(), [0, 1, 2, 3, 4, 5, 6]));
    const nf6 = live?.points.find((point) => point.ply === 6);
    expect(nf6).toEqual(expect.objectContaining({ san: "Nf6", side: "b", kind: "blunder", cp: 1000 }));
    expect(live?.report.b?.blunders).toBe(1);
    expect(live?.latest).toEqual(expect.objectContaining({ move: "3... Nf6", moves: "4. Qxf7#" }));
  });

  it("numbers a best line from Black's move, and keeps its first eight moves", () => {
    const job = jobOf();
    const long: PositionResult = {
      fen: job.positions[5].fen,
      lines: [{ score: { kind: "cp", value: 0 }, depth: 16, pv: ["g7g6", "h5f3", "g8f6", "g1e2", "f8g7", "b1c3", "e8g8", "e1g1", "d7d6"] }],
    };
    const live = jobLiveAnalysis(withCheckpoint(job, 5, long));
    expect(live?.latest?.moves).toBe("3... g6 4. Qf3 Nf6 5. Ne2 Bg7 6. Nbc3 O-O 7. O-O");
  });

  it("reads nothing from a source that no longer reads, or positions that are not the record's", () => {
    const job = jobOf();
    expect(jobLiveAnalysis({ ...job, source: { ...job.source, pgn: "1. e4 e5 2. Ke3 *" } })).toBeUndefined();
    expect(jobLiveAnalysis({ ...job, positions: job.positions.slice(1), checkpoint: job.checkpoint.slice(1) })).toBeUndefined();
  });
});
