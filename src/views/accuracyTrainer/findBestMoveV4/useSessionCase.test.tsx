import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { addAnalysisCases, loadAnalysisCases } from "../../../lib/analysisCaseStore";
import { gameCaseOf } from "../../../lib/analysisProjects";
import { sessionEvents as e } from "../../../lib/findBestMove/reducer";
import { sessionTreeOf } from "../../../lib/findBestMove/store";
import { parsePgnTree, readPgnTags } from "../../../lib/pgn";
import { ANALYSED_PGN, PLAIN_WORDS, sessionOfPgn } from "../../../test/findBestMoveKit";
import { useSessionCase } from "./useSessionCase";

/*
  The persistence unit (CTA-244): a session Case read from the store's
  snapshot and its tags, every action written through editSessionCase — the
  record always the store's, a refusal said and the record left as it was.
*/

const seedSession = () =>
  addAnalysisCases([gameCaseOf({ id: "s", projectId: "p", name: "Session" }, sessionTreeOf(sessionOfPgn(ANALYSED_PGN), readPgnTags(ANALYSED_PGN), PLAIN_WORDS))]);

const read = (caseId: string) => renderHook(() => useSessionCase(caseId, PLAIN_WORDS));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useSessionCase", () => {
  it("is loading until the Cases are read, then the session its Case's tags hold", async () => {
    await seedSession();
    const { result } = read("s");
    await waitFor(() => expect(result.current.state.kind).toBe("session"));
    const { state } = result.current;
    if (state.kind !== "session") throw new Error("not a session");
    expect(state.record.keys).toEqual([1, 2, 3]);
    expect(state.issues).toEqual([]);
    expect(state.caseRecord.id).toBe("s");
  });

  it("says a Case not there and one that holds no session apart", async () => {
    await addAnalysisCases([gameCaseOf({ id: "plain", projectId: "p", name: "" }, parsePgnTree(ANALYSED_PGN))]);
    const missing = read("nobody");
    await waitFor(() => expect(missing.result.current.state.kind).toBe("missing"));
    expect(read("plain").result.current.state.kind).toBe("not-a-session");
  });

  it("writes an action's events through the one writer — and the record is the store's once it lands", async () => {
    await seedSession();
    const { result } = read("s");
    await waitFor(() => expect(result.current.state.kind).toBe("session"));
    let problem: unknown = "unset";
    await act(async () => {
      problem = await result.current.dispatch([e.answer(1, ["e4"]), e.next()]);
    });
    expect(problem).toBeUndefined();
    const { state } = result.current;
    if (state.kind !== "session") throw new Error("not a session");
    expect(state.record.current).toBe(2);
    expect(state.record.positions.get(1)?.answer).toEqual({ kind: "answered", moves: ["e4"] });
    expect(result.current.writeProblem).toBeUndefined();
  });

  it("writes nothing for no events", async () => {
    await seedSession();
    const { result } = read("s");
    await waitFor(() => expect(result.current.state.kind).toBe("session"));
    const before = (await loadAnalysisCases())[0];
    await act(async () => {
      await result.current.dispatch([]);
    });
    expect((await loadAnalysisCases())[0]).toBe(before);
  });

  it("says a refused write, and keeps the record as it was", async () => {
    await seedSession();
    const { result } = read("s");
    await waitFor(() => expect(result.current.state.kind).toBe("session"));
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    await act(async () => {
      await result.current.dispatch([e.pass(1), e.next()]);
    });
    expect(result.current.writeProblem).toBe("storage");
    const { state } = result.current;
    if (state.kind !== "session") throw new Error("not a session");
    expect(state.record.current).toBe(1);
    expect(state.record.positions.get(1)?.answer.kind).toBe("open");
  });
});
