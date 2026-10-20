import { describe, expect, it } from "vitest";

import { ANALYSED_PGN, PLAIN_WORDS, RUY_LOPEZ_38, START_FEN, applied, searchOf, sessionOfPgn } from "../../test/findBestMoveKit";
import { withEngineLine } from "../computerAnalysisTree";
import { recordEvaluation } from "../engineEvals";
import { addLine, emptyTree, findNode, mainline, promoteVariation, setComments, setNags, treeToPgn, type GameTree } from "../gameTree";
import { parsePgnTree, readPgnTags } from "../pgn";
import { lineMovesOf, type FindBestMoveRecord } from "./model";
import { isOlderSessionTags, isSessionTags, sessionRecordOf, workFragmentOf, workFromFragment } from "./pgn";
import { sessionEvents as e } from "./reducer";
import { nextOpen } from "./selectors";
import { sessionFromPosition } from "./start";
import { sessionPgnOf } from "./store";

/*
  The session in its PGN, format 2 (CTA-244, the design note §5): every byte
  of state in the tags, the movetext a projection never read back — so the
  record survives every foreign writer — and the reading's leniency.
*/

/** A record as data to compare: its work as the fragment it writes (node ids do not survive a round trip). */
const comparable = (record: FindBestMoveRecord) => ({
  ...record,
  positions: [...record.positions.values()].map((position) => ({ ...position, work: workFragmentOf(position.work) })),
});

/** A record written and read back from its tags. */
const roundTrip = (record: FindBestMoveRecord, headers = {}) => {
  const pgn = sessionPgnOf(record, headers, PLAIN_WORDS);
  const read = sessionRecordOf(readPgnTags(pgn));
  if (read === undefined) throw new Error("not a session");
  return { pgn, read };
};

const workAt = (fen: string, ...lines: string[][]): GameTree =>
  lines.reduce((tree, sans) => addLine(tree, null, lineMovesOf(fen, sans)).tree, emptyTree(fen));

/** A session in every state: graded, passed, waiting, reopened and open; each engine state; work with comments, NAGs, a quote and a backslash. */
const busy = (): FindBestMoveRecord => {
  const record = sessionOfPgn(RUY_LOPEZ_38, { settings: { engine: true, moves: 3 } });
  const first = workAt(START_FEN, ["e4", "e5"], ["d4"]);
  const commented = setNags(setComments(first, first.moves[0].id, "comments", ['the "King\'s" pawn \\ e4']), first.moves[0].id, [1]);
  return applied(record, [
    e.workRecorded(1, commented),
    e.answer(1, ["e4", "d4"]),
    e.engineQueued(1, "job-1"),
    e.engineSearched(1, "job-1", searchOf(START_FEN, [{ pv: ["e2e4", "e7e5"], cp: 31 }, { pv: ["d2d4"], cp: 25 }, { pv: ["c2c4"], cp: 20 }])),
    e.next(),
    e.pass(2),
    e.next(),
    e.answer(3, ["Nf3"]),
    e.engineQueued(3, "job-3"),
    e.next(),
    e.firstMove(4),
    e.answer(4, ["Nc6"]),
    e.engineFailed(4),
    e.next(),
    e.pass(5),
    e.goTo(6),
    e.firstMove(6),
    e.reopen(5),
  ]);
};

describe("isSessionTags", () => {
  it("knows format 2 alone; v3's 1 is an older session", () => {
    expect(isSessionTags({ FindBestMove: "2" })).toBe(true);
    expect(isSessionTags({ FindBestMove: "1" })).toBe(false);
    expect(isOlderSessionTags({ FindBestMove: "1" })).toBe(true);
    expect(isOlderSessionTags({ White: "Alice" })).toBe(false);
  });
});

describe("the round trip", () => {
  it("reads a record back equal, in every state", () => {
    const record = busy();
    expect(record.current).toBe(5);
    expect(record.positions.get(5)?.answer.kind).toBe("reopened");
    const { read } = roundTrip(record);
    expect(read.issues).toEqual([]);
    expect(comparable(read.record)).toEqual(comparable(record));
  });

  it("writes the same text for the same record — the projection is deterministic", () => {
    const { pgn, read } = roundTrip(busy(), readPgnTags(RUY_LOPEZ_38));
    expect(sessionPgnOf(read.record, readPgnTags(pgn), PLAIN_WORDS)).toBe(pgn);
  });

  it("keeps the source game's tags, escapes a quote, and writes every session tag in the header", () => {
    const record = { ...sessionOfPgn(ANALYSED_PGN), name: 'Alice "the Bold" – Bob' };
    const { pgn, read } = roundTrip(record, readPgnTags(ANALYSED_PGN));
    expect(pgn).toContain('[White "Alice"]');
    expect(pgn).toContain('[FindBestMoveName "Alice \\"the Bold\\" – Bob"]');
    expect(read.record.name).toBe('Alice "the Bold" – Bob');
    expect(pgn).not.toContain("[%fbm");
  });

  it("writes when the engine starts, and reads a session without the tag as on the first move (CTA-247)", () => {
    const record = sessionOfPgn(ANALYSED_PGN, { settings: { engineStart: "grade" } });
    const { pgn, read } = roundTrip(record);
    expect(pgn).toContain('[FindBestMoveEngineStart "grade"]');
    expect(read.record.settings.engineStart).toBe("grade");
    expect(roundTrip(sessionOfPgn(ANALYSED_PGN)).pgn).toContain('[FindBestMoveEngineStart "move"]');
    // A session from before it — no such tag — or a value it does not know: today's behaviour, unsaid.
    const older = pgn.split("\n").filter((line) => !line.startsWith("[FindBestMoveEngineStart ")).join("\n");
    expect(sessionRecordOf(readPgnTags(older))).toMatchObject({ record: { settings: { engineStart: "move" } }, issues: [] });
    const unknown = pgn.replace('[FindBestMoveEngineStart "grade"]', '[FindBestMoveEngineStart "later"]');
    expect(sessionRecordOf(readPgnTags(unknown))?.record.settings.engineStart).toBe("move");
  });

  it("keeps a session from a position — its game empty, its one key 1", () => {
    const fen = "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1";
    const record = applied(sessionFromPosition({ fen, name: "Position — White to move", settings: { moves: 2, arrows: false } }), [
      e.workRecorded(1, workAt(fen, ["e4"], ["Kd2"])),
    ]);
    const { pgn, read } = roundTrip(record);
    expect(pgn).toContain(`[FEN "${fen}"]`);
    expect(comparable(read.record)).toEqual(comparable(record));
  });
});

describe("the movetext is a projection", () => {
  it("is the readable game: the engine's lines with their evals and the answer at a graded position, the work grafted, a pass's lines hidden", () => {
    const { pgn } = roundTrip(busy());
    const tree = parsePgnTree(pgn);
    expect(mainline(tree).map((node) => node.san)).toEqual(mainline(parsePgnTree(RUY_LOPEZ_38)).map((node) => node.san));
    const e4 = tree.moves[0];
    expect(e4.comments?.[0]).toBe("[%eval 0.31]");
    expect(e4.comments).toContain("FBM: 2/3, 2 in place");
    expect(e4.comments).toContain('the "King\'s" pawn \\ e4');
    expect(tree.moves.map((node) => node.san)).toEqual(["e4", "d4", "c4"]);
    // Position 2 passed: no line of its own, its answer said.
    expect(e4.children[0].comments).toEqual(["FBM: passed"]);
    expect(e4.children.map((node) => node.san)).toEqual(["e5"]);
  });

  it("never reads the movetext: a session whose movetext is anything reads the same", () => {
    const { pgn, read } = roundTrip(busy());
    const header = pgn.slice(0, pgn.indexOf("\n\n"));
    expect(comparable(sessionRecordOf(readPgnTags(`${header}\n\n1. e4 { anything } *`))!.record)).toEqual(comparable(read.record));
  });
});

describe("a foreign writer touching a session", () => {
  it("leaves the record identical — every move evaluated, an engine line at every position, a comment and a NAG, a promotion, the autosave", () => {
    const { pgn, read } = roundTrip(busy());
    let tree = parsePgnTree(pgn);
    // The Analysis engine: an [%eval] on every move, first in its first comment.
    const walk = (nodes: readonly GameTree["moves"][number][]): GameTree["moves"][number][] => nodes.flatMap((node) => [node, ...walk(node.children)]);
    for (const node of walk(tree.moves)) tree = recordEvaluation(tree, { nodeId: node.id, fen: node.fen, score: { kind: "cp", value: -39 }, depth: 29 });
    // A job's engine line at every mainline position.
    for (const node of mainline(tree).slice(0, 10)) tree = withEngineLine(tree, node.id, node.fen, { score: { kind: "cp", value: 5 }, depth: 18, pv: [] });
    // A comment and a NAG typed on a position's move, a variation promoted.
    const e4 = tree.moves[0].id;
    tree = setNags(setComments(tree, e4, "comments", ["typed by hand", ...(findNode(tree, e4)?.comments ?? [])]), e4, [3]);
    const side = tree.moves[1];
    if (side !== undefined) tree = promoteVariation(tree, side.id);
    // The Analysis autosave: its own parse and write.
    const edited = treeToPgn(parsePgnTree(treeToPgn(tree)));
    const again = sessionRecordOf(readPgnTags(edited));
    expect(again?.issues).toEqual([]);
    expect(comparable(again!.record)).toEqual(comparable(read.record));
    // And the next write's movetext is the clean projection again.
    expect(sessionPgnOf(again!.record, readPgnTags(edited), PLAIN_WORDS)).toBe(sessionPgnOf(read.record, readPgnTags(pgn), PLAIN_WORDS));
  });
});

describe("the 38-to-35 regression", () => {
  /** 38 positions over both sides, the first ten answered, the reader on position 11 — as session gmvgdlti036ue stood. */
  const session38 = () => {
    let record = sessionOfPgn(RUY_LOPEZ_38, { settings: { engine: true, moves: 1 } });
    for (let key = 1; key <= 10; key += 1) record = applied(record, [e.goTo(key), e.answer(key, [record.game.moves[key - 1]])]);
    return applied(record, [e.goTo(7)]);
  };

  it("reads 38 positions back when an [%eval] is prepended into positions 8, 9 and 10's moves", () => {
    const record = session38();
    expect(record.keys).toHaveLength(38);
    const { pgn } = roundTrip(record, readPgnTags(RUY_LOPEZ_38));
    let tree = parsePgnTree(pgn);
    const moves = mainline(tree);
    for (const ply of [8, 9, 10]) {
      const node = moves[ply - 1];
      tree = setComments(tree, node.id, "comments", [`[%eval -0.39,29] ${(node.comments ?? []).join(" ")}`.trim()]);
    }
    const read = sessionRecordOf(readPgnTags(treeToPgn(tree)));
    expect(read?.record.keys).toHaveLength(38);
    expect(read?.record.current).toBe(7);
    expect(comparable(read!.record)).toEqual(comparable(record));
    // Next from 7 goes to the first open one after it — 11 — and nothing between vanished.
    expect(nextOpen(read!.record)).toBe(11);
    expect([8, 9, 10].map((key) => read!.record.positions.get(key)?.answer.kind)).toEqual(["answered", "answered", "answered"]);
  });

  it("reads v3's shape of it as no session — an older one", () => {
    const v3 = `[FindBestMove "1"]\n[FindBestMoveSide "both"]\n[FindBestMovePosition "8"]\n\n1. e4 { [%fbm game:e4 state:answered answer:e4] } e5 *`;
    expect(sessionRecordOf(readPgnTags(v3))).toBeUndefined();
    expect(isOlderSessionTags(readPgnTags(v3))).toBe(true);
  });
});

describe("the manifest, and stale data", () => {
  const written = () => roundTrip(busy()).pgn;
  const withoutLine = (pgn: string, tag: string) => pgn.split("\n").filter((line) => !line.startsWith(`[${tag} `)).join("\n");
  const withLine = (pgn: string, line: string) => pgn.replace("\n\n", `\n${line}\n\n`);

  it("keeps a manifest key whose tag is lost — open, no lines — and says so", () => {
    const read = sessionRecordOf(readPgnTags(withoutLine(written(), "FindBestMove_3")));
    expect(read?.record.keys).toHaveLength(38);
    expect(read?.record.positions.get(3)).toMatchObject({ answer: { kind: "open" }, lines: [], engine: { kind: "idle" } });
    expect(read?.issues).toEqual([{ kind: "lost", key: 3 }]);
  });

  it("drops a tag for a key outside the manifest at the next write", () => {
    const stale = withLine(written(), '[FindBestMove_99 "state:answered answer:e4"]');
    const read = sessionRecordOf(readPgnTags(stale))!;
    expect(read.record.positions.has(99)).toBe(false);
    const rewritten = sessionPgnOf(applied(read.record, [e.settingsChanged({ arrows: false })]), readPgnTags(stale), PLAIN_WORDS);
    expect(rewritten).not.toContain("FindBestMove_99");
  });

  it("falls back from a current outside the manifest to the first open key", () => {
    const pgn = written().replace('[FindBestMoveCurrent "5"]', '[FindBestMoveCurrent "77"]');
    const read = sessionRecordOf(readPgnTags(pgn))!;
    expect(read.record.current).toBe(6);
    expect(read.issues).toContainEqual({ kind: "current" });
    // The reopened pass, no longer on screen, is a pass.
    expect(read.record.positions.get(5)?.answer.kind).toBe("passed");
  });

  it("takes a field that does not read as its default, and says so", () => {
    const pgn = written().replace(/\[FindBestMove_2 "[^"]*"\]/, '[FindBestMove_2 "state:weird lines:xx engine:queued"]');
    const read = sessionRecordOf(readPgnTags(pgn))!;
    expect(read.record.positions.get(2)).toMatchObject({ answer: { kind: "open" }, lines: [], engine: { kind: "idle" } });
    expect(read.issues.filter((issue) => issue.kind === "field").map((issue) => ("field" in issue ? issue.field : ""))).toEqual(["state", "lines", "engine"]);
  });

  it("is no session without a manifest, or with a game that does not replay", () => {
    expect(sessionRecordOf(readPgnTags(withoutLine(written(), "FindBestMoveKeys")))).toBeUndefined();
    expect(sessionRecordOf(readPgnTags(written().replace('[FindBestMoveGame "e4 e5', '[FindBestMoveGame "e4 e4')))).toBeUndefined();
  });

  it("reads a work fragment that does not parse as none", () => {
    expect(workFromFragment(START_FEN, "1. e5 *")).toBeUndefined();
    const read = sessionRecordOf(readPgnTags(written().replace(/\[FindBestMoveWork_1 "[^\n]*"\]/, '[FindBestMoveWork_1 "1. Ke2"]')))!;
    expect(read.record.positions.get(1)?.work).toBeNull();
    expect(read.issues).toContainEqual({ kind: "work", key: 1 });
  });
});
