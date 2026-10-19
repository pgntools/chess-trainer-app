import { describe, expect, it } from "vitest";

import { graftTree, sessionBaseTree, sessionCaseTreeOf, withPositionEngineLines } from "./findBestMoveSession";
import { emptyTree, mainline, nodeAtSanPath, treeToPgn } from "./gameTree";
import { parsePgnTree } from "./pgn";

/*
  Find Best Move v2's session as a Case (CTA-238): the game's mainline, and
  at each trained position the reader's analysis, the engine's lines and the
  answer.
*/

const ANALYSED = `[White "Alice"]
[Black "Bob"]
[AnalysedPlies "1-3"]
[Annotator "Stockfish 19 [full]"]

{ Computer analysis (full) } 1. e4 { [%eval 0.30,20] } (1. d4 { [%eval 0.25,20] }) 1... e5 $2 { [%eval 0.30,20] } 2. Nf3 *`;

const base = sessionBaseTree(parsePgnTree(ANALYSED));

describe("sessionBaseTree", () => {
  it("keeps the game's mainline and tags — none of its comments, NAGs, side lines or the analysis's tags", () => {
    expect(mainline(base).map((node) => node.san)).toEqual(["e4", "e5", "Nf3"]);
    expect(base.headers).toMatchObject({ White: "Alice", Black: "Bob" });
    expect(base.headers.AnalysedPlies).toBeUndefined();
    expect(base.headers.Annotator).toBeUndefined();
    const pgn = treeToPgn(base);
    expect(pgn).not.toContain("{");
    expect(pgn).not.toContain("d4");
    expect(pgn).not.toContain("$2");
  });
});

describe("graftTree", () => {
  it("adds a tree from a position under its node — moves, comments, glyphs; a move already there followed", () => {
    const afterE4 = mainline(base)[0];
    const analysis = parsePgnTree(`[FEN "${afterE4.fen}"]\n[SetUp "1"]\n\n{ Black to play } 1... e5 $1 { The classical reply } (1... c5) 2. Nf3 (2. Bc4) *`);
    const grafted = graftTree(base, afterE4.id, analysis);
    // e5 followed (the mainline's), its glyph and comment joined; c5 a side line; Bc4 under Nf3's parent.
    expect(treeToPgn(grafted)).toBe(
      treeToPgn(parsePgnTree('[White "Alice"]\n[Black "Bob"]\n\n1. e4 { Black to play } 1... e5 $1 { The classical reply } (1... c5) 2. Nf3 (2. Bc4) *')),
    );
    // Nothing new: the same tree back.
    expect(graftTree(base, afterE4.id, emptyTree(afterE4.fen))).toBe(base);
  });
});

describe("withPositionEngineLines", () => {
  it("hangs an engine's lines at the position its SAN path names, each first move with its eval", () => {
    const afterE4 = mainline(base)[0];
    const tree = withPositionEngineLines(base, ["e4"], {
      fen: afterE4.fen,
      lines: [
        { score: { kind: "cp", value: 30 }, depth: 24, pv: ["e7e5", "g1f3"] },
        { score: { kind: "cp", value: 35 }, depth: 24, pv: ["c7c5"] },
      ],
    });
    const pgn = treeToPgn(tree);
    expect(pgn).toContain("e5 { [%eval 0.30,24] }");
    expect(pgn).toContain("(1... c5 { [%eval 0.35,24] })");
  });

  it("leaves a tree that does not hold the path as it is", () => {
    expect(withPositionEngineLines(base, ["d4"], { fen: base.startFen, lines: [{ score: { kind: "cp", value: 0 }, depth: 1, pv: ["d7d5"] }] })).toBe(base);
  });
});

describe("sessionCaseTreeOf", () => {
  it("writes each position's analysis, engine lines and answer into the base", () => {
    const [e4, e5] = mainline(base);
    const tree = sessionCaseTreeOf(base, [
      { path: [], analysis: parsePgnTree("1. d4 { Mine } *"), answer: "Find Best Move: d4 — Good (5 cp)" },
      {
        path: ["e4", "e5"],
        engine: { fen: e5.fen, lines: [{ score: { kind: "cp", value: 30 }, depth: 24, pv: ["g1f3"] }, { score: { kind: "cp", value: 20 }, depth: 24, pv: ["f1c4"] }] },
        answer: "Find Best Move: passed",
      },
    ]);
    const pgn = treeToPgn(tree);
    // The start position's answer is the game's opening comment.
    expect(tree.comments).toEqual(["Find Best Move: d4 — Good (5 cp)"]);
    expect(pgn).toContain("(1. d4 { Mine })");
    expect(pgn).toContain("e5 { Find Best Move: passed }");
    expect(pgn).toContain("2. Nf3 { [%eval 0.30,24] }");
    expect(pgn).toContain("(2. Bc4 { [%eval 0.20,24] })");
    // The game's moves are where they were.
    expect(mainline(tree).map((node) => node.san)).toEqual(["e4", "e5", "Nf3"]);
    expect(nodeAtSanPath(tree, ["e4"])).toBe(e4.id);
  });
});
