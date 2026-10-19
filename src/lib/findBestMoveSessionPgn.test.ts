import { describe, expect, it } from "vitest";

import { gradePosition, trainingPositionFrom, trainingPositionsOf, type TrainingPosition } from "./accuracyTrainer";
import {
  answerPosition,
  candidatesOf,
  caseTreeOf,
  leavePosition,
  openPosition,
  resumeSession,
  sessionBaseTree,
  startSession,
  withoutSessionCommands,
  withPositionJob,
  withPositionLines,
  workOf,
  type FindBestMoveSession,
} from "./findBestMoveSession";
import { isSessionTree, sessionProgressOf, sessionRecordOf, withSessionRecord, type SessionRecord } from "./findBestMoveSessionPgn";
import { addMove, findNode, nodeAtSanPath, treeToPgn, type GameTree, type VariationNode } from "./gameTree";
import { readComment } from "./moveAnnotations";
import { parsePgnTree } from "./pgn";

/*
  A Find Best Move session in its PGN (CTA-239): its whole state written into
  its Case's tree — tags and one `[%fbm …]` per position — and read back the
  same, so a session resumes from its PGN alone.
*/

const ANALYSED = `[White "Alice"]
[Black "Bob"]
[AnalysedPlies "1-4"]
[Annotator "Stockfish 19 [full]"]

1. e4 { [%eval 0.30,20] } (1. d4 { [%eval 0.25,20] } 1... d5 2. c4) (1. Nf3 { [%eval 0.20,20] }) 1... e5 { [%eval 0.30,20] } (1... c5 { [%eval 0.35,20] }) 2. Nf3 { [%eval 0.30,20] } (2. Bc4 { [%eval 0.20,20] }) 2... Nc6 *`;

const source = parsePgnTree(ANALYSED);
const base = sessionBaseTree(source);
const positions = trainingPositionsOf(source);
const caseRef = { projectId: "p", caseId: "c" };

/** A move played on the board under `parentId`, as the core plays it. */
const play = (tree: GameTree, parentId: string | null, san: string): { tree: GameTree; nodeId: string } => {
  const fenBefore = parentId === null ? tree.startFen : (findNode(tree, parentId)?.fen ?? tree.startFen);
  const replay = parsePgnTree(`[FEN "${fenBefore}"]\n[SetUp "1"]\n\n${fenBefore.split(" ")[1] === "b" ? "1... " : ""}${san} *`).moves[0];
  return addMove(tree, parentId, { san: replay.san, from: replay.from, to: replay.to, fen: replay.fen });
};

/** A tree of moves as nested SANs — the shape the reader's lines have. */
const shape = (nodes: readonly VariationNode[]): unknown[] => nodes.map((node) => (node.children.length === 0 ? node.san : [node.san, shape(node.children)]));

/** What grades a position — everything but the played line's continuation, which `lines:` keeps as its first move. */
const graded = (position: TrainingPosition) => ({
  ...position,
  nodeId: undefined,
  lines: position.lines.map(({ sans, ...line }) => ({ ...line, sans: line.played ? [line.san] : sans })),
});

/**
 * A session half done: 1. e4 answered with d4 (and a reply) then Nf3, 1... e5 passed,
 * and 2. Nf3's position on screen, Bc4 played there and its job queued.
 */
const halfDone = (): { session: FindBestMoveSession; board: GameTree } => {
  let session = startSession({ caseRef, side: "both", game: "Alice – Bob", positions, wanted: 2, tree: base })!;
  let board = session.view.board;
  const d4 = play(board, null, "d4");
  board = play(d4.tree, d4.nodeId, "d5").tree;
  board = play(board, null, "Nf3").tree;
  session = answerPosition(session, candidatesOf(session.view, board));
  session = openPosition(leavePosition(session, board), 1, caseTreeOf(session, board));
  board = session.view.board;
  session = answerPosition(session, []);
  session = openPosition(leavePosition(session, board), 2, caseTreeOf(session, board));
  board = play(session.view.board, session.view.nodeId, "Bc4").tree;
  session = withPositionJob(session, 2, "job-7");
  return { session, board };
};

/** The session's record as the screen writes it — the one on screen's lines the board's. */
const recordOf = (session: FindBestMoveSession, board: GameTree, settings = { engine: true, showArrows: false }): SessionRecord => ({
  side: session.side,
  game: session.game,
  positions: session.positions,
  wanted: session.wanted,
  index: session.index,
  answers: session.answers,
  jobs: session.jobs,
  searched: session.searched,
  work: session.work.map((each, at) => (at === session.index ? workOf(session, board) : each)),
  reopened: session.reopened,
  ...settings,
});

describe("trainingPositionFrom", () => {
  it("rebuilds every position of a tree from its stored lines alone — the same scores, ranks, losses and top N", () => {
    for (const position of positionsWithMate()) {
      const rebuilt = trainingPositionFrom(position, position.lines);
      expect(rebuilt).toEqual(position);
    }
  });
});

/** The analysed game's positions, and one where the game's move mates — its own eval `#0`, signed by the side mated. */
const positionsWithMate = (): TrainingPosition[] => [
  ...positions,
  ...trainingPositionsOf(parsePgnTree(`1. f3 e5 2. g4 Qh4# { [%eval #0] } (2... Nc6 { [%eval 3.50] }) *`)),
];

describe("withSessionRecord / sessionRecordOf — the round trip", () => {
  it("writes the session's tags and one command per position, and reads the same session back", () => {
    const { session, board } = halfDone();
    const record = recordOf(session, board);
    const pgn = treeToPgn(withSessionRecord(caseTreeOf(session, board), record));

    expect(pgn).toContain('[FindBestMove "1"]');
    expect(pgn).toContain('[FindBestMoveSide "both"]');
    expect(pgn).toContain('[FindBestMoveMoves "2"]');
    expect(pgn).toContain('[FindBestMoveEngine "on"]');
    expect(pgn).toContain('[FindBestMoveArrows "off"]');
    expect(pgn).toContain('[FindBestMovePosition "3"]');
    expect(pgn).toContain('[FindBestMoveStatus "ongoing"]');
    expect(pgn).toContain('[FindBestMoveGame "Alice – Bob"]');
    // The start's command is the game's opening comment; the reader's lines in their order.
    expect(pgn).toMatch(/^\{ \[%fbm game:e4 state:answered answer:d4,Nf3 lines:\S+ work:d4\.d5\|Nf3\] \}/m);
    expect(pgn).toContain("[%fbm game:e5 state:passed lines:");
    expect(pgn).toContain("work:Bc4 job:job-7]");

    const tree = parsePgnTree(pgn);
    expect(isSessionTree(tree)).toBe(true);
    const back = sessionRecordOf(tree)!;
    expect(back).toMatchObject({
      side: "both",
      game: "Alice – Bob",
      wanted: 2,
      index: 2,
      answers: [["d4", "Nf3"], [], null],
      jobs: [null, null, "job-7"],
      searched: [false, false, false],
      reopened: null,
      engine: true,
      showArrows: false,
    });
    expect(back.positions.map(graded)).toEqual(session.positions.map(graded));
    expect(back.work.map((each) => (each === null ? null : shape(each.moves)))).toEqual([[["d4", ["d5"]], "Nf3"], null, ["Bc4"]]);
    // The grades are the same: the positions are their stored lines.
    expect(gradePosition(back.positions[0], ["d4", "Nf3"], { wanted: 2 })).toEqual(gradePosition(session.positions[0], ["d4", "Nf3"], { wanted: 2 }));

    // Written again from what was read, the same PGN.
    expect(treeToPgn(withSessionRecord(tree, back))).toBe(pgn);
  });

  it("resumes on the position on screen, its lines of the reader's own back — and no session data on the board", () => {
    const { session, board } = halfDone();
    const tree = parsePgnTree(treeToPgn(withSessionRecord(caseTreeOf(session, board), recordOf(session, board))));
    const resumed = resumeSession(caseRef, sessionRecordOf(tree)!, tree)!;
    expect(resumed.index).toBe(2);
    expect(resumed.view.nodeId).toBe(nodeAtSanPath(tree, ["e4", "e5"]));
    expect(candidatesOf(resumed.view, resumed.view.board)).toEqual(["Bc4"]);
    // The game's 2. Nf3 and the engine's lines there are set aside; nothing of the trainer's data shows.
    expect(treeToPgn(resumed.view.board)).not.toContain("%fbm");
    expect(treeToPgn(resumed.view.board)).not.toContain("Nf3 Nc6");
    // Its other positions' lines come back as they were left.
    expect(shape(openPosition(resumed, 0, tree).view.board.moves)).toEqual([["d4", ["d5"]], "Nf3"]);
  });

  it("keeps the reader's comments and glyphs in their lines, but no engine eval", () => {
    let session = startSession({ caseRef, positions, wanted: 2, tree: base })!;
    const d4 = play(session.view.board, null, "d4");
    let board = d4.tree;
    board = { ...board, moves: board.moves.map((node) => (node.id === d4.nodeId ? { ...node, comments: ["My idea"], nags: [5] } : node)) };
    session = answerPosition(session, ["d4"]);
    // The engine's line through d4 lands in the Case too — its eval on the reader's move.
    const caseTree = withPositionLines(caseTreeOf(session, board), [], base.startFen, session.positions[0].lines);
    const tree = parsePgnTree(treeToPgn(withSessionRecord(caseTree, recordOf(leavePosition(session, board), board))));
    const work = sessionRecordOf(tree)!.work[0]!;
    expect(work.moves[0]).toMatchObject({ san: "d4", comments: ["My idea"], nags: [5] });
  });

  it("keeps a pass being answered again on screen — and anywhere else reads it as a pass", () => {
    const { session, board } = halfDone();
    const record = { ...recordOf(session, board), index: 1, answers: [["d4", "Nf3"], null, null], reopened: 1 };
    const pgn = treeToPgn(withSessionRecord(caseTreeOf(session, board), record));
    expect(pgn).toContain("[%fbm game:e5 state:reopened");
    expect(sessionRecordOf(parsePgnTree(pgn))).toMatchObject({ index: 1, reopened: 1, answers: [["d4", "Nf3"], null, null] });
    const elsewhere = parsePgnTree(pgn.replace('[FindBestMovePosition "2"]', '[FindBestMovePosition "3"]'));
    expect(sessionRecordOf(elsewhere)).toMatchObject({ index: 2, reopened: null, answers: [["d4", "Nf3"], [], null] });
  });

  it("marks a job whose lines are in as searched — waited for no more", () => {
    const { session, board } = halfDone();
    const pgn = treeToPgn(withSessionRecord(caseTreeOf(session, board), { ...recordOf(session, board), searched: [false, false, true] }));
    expect(pgn).toContain("searched:job-7]");
    expect(sessionRecordOf(parsePgnTree(pgn))).toMatchObject({ jobs: [null, null, "job-7"], searched: [false, false, true] });
  });

  it("writes the same PGN however often it is written", () => {
    const { session, board } = halfDone();
    const record = recordOf(session, board);
    const once = withSessionRecord(caseTreeOf(session, board), record);
    expect(treeToPgn(withSessionRecord(once, record))).toBe(treeToPgn(once));
  });
});

describe("sessionRecordOf — what is not a session, and leniency", () => {
  const written = () => {
    const { session, board } = halfDone();
    return treeToPgn(withSessionRecord(caseTreeOf(session, board), recordOf(session, board)));
  };

  it("reads no session from a plain game, another format's or one with no position", () => {
    expect(sessionRecordOf(source)).toBeUndefined();
    expect(isSessionTree(source)).toBe(false);
    expect(sessionRecordOf(parsePgnTree(written().replace('[FindBestMove "1"]', '[FindBestMove "2"]')))).toBeUndefined();
    expect(sessionRecordOf(parsePgnTree(written().replace(/\{ \[%fbm [^\]]*\] \}/g, "")))).toBeUndefined();
  });

  it("reads a tag that does not read as its default", () => {
    const pgn = written()
      .replace('[FindBestMoveMoves "2"]', '[FindBestMoveMoves "40"]')
      .replace('[FindBestMoveSide "both"]', '[FindBestMoveSide "purple"]')
      .replace('[FindBestMovePosition "3"]', '[FindBestMovePosition "x"]');
    expect(sessionRecordOf(parsePgnTree(pgn))).toMatchObject({ wanted: 3, side: "both", index: 0 });
  });
});

describe("the board never holds the session's data", () => {
  it("takes every command off, keeping every other comment and every id", () => {
    const { session, board } = halfDone();
    const tree = withSessionRecord(caseTreeOf(session, board), recordOf(session, board));
    const stripped = withoutSessionCommands(tree);
    expect(treeToPgn(stripped)).not.toContain("%fbm");
    expect(stripped.comments).toBeUndefined();
    expect(withoutSessionCommands(stripped)).toBe(stripped);
    expect(findNode(stripped, nodeAtSanPath(tree, ["e4", "e5"]))?.id).toBe(nodeAtSanPath(tree, ["e4", "e5"]));
  });

  it("is never a chip in the comment block", () => {
    expect(readComment("[%fbm game:e4 state:open] Mine").attributes).toEqual([]);
    expect(readComment("[%fbm game:e4 state:open] Mine").paragraphs).toEqual(["Mine"]);
  });
});

describe("withPositionLines", () => {
  it("hangs a graded position's lines as variations, each first move with its eval once", () => {
    const lines = positions[0].lines;
    const once = withPositionLines(base, [], base.startFen, lines);
    const pgn = treeToPgn(once);
    expect(pgn).toContain("1. e4 { [%eval 0.30] }");
    expect(pgn).toContain("(1. d4 { [%eval 0.25] } 1... d5 2. c4)");
    expect(pgn).toContain("(1. Nf3 { [%eval 0.20] })");
    expect(treeToPgn(withPositionLines(once, [], base.startFen, lines))).toBe(pgn);
  });
});

describe("sessionProgressOf", () => {
  it("counts the positions answered and passed, and grades the answered ones — but one waiting for its search", () => {
    const { session, board } = halfDone();
    const progress = sessionProgressOf(recordOf(session, board));
    const first = gradePosition(session.positions[0], ["d4", "Nf3"], { wanted: 2 });
    expect(progress).toEqual({ total: 3, answered: 1, passed: 1, found: first.found, inPlace: first.inPlace, target: first.target, done: false });
    const waiting = { ...recordOf(session, board), answers: [["d4", "Nf3"], [], ["Bc4"]] };
    expect(sessionProgressOf(waiting)).toMatchObject({ answered: 2, target: first.target, done: true });
    expect(sessionProgressOf({ ...waiting, searched: [false, false, true] }).target).toBeGreaterThan(first.target);
  });
});
