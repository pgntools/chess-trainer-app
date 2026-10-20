import { describe, expect, it } from "vitest";

import { ANALYSED_PGN, PLAIN_WORDS, START_FEN, searchOf, sessionOfPgn } from "../../test/findBestMoveKit";
import { addAnalysisCases, editAnalysisCasePgn, loadAnalysisCases, mergeIntoAnalysisCase, removeAnalysisCases, resetAnalysisCaseStore } from "../analysisCaseStore";
import { gameCaseOf } from "../analysisProjects";
import { loadAnalysisProjects } from "../analysisProjectStore";
import { emptyTree } from "../gameTree";
import { parsePgnTree, readPgnTags } from "../pgn";
import type { FindBestMoveRecord } from "./model";
import { isSessionTags, sessionRecordOf, workFragmentOf } from "./pgn";
import { sessionEvents as e, type SessionEvent } from "./reducer";
import { createSessionCase, duplicateSessionAsPlainCase, editSessionCase, sessionPgnOf, sessionTreeOf } from "./store";

/*
  The session's one writer (CTA-244, the design note §6.2) over the real Case
  store (fake-indexeddb): events applied to the record stored at that
  moment, so the screen's and the job's writes commute — and S2's
  `editAnalysisCasePgn` under it.
*/

const NOW = new Date("2026-10-20T12:00:00.000Z");
const LATER = new Date("2026-10-20T12:05:00.000Z");

/** A session Case in the store; its id. */
const seed = async (record: FindBestMoveRecord = sessionOfPgn(ANALYSED_PGN, { settings: { engine: true, moves: 4 } })): Promise<string> => {
  const made = gameCaseOf({ id: "c1", projectId: "p1", name: "Alice – Bob — Find Best Move", now: NOW }, sessionTreeOf(record, readPgnTags(ANALYSED_PGN), PLAIN_WORDS));
  expect(await addAnalysisCases([made])).toBeUndefined();
  return made.id;
};

/** The session the store holds now, as data (its work as fragments). */
const stored = async (id = "c1") => {
  resetAnalysisCaseStore();
  const record = (await loadAnalysisCases()).find((each) => each.id === id);
  const read = record === undefined ? undefined : sessionRecordOf(readPgnTags(record.pgn))?.record;
  return read === undefined ? undefined : { ...read, positions: [...read.positions.values()].map((each) => ({ ...each, work: workFragmentOf(each.work) })) };
};

const RESULT = searchOf(START_FEN, [{ pv: ["c2c4"], cp: 28 }, { pv: ["g1f3"], cp: 20 }]);

describe("editAnalysisCasePgn (S2)", () => {
  it("edits a Case's PGN in the store's queue — gone for none, nothing written for the same text or undefined", async () => {
    const made = gameCaseOf({ id: "plain", projectId: "p1", name: "", now: NOW }, emptyTree());
    await addAnalysisCases([made]);
    expect(await editAnalysisCasePgn("nobody", (pgn) => pgn)).toBe("gone");
    expect(await editAnalysisCasePgn("plain", (pgn) => pgn, LATER)).toBeUndefined();
    expect(await editAnalysisCasePgn("plain", () => undefined, LATER)).toBeUndefined();
    expect((await loadAnalysisCases()).find((each) => each.id === "plain")?.updatedAt).toBe(NOW.toISOString());
    expect(await editAnalysisCasePgn("plain", () => '[Event "x"]\n\n*', LATER)).toBeUndefined();
    const edited = (await loadAnalysisCases()).find((each) => each.id === "plain");
    expect(edited).toMatchObject({ pgn: '[Event "x"]\n\n*', updatedAt: LATER.toISOString(), merges: [] });
  });

  it("is what mergeIntoAnalysisCase is built on — the merge's id recorded once", async () => {
    await addAnalysisCases([gameCaseOf({ id: "m", projectId: "p1", name: "", now: NOW }, emptyTree())]);
    expect(await mergeIntoAnalysisCase("m", "job-1", (pgn) => pgn, LATER)).toBeUndefined();
    expect(await mergeIntoAnalysisCase("m", "job-1", () => "changed", LATER)).toBeUndefined();
    expect((await loadAnalysisCases()).find((each) => each.id === "m")?.merges).toEqual(["job-1"]);
  });
});

describe("editSessionCase", () => {
  it("applies events to the stored record and writes the record whole — tags and movetext", async () => {
    const id = await seed();
    expect(await editSessionCase(id, [e.answer(1, ["e4", "d4"]), e.next()], { words: PLAIN_WORDS, now: LATER })).toBeUndefined();
    const record = await stored();
    expect(record?.current).toBe(2);
    expect(record?.positions[0].answer).toEqual({ kind: "answered", moves: ["e4", "d4"] });
    expect(record?.positions[0].engine).toEqual({ kind: "wanted" });
    const pgn = (await loadAnalysisCases())[0].pgn;
    expect(pgn).toContain("FBM: e4,d4 waiting");
  });

  it("writes nothing when the events change nothing", async () => {
    const id = await seed();
    expect(await editSessionCase(id, [e.goTo(1), e.pass(9)], { now: LATER })).toBeUndefined();
    expect((await loadAnalysisCases())[0].updatedAt).toBe(NOW.toISOString());
  });

  it("answers gone for a Case not there, and not-a-session for a plain game", async () => {
    expect(await editSessionCase("nobody", [e.next()])).toBe("gone");
    await addAnalysisCases([gameCaseOf({ id: "plain", projectId: "p1", name: "", now: NOW }, parsePgnTree(ANALYSED_PGN))]);
    expect(await editSessionCase("plain", [e.next()])).toBe("not-a-session");
  });

  it("commutes: the screen's write and the job's, interleaved in either order, give the same record", async () => {
    const screen: SessionEvent[] = [e.answer(1, ["e4"]), e.next()];
    const job: SessionEvent[] = [e.engineSearched(1, "job-1", RESULT)];
    const results = [];
    for (const order of [
      [screen, job],
      [job, screen],
    ]) {
      const id = await seed(sessionOfPgn(ANALYSED_PGN, { settings: { engine: true, moves: 4 } }));
      // The job only finds a position wanting it once the reader started on it.
      await editSessionCase(id, [e.firstMove(1), e.engineQueued(1, "job-1")], { words: PLAIN_WORDS });
      await Promise.all(order.map((events) => editSessionCase(id, events, { words: PLAIN_WORDS })));
      results.push(await stored());
      await removeAnalysisCases([id]);
    }
    expect(results[0]).toEqual(results[1]);
    expect(results[0]?.positions[0]).toMatchObject({ answer: { kind: "answered", moves: ["e4"] }, engine: { kind: "searched", jobId: "job-1" } });
    expect(results[0]?.positions[0].lines.map((line) => line.san)).toContain("c4");
  });

  it("lands the job's search with the trainer closed, and its echo again is no write", async () => {
    const id = await seed();
    await editSessionCase(id, [e.answer(1, ["e4"]), e.engineQueued(1, "job-1")]);
    expect(await editSessionCase(id, [e.engineSearched(1, "job-1", RESULT)], { now: LATER })).toBeUndefined();
    const updated = (await loadAnalysisCases())[0].updatedAt;
    expect(await editSessionCase(id, [e.engineSearched(1, "job-1", RESULT)], { now: new Date("2026-10-21T00:00:00.000Z") })).toBeUndefined();
    expect((await loadAnalysisCases())[0].updatedAt).toBe(updated);
    expect((await stored())?.positions[0].engine).toEqual({ kind: "searched", jobId: "job-1" });
  });
});

describe("a session's Case", () => {
  it("is made in the one Find Best Move project, its evaluations not written by Analysis (S4)", async () => {
    const record = sessionOfPgn(ANALYSED_PGN);
    const made = await createSessionCase({ record, headers: readPgnTags(ANALYSED_PGN), projectName: "Find Best Move", caseName: "A — Find Best Move", words: PLAIN_WORDS, now: NOW });
    const again = await createSessionCase({ record, headers: {}, projectName: "Find Best Move", caseName: "B — Find Best Move", words: PLAIN_WORDS, now: NOW });
    expect(made?.projectId).toBe(again?.projectId);
    expect((await loadAnalysisProjects()).filter((each) => each.name === "Find Best Move")).toHaveLength(1);
    const kept = (await loadAnalysisCases()).find((each) => each.id === made?.caseId);
    expect(kept?.display.writeEvals).toBe(false);
    expect(kept?.pgn).toBe(sessionPgnOf(record, readPgnTags(ANALYSED_PGN), PLAIN_WORDS));
  });

  it("duplicates as a plain Case: the readable game without the session's tags (S3)", async () => {
    await seed();
    const original = (await loadAnalysisCases())[0];
    const copy = await duplicateSessionAsPlainCase(original, "Alice – Bob (copy)", LATER);
    expect(copy).toBeDefined();
    const tags = readPgnTags(copy!.pgn);
    expect(isSessionTags(tags)).toBe(false);
    expect(Object.keys(tags).some((name) => name.startsWith("FindBestMove"))).toBe(false);
    expect(tags.White).toBe("Alice");
    expect(copy).toMatchObject({ projectId: original.projectId, name: "Alice – Bob (copy)", merges: [] });
    expect(copy!.display.writeEvals).toBe(true);
  });
});
