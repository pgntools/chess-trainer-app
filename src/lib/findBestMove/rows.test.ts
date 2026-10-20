import { describe, expect, it } from "vitest";

import { trainingPositionsOf } from "./accuracyTrainer";
import { answerPosition, sessionBaseTree, startSession } from "./findBestMoveSession";
import { withSessionRecord } from "./findBestMoveSessionPgn";
import { findBestMoveSessionFirstDirection, findBestMoveSessionRowOf, sortedFindBestMoveSessions, type FindBestMoveSessionRow } from "./findBestMoveSessionRows";
import { treeToPgn } from "./gameTree";
import { parsePgnTree } from "./pgn";

/* The Find Best Move sessions lobby's rows (CTA-239): each session Case's PGN read, and their order. */

const ANALYSED = `[White "Alice"]
[Black "Bob"]

1. e4 { [%eval 0.30,20] } (1. d4 { [%eval 0.25,20] }) 1... e5 { [%eval 0.30,20] } (1... c5 { [%eval 0.35,20] }) 2. Nf3 *`;

const sessionPgn = (answers: (readonly string[] | null)[]): string => {
  const source = parsePgnTree(ANALYSED);
  const base = sessionBaseTree(source);
  const started = startSession({ caseRef: { projectId: "p", caseId: "c" }, side: "w", game: "Alice – Bob", positions: trainingPositionsOf(source), wanted: 2, tree: base })!;
  const session = answers.reduce((each, given, at) => (given === null ? each : { ...answerPosition({ ...each, index: at }, given), index: 0 }), started);
  return treeToPgn(withSessionRecord(base, { ...session, engine: false, showArrows: true }));
};

describe("findBestMoveSessionRowOf", () => {
  it("reads a session Case's side, moves to find and progress from its PGN", () => {
    const row = findBestMoveSessionRowOf({ id: "a", pgn: sessionPgn([["e4", "d4"], []]), updatedAt: "2026-10-19T10:00:00.000Z" }, "Alice – Bob — Find Best Move");
    expect(row).toEqual({
      id: "a",
      name: "Alice – Bob — Find Best Move",
      updatedAt: "2026-10-19T10:00:00.000Z",
      session: { side: "w", wanted: 2, progress: { total: 2, answered: 1, passed: 1, found: 2, inPlace: 2, target: 2, done: true } },
    });
  });

  it("keeps a Case that is no session — a plain game, or a PGN that will not read — without one", () => {
    expect(findBestMoveSessionRowOf({ id: "b", pgn: ANALYSED, updatedAt: "2026-10-19T10:00:00.000Z" }, "Plain").session).toBeUndefined();
    expect(findBestMoveSessionRowOf({ id: "c", pgn: "1. e5 *", updatedAt: "2026-10-19T10:00:00.000Z" }, "Broken").session).toBeUndefined();
  });
});

describe("sortedFindBestMoveSessions", () => {
  const row = (id: string, updatedAt: string, session?: FindBestMoveSessionRow["session"]): FindBestMoveSessionRow => ({ id, name: id, updatedAt, ...(session === undefined ? {} : { session }) });
  const progress = (answered: number, total: number, done = false) => ({ total, answered, passed: 0, found: answered, inPlace: 0, target: total, done });
  const rows = [
    row("old", "2026-10-01T00:00:00.000Z", { side: "b", wanted: 1, progress: progress(4, 4, true) }),
    row("plain", "2026-10-20T00:00:00.000Z"),
    row("new", "2026-10-19T00:00:00.000Z", { side: "w", wanted: 3, progress: progress(1, 10) }),
  ];
  const ids = (sorted: FindBestMoveSessionRow[]) => sorted.map((each) => each.id);

  it("orders by a column, a Case that is no session last either way", () => {
    expect(ids(sortedFindBestMoveSessions(rows, "updated", "desc"))).toEqual(["plain", "new", "old"]);
    expect(ids(sortedFindBestMoveSessions(rows, "progress", "desc"))).toEqual(["old", "new", "plain"]);
    expect(ids(sortedFindBestMoveSessions(rows, "progress", "asc"))).toEqual(["new", "old", "plain"]);
    expect(ids(sortedFindBestMoveSessions(rows, "moves", "asc"))).toEqual(["old", "new", "plain"]);
    expect(ids(sortedFindBestMoveSessions(rows, "status", "desc"))).toEqual(["old", "new", "plain"]);
    expect(ids(sortedFindBestMoveSessions(rows, "name", "asc"))).toEqual(["new", "old", "plain"]);
  });

  it("opens the words A to Z, the numbers and the date high first", () => {
    expect(findBestMoveSessionFirstDirection("name")).toBe("asc");
    expect(findBestMoveSessionFirstDirection("updated")).toBe("desc");
    expect(findBestMoveSessionFirstDirection("found")).toBe("desc");
  });
});
