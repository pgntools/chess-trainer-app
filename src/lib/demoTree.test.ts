import { describe, expect, it } from "vitest";

import { demoBranchStart, demoMainline, demoNodeAt, demoTreeOfGameTree, numberedLine, startLineOf } from "./demoTree";
import { parsePgnTree } from "./pgn";

describe("demoTreeOfGameTree", () => {
  it("keeps a game's mainline first and gives a lone move a certainty", () => {
    const root = demoTreeOfGameTree(parsePgnTree("1. e4 e5 2. Nf3 *"));
    expect(root.san).toBe("");
    expect(root.children.map((node) => [node.san, node.chance])).toEqual([["e4", 1]]);
    expect(demoNodeAt(root, ["e4", "e5"]).node.children.map((node) => node.san)).toEqual(["Nf3"]);
  });

  it("weighs a repertoire's branches by their play chances — marked, and unmarked by what is left", () => {
    const root = demoTreeOfGameTree(parsePgnTree("1. e4 e5 (1... c5 { prc:30 } 2. Nf3) (1... e6 { prc:20 } 2. d4) *"));
    const replies = root.children[0].children;
    expect(replies.map((node) => node.san)).toEqual(["e5", "c5", "e6"]);
    expect(replies.map((node) => node.chance)).toEqual([0.5, 0.3, 0.2]);
  });
});

describe("demoNodeAt", () => {
  it("walks as far as the tree follows the line", () => {
    const root = demoTreeOfGameTree(parsePgnTree("1. e4 e5 2. Nf3 *"));
    const { line, node } = demoNodeAt(root, ["e4", "c5", "Nf3"]);
    expect(line).toEqual(["e4"]);
    expect(node.san).toBe("e4");
  });
});

describe("demoBranchStart / demoMainline — Home and PgDown (CTA-165)", () => {
  const root = demoTreeOfGameTree(parsePgnTree("1. e4 e5 (1... c5 2. Nf3 (2. c3 d5) d6) 2. Nf3 Nc6 *"));

  it("goes to the first move of the innermost side line, climbing a level from there, out to the start", () => {
    expect(demoBranchStart(root, ["e4", "c5", "c3", "d5"])).toEqual(["e4", "c5", "c3"]);
    expect(demoBranchStart(root, ["e4", "c5", "c3"])).toEqual(["e4", "c5"]);
    expect(demoBranchStart(root, ["e4", "c5", "Nf3", "d6"])).toEqual(["e4", "c5"]);
    expect(demoBranchStart(root, ["e4", "c5"])).toEqual([]);
    expect(demoBranchStart(root, ["e4", "e5", "Nf3"])).toEqual([]);
    expect(demoBranchStart(root, [])).toEqual([]);
  });

  it("reads the mainline as children[0] at every step", () => {
    expect(demoMainline(root)).toEqual(["e4", "e5", "Nf3", "Nc6"]);
    expect(demoMainline(demoTreeOfGameTree(parsePgnTree("*")))).toEqual([]);
  });
});

describe("numberedLine", () => {
  it("numbers from the standard start", () => {
    expect(numberedLine(["e4", "e5", "Nf3"])).toBe("1. e4 e5 2. Nf3");
  });

  it("numbers from a position's own move number and side to move", () => {
    expect(numberedLine(["Kb3", "e8=Q"], "8/4P3/8/8/8/8/k7/4K3 b - - 0 40")).toBe("40... Kb3 41. e8=Q");
    expect(numberedLine([])).toBe("");
  });
});

describe("startLineOf — where a board opens", () => {
  const root = demoTreeOfGameTree(parsePgnTree("1. e4 e5 (1... c5 2. Nf3) 2. Nf3 Nc6 3. Bb5 *"));

  it.each([
    ["1", ["e4"]],
    ["1.", ["e4"]],
    ["2", ["e4", "e5", "Nf3"]],
    ["1...", ["e4", "e5"]],
    ["...1", ["e4", "e5"]],
    ["…2", ["e4", "e5", "Nf3", "Nc6"]],
    ["0", []],
    // Past the end: the mainline's end, as `?move=` clamps.
    ["40", ["e4", "e5", "Nf3", "Nc6", "Bb5"]],
  ])("a move number, %s, walks the mainline", (startMove, line) => {
    expect(startLineOf(root, startMove)).toEqual(line);
  });

  it("follows a line of SAN, numbered or bare, into a side line, as far as the tree holds it", () => {
    expect(startLineOf(root, "1. e4 c5 2. Nf3")).toEqual(["e4", "c5", "Nf3"]);
    expect(startLineOf(root, "e4 c5")).toEqual(["e4", "c5"]);
    expect(startLineOf(root, "1.e4 1...c5")).toEqual(["e4", "c5"]);
    expect(startLineOf(root, "1. e4 e6")).toEqual(["e4"]);
  });

  it("opens at the start for nothing, or for words it cannot read", () => {
    expect(startLineOf(root, undefined)).toEqual([]);
    expect(startLineOf(root, "  ")).toEqual([]);
    expect(startLineOf(root, "the middle")).toEqual([]);
  });

  it("numbers from a position's own move number and side to move", () => {
    const fen = "8/4P3/8/8/8/8/k7/4K3 b - - 0 40";
    const fromPosition = demoTreeOfGameTree(parsePgnTree(`[SetUp "1"]\n[FEN "${fen}"]\n\n40... Kb3 41. e8=Q *`));
    expect(startLineOf(fromPosition, "40...", fen)).toEqual(["Kb3"]);
    expect(startLineOf(fromPosition, "41", fen)).toEqual(["Kb3", "e8=Q"]);
  });
});
