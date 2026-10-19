import { describe, expect, it } from "vitest";

import { trainingPositionsOf } from "./accuracyTrainer";
import {
  answerPosition,
  candidatesOf,
  caseTreeOf,
  isAtPosition,
  leavePosition,
  nextUnanswered,
  openPosition,
  positionAtPath,
  positionViewOf,
  reopenPassed,
  reorderedCandidates,
  sessionBaseTree,
  startSession,
  withPositionEngineLines,
  withPositionJob,
  withoutCandidate,
  withoutPositionComment,
  withSessionAnnotations,
} from "./findBestMoveSession";
import { addMove, deleteFrom, findNode, mainline, nodeAtSanPath, setComments, treeToPgn, type GameTree } from "./gameTree";
import { parsePgnTree } from "./pgn";

/*
  A Find Best Move session (CTA-238, v3): the Case's tree as the one truth,
  a position's view of it — every move before it, none after — and the
  reader's work put back.
*/

const ANALYSED = `[White "Alice"]
[Black "Bob"]
[AnalysedPlies "1-4"]
[Annotator "Stockfish 19 [full]"]

{ Computer analysis (full) } 1. e4 { [%eval 0.30,20] } (1. d4 { [%eval 0.25,20] }) 1... e5 $2 { [%eval 0.30,20] } (1... c5 { [%eval 0.35,20] }) 2. Nf3 { [%eval 0.30,20] } (2. Bc4 { [%eval 0.20,20] }) 2... Nc6 *`;

const base = sessionBaseTree(parsePgnTree(ANALYSED));
const sans = (tree: GameTree) => mainline(tree).map((node) => node.san);

/** A move played on the board under `parentId`, as the core plays it. */
const play = (tree: GameTree, parentId: string | null, san: string): { tree: GameTree; nodeId: string } => {
  const fenBefore = parentId === null ? tree.startFen : (findNode(tree, parentId)?.fen ?? tree.startFen);
  const replay = parsePgnTree(`[FEN "${fenBefore}"]\n[SetUp "1"]\n\n${fenBefore.split(" ")[1] === "b" ? "1... " : ""}${san} *`).moves[0];
  return addMove(tree, parentId, { san: replay.san, from: replay.from, to: replay.to, fen: replay.fen });
};

describe("sessionBaseTree", () => {
  it("keeps the game's mainline and tags — none of its comments, NAGs, side lines or the analysis's tags", () => {
    expect(sans(base)).toEqual(["e4", "e5", "Nf3", "Nc6"]);
    expect(base.headers).toMatchObject({ White: "Alice", Black: "Bob" });
    expect(base.headers.AnalysedPlies).toBeUndefined();
    expect(base.headers.Annotator).toBeUndefined();
    expect(treeToPgn(base)).not.toMatch(/[{$(]/);
  });
});

describe("positionViewOf", () => {
  it("shows every move before the position and hides its continuation", () => {
    const view = positionViewOf(base, ["e4", "e5"])!;
    expect(sans(view.board)).toEqual(["e4", "e5"]);
    expect(view.nodeId).toBe(nodeAtSanPath(base, ["e4", "e5"]));
    expect(view.hidden.map((node) => node.san)).toEqual(["Nf3"]);
  });

  it("hides the whole game at the start position", () => {
    const view = positionViewOf(base, [])!;
    expect(view.board.moves).toEqual([]);
    expect(view.nodeId).toBeNull();
    expect(view.hidden.map((node) => node.san)).toEqual(["e4"]);
  });

  it("hides the lines hung at the position too, and names no position the tree lacks", () => {
    const tree = withPositionEngineLines(base, ["e4", "e5"], {
      fen: findNode(base, nodeAtSanPath(base, ["e4", "e5"]))!.fen,
      lines: [{ score: { kind: "cp", value: 20 }, depth: 20, pv: ["f1c4"] }],
    });
    expect(positionViewOf(tree, ["e4", "e5"])!.hidden.map((node) => node.san)).toEqual(["Nf3", "Bc4"]);
    expect(positionViewOf(base, ["d4"])).toBeUndefined();
  });
});

describe("caseTreeOf", () => {
  const view = positionViewOf(base, ["e4", "e5"])!;
  const session = { tree: base, view };

  it("puts the continuation back, the game's move first, the reader's lines merged in", () => {
    // The reader plays 2. Bc4 then 2. Nf3 with a reply the game did not play.
    const bc4 = play(view.board, view.nodeId, "Bc4");
    const nf3 = play(bc4.tree, view.nodeId, "Nf3");
    const nf6 = play(nf3.tree, nf3.nodeId, "Nf6");
    const tree = caseTreeOf(session, nf6.tree);
    // The game's moves are the mainline still; Bc4 a side line; Nf6 a side line under the game's Nf3.
    expect(sans(tree)).toEqual(["e4", "e5", "Nf3", "Nc6"]);
    expect(treeToPgn(tree)).toContain("2. Nf3 (2. Bc4) 2... Nc6 (2... Nf6)");
  });

  it("keeps the reader's edits before the position", () => {
    const e4 = nodeAtSanPath(view.board, ["e4"])!;
    const tree = caseTreeOf(session, setComments(view.board, e4, "comments", ["Best by test"]));
    expect(treeToPgn(tree)).toContain("1. e4 { Best by test } 1... e5 2. Nf3");
  });

  it("keeps nothing of a board that lost the position — the rest of the game would go with it", () => {
    const e4 = nodeAtSanPath(view.board, ["e4"])!;
    expect(caseTreeOf(session, deleteFrom(view.board, e4))).toBe(base);
  });

  it("is the tree again for a board left as it opened", () => {
    expect(treeToPgn(caseTreeOf(session, view.board))).toBe(treeToPgn(base));
  });
});

describe("candidatesOf / isAtPosition", () => {
  const view = positionViewOf(base, ["e4", "e5"])!;
  const bc4 = play(view.board, view.nodeId, "Bc4");
  const nf6 = play(bc4.tree, bc4.nodeId, "Nf6");
  const nf3 = play(nf6.tree, view.nodeId, "Nf3");

  it("are the first moves of the reader's lines from the position, in the tree's order", () => {
    expect(candidatesOf(view, view.board)).toEqual([]);
    expect(candidatesOf(view, nf3.tree)).toEqual(["Bc4", "Nf3"]);
  });

  it("stand on the position or inside a line from it — not before it", () => {
    expect(isAtPosition(view, nf3.tree, view.nodeId)).toBe(true);
    expect(isAtPosition(view, nf3.tree, nf6.nodeId)).toBe(true);
    expect(isAtPosition(view, nf3.tree, nodeAtSanPath(nf3.tree, ["e4"]))).toBe(false);
    expect(isAtPosition(view, nf3.tree, null)).toBe(false);
  });

  it("read from the start position too", () => {
    const start = positionViewOf(base, [])!;
    const d4 = play(start.board, null, "d4");
    const c4 = play(d4.tree, null, "c4");
    expect(candidatesOf(start, c4.tree)).toEqual(["d4", "c4"]);
    expect(isAtPosition(start, c4.tree, null)).toBe(true);
  });
});

describe("reorderedCandidates / withoutCandidate", () => {
  const view = positionViewOf(base, ["e4", "e5"])!;
  const bc4 = play(view.board, view.nodeId, "Bc4");
  const nf3 = play(bc4.tree, view.nodeId, "Nf3");
  const d4 = play(nf3.tree, view.nodeId, "d4");
  const nf6 = play(d4.tree, bc4.nodeId, "Nf6");
  const board = nf6.tree;

  it("moves one of the reader's moves up or down their order, its line with it, every id kept", () => {
    expect(candidatesOf(view, reorderedCandidates(view, board, 1, "up"))).toEqual(["Nf3", "Bc4", "d4"]);
    const down = reorderedCandidates(view, board, 0, "down");
    expect(candidatesOf(view, down)).toEqual(["Nf3", "Bc4", "d4"]);
    // Bc4's own line came with it, its node the same.
    expect(findNode(down, nf6.nodeId)?.san).toBe("Nf6");
  });

  it("leaves the order as it is past an end", () => {
    expect(reorderedCandidates(view, board, 0, "up")).toBe(board);
    expect(reorderedCandidates(view, board, 2, "down")).toBe(board);
    expect(reorderedCandidates(view, board, 5, "up")).toBe(board);
  });

  it("deletes one of the reader's moves, and everything in its line", () => {
    const without = withoutCandidate(view, board, 0);
    expect(candidatesOf(view, without)).toEqual(["Nf3", "d4"]);
    expect(findNode(without, nf6.nodeId)).toBeNull();
    expect(withoutCandidate(view, board, 7)).toBe(board);
  });

  it("works from the start position too", () => {
    const start = positionViewOf(base, [])!;
    const e4 = play(start.board, null, "e4");
    const c4 = play(e4.tree, null, "c4");
    expect(candidatesOf(start, reorderedCandidates(start, c4.tree, 1, "up"))).toEqual(["c4", "e4"]);
    expect(candidatesOf(start, withoutCandidate(start, c4.tree, 1))).toEqual(["e4"]);
  });
});

describe("positionAtPath", () => {
  const positions = [{ path: [] }, { path: ["e4", "e5"] }, { path: ["e4", "e5", "Nf3", "Nc6"] }];

  it("is the deepest trained position leading to where the board stands", () => {
    expect(positionAtPath(positions, [])).toBe(0);
    expect(positionAtPath(positions, ["e4"])).toBe(0);
    expect(positionAtPath(positions, ["e4", "e5"])).toBe(1);
    // Inside a line of the reader's from it, or past it on the way to the next.
    expect(positionAtPath(positions, ["e4", "e5", "Bc4", "Nf6"])).toBe(1);
    expect(positionAtPath(positions, ["e4", "e5", "Nf3"])).toBe(1);
    expect(positionAtPath(positions, ["e4", "e5", "Nf3", "Nc6", "Bb5"])).toBe(2);
  });

  it("is none before the first", () => {
    expect(positionAtPath([{ path: ["e4"] }], [])).toBeUndefined();
  });
});

describe("withSessionAnnotations", () => {
  it("writes each position's engine lines and answer, once however often it is written", () => {
    const fen = findNode(base, nodeAtSanPath(base, ["e4", "e5"]))!.fen;
    const annotations = [
      { path: [], answer: "Find Best Move: d4 — Good (5 cp)" },
      { path: ["e4", "e5"], engine: { fen, lines: [{ score: { kind: "cp" as const, value: 20 }, depth: 24, pv: ["f1c4"] }] } },
    ];
    const once = withSessionAnnotations(base, annotations);
    expect(once.comments).toEqual(["Find Best Move: d4 — Good (5 cp)"]);
    expect(treeToPgn(once)).toContain("(2. Bc4 { [%eval 0.20,24] })");
    expect(treeToPgn(withSessionAnnotations(once, annotations))).toBe(treeToPgn(once));
  });
});

describe("the session's transitions", () => {
  const positions = trainingPositionsOf(parsePgnTree(ANALYSED)).filter((position) => position.turn === "w");
  const caseRef = { projectId: "p", caseId: "c" };

  it("starts on its first position's view", () => {
    const session = startSession({ caseRef, positions, wanted: 3, tree: base })!;
    expect(session).toMatchObject({ index: 0, wanted: 3, answers: [null, null], jobs: [null, null], work: [null, null] });
    expect(session.view.nodeId).toBeNull();
    expect(startSession({ caseRef, positions: [], wanted: 3, tree: base })).toBeUndefined();
  });

  it("answers, queues a job, finds the next position and opens it on the tree as it stands", () => {
    let session = startSession({ caseRef, positions, wanted: 3, tree: base })!;
    session = withPositionJob(answerPosition(session, ["e4", "d4"]), 0, "job-1");
    expect(session.answers).toEqual([["e4", "d4"], null]);
    expect(session.jobs).toEqual(["job-1", null]);
    expect(nextUnanswered(session)).toBe(1);
    const opened = openPosition(session, 1, base);
    expect(opened.index).toBe(1);
    expect(sans(opened.view.board)).toEqual(["e4", "e5"]);
    expect(nextUnanswered(answerPosition(opened, []))).toBeUndefined();
  });
});

describe("leavePosition / openPosition — the reader's own lines", () => {
  const positions = trainingPositionsOf(parsePgnTree(ANALYSED)).filter((position) => position.turn === "w");
  const caseRef = { projectId: "p", caseId: "c" };

  it("keeps the reader's lines at a position when it is left, and puts them back — not the game's continuation — when it opens again", () => {
    // At 2. Qh5's position the reader plays 2. Nf3 (the game's move) Nf6, and 2. Bc4.
    let session = openPosition(startSession({ caseRef, positions, wanted: 3, tree: base })!, 1, base);
    const nf3 = play(session.view.board, session.view.nodeId, "Nf3");
    const nf6 = play(nf3.tree, nf3.nodeId, "Nf6");
    const bc4 = play(nf6.tree, session.view.nodeId, "Bc4");
    const tree = caseTreeOf(session, bc4.tree);
    // The Case: the reader's Nf6 merged under the game's Nf3, beside the game's Nc6.
    expect(treeToPgn(tree)).toContain("2. Nf3 (2. Bc4) 2... Nc6 (2... Nf6)");

    session = openPosition(leavePosition(session, bc4.tree), 0, tree);
    const again = openPosition(session, 1, tree);
    const board = again.view.board;
    // Back on the board: the reader's lines, and none of the game's Nc6.
    expect(treeToPgn(board)).toContain("2. Nf3 (2. Bc4) 2... Nf6");
    expect(treeToPgn(board)).not.toContain("Nc6");
  });

  it("keeps nothing for a position left with no line", () => {
    const session = startSession({ caseRef, positions, wanted: 3, tree: base })!;
    expect(leavePosition(session, session.view.board).work).toEqual([null, null]);
  });
});

describe("reopenPassed / withoutPositionComment", () => {
  const positions = trainingPositionsOf(parsePgnTree(ANALYSED)).filter((position) => position.turn === "w");
  const caseRef = { projectId: "p", caseId: "c" };

  it("opens a passed position again, its pass taken back — and leaves an answered one as it is", () => {
    let session = answerPosition(startSession({ caseRef, positions, wanted: 3, tree: base })!, []);
    session = answerPosition(openPosition(session, 1, base), ["Nf3"]);
    const again = reopenPassed(session, 0, base);
    expect(again.index).toBe(0);
    expect(again.answers).toEqual([null, ["Nf3"]]);
    expect(again.view.nodeId).toBeNull();
    // The answered one, and one never answered, stay.
    expect(reopenPassed(session, 1, base)).toBe(session);
    expect(reopenPassed(startSession({ caseRef, positions, wanted: 3, tree: base })!, 0, base).answers).toEqual([null, null]);
  });

  it("takes an answer's comment off its position, and nothing else", () => {
    const annotated = withSessionAnnotations(base, [{ path: ["e4", "e5"], answer: "Find Best Move: passed" }]);
    const node = nodeAtSanPath(annotated, ["e4", "e5"]);
    const withMine = setComments(annotated, node, "comments", ["Mine", "Find Best Move: passed"]);
    const without = withoutPositionComment(withMine, ["e4", "e5"], "Find Best Move: passed");
    expect(findNode(without, node)?.comments).toEqual(["Mine"]);
    expect(withoutPositionComment(without, ["e4", "e5"], "Find Best Move: passed")).toBe(without);
  });
});
