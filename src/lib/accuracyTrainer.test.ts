import { describe, expect, it } from "vitest";

import {
  gradePosition,
  gradeSuggestion,
  moveSquaresOf,
  needsEngine,
  sanLineOf,
  sessionPositionsOf,
  sessionSummaryOf,
  targetOf,
  trainingPositionsOf,
  withEngineResult,
  type TrainingPosition,
} from "./accuracyTrainer";
import { parsePgnTree } from "./pgn";

/*
  The Accuracy Trainer's pure layer (CTA-238): the positions a full analysis
  can train, and the grading of a reader's suggestions against its lines.
*/

/**
 * A computer analysis's shape, by hand: at each analysed move the engine's
 * lines as side lines, each first move with its eval, the game's move with
 * its own. 2. Qh5 is below every line the engine listed; 2... Nc6 has no line.
 */
const ANALYSED = `[Event "Trainer"]
[AnalysedPlies "1-4"]

1. e4 { [%eval 0.30,20] } (1. d4 { [%eval 0.25,20] } 1... d5 2. c4) (1. Nf3 { [%eval 0.20,20] })
1... e5 { [%eval 0.30,20] } (1... c5 { [%eval 0.35,20] })
2. Qh5 $6 { [%eval -0.50,20] } { Inaccuracy. Nf3 was best. } (2. Nf3 { [%eval 0.30,20] }) (2. Bc4 { [%eval 0.20,20] })
2... Nc6 { [%eval -0.40,20] } 3. Bc4 { [%eval -0.45,20] } *`;

const positions = trainingPositionsOf(parsePgnTree(ANALYSED));
const at = (ply: number): TrainingPosition => {
  const position = positions.find((each) => each.ply === ply);
  if (position === undefined) throw new Error(`no position at ply ${ply}`);
  return position;
};

describe("trainingPositionsOf (CTA-238)", () => {
  it("asks at every analysed mainline move that has evaluated side lines, in game order", () => {
    // 2... Nc6 has no line, 3. Bc4 is outside AnalysedPlies.
    expect(positions.map((position) => [position.ply, position.turn, position.moveNumber, position.playedSan])).toEqual([
      [1, "w", 1, "e4"],
      [2, "b", 1, "e5"],
      [3, "w", 2, "Qh5"],
    ]);
    expect(at(1).nodeId).toBeNull();
    expect(at(1).fen).toBe(parsePgnTree(ANALYSED).startFen);
  });

  it("ranks the lines best first from the mover's view, the losses against line 1", () => {
    expect(at(1).lines.map((line) => [line.san, line.rank, line.loss, line.listed, line.played])).toEqual([
      ["e4", 1, 0, true, true],
      ["d4", 2, 5, true, false],
      ["Nf3", 3, 10, true, false],
    ]);
    // Black's view: 1... e5 at -0.30 is better than 1... c5 at -0.35.
    expect(at(2).lines.map((line) => [line.san, line.rank, line.loss, line.moverCp])).toEqual([
      ["e5", 1, 0, -30],
      ["c5", 2, 5, -35],
    ]);
    // A line keeps its continuation.
    expect(at(1).lines[1].sans).toEqual(["d4", "d5", "c4"]);
  });

  it("lists the game's move among the top N only when it scores within the engine's lines", () => {
    expect(at(1).topCount).toBe(3);
    expect(at(3).lines.map((line) => [line.san, line.rank, line.loss, line.listed])).toEqual([
      ["Nf3", 1, 0, true],
      ["Bc4", 2, 10, true],
      ["Qh5", 3, 80, false],
    ]);
    expect(at(3).topCount).toBe(2);
  });

  it("keeps to AnalysedSide", () => {
    const black = trainingPositionsOf(parsePgnTree(ANALYSED.replace("[AnalysedPlies", '[AnalysedSide "Black"]\n[AnalysedPlies')));
    expect(black.map((position) => position.ply)).toEqual([2]);
  });

  it("reads every evaluated move when the tree names no scope", () => {
    const unscoped = trainingPositionsOf(parsePgnTree(ANALYSED.replace('[AnalysedPlies "1-4"]\n', "")));
    expect(unscoped.map((position) => position.ply)).toEqual([1, 2, 3]);
  });

  it("finds nothing in a tree with no engine lines", () => {
    expect(trainingPositionsOf(parsePgnTree("1. e4 { [%eval 0.3] } 1... e5 { [%eval 0.3] } (1... c5) *"))).toEqual([]);
    expect(trainingPositionsOf(parsePgnTree("1. e4 e5 2. Nf3 *"))).toEqual([]);
  });

  it("counts a mate as 10000 less its distance, clamped to 1000 before the loss", () => {
    const mates = trainingPositionsOf(
      parsePgnTree("1. e4 { [%eval #3] } (1. d4 { [%eval 0.50] }) (1. Nf3 { [%eval #5] }) *"),
    )[0];
    expect(mates.lines.map((line) => [line.san, line.moverCp, line.loss])).toEqual([
      ["e4", 9997, 0],
      ["Nf3", 9995, 0],
      ["d4", 50, 950],
    ]);
  });

  it("reads a mating game move's mate 0 as the mover's, and a mate against the mover as theirs", () => {
    const fools = trainingPositionsOf(
      parsePgnTree("1. f3 e5 2. g4 Qh4# { [%eval #0] } (2... Qf6 { [%eval 0.50] }) (2... d5 { [%eval #2] }) *"),
    )[0];
    expect(fools.turn).toBe("b");
    expect(fools.lines.map((line) => [line.san, line.moverCp, line.loss])).toEqual([
      ["Qh4#", 10000, 0],
      ["Qf6", -50, 1050],
      // White mates in 2: −9998 for Black, clamped to −1000.
      ["d5", -9998, 2000],
    ]);
  });
});

describe("sessionPositionsOf", () => {
  it("keeps one side's positions, or both", () => {
    expect(sessionPositionsOf(positions, "w").map((position) => position.ply)).toEqual([1, 3]);
    expect(sessionPositionsOf(positions, "b").map((position) => position.ply)).toEqual([2]);
    expect(sessionPositionsOf(positions, "both")).toHaveLength(3);
  });
});

describe("grading (CTA-238)", () => {
  it("grades a suggestion on the lines by its rank, its loss and the thresholds — and against the top N, in the reader's order", () => {
    expect(gradeSuggestion(at(3), "Nf3", 1, 2)).toEqual({
      san: "Nf3",
      order: 1,
      kind: "line",
      rank: 1,
      loss: 0,
      verdict: null,
      listed: true,
      played: false,
      inTop: true,
      inPlace: true,
    });
    // The game's move, below the engine's lines: never one of the top N.
    expect(gradeSuggestion(at(3), "Qh5", 2, 2)).toMatchObject({ kind: "line", rank: 3, loss: 80, verdict: "inaccuracy", listed: false, inTop: false, inPlace: false });
    // In the top 3, but not where the reader put it.
    expect(gradeSuggestion(at(1), "d4+", 3, 3)).toMatchObject({ kind: "line", rank: 2, inTop: true, inPlace: false });
    // Outside a top 1.
    expect(gradeSuggestion(at(1), "d4", 1, 1)).toMatchObject({ rank: 2, inTop: false });
  });

  it("calls a move none of the lines has outside them, its loss at least the worst listed line's — never a number", () => {
    // Qh5 is a line but not a listed one: the bound is Bc4's 10.
    expect(gradeSuggestion(at(3), "d4", 1, 2)).toEqual({ san: "d4", order: 1, kind: "outside", lossAtLeast: 10, inTop: false, inPlace: false });
  });

  it("uses the thresholds: inaccuracy above 50, mistake above 100, blunder above 300", () => {
    const position: TrainingPosition = {
      ...at(1),
      lines: [0, 50, 51, 101, 301].map((loss, index) => ({ ...at(1).lines[0], san: `m${index}`, rank: index + 1, loss, played: false })),
    };
    expect(["m0", "m1", "m2", "m3", "m4"].map((san, index) => gradeSuggestion(position, san, index + 1, 3))).toMatchObject([
      { verdict: null },
      { verdict: null },
      { verdict: "inaccuracy" },
      { verdict: "mistake" },
      { verdict: "blunder" },
    ]);
  });

  it("holds the moves to find to the engine's top lines", () => {
    expect(targetOf(at(1), 3)).toBe(3);
    expect(targetOf(at(1), 5)).toBe(3);
    expect(targetOf(at(3), 3)).toBe(2);
    expect(targetOf({ ...at(1), topCount: 0 }, 3)).toBe(0);
  });

  it("grades a position against its top N: found, in place, the best suggestion's loss, the worst verdict, the outside ones", () => {
    // The top 3 are e4, d4, Nf3: all found, only e4 in its place.
    expect(gradePosition(at(1), ["e4", "Nf3", "d4"], { wanted: 3 })).toMatchObject({
      target: 3,
      found: 3,
      inPlace: 1,
      bestFound: true,
      bestLoss: 0,
      worstVerdict: null,
      outside: 0,
    });
    // Exactly in order.
    expect(gradePosition(at(1), ["e4", "d4", "Nf3"], { wanted: 3 })).toMatchObject({ found: 3, inPlace: 3 });
    // The top 2 here are Nf3 and Bc4; Qh5 is a line below them, d4 none at all.
    expect(gradePosition(at(3), ["Bc4", "Qh5", "d4"], { wanted: 3 })).toMatchObject({
      target: 2,
      found: 1,
      inPlace: 0,
      bestFound: false,
      bestLoss: 10,
      worstVerdict: "inaccuracy",
      outside: 1,
    });
    // One to find, to start with.
    expect(gradePosition(at(1), ["d4"])).toMatchObject({ target: 1, found: 0 });
  });

  it("grades a pass as no suggestion", () => {
    expect(gradePosition(at(1), [], { wanted: 3 })).toEqual({
      suggestions: [],
      passed: true,
      target: 3,
      found: 0,
      inPlace: 0,
      bestFound: false,
      bestLoss: null,
      worstVerdict: null,
      outside: 0,
    });
  });

  it("knows no best loss where every suggestion is outside the lines, and counts a move once, in its first place", () => {
    expect(gradePosition(at(1), ["a3", "h3"])).toMatchObject({ bestLoss: null, outside: 2, bestFound: false });
    const twice = gradePosition(at(1), ["e4", "d4", "e4"], { wanted: 3 });
    expect(twice.suggestions.map((grade) => [grade.san, grade.order])).toEqual([
      ["e4", 1],
      ["d4", 2],
    ]);
    expect(twice).toMatchObject({ found: 2, inPlace: 2 });
  });
});

describe("sessionSummaryOf", () => {
  it("counts the positions, the moves found and in place, the perfect positions, the average best loss and every verdict", () => {
    const grades = [
      gradePosition(at(1), ["e4", "d4", "Nf3"], { wanted: 3 }),
      gradePosition(at(2), [], { wanted: 3 }),
      gradePosition(at(3), ["Bc4", "Qh5", "d4"], { wanted: 3 }),
    ];
    expect(sessionSummaryOf(grades)).toEqual({
      positions: 3,
      answered: 2,
      passed: 1,
      // 3 + 2 + 2 to find; 3 + 0 + 1 found; 3 + 0 + 0 in place.
      wanted: 7,
      found: 4,
      inPlace: 3,
      foundRate: 4 / 7,
      inPlaceRate: 3 / 7,
      perfect: 1,
      bestFound: 1,
      bestRate: 1 / 3,
      // 0 and 10; the pass knows none.
      averageBestLoss: 5,
      inaccuracies: 1,
      mistakes: 0,
      blunders: 0,
      outside: 1,
    });
  });

  it("has no rates or average with nothing graded", () => {
    expect(sessionSummaryOf([])).toMatchObject({ positions: 0, foundRate: null, inPlaceRate: null, bestRate: null, averageBestLoss: null });
  });
});

describe("moveSquaresOf", () => {
  it("finds a SAN move's squares, marks or none, and nothing for an illegal one", () => {
    const start = parsePgnTree("*").startFen;
    expect(moveSquaresOf(start, "Nf3")).toEqual({ from: "g1", to: "f3" });
    expect(moveSquaresOf(start, "e4+")).toEqual({ from: "e2", to: "e4" });
    expect(moveSquaresOf(start, "Ke2")).toBeUndefined();
    expect(moveSquaresOf("not a fen", "e4")).toBeUndefined();
  });
});

describe("the engine's part (CTA-238, Find Best Move)", () => {
  it("names each position's SAN path from the start", () => {
    expect(positions.map((position) => position.path)).toEqual([[], ["e4"], ["e4", "e5"]]);
  });

  it("keeps every analysed position when asked, with whatever lines the tree has", () => {
    const plain = trainingPositionsOf(parsePgnTree("1. e4 e5 2. Nf3 { [%eval 0.30] } *"), { unevaluated: true });
    expect(plain.map((position) => [position.ply, position.lines.length, position.topCount])).toEqual([
      [1, 0, 0],
      [2, 0, 0],
      // The game's move with an eval is a line — not one of the engine's top lines.
      [3, 1, 0],
    ]);
    expect(plain[2].lines[0]).toMatchObject({ san: "Nf3", played: true, listed: false });
    // Without the option, nothing.
    expect(trainingPositionsOf(parsePgnTree("1. e4 e5 2. Nf3 *"))).toEqual([]);
  });

  it("reads a UCI line as SAN, cut at the first move that does not play", () => {
    const start = parsePgnTree("*").startFen;
    expect(sanLineOf(start, ["e2e4", "e7e5", "g1f3"])).toEqual(["e4", "e5", "Nf3"]);
    expect(sanLineOf(start, ["e2e4", "e2e4"])).toEqual(["e4"]);
  });

  it("adds an engine's lines to a position — the tree's kept for a move it has — and ranks them again", () => {
    // 2. Qh5's position: Nf3 +0.30, Bc4 +0.20 listed, Qh5 −1.50 below them.
    const merged = withEngineResult(at(3), {
      fen: at(3).fen,
      lines: [
        { score: { kind: "cp", value: 40 }, depth: 24, pv: ["b1c3", "g8f6"] },
        { score: { kind: "cp", value: 25 }, depth: 24, pv: ["g1f3"] },
        { score: { kind: "cp", value: -150 }, depth: 24, pv: ["d1h5"] },
      ],
    });
    expect(merged.lines.map((line) => [line.san, line.rank, line.loss, line.listed, line.played])).toEqual([
      ["Nc3", 1, 0, true, false],
      ["Nf3", 2, 10, true, false],
      ["Bc4", 3, 20, true, false],
      ["Qh5", 4, 90, false, true],
    ]);
    expect(merged.topCount).toBe(3);
    expect(merged.lines[0].sans).toEqual(["Nc3", "Nf6"]);
  });

  it("lists the game's move once the engine scores it among its lines, and ignores another position's search", () => {
    const plain = trainingPositionsOf(parsePgnTree("1. e4 { [%eval 0.30] } *"), { unevaluated: true })[0];
    const merged = withEngineResult(plain, { fen: plain.fen, lines: [{ score: { kind: "cp", value: 35 }, depth: 20, pv: ["d2d4"] }, { score: { kind: "cp", value: 20 }, depth: 20, pv: ["g1f3"] }] });
    expect(merged.lines.map((line) => [line.san, line.listed])).toEqual([
      ["d4", true],
      ["e4", true],
      ["Nf3", true],
    ]);
    expect(withEngineResult(plain, { fen: at(3).fen, lines: [{ score: { kind: "cp", value: 0 }, depth: 1, pv: ["g1f3"] }] })).toBe(plain);
  });

  it("asks the engine where the tree has fewer top lines than needed", () => {
    expect(needsEngine(at(1), 3)).toBe(false);
    expect(needsEngine(at(1), 4)).toBe(true);
    expect(needsEngine(at(3), 3)).toBe(true);
  });
});
