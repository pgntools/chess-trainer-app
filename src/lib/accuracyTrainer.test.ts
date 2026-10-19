import { describe, expect, it } from "vitest";

import {
  gradePosition,
  gradeSuggestion,
  moveSquaresOf,
  sanOfMove,
  sessionPositionsOf,
  sessionSummaryOf,
  trainingPositionsOf,
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
  it("grades a suggestion on the lines by its rank, its loss and the thresholds", () => {
    expect(gradeSuggestion(at(3), "Nf3")).toEqual({ san: "Nf3", kind: "line", rank: 1, loss: 0, verdict: null, listed: true, played: false });
    expect(gradeSuggestion(at(3), "Qh5")).toEqual({ san: "Qh5", kind: "line", rank: 3, loss: 80, verdict: "inaccuracy", listed: false, played: true });
    expect(gradeSuggestion(at(1), "d4+")).toMatchObject({ kind: "line", rank: 2 });
  });

  it("calls a move none of the lines has outside the top N, its loss at least the worst listed line's — never a number", () => {
    // Qh5 is a line but not a listed one: the bound is Bc4's 10.
    expect(gradeSuggestion(at(3), "d4")).toEqual({ san: "d4", kind: "outside", lossAtLeast: 10 });
  });

  it("uses the thresholds: inaccuracy above 50, mistake above 100, blunder above 300", () => {
    const position: TrainingPosition = {
      ...at(1),
      lines: [0, 50, 51, 101, 301].map((loss, index) => ({ ...at(1).lines[0], san: `m${index}`, rank: index + 1, loss, played: false })),
    };
    expect(["m0", "m1", "m2", "m3", "m4"].map((san) => gradeSuggestion(position, san))).toMatchObject([
      { verdict: null },
      { verdict: null },
      { verdict: "inaccuracy" },
      { verdict: "mistake" },
      { verdict: "blunder" },
    ]);
  });

  it("grades a position: best found, top lines found, the best suggestion's loss, the worst verdict, the outside ones", () => {
    expect(gradePosition(at(3), ["Bc4", "Qh5", "d4"])).toMatchObject({
      passed: false,
      bestFound: false,
      topFound: 1,
      bestLoss: 10,
      worstVerdict: "inaccuracy",
      outside: 1,
    });
    expect(gradePosition(at(1), ["d4", "e4", "Nf3"])).toMatchObject({ bestFound: true, topFound: 3, bestLoss: 0, worstVerdict: null, outside: 0 });
  });

  it("grades a pass as no suggestion", () => {
    expect(gradePosition(at(1), [])).toEqual({
      suggestions: [],
      passed: true,
      bestFound: false,
      topFound: 0,
      bestLoss: null,
      worstVerdict: null,
      outside: 0,
    });
  });

  it("knows no best loss where every suggestion is outside the lines, and counts a move once", () => {
    expect(gradePosition(at(1), ["a3", "h3"])).toMatchObject({ bestLoss: null, outside: 2, bestFound: false });
    expect(gradePosition(at(1), ["e4", "e4"]).suggestions).toHaveLength(1);
  });
});

describe("sessionSummaryOf", () => {
  it("counts the positions, the hit rates, the average best loss and every suggestion's verdict", () => {
    const grades = [
      gradePosition(at(1), ["e4", "d4"]),
      gradePosition(at(2), []),
      gradePosition(at(3), ["Bc4", "Qh5", "d4"]),
    ];
    expect(sessionSummaryOf(grades)).toEqual({
      positions: 3,
      answered: 2,
      passed: 1,
      bestFound: 1,
      topFound: 2,
      bestRate: 1 / 3,
      topRate: 2 / 3,
      // 0 and 10; the pass knows none.
      averageBestLoss: 5,
      inaccuracies: 1,
      mistakes: 0,
      blunders: 0,
      outside: 1,
    });
  });

  it("has no rates or average with nothing graded", () => {
    expect(sessionSummaryOf([])).toMatchObject({ positions: 0, bestRate: null, topRate: null, averageBestLoss: null });
  });
});

describe("sanOfMove", () => {
  it("names a legal drop in SAN, a promotion by its piece, and nothing for an illegal one", () => {
    const start = parsePgnTree("*").startFen;
    expect(sanOfMove(start, "g1", "f3")).toBe("Nf3");
    expect(sanOfMove(start, "e2", "e5")).toBeUndefined();
    const promoting = "8/P6k/8/8/8/8/8/K7 w - - 0 1";
    expect(sanOfMove(promoting, "a7", "a8", "q")).toBe("a8=Q");
    expect(sanOfMove(promoting, "a7", "a8", "n")).toBe("a8=N");
    expect(sanOfMove(promoting, "a7", "a8")).toBeUndefined();
    expect(sanOfMove("not a fen", "a7", "a8")).toBeUndefined();
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
