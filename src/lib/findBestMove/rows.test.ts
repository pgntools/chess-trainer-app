import { describe, expect, it } from "vitest";

import { ANALYSED_PGN, PLAIN_WORDS, applied, sessionOfPgn } from "../../test/findBestMoveKit";
import { readPgnTags } from "../pgn";
import { sessionEvents as e } from "./reducer";
import { findBestMoveSessionFirstDirection, findBestMoveSessionRowOf, sortedFindBestMoveSessions, type FindBestMoveSessionRow } from "./rows";
import { sessionPgnOf } from "./store";

/* The Find Best Move sessions lobby's rows (CTA-239; from the tags alone since CTA-244): each session Case's tags read, and their order. */

const UPDATED = "2026-10-19T10:00:00.000Z";

describe("findBestMoveSessionRowOf", () => {
  it("reads a session Case's side, moves to find and progress from its tags", () => {
    const record = applied(sessionOfPgn(ANALYSED_PGN, { side: "w" }), [e.answer(1, ["e4", "d4"]), e.next(), e.pass(3)]);
    const row = findBestMoveSessionRowOf({ id: "a", pgn: sessionPgnOf(record, readPgnTags(ANALYSED_PGN), PLAIN_WORDS), updatedAt: UPDATED }, "Alice – Bob — Find Best Move");
    expect(row).toEqual({
      id: "a",
      name: "Alice – Bob — Find Best Move",
      updatedAt: UPDATED,
      session: { side: "w", wanted: 2, progress: { total: 2, answered: 1, passed: 1, found: 2, inPlace: 2, target: 2, done: true } },
    });
  });

  it("reads the tags alone — a movetext that will not parse does not matter", () => {
    const pgn = sessionPgnOf(sessionOfPgn(ANALYSED_PGN), {}, PLAIN_WORDS);
    const broken = `${pgn.slice(0, pgn.indexOf("\n\n"))}\n\n1. e5 *`;
    expect(findBestMoveSessionRowOf({ id: "b", pgn: broken, updatedAt: UPDATED }, "Broken").session?.progress.total).toBe(3);
  });

  it("keeps a Case that is no session without one, and says an older session is one", () => {
    expect(findBestMoveSessionRowOf({ id: "c", pgn: ANALYSED_PGN, updatedAt: UPDATED }, "Plain")).toEqual({ id: "c", name: "Plain", updatedAt: UPDATED });
    const v3 = `[FindBestMove "1"]\n\n1. e4 { [%fbm game:e4 state:open] } *`;
    expect(findBestMoveSessionRowOf({ id: "d", pgn: v3, updatedAt: UPDATED }, "Old")).toEqual({ id: "d", name: "Old", updatedAt: UPDATED, older: true });
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
