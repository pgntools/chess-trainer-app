import { describe, expect, it } from "vitest";

import {
  accuracyOfAcpl,
  analysisPositionsOf,
  computerAnalysisOptionsFrom,
  kindOfLoss,
  lossAndMissedMate,
  moveVerdicts,
  moverCp,
  playerReports,
  prunedLines,
  shouldStopEarly,
  terminalResultOf,
  withSearchInfo,
  COMPUTER_ANALYSIS_BOUNDS,
  DEFAULT_COMPUTER_ANALYSIS_OPTIONS,
  type ComputerAnalysisOptions,
  type PositionLine,
  type PositionResult,
} from "./computerAnalysis";
import {
  analysisScopeOf,
  computerAnalysisTree,
  evalSeriesOf,
  reportFromTree,
} from "./computerAnalysisTree";
import type { Score } from "./engineAnalysis";
import { findNode, mainline, treeToPgn, type GameTree } from "./gameTree";
import { parsePgnTree } from "./pgn";

const cp = (value: number): Score => ({ kind: "cp", value });
const mate = (value: number): Score => ({ kind: "mate", value });

const treeOf = (pgn: string): GameTree => {
  const tree = parsePgnTree(pgn);
  if (tree === null) throw new Error("unreadable PGN");
  return tree;
};

const options = (patch: Partial<ComputerAnalysisOptions> = {}): ComputerAnalysisOptions => ({
  ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS,
  ...patch,
});

const line = (score: Score, pv: string, depth = 20): PositionLine => ({ score, depth, pv: pv.split(" ") });

describe("computerAnalysisOptionsFrom", () => {
  it("fills every missing or mistyped field with its default", () => {
    expect(computerAnalysisOptionsFrom(undefined)).toEqual(DEFAULT_COMPUTER_ANALYSIS_OPTIONS);
    expect(computerAnalysisOptionsFrom({ depth: "deep", side: "white", outputs: "full" })).toEqual(
      DEFAULT_COMPUTER_ANALYSIS_OPTIONS,
    );
  });

  it("has main.py's defaults, with the early stop at the depth", () => {
    expect(DEFAULT_COMPUTER_ANALYSIS_OPTIONS).toMatchObject({
      depth: 20,
      moveTimeMs: 30000,
      multiPv: 1,
      minDepth: 20,
      variationRangeCp: 100,
      side: "both",
      fromMove: 1,
      fromColour: "w",
      toMove: null,
      thresholds: { inaccuracy: 50, mistake: 100, blunder: 300 },
    });
  });

  it("clamps the numbers into their bounds", () => {
    const read = computerAnalysisOptionsFrom({ threads: 99, hashMb: 0, depth: 400, multiPv: 50, moveTimeMs: -5 });
    expect(read.threads).toBe(COMPUTER_ANALYSIS_BOUNDS.threads.max);
    expect(read.hashMb).toBe(COMPUTER_ANALYSIS_BOUNDS.hashMb.min);
    expect(read.depth).toBe(COMPUTER_ANALYSIS_BOUNDS.depth.max);
    expect(read.multiPv).toBe(10);
    expect(read.moveTimeMs).toBe(0);
  });

  it("keeps an engine server's engine's Hash and Threads past the in-browser ceilings (CTA-175)", () => {
    const hosted = computerAnalysisOptionsFrom({ engine: "hosted:stockfish-19", threads: 12, hashMb: 4096 });
    expect(hosted).toMatchObject({ engine: "hosted:stockfish-19", threads: 12, hashMb: 4096 });
    // Read back as a stored job is: the same.
    expect(computerAnalysisOptionsFrom(JSON.parse(JSON.stringify(hosted)))).toEqual(hosted);
  });

  it("still holds an in-browser build, or a record naming no engine, to 1024 MB and 32 threads (CTA-175)", () => {
    for (const engine of [undefined, "stockfish-19-lite-single", "stockfish-19-lite-multi"]) {
      const read = computerAnalysisOptionsFrom({ engine, threads: 48, hashMb: 4096 });
      expect(read.hashMb).toBe(1024);
      expect(read.threads).toBe(32);
    }
  });

  it("clamps minDepth to at most the depth", () => {
    expect(computerAnalysisOptionsFrom({ depth: 18, minDepth: 24 }).minDepth).toBe(18);
    expect(computerAnalysisOptionsFrom({ depth: 18, minDepth: 12 }).minDepth).toBe(12);
  });

  it("keeps the thresholds in order", () => {
    expect(computerAnalysisOptionsFrom({ thresholds: { inaccuracy: 120, mistake: 80, blunder: 90 } }).thresholds).toEqual({
      inaccuracy: 120,
      mistake: 120,
      blunder: 120,
    });
  });

  it("reads the move range: a last move before the first is the first", () => {
    expect(computerAnalysisOptionsFrom({ fromMove: 10, fromColour: "b", toMove: 4 })).toMatchObject({
      fromMove: 10,
      fromColour: "b",
      toMove: 10,
    });
    expect(computerAnalysisOptionsFrom({ toMove: null }).toMove).toBeNull();
    expect(computerAnalysisOptionsFrom({ toMove: 40 }).toMove).toBe(40);
  });

  it("keeps the known outputs once each, in their order", () => {
    expect(computerAnalysisOptionsFrom({ outputs: ["full", "nope", "light", "full"] }).outputs).toEqual([
      "light",
      "full",
    ]);
    expect(computerAnalysisOptionsFrom({ outputs: [] }).outputs).toEqual([]);
  });
});

describe("the scores", () => {
  it("score a mate as ±10000 less its distance, from the side to move's view", () => {
    expect(moverCp(cp(40), "w")).toBe(40);
    expect(moverCp(cp(40), "b")).toBe(-40);
    expect(moverCp(mate(3), "w")).toBe(9997);
    expect(moverCp(mate(3), "b")).toBe(-9997);
    expect(moverCp(mate(-2), "b")).toBe(9998);
    // `mate 0`: the side to move is mated.
    expect(moverCp(mate(0), "w")).toBe(-10000);
    expect(moverCp(mate(-0), "b")).toBe(-10000);
  });
});

describe("shouldStopEarly", () => {
  const rules = { minDepth: 12, depth: 20, variationRangeCp: 100 };

  it("stops once another line is more than the range below line 1, at minDepth or deeper", () => {
    const lines = [{ score: cp(50) }, { score: cp(20) }, { score: cp(-60) }];
    expect(shouldStopEarly(lines, "w", 12, rules)).toBe(true);
    expect(shouldStopEarly(lines, "w", 11, rules)).toBe(false);
  });

  it("does not stop at a gap of exactly the range, or without line 1", () => {
    expect(shouldStopEarly([{ score: cp(50) }, { score: cp(-50) }], "w", 15, rules)).toBe(false);
    expect(shouldStopEarly([undefined, { score: cp(-500) }], "w", 15, rules)).toBe(false);
  });

  it("measures from Black's view when Black is to move", () => {
    // White's view: line 1 −0.50 is Black +0.50, line 2 +0.80 is Black −0.80 — a 130 cp gap.
    expect(shouldStopEarly([{ score: cp(-50) }, { score: cp(80) }], "b", 15, rules)).toBe(true);
    // The same numbers with White to move: line 2 is the better one, no gap.
    expect(shouldStopEarly([{ score: cp(-50) }, { score: cp(80) }], "w", 15, rules)).toBe(false);
  });

  it("scores mates as ±10000", () => {
    expect(shouldStopEarly([{ score: mate(4) }, { score: cp(900) }], "w", 15, rules)).toBe(true);
    expect(shouldStopEarly([{ score: mate(2) }, { score: mate(5) }], "w", 15, rules)).toBe(false);
    expect(shouldStopEarly([{ score: mate(-2) }, { score: cp(300) }], "b", 15, rules)).toBe(true);
  });

  it("clamps minDepth to the depth", () => {
    const lines = [{ score: cp(50) }, { score: cp(-200) }];
    expect(shouldStopEarly(lines, "w", 20, { minDepth: 24, depth: 20, variationRangeCp: 100 })).toBe(true);
    expect(shouldStopEarly(lines, "w", 19, { minDepth: 24, depth: 20, variationRangeCp: 100 })).toBe(false);
  });
});

describe("prunedLines", () => {
  const rules = { variationRangeCp: 100 };

  it("keeps line 1 and every line up to the first more than the range below it", () => {
    const lines = [line(cp(60), "e2e4"), line(cp(0), "d2d4"), line(cp(-50), "g1f3"), line(cp(-30), "c2c4")];
    // −50 is 110 below: it goes, and everything after it.
    expect(prunedLines(lines, "w", rules).map((kept) => kept.pv[0])).toEqual(["e2e4", "d2d4"]);
  });

  it("measures from Black's view when Black is to move", () => {
    const lines = [line(cp(-60), "e7e5"), line(cp(30), "c7c5"), line(cp(50), "a7a6")];
    expect(prunedLines(lines, "b", rules).map((kept) => kept.pv[0])).toEqual(["e7e5", "c7c5"]);
  });

  it("scores mates as ±10000", () => {
    const lines = [line(mate(-3), "d8h4"), line(mate(-5), "d8g5"), line(cp(-900), "e7e5")];
    expect(prunedLines(lines, "b", rules).map((kept) => kept.pv[0])).toEqual(["d8h4", "d8g5"]);
  });

  it("prunes nothing without line 1", () => {
    expect(prunedLines([undefined, line(cp(-900), "e2e4")], "w", rules)).toHaveLength(1);
  });
});

describe("withSearchInfo", () => {
  it("folds an info line in by its multipv, normalised against the searched position's turn", () => {
    const folded = withSearchInfo([], { multipv: 2, depth: 14, positionEvaluation: "35", pv: "e7e5 g1f3" }, "b");
    expect(folded[1]).toEqual({ score: cp(-35), depth: 14, pv: ["e7e5", "g1f3"] });
    expect(folded[0]).toBeUndefined();
    const lines = withSearchInfo(folded, { depth: 15, possibleMate: "-2", pv: "d8h4" }, "b");
    expect(lines[0]).toEqual({ score: mate(2), depth: 15, pv: ["d8h4"] });
  });

  it("ignores an info line with no score", () => {
    const lines: (PositionLine | undefined)[] = [];
    expect(withSearchInfo(lines, { depth: 3 }, "w")).toBe(lines);
  });
});

/*
  The fixture: eleven plies, whose results (below) make 3. Qh5 an inaccuracy,
  3... Nf6 a blunder, 4. Qf3 a missed mate (4. Qxf7#) and 5... d5 a mistake.
*/
const GAME = `[White "Alice"]
[Black "Bob"]

1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qf3 Nd4 5. Qd3 d5 6. exd5 *`;

const RESULTS: readonly (readonly PositionLine[])[] = [
  /* 0 W */ [line(cp(30), "e2e4 e7e5"), line(cp(25), "d2d4 d7d5"), line(cp(-100), "g2g4 d7d5")],
  /* 1 B */ [line(cp(30), "e7e5 g1f3"), line(cp(45), "c7c5 g1f3")],
  /* 2 W */ [line(cp(35), "g1f3 b8c6"), line(cp(30), "f1c4 g8f6")],
  /* 3 B */ [line(cp(20), "g8f6 d2d3"), line(cp(30), "b8c6 d1h5")],
  // Line 1 is cut at its third move, which does not play.
  /* 4 W */ [line(cp(30), "g1f3 g8f6 e1e8"), line(cp(-25), "d1h5 g7g6")],
  /* 5 B */ [line(cp(-25), "g7g6 h5f3"), line(cp(0), "d8e7 g1f3")],
  /* 6 W */ [line(mate(1), "h5f7")],
  /* 7 B */ [line(cp(40), "c6d4 f3d3"), line(cp(60), "d7d6 b1c3")],
  /* 8 W */ [line(cp(40), "f3d3 d7d5"), line(cp(10), "f3d1 d7d5")],
  /* 9 B */ [line(cp(45), "d7d6 c2c3"), line(cp(90), "b7b5 c4b3")],
  /* 10 W */ [line(cp(200), "e4d5 c8g4"), line(cp(180), "c4d5 c7c6")],
  /* 11 B */ [line(cp(210), "c8g4")],
];

const fixture = (patch: Partial<ComputerAnalysisOptions> = {}) => {
  const source = treeOf(GAME);
  const opts = options({ multiPv: 3, ...patch });
  const positions = analysisPositionsOf(source, opts);
  const results: PositionResult[] = positions.map((position) => ({ fen: position.fen, lines: [...RESULTS[position.ply]] }));
  const verdicts = moveVerdicts(positions, results, opts);
  return { source, opts, positions, results, verdicts };
};

describe("analysisPositionsOf", () => {
  it("names every mainline position, the one after the last move too", () => {
    const { positions, source } = fixture();
    expect(positions).toHaveLength(12);
    expect(positions.map((position) => position.ply)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(positions[0]).toMatchObject({ fen: source.startFen, turn: "w", nodeId: null, analysed: true, multiPv: 3 });
    expect(positions[0].move).toMatchObject({ san: "e4", uci: "e2e4" });
    const last = positions[11];
    expect(last).toMatchObject({ analysed: false, multiPv: 1, turn: "b", terminal: false });
    expect(last.move).toBeUndefined();
    expect(last.nodeId).toBe(mainline(source)[10].id);
  });

  it("with an eval-only side, analyses that side's moves and asks one line of the others", () => {
    const { positions } = fixture({ side: "b" });
    // Black's first move is ply 2, from position 1; the last position follows Black's last move, 5... d5.
    expect(positions.map((position) => position.ply)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(positions.filter((position) => position.analysed).map((position) => position.move?.san)).toEqual([
      "e5",
      "Nc6",
      "Nf6",
      "Nd4",
      "d5",
    ]);
    expect(positions.map((position) => position.multiPv)).toEqual([3, 1, 3, 1, 3, 1, 3, 1, 3, 1]);
  });

  it("starts at the start move and colour, and stops after the end move", () => {
    const { positions } = fixture({ fromMove: 2, fromColour: "b", toMove: 4 });
    expect(positions.filter((position) => position.analysed).map((position) => position.move?.san)).toEqual([
      "Nc6",
      "Qh5",
      "Nf6",
      "Qf3",
      "Nd4",
    ]);
    expect(positions[0].ply).toBe(3);
    expect(positions.at(-1)?.ply).toBe(8);
  });

  it("is empty when no move is analysed", () => {
    expect(analysisPositionsOf(treeOf(GAME), options({ fromMove: 30 }))).toEqual([]);
    expect(analysisPositionsOf(treeOf("*"), options())).toEqual([]);
  });

  it("marks a position with no move to play terminal, and gives its result", () => {
    const positions = analysisPositionsOf(treeOf("1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0"), options());
    const last = positions.at(-1);
    expect(last).toMatchObject({ ply: 7, terminal: true });
    expect(terminalResultOf(last?.fen ?? "")?.lines[0].score).toEqual(mate(0));
    expect(terminalResultOf("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1")?.lines[0].score).toEqual(cp(0));
    expect(terminalResultOf(positions[0].fen)).toBeUndefined();
  });

  it("carries the eval a position already has, with its depth", () => {
    const positions = analysisPositionsOf(
      treeOf("{ [%eval 0.2] } 1. e4 { [%eval 0.31,22] } e5 2. Nf3 { [%eval #-3] } *"),
      options(),
    );
    expect(positions.map((position) => position.storedEval)).toEqual([
      { score: cp(20) },
      { score: cp(31), depth: 22 },
      undefined,
      { score: mate(-3) },
    ]);
  });
});

describe("the classification", () => {
  const thresholds = DEFAULT_COMPUTER_ANALYSIS_OPTIONS.thresholds;

  it("classifies each loss strictly above its threshold", () => {
    expect([0, 50, 51, 100, 101, 300, 301, 1500].map((loss) => kindOfLoss(loss, thresholds))).toEqual([
      null,
      null,
      "inaccuracy",
      "inaccuracy",
      "mistake",
      "mistake",
      "blunder",
      "blunder",
    ]);
  });

  it("measures the loss in White's view, signed for the mover, each score clamped to ±1000", () => {
    const w = { turn: "w" as const };
    const b = { turn: "b" as const };
    expect(lossAndMissedMate({ score: cp(80), ...w }, { score: cp(10), ...b }, "w")).toEqual({ loss: 70 });
    expect(lossAndMissedMate({ score: cp(-80), ...b }, { score: cp(10), ...w }, "b")).toEqual({ loss: 90 });
    // A move that gains is no loss.
    expect(lossAndMissedMate({ score: cp(10), ...w }, { score: cp(80), ...b }, "w")).toEqual({ loss: 0 });
    expect(lossAndMissedMate({ score: cp(1800), ...w }, { score: cp(-1500), ...b }, "w")).toEqual({ loss: 2000 });
    // A mate against the mover is −1000 at most.
    expect(lossAndMissedMate({ score: cp(0), ...b }, { score: mate(4), ...w }, "b")).toEqual({ loss: 1000 });
  });

  it("calls a forced mate given up a missed mate, with no loss", () => {
    const w = { turn: "w" as const };
    const b = { turn: "b" as const };
    expect(lossAndMissedMate({ score: mate(2), ...w }, { score: cp(300), ...b }, "w")).toEqual({ loss: 0, missedMateIn: 2 });
    expect(lossAndMissedMate({ score: mate(-1), ...b }, { score: cp(0), ...w }, "b")).toEqual({ loss: 0, missedMateIn: 1 });
    // Turned into the other side's mate.
    expect(lossAndMissedMate({ score: mate(3), ...w }, { score: mate(-4), ...b }, "w")).toEqual({ loss: 0, missedMateIn: 3 });
  });

  it("calls a longer mate a missed mate, and a shorter or equal one none", () => {
    const w = { turn: "w" as const };
    const b = { turn: "b" as const };
    expect(lossAndMissedMate({ score: mate(2), ...w }, { score: mate(4), ...b }, "w").missedMateIn).toBe(2);
    expect(lossAndMissedMate({ score: mate(3), ...w }, { score: mate(2), ...b }, "w").missedMateIn).toBeUndefined();
    expect(lossAndMissedMate({ score: mate(-3), ...b }, { score: mate(-3), ...w }, "b").missedMateIn).toBeUndefined();
  });

  it("calls a mate delivered no missed mate", () => {
    expect(lossAndMissedMate({ score: mate(1), turn: "w" }, { score: mate(0), turn: "b" }, "w")).toEqual({ loss: 0 });
    expect(lossAndMissedMate({ score: mate(-1), turn: "b" }, { score: mate(0), turn: "w" }, "b")).toEqual({ loss: 0 });
  });
});

describe("moveVerdicts", () => {
  it("gives each analysed move its loss, kind, missed mate and best alternative", () => {
    const { verdicts } = fixture();
    expect(verdicts.map(({ san, loss, kind, bestSan }) => ({ san, loss, kind, bestSan }))).toEqual([
      { san: "e4", loss: 0, kind: null, bestSan: "d4" },
      { san: "e5", loss: 5, kind: null, bestSan: "c5" },
      { san: "Bc4", loss: 15, kind: null, bestSan: "Nf3" },
      { san: "Nc6", loss: 10, kind: null, bestSan: "Nf6" },
      { san: "Qh5", loss: 55, kind: "inaccuracy", bestSan: "Nf3" },
      { san: "Nf6", loss: 1025, kind: "blunder", bestSan: "g6" },
      { san: "Qf3", loss: 0, kind: "missedMate", bestSan: "Qxf7#" },
      { san: "Nd4", loss: 0, kind: null, bestSan: "d6" },
      { san: "Qd3", loss: 0, kind: null, bestSan: "Qd1" },
      { san: "d5", loss: 155, kind: "mistake", bestSan: "d6" },
      { san: "exd5", loss: 0, kind: null, bestSan: "Bxd5" },
    ]);
    expect(verdicts[6]).toMatchObject({ missedMateIn: 1, best: mate(1), played: cp(40), side: "w", ply: 7 });
  });

  it("gives no verdict to a move whose results are not both in", () => {
    const { positions, results, opts } = fixture();
    const partial = results.slice(0, 4);
    expect(moveVerdicts(positions, partial, opts).map((verdict) => verdict.san)).toEqual(["e4", "e5", "Bc4"]);
  });

  it("ignores a result for another position", () => {
    const { positions, results, opts } = fixture();
    const wrong = results.map((result, index) => (index === 2 ? { ...result, fen: results[3].fen } : result));
    expect(moveVerdicts(positions, wrong, opts).map((verdict) => verdict.san)).not.toContain("e5");
  });

  it("reads a mate delivered from the terminal position, unsearched", () => {
    const source = treeOf("1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0");
    const positions = analysisPositionsOf(source, options());
    const results = positions.map((position) =>
      position.ply === 6 ? { fen: position.fen, lines: [line(mate(1), "h5f7")] } : undefined,
    );
    expect(moveVerdicts(positions, results, options())).toEqual([
      expect.objectContaining({ san: "Qxf7#", loss: 0, kind: null, played: mate(0) }),
    ]);
  });
});

describe("playerReports", () => {
  it("counts, averages and scores each side over its analysed moves", () => {
    const report = playerReports(fixture().verdicts);
    // White: 0 + 15 + 55 + 0 + 0 + 0 over six moves; Black: 5 + 10 + 1025 + 0 + 155 over five.
    expect(report.w).toEqual({
      moves: 6,
      inaccuracies: 1,
      mistakes: 0,
      blunders: 0,
      missedMates: 1,
      acpl: 12,
      accuracy: accuracyOfAcpl(12),
    });
    expect(report.b).toMatchObject({ moves: 5, inaccuracies: 0, mistakes: 1, blunders: 1, missedMates: 0, acpl: 239 });
  });

  it("leaves a side out when none of its moves was analysed", () => {
    const report = playerReports(fixture({ side: "w" }).verdicts);
    expect(report.b).toBeNull();
    expect(report.w?.moves).toBe(6);
  });

  it("is the lichess formula, against main.py's values", () => {
    expect(accuracyOfAcpl(0)).toBeCloseTo(99.9999, 4);
    expect(accuracyOfAcpl(10)).toBeCloseTo(95.6044, 4);
    expect(accuracyOfAcpl(25)).toBeCloseTo(89.3598, 4);
    expect(accuracyOfAcpl(50)).toBeCloseTo(79.817, 4);
    expect(accuracyOfAcpl(100)).toBeCloseTo(63.5826, 4);
    expect(accuracyOfAcpl(200)).toBeCloseTo(40.0204, 4);
    expect(accuracyOfAcpl(800)).toBeCloseTo(0.0012, 4);
    expect(accuracyOfAcpl(5000)).toBe(0);
  });
});

describe("computerAnalysisTree", () => {
  const variantTree = (variant: "light" | "medium" | "full", patch: Partial<ComputerAnalysisOptions> = {}) => {
    const { source, opts, positions, results, verdicts } = fixture(patch);
    return computerAnalysisTree({ source, positions, results, verdicts, variant, engine: "Stockfish 19 Lite", options: opts });
  };

  const REPORT =
    "Computer analysis (VARIANT), Stockfish 19 Lite, depth 20. " +
    "White (Alice): 1 inaccuracy, 0 mistakes, 0 blunders, 1 missed mate, ACPL 12, accuracy 95%. " +
    "Black (Bob): 0 inaccuracies, 1 mistake, 1 blunder, 0 missed mates, ACPL 239, accuracy 33%.";

  it("writes the light variant: the best other line, on classified moves only", () => {
    expect(treeToPgn(variantTree("light"))).toBe(
      `[White "Alice"]
[Black "Bob"]
[AnalysedPlies "1-11"]
[Annotator "Stockfish 19 Lite [light]"]

{ [%eval 0.30,20] } { ${REPORT.replace("VARIANT", "light")} } 1. e4 { [%eval 0.30,20] } 1... e5 { [%eval 0.35,20] } 2. Bc4 { [%eval 0.20,20] } 2... Nc6 { [%eval 0.30,20] } 3. Qh5 $6 { [%eval -0.25,20] } { Inaccuracy. Nf3 was best. } (3. Nf3 { [%eval 0.30,20] } 3... Nf6) 3... Nf6 $4 { [%eval #1,20] } { Blunder. g6 was best. } (3... g6 { [%eval -0.25,20] } 4. Qf3) 4. Qf3 $4 { [%eval 0.40,20] } { Missed mate in 1! Qxf7# was best. } (4. Qxf7# { [%eval #1,20] }) 4... Nd4 { [%eval 0.40,20] } 5. Qd3 { [%eval 0.45,20] } 5... d5 $2 { [%eval 2.00,20] } { Mistake. d6 was best. } (5... d6 { [%eval 0.45,20] } 6. c3) 6. exd5 { [%eval 2.10,20] } *`,
    );
  });

  it("writes the medium variant: every line in range, on classified moves only", () => {
    const pgn = treeToPgn(variantTree("medium"));
    // 3. Qh5's position had one other line (3. Nf3); 3... Nf6's two (g6, Qe7); 5... d5's two (d6, b5).
    expect(pgn).toContain("(3. Nf3 { [%eval 0.30,20] } 3... Nf6) 3... Nf6 $4");
    expect(pgn).toContain("(3... g6 { [%eval -0.25,20] } 4. Qf3) (3... Qe7 { [%eval 0.00,20] } 4. Nf3) 4. Qf3 $4");
    expect(pgn).toContain("(5... d6 { [%eval 0.45,20] } 6. c3) (5... b5 { [%eval 0.90,20] } 6. Bb3) 6. exd5");
    // No line on an unclassified move.
    expect(pgn).not.toContain("(1. d4");
    expect(pgn).toContain('[Annotator "Stockfish 19 Lite [medium]"]');
  });

  it("writes the full variant: every line in range, on every analysed move", () => {
    const pgn = treeToPgn(variantTree("full"));
    // 1. g4 was more than 100 cp below line 1: pruned.
    expect(pgn).toContain("1. e4 { [%eval 0.30,20] } (1. d4 { [%eval 0.25,20] } 1... d5) 1... e5");
    expect(pgn).not.toContain("g4");
    expect(pgn).toContain("(1... c5 { [%eval 0.45,20] } 2. Nf3)");
    // The played move's own line is not repeated: 4... Nd4 was line 1, so only 4... d6.
    expect(pgn).toContain("4... Nd4 { [%eval 0.40,20] } (4... d6 { [%eval 0.60,20] } 5. Nc3) 5. Qd3");
    expect(pgn).toContain('[Annotator "Stockfish 19 Lite [full]"]');
  });

  it("cuts an engine line at its first move that does not play", () => {
    // Line 1 of position 4 is g1f3 g8f6 e1e8: two moves, the third dropped.
    expect(treeToPgn(variantTree("light"))).toContain("(3. Nf3 { [%eval 0.30,20] } 3... Nf6)");
  });

  it.each(["light", "medium", "full"] as const)("round-trips the %s variant through parsePgnTree / treeToPgn", (variant) => {
    const pgn = treeToPgn(variantTree(variant));
    expect(treeToPgn(treeOf(pgn))).toBe(pgn);
  });

  it.each(["light", "medium", "full"] as const)("reads the %s variant's report back, after a round trip too", (variant) => {
    const tree = variantTree(variant);
    const expected = playerReports(fixture().verdicts);
    expect(reportFromTree(tree)).toEqual(expected);
    expect(reportFromTree(treeOf(treeToPgn(tree)))).toEqual(expected);
  });

  it.each(["light", "medium", "full"] as const)("reads the %s variant's eval series back", (variant) => {
    const series = evalSeriesOf(variantTree(variant));
    expect(series.map((point) => point.cp)).toEqual([30, 30, 35, 20, 30, -25, 1000, 40, 40, 45, 200, 210]);
    expect(series[0]).toMatchObject({ nodeId: null, ply: 0, kind: null });
    expect(series.map((point) => point.kind)).toEqual([
      null, null, null, null, null, "inaccuracy", "blunder", "missedMate", null, null, "mistake", null,
    ]);
    expect(series[6]).toMatchObject({ san: "Nf6", side: "b", score: mate(1) });
  });

  it("keeps the source's own side lines, comments and NAGs, a verdict NAG replacing its move mark", () => {
    const source = treeOf(`{ Club game. } 1. e4 e5 2. Bc4 { The Italian. } (2. Nf3 Nc6) Nc6 3. Qh5! $14 Nf6 4. Qf3 Nd4 5. Qd3 d5 6. exd5 *`);
    const opts = options({ multiPv: 3 });
    const positions = analysisPositionsOf(source, opts);
    const results = positions.map((position) => ({ fen: position.fen, lines: [...RESULTS[position.ply]] }));
    const verdicts = moveVerdicts(positions, results, opts);
    const tree = computerAnalysisTree({ source, positions, results, verdicts, variant: "light", engine: "Stockfish 19 Lite", options: opts });
    const pgn = treeToPgn(tree);

    expect(pgn).toContain("{ [%eval 0.30,20] Club game. }");
    expect(pgn).toContain("2. Bc4 { [%eval 0.20,20] The Italian. } (2. Nf3 Nc6) 2... Nc6");
    // `!` ($1) is a move mark, replaced; `$14` stays.
    expect(pgn).toContain("3. Qh5 $6 $14 { [%eval -0.25,20] } { Inaccuracy. Nf3 was best. }");
  });

  it("writes an eval-only side's analysis: evals on the other side's moves, nothing else, and the scope", () => {
    const tree = variantTree("light", { side: "b" });
    const pgn = treeToPgn(tree);
    expect(analysisScopeOf(tree)).toEqual({ fromPly: 2, toPly: 10, side: "b" });
    expect(pgn).toContain('[AnalysedPlies "2-10"]\n[AnalysedSide "Black"]');
    expect(pgn).toContain("{ Computer analysis (light)");
    expect(pgn).toContain("White (Alice): not analysed.");
    // 4. Qf3 still carries its eval (3... Nf6 is measured from it) but is not called a missed mate.
    expect(pgn).toContain("4. Qf3 { [%eval 0.40,20] } 4... Nd4");
    expect(pgn).not.toContain("Missed mate");
    // The start position and 6. exd5 were not searched: the analysis began after 1. e4 and ended after 5... d5.
    expect(pgn).toContain("1. e4 { [%eval 0.30,20] } 1... e5");
    expect(pgn).toContain("6. exd5 *");

    const report = reportFromTree(tree);
    expect(report.w).toBeNull();
    expect(report).toEqual(playerReports(fixture({ side: "b" }).verdicts));
  });

  it("replaces its own report and verdict comments when an output is analysed again", () => {
    const { opts } = fixture();
    const once = variantTree("light");
    const positions = analysisPositionsOf(once, opts);
    const results = positions.map((position) => ({ fen: position.fen, lines: [...RESULTS[position.ply]] }));
    const verdicts = moveVerdicts(positions, results, opts);
    const twice = computerAnalysisTree({ source: once, positions, results, verdicts, variant: "light", engine: "Stockfish 19 Lite", options: opts });
    expect(treeToPgn(twice)).toBe(treeToPgn(once));
  });

  it("replaces the scope tags on a new run, an eval-only side's going with both sides", () => {
    const restricted = variantTree("light", { side: "w" });
    const opts = options({ multiPv: 3 });
    const positions = analysisPositionsOf(restricted, opts);
    const results = positions.map((position) => ({ fen: position.fen, lines: [...RESULTS[position.ply]] }));
    const again = computerAnalysisTree({
      source: restricted,
      positions,
      results,
      verdicts: moveVerdicts(positions, results, opts),
      variant: "light",
      engine: "Stockfish 19 Lite",
      options: opts,
    });
    expect(again.headers).toMatchObject({ AnalysedPlies: "1-11" });
    expect(again.headers.AnalysedSide).toBeUndefined();
    expect(again.comments?.filter((text) => text.startsWith("Computer analysis"))).toHaveLength(1);
  });

  it("keeps a deeper eval the source already had", () => {
    const source = treeOf(GAME.replace("1. e4", "1. e4 { [%eval 0.41,30] }"));
    const opts = options({ multiPv: 3 });
    const positions = analysisPositionsOf(source, opts);
    const results = positions.map((position) => ({ fen: position.fen, lines: [...RESULTS[position.ply]] }));
    const tree = computerAnalysisTree({
      source,
      positions,
      results,
      verdicts: moveVerdicts(positions, results, opts),
      variant: "light",
      engine: "Stockfish 19 Lite",
      options: opts,
    });
    expect(treeToPgn(tree)).toContain("1. e4 { [%eval 0.41,30] }");
    expect(findNode(tree, mainline(tree)[0].id)?.comments).toEqual(["[%eval 0.41,30]"]);
  });
});

describe("analysisScopeOf", () => {
  it("reads the plies and an eval-only side from the header tags", () => {
    expect(analysisScopeOf(treeOf('[AnalysedPlies "19-80"]\n[AnalysedSide "White"]\n\n1. e4 *'))).toEqual({
      fromPly: 19,
      toPly: 80,
      side: "w",
    });
    expect(analysisScopeOf(treeOf('[AnalysedPlies "3-9"]\n\n1. e4 *'))).toEqual({ fromPly: 3, toPly: 9 });
  });

  it("names nothing without the plies, or when they do not read", () => {
    expect(analysisScopeOf(treeOf("1. e4 *"))).toBeUndefined();
    expect(analysisScopeOf(treeOf('[AnalysedPlies "from 3"]\n[AnalysedSide "White"]\n\n1. e4 *'))).toBeUndefined();
  });
});

describe("reportFromTree on a lichess export", () => {
  const LICHESS = `[White "a"]
[Black "b"]
[Annotator "lichess.org"]

1. e4 { [%eval 0.36] } 1... e5 { [%eval 0.3] } 2. Bc4 { [%eval 0.2] } 2... Nc6 { [%eval 0.25] } 3. Qh5 { [%eval 0.0] } 3... Nf6?? { (0.00 → Mate in 1) Lost forced checkmate sequence. g6 was best. } { [%eval #1] } (3... g6 4. Qf3) 4. Qxf7# { [%eval #0] } 1-0`;

  it("counts every move with an eval, the losses from the evals and the kinds from the NAGs", () => {
    const report = reportFromTree(treeOf(LICHESS));
    // Without an opening eval, 1. e4's loss is unknown: it counts, but not in the ACPL.
    expect(report.w).toMatchObject({ moves: 4, inaccuracies: 0, mistakes: 0, blunders: 0, missedMates: 0, acpl: 12 });
    // 0 + 5 + 1000: 3... Nf6?? into a mate is a blunder of 0.00 → −10.00 for Black, not a missed mate (Black had none).
    expect(report.b).toMatchObject({ moves: 3, blunders: 1, missedMates: 0, acpl: 335 });
  });

  it("plots each eval, the mate delivered at +1000", () => {
    const series = evalSeriesOf(treeOf(LICHESS));
    expect(series.map((point) => point.cp)).toEqual([36, 30, 20, 25, 0, 1000, 1000]);
    expect(series[0].nodeId).toBe(mainline(treeOf(LICHESS))[0].id);
  });

  it("calls a ?? whose evals show a mate given up a missed mate", () => {
    const report = reportFromTree(treeOf(`1. e4 { [%eval 0.3] } e5 { [%eval 0.3] } 2. Bc4 { [%eval 0.2] } Nc6 { [%eval 0.3] } 3. Qh5 { [%eval 0.0] } Nf6 { [%eval #1] } 4. Qf3?? { [%eval 0.4] } *`));
    expect(report.w).toMatchObject({ missedMates: 1, blunders: 0 });
  });
});
