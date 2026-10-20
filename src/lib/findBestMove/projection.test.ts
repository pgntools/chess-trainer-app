import { describe, expect, it } from "vitest";

import { ANALYSED_PGN, PLAIN_WORDS, START_FEN, applied, sessionOfPgn } from "../../test/findBestMoveKit";
import { addLine, emptyTree, findNode, mainline, sanPathTo, type GameTree } from "../gameTree";
import { lineMovesOf } from "./model";
import { workFragmentOf } from "./pgn";
import { boardTreeOf, candidatesOf, isAtPosition, isWorkNode, reorderedCandidates, withoutCandidate, workOf } from "./projection";
import { sessionEvents as e } from "./reducer";

/* The board at a position (CTA-244, the design note §6.1): every move before it and none after, its own lines alone under it. */

const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
const AFTER_E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";

const workAt = (fen: string, ...lines: string[][]): GameTree =>
  lines.reduce((tree, sans) => addLine(tree, null, lineMovesOf(fen, sans)).tree, emptyTree(fen));

describe("boardTreeOf", () => {
  it("is the game up to the position, nothing after it", () => {
    const record = applied(sessionOfPgn(ANALYSED_PGN), [e.goTo(3)]);
    const view = boardTreeOf(record, 3, PLAIN_WORDS);
    expect(mainline(view.tree).map((node) => node.san)).toEqual(["e4", "e5"]);
    expect(sanPathTo(view.tree, view.nodeId)).toEqual(["e4", "e5"]);
    expect(findNode(view.tree, view.nodeId)?.children).toEqual([]);
  });

  it("shows what the session left at earlier positions: their graded lines with evals, their answers, the reader's lines", () => {
    const record = applied(sessionOfPgn(ANALYSED_PGN), [
      e.workRecorded(1, workAt(START_FEN, ["d4", "d5"])),
      e.answer(1, ["d4"]),
      e.next(),
      e.pass(2),
      e.next(),
    ]);
    const view = boardTreeOf(record, 3, PLAIN_WORDS);
    expect(view.tree.moves.map((node) => node.san)).toEqual(["e4", "d4", "Nf3"]);
    expect(view.tree.moves[0].comments).toEqual(["[%eval 0.30]", "FBM: 1/2, 0 in place"]);
    expect(view.tree.moves[1].children.map((node) => node.san)).toEqual(["d5"]);
    // A pass: its answer said, its lines hidden.
    expect(view.tree.moves[0].children.map((node) => node.san)).toEqual(["e5"]);
    expect(view.tree.moves[0].children[0].comments).toEqual(["FBM: passed"]);
  });

  it("cuts anything earlier that runs on through the position — under it, the reader's work alone", () => {
    // The reader at 1 played on into position 2 and past it: 1. e4 e5 2. Nf3.
    const record = applied(sessionOfPgn(ANALYSED_PGN), [e.workRecorded(1, workAt(START_FEN, ["e4", "e5", "Nf3"])), e.answer(1, ["e4"]), e.next()]);
    expect(record.current).toBe(2);
    const bare = boardTreeOf(record, 2, PLAIN_WORDS);
    expect(findNode(bare.tree, bare.nodeId)?.children).toEqual([]);
    const withWork = boardTreeOf(applied(record, [e.workRecorded(2, workAt(AFTER_E4, ["c5"]))]), 2, PLAIN_WORDS);
    expect(candidatesOf(withWork.tree, withWork.nodeId)).toEqual(["c5"]);
  });

  it("puts the position's own work back under it", () => {
    const record = applied(sessionOfPgn(ANALYSED_PGN), [e.goTo(3), e.workRecorded(3, workAt(AFTER_E5, ["Nf3", "Nc6"], ["Bc4"]))]);
    const view = boardTreeOf(record, 3, PLAIN_WORDS);
    expect(candidatesOf(view.tree, view.nodeId)).toEqual(["Nf3", "Bc4"]);
    const work = workOf(view.tree, view.nodeId, AFTER_E5);
    expect(work?.moves.map((node) => node.san)).toEqual(["Nf3", "Bc4"]);
    // A tree of its own: numbered from the position, not from the game's start.
    expect(work?.moves[0].ply).toBe(1);
    expect(workFragmentOf(work)).toBe("2. Nf3 (2. Bc4) 2... Nc6");
  });
});

describe("the reader's moves on the board", () => {
  const board = () => {
    const record = applied(sessionOfPgn(ANALYSED_PGN), [e.goTo(3), e.workRecorded(3, workAt(AFTER_E5, ["Nf3", "Nc6"], ["Bc4"], ["d4"]))]);
    return boardTreeOf(record, 3, PLAIN_WORDS);
  };

  it("moves one up or down with its line, deletes one with it", () => {
    const { tree, nodeId } = board();
    expect(candidatesOf(reorderedCandidates(tree, nodeId, 2, "up"), nodeId)).toEqual(["Nf3", "d4", "Bc4"]);
    expect(reorderedCandidates(tree, nodeId, 0, "up")).toBe(tree);
    expect(candidatesOf(withoutCandidate(tree, nodeId, 0), nodeId)).toEqual(["Bc4", "d4"]);
  });

  it("moves only on the position or inside a line from it, and edits only strictly under it", () => {
    const { tree, nodeId } = board();
    const nf3 = findNode(tree, nodeId)!.children[0];
    const e4 = tree.moves[0];
    expect(isAtPosition(tree, nodeId, nodeId)).toBe(true);
    expect(isAtPosition(tree, nodeId, nf3.children[0].id)).toBe(true);
    expect(isAtPosition(tree, nodeId, e4.id)).toBe(false);
    expect(isWorkNode(tree, nodeId, nf3.id)).toBe(true);
    expect(isWorkNode(tree, nodeId, nodeId)).toBe(false);
    expect(isWorkNode(tree, nodeId, e4.id)).toBe(false);
    expect(isWorkNode(tree, nodeId, null)).toBe(false);
  });
});
