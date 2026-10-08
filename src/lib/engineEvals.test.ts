import { describe, expect, it } from "vitest";

import {
  annotatorOf,
  evalDepthOf,
  formatEval,
  recordEvaluation,
  withAnnotator,
  withEval,
} from "./engineEvals";
import { readComment } from "./moveAnnotations";
import { evalOf, parseEval } from "./nextMoveWeights";
import { treeToPgn, findNode, type GameTree } from "./gameTree";
import { parsePgnTree } from "./pgn";

const cp = (value: number) => ({ kind: "cp", value }) as const;
const mate = (value: number) => ({ kind: "mate", value }) as const;

const treeOf = (pgn: string): GameTree => {
  const tree = parsePgnTree(pgn);
  if (tree === null) throw new Error("unreadable PGN");
  return tree;
};

/** The id of the mainline's `ply`-th move (1-based). */
const mainlineId = (tree: GameTree, ply: number): string => {
  let node = tree.moves[0];
  for (let step = 1; step < ply; step += 1) node = node.children[0];
  return node.id;
};

describe("formatEval", () => {
  it("writes pawns from White's view with two decimals, then the depth", () => {
    expect(formatEval(cp(17), 20)).toBe("0.17,20");
    expect(formatEval(cp(120), 18)).toBe("1.20,18");
    expect(formatEval(cp(-150), 22)).toBe("-1.50,22");
    expect(formatEval(cp(0), 5)).toBe("0.00,5");
    expect(formatEval(cp(-3), 9)).toBe("-0.03,9");
  });

  it("writes a mate with #, signed by who delivers it", () => {
    expect(formatEval(mate(3), 30)).toBe("#3,30");
    expect(formatEval(mate(-2), 12)).toBe("#-2,12");
  });

  it("reads back through parseEval and evalDepthOf", () => {
    expect(parseEval(formatEval(cp(-150), 22))).toEqual({ cp: -150 });
    expect(parseEval(formatEval(mate(-2), 12))).toEqual({ mate: -2 });
    expect(evalDepthOf("0.17,20")).toBe(20);
    expect(evalDepthOf("#-3, 7")).toBe(7);
    expect(evalDepthOf("0.17")).toBeUndefined();
  });
});

describe("withEval — placement", () => {
  it("makes a comment of its own on a move with none", () => {
    expect(withEval([], cp(17), 20)).toEqual(["[%eval 0.17,20]"]);
  });

  it("goes first into the move's first comment, the prose and other commands untouched", () => {
    expect(withEval(["Good move [%clk 0:05:00]", "second"], cp(17), 20)).toEqual([
      "[%eval 0.17,20] Good move [%clk 0:05:00]",
      "second",
    ]);
  });

  it("replaces an existing [%eval] in place, in whichever comment holds it", () => {
    expect(
      withEval(["prose", "[%cal Ge2e4] [%eval 0.30,10] prc:40 [%games 3]"], cp(-25), 14),
    ).toEqual(["prose", "[%cal Ge2e4] [%eval -0.25,14] prc:40 [%games 3]"]);
  });
});

describe("withEval — the override rule", () => {
  it("replaces a stored evaluation by one at least as deep", () => {
    expect(withEval(["[%eval 0.30,18]"], cp(25), 20)).toEqual(["[%eval 0.25,20]"]);
    expect(withEval(["[%eval 0.30,20]"], cp(25), 20)).toEqual(["[%eval 0.25,20]"]);
  });

  it("never overwrites a deeper evaluation with a shallower one", () => {
    const comments = ["[%eval 0.30,22] kept"];
    expect(withEval(comments, cp(25), 20)).toBe(comments);
  });

  it("always replaces a stored evaluation with no depth (a lichess import)", () => {
    expect(withEval(["[%eval 0.17]"], cp(25), 1)).toEqual(["[%eval 0.25,1]"]);
    expect(withEval(["[%eval #-3]"], mate(-2), 4)).toEqual(["[%eval #-2,4]"]);
  });

  it("returns the same array when the evaluation is already there", () => {
    const comments = ["[%eval 0.25,20]"];
    expect(withEval(comments, cp(25), 20)).toBe(comments);
  });
});

describe("recordEvaluation", () => {
  const pgn = "1. e4 { King's pawn. } e5 2. Nf3 *";

  it("writes on the move whose position was searched, and names the engine", () => {
    const tree = treeOf(pgn);
    const id = mainlineId(tree, 2);
    const node = findNode(tree, id);
    const next = recordEvaluation(tree, {
      nodeId: id,
      fen: node!.fen,
      score: cp(30),
      depth: 20,
      annotator: "Stockfish 19 Lite",
    });
    expect(findNode(next, id)?.comments).toEqual(["[%eval 0.30,20]"]);
    expect(next.headers.Annotator).toBe("Stockfish 19 Lite");
    // Id-preserving, only the path to the move copied: the move after it is the same node.
    expect(mainlineId(next, 1)).toBe(mainlineId(tree, 1));
    expect(findNode(next, mainlineId(tree, 3))).toBe(findNode(tree, mainlineId(tree, 3)));
    expect(treeToPgn(next)).toContain("1. e4 { King's pawn. } 1... e5 { [%eval 0.30,20] } 2. Nf3");
  });

  it("writes the start position's evaluation into the game's opening comment", () => {
    const tree = treeOf(pgn);
    const next = recordEvaluation(tree, { nodeId: null, fen: tree.startFen, score: cp(20), depth: 18 });
    expect(next.comments).toEqual(["[%eval 0.20,18]"]);
    expect(treeToPgn(next)).toMatch(/\{ \[%eval 0\.20,18\] \} 1\. e4/);
  });

  it("is a no-op — the same tree — for a shallower search, a repeated one, or a stale node", () => {
    const tree = treeOf(pgn);
    const id = mainlineId(tree, 1);
    const fen = findNode(tree, id)!.fen;
    const once = recordEvaluation(tree, { nodeId: id, fen, score: cp(30), depth: 20, annotator: "SF" });
    expect(recordEvaluation(once, { nodeId: id, fen, score: cp(30), depth: 20, annotator: "SF" })).toBe(once);
    expect(recordEvaluation(once, { nodeId: id, fen, score: cp(90), depth: 12, annotator: "SF" })).toBe(once);
    // The node no longer leads to the searched position (another game loaded since).
    expect(recordEvaluation(tree, { nodeId: id, fen: tree.startFen, score: cp(1), depth: 30 })).toBe(tree);
    expect(recordEvaluation(tree, { nodeId: "missing", fen, score: cp(1), depth: 30 })).toBe(tree);
  });

  it("is read back by the Eval and Depth chips and by the Evaluation arrows", () => {
    const tree = treeOf(pgn);
    const id = mainlineId(tree, 3);
    const node = findNode(tree, id)!;
    const next = recordEvaluation(tree, { nodeId: id, fen: node.fen, score: mate(-2), depth: 14 });
    const written = findNode(next, id)!;
    expect(readComment(written.comments![0]).attributes).toEqual([
      { key: "eval", value: "#-2" },
      { key: "depth", value: "14" },
    ]);
    expect(evalOf(written)).toEqual({ mate: -2 });
  });
});

describe("the Annotator tag", () => {
  it("names the engine by its name, with its version unless the name says it", () => {
    expect(annotatorOf({ name: "Stockfish 19 Lite", version: "19" })).toBe("Stockfish 19 Lite");
    expect(annotatorOf({ name: "Stockfish 19 Lite (multi-thread)", version: "19" })).toBe(
      "Stockfish 19 Lite (multi-thread)",
    );
    expect(annotatorOf({ name: "Stockfish", version: "19" })).toBe("Stockfish 19");
  });

  it("is set or updated, and the same tree back when it already says so", () => {
    const tree = treeOf('[Annotator "Someone"]\n\n1. e4 *');
    const named = withAnnotator(tree, "Stockfish 19");
    expect(named.headers.Annotator).toBe("Stockfish 19");
    expect(withAnnotator(named, "Stockfish 19")).toBe(named);
    expect(treeToPgn(named)).toContain('[Annotator "Stockfish 19"]');
  });
});

describe("round trip", () => {
  it("leaves lichess and python-chess evaluations as they came", () => {
    const pgn = [
      '[Event "Casual"]',
      '[Result "*"]',
      "",
      "1. e4 { [%eval 0.17] [%clk 0:05:00] } 1... e5 { [%eval 0.19,20] } 2. Nf3 { [%eval #-3] } *",
    ].join("\n");
    const tree = treeOf(pgn);
    const again = treeOf(treeToPgn(tree));
    expect(treeToPgn(again)).toBe(treeToPgn(tree));
    expect(findNode(tree, mainlineId(tree, 1))?.comments).toEqual(["[%eval 0.17] [%clk 0:05:00]"]);
    expect(findNode(tree, mainlineId(tree, 2))?.comments).toEqual(["[%eval 0.19,20]"]);
    expect(evalOf(findNode(tree, mainlineId(tree, 2))!)).toEqual({ cp: 19 });
  });

  it("round-trips a written evaluation", () => {
    const tree = treeOf("1. d4 d5 *");
    const id = mainlineId(tree, 2);
    const written = recordEvaluation(tree, {
      nodeId: id,
      fen: findNode(tree, id)!.fen,
      score: cp(-42),
      depth: 25,
      annotator: "Stockfish 19 Lite",
    });
    const read = treeOf(treeToPgn(written));
    expect(findNode(read, mainlineId(read, 2))?.comments).toEqual(["[%eval -0.42,25]"]);
    expect(read.headers.Annotator).toBe("Stockfish 19 Lite");
  });
});
