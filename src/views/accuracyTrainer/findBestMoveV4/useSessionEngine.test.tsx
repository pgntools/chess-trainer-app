import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useCallback, useState } from "react";

import { addAnalysisCases } from "../../../lib/analysisCaseStore";
import { gameCaseOf } from "../../../lib/analysisProjects";
import type { FindBestMoveRecord } from "../../../lib/findBestMove/model";
import { reduceSession, sessionEvents as e, type SessionEvent } from "../../../lib/findBestMove/reducer";
import { sessionTreeOf } from "../../../lib/findBestMove/store";
import { EVALUATE_POSITION_KIND } from "../../../lib/jobs/kinds/evaluatePosition/core";
import { jobRuntime } from "../../../lib/jobs/runtime";
import { PLAIN_WORDS, START_FEN, applied, sessionOfPgn } from "../../../test/findBestMoveKit";
import { FakeEngine } from "../../board/boardTestHarness";

vi.mock("../../../lib/engines/builtin", async (importOriginal) =>
  (await import("../../board/boardTestHarness")).builtinEnginesMock(importOriginal),
);

// The page's job runtime, its engine kinds answering every search at once.
vi.mock("../../../lib/jobs/kinds", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../lib/jobs/kinds")>();
  const { engineDeps } = await import("../../../test/answeringEngine");
  return { ...actual, jobKinds: () => actual.jobKinds({ engine: engineDeps() }) };
});

import { useSessionEngine } from "./useSessionEngine";

/*
  The engine unit (CTA-244): every position that wants its engine queued
  once — the session's Case its subject, its key and MultiPV N its input —
  then what became of each job echoed into the record: its search, or its
  failure (failed, cancelled or gone).
*/

/** A game with no analysis: the engine on, every position needs it. */
const GAME = '[White "Carol"]\n[Black "Dan"]\n\n1. e4 e5 2. Nf3 *';

/**
 * The unit over a record of its own, which `dispatch` reduces — as the
 * session's Case would, without the store — every event kept.
 */
const mount = (initial: FindBestMoveRecord) => {
  const events: SessionEvent[] = [];
  const hook = renderHook(() => {
    const [record, setRecord] = useState(initial);
    const dispatch = useCallback(async (next: readonly SessionEvent[]) => {
      events.push(...next);
      setRecord((current) => reduceSession(current, next));
      return undefined;
    }, []);
    const engine = useSessionEngine({ caseId: "c", record, dispatch, titleOf: (key) => `Evaluate ${key}`, labelOf: (key) => `move ${key}` });
    return { record, dispatch, ...engine };
  });
  return { ...hook, events };
};

/** The session's Case in the store, where the job writes its search. */
const seed = (record: FindBestMoveRecord) => addAnalysisCases([gameCaseOf({ id: "c", projectId: "p", name: "Carol – Dan" }, sessionTreeOf(record, {}, PLAIN_WORDS))]);

const jobsOfKind = () => (jobRuntime().snapshot() ?? []).filter((job) => job.kind === EVALUATE_POSITION_KIND);

beforeEach(() => {
  FakeEngine.reset();
});

describe("useSessionEngine", () => {
  it("queues a wanted position's search once, then echoes its result into the record", async () => {
    const record = applied(sessionOfPgn(GAME, { side: "w", settings: { engine: true, moves: 3 } }), [e.firstMove(1)]);
    await seed(record);
    const { result, events, rerender } = mount(record);
    expect(result.current.searchingAt(1)).toBe(true);

    await waitFor(() => expect(jobsOfKind()).toHaveLength(1));
    const [job] = jobsOfKind();
    expect(job.title).toBe("Evaluate 1");
    expect(job.subjects).toEqual([{ type: "analysis-case", id: "c" }]);
    expect(job.input).toMatchObject({ version: 2, caseId: "c", key: 1, fen: START_FEN, label: "move 1", search: { multiPv: 3 } });
    // Queued, said — the answering engine is done before a render could show it.
    await waitFor(() => expect(events).toContainEqual(e.engineQueued(1, job.id)));

    // Re-rendered meanwhile: nothing queued twice.
    rerender();
    rerender();

    await waitFor(() => expect(result.current.record.positions.get(1)?.engine).toEqual({ kind: "searched", jobId: job.id }), { timeout: 10_000 });
    expect(result.current.record.positions.get(1)?.lines.length).toBeGreaterThan(0);
    expect(result.current.searchingAt(1)).toBe(false);
    expect(jobsOfKind()).toHaveLength(1);
    expect(events.filter((event) => event.type === "engineQueued")).toHaveLength(1);
  });

  it("asks nothing for a position that does not want its engine", async () => {
    const record = sessionOfPgn(GAME, { side: "w", settings: { engine: true, moves: 3 } });
    const { result, events } = mount(record);
    await waitFor(() => expect(jobRuntime().snapshot()).toBeDefined());
    expect(jobsOfKind()).toEqual([]);
    expect(events).toEqual([]);
    expect(result.current.searchingAt(1)).toBe(false);
  });

  it("fails a position whose job is gone — the runtime has read its jobs and holds none of it", async () => {
    const record = applied(sessionOfPgn(GAME, { side: "w", settings: { engine: true, moves: 3 } }), [e.firstMove(1), e.engineQueued(1, "nojob")]);
    const { result } = mount(record);
    await waitFor(() => expect(result.current.record.positions.get(1)?.engine).toEqual({ kind: "failed", jobId: "nojob" }));
    expect(jobsOfKind()).toEqual([]);
  });

  it("fails a position whose job was cancelled", async () => {
    const record = applied(sessionOfPgn(GAME, { side: "w", settings: { engine: true, moves: 3 } }), [e.firstMove(1)]);
    await seed(record);
    // Queued far off, so it is still waiting when cancelled.
    const queued = await jobRuntime().enqueue(
      EVALUATE_POSITION_KIND,
      { version: 2, caseId: "c", key: 1, name: "x", fen: START_FEN, label: "", engine: "stockfish-19-lite", preset: null, search: { depth: 12, moveTimeMs: 1000, threads: 1, hashMb: 16, multiPv: 3 } },
      { runAfter: new Date(Date.now() + 3_600_000) },
    );
    if (!("id" in queued)) throw new Error("not queued");
    const { result } = mount(applied(record, [e.engineQueued(1, queued.id)]));
    await waitFor(() => expect(jobsOfKind().map((job) => job.id)).toContain(queued.id));
    expect(await jobRuntime().cancel(queued.id)).toBeUndefined();
    await waitFor(() => expect(result.current.record.positions.get(1)?.engine).toEqual({ kind: "failed", jobId: queued.id }));
  });

  it("queues a new search for a position whose job is gone once Evaluate again wants it — and fails it again when that one goes too (CTA-250)", async () => {
    const answered = applied(sessionOfPgn(GAME, { side: "w", settings: { engine: true, moves: 3 } }), [e.answer(1, ["e4"]), e.engineQueued(1, "nojob")]);
    await seed(answered);
    const { result, events } = mount(answered);
    await waitFor(() => expect(result.current.record.positions.get(1)?.engine).toEqual({ kind: "failed", jobId: "nojob" }));
    expect(jobsOfKind()).toEqual([]);

    // Evaluate again: the position wanted once more, its search queued — a new job, the in-flight set no bar to it.
    await act(() => result.current.dispatch([e.engineRetry(1)]));
    await waitFor(() => expect(jobsOfKind()).toHaveLength(1));
    const [job] = jobsOfKind();
    expect(job.input).toMatchObject({ caseId: "c", key: 1, search: { multiPv: 3 } });
    await waitFor(() => expect(result.current.record.positions.get(1)?.engine).toEqual({ kind: "searched", jobId: job.id }), { timeout: 10_000 });
    expect(result.current.record.positions.get(1)?.answer).toEqual({ kind: "answered", moves: ["e4"] });
    expect(events.filter((event) => event.type === "engineQueued")).toHaveLength(1);
  });

  it("fails a re-queued search whose job is deleted, so it is offered again (CTA-250)", async () => {
    const record = applied(sessionOfPgn(GAME, { side: "w", settings: { engine: true, moves: 3 } }), [e.answer(1, ["e4"]), e.engineFailed(1)]);
    await seed(record);
    // Queued far off, so it is still waiting when deleted.
    const queued = await jobRuntime().enqueue(
      EVALUATE_POSITION_KIND,
      { version: 2, caseId: "c", key: 1, name: "x", fen: START_FEN, label: "", engine: "stockfish-19-lite", preset: null, search: { depth: 12, moveTimeMs: 1000, threads: 1, hashMb: 16, multiPv: 3 } },
      { runAfter: new Date(Date.now() + 3_600_000) },
    );
    if (!("id" in queued)) throw new Error("not queued");
    const { result } = mount(applied(record, [e.engineRetry(1), e.engineQueued(1, queued.id)]));
    await waitFor(() => expect(jobsOfKind().map((job) => job.id)).toContain(queued.id));
    expect(result.current.searchingAt(1)).toBe(true);
    expect(await jobRuntime().remove([queued.id])).toBeUndefined();
    await waitFor(() => expect(result.current.record.positions.get(1)?.engine).toEqual({ kind: "failed", jobId: queued.id }));
  });
});
