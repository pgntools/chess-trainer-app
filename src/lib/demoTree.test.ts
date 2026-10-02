import { describe, expect, it } from "vitest";

import { demoNodeAt, demoTreeOfGameTree, demoTreeOfOpeningTree, numberedLine } from "./demoTree";
import { openingTreeOf } from "./openingTree";
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
    // A tree's node carries no games.
    expect(replies[0].count).toBeUndefined();
  });
});

describe("demoTreeOfOpeningTree", () => {
  it("makes each move's chance its share of the position's games, and keeps the games' counts and results", () => {
    const root = demoTreeOfOpeningTree(
      openingTreeOf([
        { line: ["e4", "e5"], result: "1-0" },
        { line: ["e4", "c5"], result: "0-1" },
        { line: ["e4", "c5"], result: "1/2-1/2" },
        { line: ["d4", "d5"], result: "1-0" },
      ]),
    );
    expect(root.count).toBe(4);
    expect(root.children.map((node) => [node.san, node.chance, node.count])).toEqual([
      ["e4", 0.75, 3],
      ["d4", 0.25, 1],
    ]);
    const e4 = root.children[0];
    expect(e4.results).toEqual({ white: 1, draw: 1, black: 1 });
    expect(e4.children.map((node) => [node.san, node.chance])).toEqual([
      ["c5", 2 / 3],
      ["e5", 1 / 3],
    ]);
    // Where one game goes on alone, the tree is cut, and says so.
    expect(root.children[1].children).toEqual([]);
    expect(root.children[1].continues).toBe(true);
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

describe("numberedLine", () => {
  it("numbers from the standard start", () => {
    expect(numberedLine(["e4", "e5", "Nf3"])).toBe("1. e4 e5 2. Nf3");
  });

  it("numbers from a position's own move number and side to move", () => {
    expect(numberedLine(["Kb3", "e8=Q"], "8/4P3/8/8/8/8/k7/4K3 b - - 0 40")).toBe("40... Kb3 41. e8=Q");
    expect(numberedLine([])).toBe("");
  });
});
