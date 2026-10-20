import { describe, expect, it } from "vitest";

import { gradePosition, trainingPositionFrom, type TrainingPosition } from "../accuracyTrainer";
import type { GameTree } from "../gameTree";
import { parsePgnTree } from "../pgn";
import {
  ACHIEVEMENT_CATEGORIES,
  betterThanGamePiece,
  bestMovePiece,
  cleanCandidatesPiece,
  placeInOrderPiece,
  seeTheLinePiece,
} from "./categories";
import { PIECES, ranksAtLeast, type AchievementInput, type Piece } from "./pieces";

/*
  The five categories' graders (CTA-249), each against its table in
  docs/design/accuracy-achievements.md §3 — per tier, per precondition.
*/

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

type Line = { san: string; cp: number; played?: boolean; listed?: boolean; sans?: string[] };

const positionOf = (lines: readonly Line[]): TrainingPosition =>
  trainingPositionFrom(
    { nodeId: null, path: [], fen: START, turn: "w", ply: 1, moveNumber: 1, playedSan: lines.find((line) => line.played)?.san ?? "" },
    lines.map((line) => ({
      san: line.san,
      score: { kind: "cp", value: line.cp },
      listed: line.listed ?? !line.played,
      played: line.played ?? false,
      sans: line.sans ?? [line.san],
    })),
  );

/** White's lines, the losses against line 1: e4 0, d4 5, Nf3 20, c4 50, g3 100, b3 300 — every one listed. */
const LINES: Line[] = [
  { san: "e4", cp: 30 },
  { san: "d4", cp: 25 },
  { san: "Nf3", cp: 10 },
  { san: "c4", cp: -20 },
  { san: "g3", cp: -70 },
  { san: "b3", cp: -270 },
];

const inputOf = (sans: readonly string[], { lines = LINES, wanted = 3, work = null }: { lines?: readonly Line[]; wanted?: number; work?: GameTree | null } = {}): AchievementInput => {
  const position = positionOf(lines);
  return { position, grade: gradePosition(position, sans, { wanted }), work, wanted };
};

describe("A1 — place X moves in order", () => {
  it.each<[string, string[], Piece | null]>([
    ["Queen: all X, each in its place", ["e4", "d4", "Nf3"], "queen"],
    ["Rook: all X in the top X, the order wrong", ["d4", "e4", "Nf3"], "rook"],
    ["Bishop: the best move first", ["e4", "c4", "g3"], "bishop"],
    ["Knight: the best move among them, not first", ["c4", "e4", "g3"], "knight"],
    ["Pawn: one in the top X", ["c4", "d4", "g3"], "pawn"],
    ["none in the top X", ["c4", "g3", "b3"], null],
  ])("%s", (_, sans, piece) => {
    expect(placeInOrderPiece(inputOf(sans))).toBe(piece);
  });

  it("needs X ≥ 2", () => {
    expect(placeInOrderPiece(inputOf(["e4"], { wanted: 1 }))).toBeNull();
    expect(placeInOrderPiece(inputOf(["e4", "d4"], { wanted: 2 }))).toBe("queen");
  });

  it("caps at Bishop where the engine has fewer lines than X", () => {
    const two = LINES.slice(0, 2);
    expect(placeInOrderPiece(inputOf(["e4", "d4"], { lines: two }))).toBe("bishop");
    expect(placeInOrderPiece(inputOf(["d4", "e4"], { lines: two }))).toBe("knight");
  });

  it("grades only the first X moves", () => {
    expect(placeInOrderPiece(inputOf(["c4", "g3", "b3", "e4"]))).toBeNull();
  });

  it("a move outside the lines fails every tier above Pawn", () => {
    expect(placeInOrderPiece(inputOf(["e4", "d4", "a3"]))).toBe("pawn");
    expect(placeInOrderPiece(inputOf(["a3", "h3", "a4"]))).toBeNull();
  });
});

describe("A2 — find the best move", () => {
  it.each<[string, string[], Line[], Piece | null]>([
    ["Queen: the best and the only one (line 2 loses ≥ 150)", ["e4"], [{ san: "e4", cp: 30 }, { san: "d4", cp: -120 }], "queen"],
    ["Rook: the best, line 2 close", ["e4"], LINES, "rook"],
    ["Rook: the best, no second listed line", ["e4"], [{ san: "e4", cp: 30 }], "rook"],
    ["Bishop: loss ≤ 20", ["Nf3"], LINES, "bishop"],
    ["Knight: no inaccuracy", ["c4"], LINES, "knight"],
    ["Pawn: in the top X", ["d4"], [{ san: "e4", cp: 30 }, { san: "d4", cp: -40 }, { san: "c4", cp: -100 }], "pawn"],
    ["none: outside the top X, an inaccuracy", ["g3"], LINES, null],
  ])("%s", (_, sans, lines, piece) => {
    expect(bestMovePiece(inputOf(sans, { lines }))).toBe(piece);
  });

  it("reads the first move alone", () => {
    expect(bestMovePiece(inputOf(["c4", "e4"]))).toBe("knight");
  });

  it("a first move outside the lines wins nothing", () => {
    expect(bestMovePiece(inputOf(["a3", "e4"]))).toBeNull();
  });
});

describe("A3 — clean candidates", () => {
  it.each<[string, string[], Line[], Piece | null]>([
    ["Queen: every one within 20 of the best", ["e4", "d4", "Nf3"], LINES, "queen"],
    ["Rook: every one in the top X", ["e4", "d4", "Nf3"], [{ san: "e4", cp: 30 }, { san: "d4", cp: 25 }, { san: "Nf3", cp: -10 }, { san: "c4", cp: -15 }], "rook"],
    ["Bishop: no inaccuracy", ["e4", "d4", "c4"], LINES, "bishop"],
    ["Knight: no mistake", ["e4", "d4", "g3"], LINES, "knight"],
    ["Pawn: no blunder", ["e4", "d4", "b3"], LINES, "pawn"],
    ["none: a blunder", ["e4", "d4", "h3"], [...LINES, { san: "h3", cp: -400 }], null],
  ])("%s", (_, sans, lines, piece) => {
    expect(cleanCandidatesPiece(inputOf(sans, { lines }))).toBe(piece);
  });

  it("needs X moves given", () => {
    expect(cleanCandidatesPiece(inputOf(["e4", "d4"]))).toBeNull();
    expect(cleanCandidatesPiece(inputOf(["e4", "d4"], { wanted: 2 }))).toBe("queen");
  });

  it("a move outside the lines passes Pawn alone, while its bound does", () => {
    expect(cleanCandidatesPiece(inputOf(["e4", "d4", "a3"]))).toBe("pawn");
    expect(cleanCandidatesPiece(inputOf(["e4", "d4", "a3"], { lines: [...LINES, { san: "h3", cp: -400 }] }))).toBeNull();
  });
});

describe("A4 — better than the game", () => {
  /** The game's move h3 loses 200 — a mistake; f4 loses 140, outside the top 3. */
  const MISTAKE: Line[] = [...LINES.slice(0, 5), { san: "f4", cp: -110 }, { san: "h3", cp: -170, played: true, listed: false }];

  it.each<[string, string[], Piece | null]>([
    ["Queen: the best move", ["e4"], "queen"],
    ["Rook: in the top X", ["d4"], "rook"],
    ["Bishop: no inaccuracy", ["c4"], "bishop"],
    ["Knight: no mistake", ["g3"], "knight"],
    ["Pawn: loses less than the game's move", ["f4"], "pawn"],
    ["none: the game's move itself", ["h3"], null],
  ])("%s", (_, sans, piece) => {
    expect(betterThanGamePiece(inputOf(sans, { lines: MISTAKE }))).toBe(piece);
  });

  it("none for a move that loses more than the game's", () => {
    expect(betterThanGamePiece(inputOf(["b3"], { lines: [...MISTAKE, { san: "b3", cp: -270 }] }))).toBeNull();
  });

  it("only where the game's move is a mistake or a blunder", () => {
    const inaccuracy = [...LINES, { san: "h3", cp: -60, played: true, listed: false }];
    expect(betterThanGamePiece(inputOf(["e4"], { lines: inaccuracy }))).toBeNull();
    // The game's move with no eval: no line of its own.
    expect(betterThanGamePiece(inputOf(["e4"]))).toBeNull();
  });

  it("a first move outside the lines is a Pawn only where its bound is under the game's loss", () => {
    expect(betterThanGamePiece(inputOf(["a3"], { lines: MISTAKE }))).toBe("pawn");
    expect(betterThanGamePiece(inputOf(["a3"], { lines: [...MISTAKE, { san: "b3", cp: -270 }] }))).toBeNull();
  });
});

describe("B1 — see the line", () => {
  const ENGINE: Line[] = [{ san: "e4", cp: 30, sans: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6"] }, ...LINES.slice(1)];
  const work = (movetext: string) => parsePgnTree(`${movetext} *`);

  it.each<[string, string, Piece | null]>([
    ["Queen: 6 plies", "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6", "queen"],
    ["Rook: 4 (5 matched)", "1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6", "rook"],
    ["Bishop: 3", "1. e4 e5 2. Nf3 Nf6", "bishop"],
    ["Knight: 2", "1. e4 e5 2. Bc4", "knight"],
    ["Pawn: the move itself", "1. e4 c5", "pawn"],
  ])("%s", (_, movetext, piece) => {
    expect(seeTheLinePiece(inputOf(["e4"], { lines: ENGINE, work: work(movetext) }))).toBe(piece);
  });

  it("reaches a tier only where the engine's line is that long", () => {
    const short: Line[] = [{ san: "e4", cp: 30, sans: ["e4", "e5", "Nf3"] }, ...LINES.slice(1)];
    expect(seeTheLinePiece(inputOf(["e4"], { lines: short, work: work("1. e4 e5 2. Nf3 Nc6 3. Bb5 a6") }))).toBe("bishop");
  });

  it("follows the reader's line from the best move wherever it is among the first X", () => {
    expect(seeTheLinePiece(inputOf(["d4", "e4"], { lines: ENGINE, work: work("1. d4 (1. e4 e5 2. Nf3)") }))).toBe("bishop");
  });

  it("needs the best move among the first X", () => {
    expect(seeTheLinePiece(inputOf(["d4", "Nf3"], { lines: ENGINE, work: work("1. d4 (1. Nf3)") }))).toBeNull();
    expect(seeTheLinePiece(inputOf(["d4", "Nf3", "c4", "e4"], { lines: ENGINE, work: work("1. d4 (1. Nf3) (1. c4) (1. e4 e5)") }))).toBeNull();
  });

  it("with no work, the move itself", () => {
    expect(seeTheLinePiece(inputOf(["e4"], { lines: ENGINE }))).toBe("pawn");
  });
});

describe("every category", () => {
  it("gives no piece for a pass", () => {
    for (const category of ACHIEVEMENT_CATEGORIES) expect(category.grade(inputOf([]))).toBeNull();
  });

  it("gives no piece where there is nothing to compare (target 0)", () => {
    const unlisted: Line[] = [{ san: "e4", cp: 30, played: true, listed: false }];
    for (const category of ACHIEVEMENT_CATEGORIES) expect(category.grade(inputOf(["e4"], { lines: unlisted }))).toBeNull();
  });

  it("is registered once, named by its catalog key", () => {
    expect(ACHIEVEMENT_CATEGORIES.map((category) => [category.code, category.id, category.labelKey])).toEqual([
      ["A1", "order", "accuracyTrainer.achievements.categories.order"],
      ["A2", "best", "accuracyTrainer.achievements.categories.best"],
      ["A3", "clean", "accuracyTrainer.achievements.categories.clean"],
      ["A4", "game", "accuracyTrainer.achievements.categories.game"],
      ["B1", "line", "accuracyTrainer.achievements.categories.line"],
    ]);
  });
});

describe("the tiers nest, where the tables say so", () => {
  const POOL = ["e4", "d4", "Nf3", "c4", "g3", "b3", "f4", "a3"];
  const answers: string[][] = [];
  for (const a of POOL) for (const b of POOL) for (const c of POOL) if (new Set([a, b, c]).size === 3) answers.push([a, b, c]);
  const MISTAKE: Line[] = [...LINES, { san: "f4", cp: -110 }, { san: "h3", cp: -170, played: true, listed: false }];
  const lossOf = (input: AchievementInput, at: number) => {
    const move = input.grade.suggestions[at];
    return move?.kind === "line" ? move.loss : Infinity;
  };

  it("A2: a Knight or better loses no more than an inaccuracy; a Bishop or better no more than 20; a Rook nothing", () => {
    for (const sans of answers) {
      const input = inputOf(sans, { lines: MISTAKE });
      const piece = bestMovePiece(input);
      if (piece === null) continue;
      if (ranksAtLeast(piece, "knight")) expect(lossOf(input, 0)).toBeLessThanOrEqual(50);
      if (ranksAtLeast(piece, "bishop")) expect(lossOf(input, 0)).toBeLessThanOrEqual(20);
      if (ranksAtLeast(piece, "rook")) expect(lossOf(input, 0)).toBe(0);
    }
  });

  it("A3: a Queen holds Bishop's, Knight's and Pawn's conditions; every piece Pawn's", () => {
    for (const sans of answers) {
      const input = inputOf(sans, { lines: MISTAKE });
      const piece = cleanCandidatesPiece(input);
      if (piece === null) continue;
      const losses = sans.map((_, at) => lossOf(input, at));
      if (piece === "queen") expect(Math.max(...losses)).toBeLessThanOrEqual(20);
      if (piece !== "pawn") expect(Math.max(...losses)).toBeLessThanOrEqual(100);
    }
  });

  it("A1 and A4: every piece holds Pawn's condition", () => {
    for (const sans of answers) {
      const order = inputOf(sans);
      if (placeInOrderPiece(order) !== null) expect(order.grade.suggestions.some((move) => move.inTop)).toBe(true);
      const game = inputOf(sans, { lines: MISTAKE });
      if (betterThanGamePiece(game) !== null && game.grade.suggestions[0]?.kind === "line") expect(lossOf(game, 0)).toBeLessThan(200);
    }
  });

  it("ranks the five pieces Pawn, Knight, Bishop, Rook, Queen", () => {
    expect(PIECES).toEqual(["pawn", "knight", "bishop", "rook", "queen"]);
    expect(ranksAtLeast("bishop", "knight")).toBe(true);
    expect(ranksAtLeast("knight", "bishop")).toBe(false);
  });
});
