import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JobRuntime } from "@pgntools/jobs-runtime";
import { manualClock, memoryJobStore, runUntilIdle } from "@pgntools/jobs-runtime/testing";

import { crashingStore, crashThenRecover, engineDeps, runToEnd, testRuntime } from "../../../../test/jobsKit";
import { FakeEngine } from "../../../../views/board/boardTestHarness";
import { addAnalysisCases, loadAnalysisCases, removeAnalysisCases } from "../../../analysisCaseStore";
import { gameCaseOf } from "../../../analysisProjects";
import { sessionBaseTree } from "../../../findBestMoveSession";
import { mainline } from "../../../gameTree";
import { parsePgnTree } from "../../../pgn";
import { registerSubjectRemover } from "../../subjectDeletion";
import { EVALUATE_POSITION_KIND, parseEvaluatePositionResult } from "./core";
import { evaluatePositionKind } from "./kind";

vi.mock("../../../engines/builtin", async (importOriginal) =>
  (await import("../../../../views/board/boardTestHarness")).builtinEnginesMock(importOriginal),
);

/*
  Evaluate Position on the jobs runtime (CTA-238): one search, its result a
  data output, its lines written into the session's Case once — and the
  Case's deletion taking it while unfinished.
*/

const GAME = '[White "Alice"]\n[Black "Bob"]\n\n1. e4 e5 2. Nf3 *';
const base = sessionBaseTree(parsePgnTree(GAME));
const afterE4 = mainline(base)[0];

/** The session's Case — the job's subject. */
const seed = async (id = "session") => {
  await addAnalysisCases([gameCaseOf({ id, projectId: "p", name: "Alice – Bob — Find Best Move" }, base)]);
};

const inputOf = (caseId = "session") => ({
  caseId,
  name: "Evaluate position — Alice – Bob, 1. Black",
  fen: afterE4.fen,
  path: ["e4"],
  label: "1. Black",
  engine: "stockfish-19-lite",
  preset: { id: "given", name: "Given", values: { "Move Overhead": 300 } },
  search: { depth: 12, moveTimeMs: 1000, threads: 1, hashMb: 16, multiPv: 3 },
});

const caseOf = async (id = "session") => (await loadAnalysisCases()).find((record) => record.id === id);

let runtimes: JobRuntime[] = [];
const started = (runtime: JobRuntime) => {
  runtimes.push(runtime);
  runtime.start();
  return runtime;
};

beforeEach(() => {
  FakeEngine.reset();
});

afterEach(async () => {
  for (const runtime of runtimes) await runtime.stop();
  runtimes = [];
  await registerSubjectRemover(undefined);
});

describe("the Evaluate Position kind (CTA-238) on the jobs runtime", () => {
  it("searches the position once — its result a data output, its lines written into the Case at the position", async () => {
    await seed();
    const clock = manualClock();
    const runtime = started(testRuntime([evaluatePositionKind({ engine: engineDeps() })], memoryJobStore(), clock));
    const queued = await runtime.enqueue(EVALUATE_POSITION_KIND, inputOf());
    if (!("id" in queued)) throw new Error("not queued");
    await runToEnd(runtime, clock, queued.id);

    const job = runtime.snapshot()?.find((each) => each.id === queued.id);
    expect(job).toMatchObject({
      status: "done",
      lane: "engine",
      subjects: [{ type: "analysis-case", id: "session" }],
      title: "Evaluate position — Alice – Bob, 1. Black",
    });
    const [result, written] = job!.outputs;
    const read = parseEvaluatePositionResult(result.kind === "data" ? result.value : undefined);
    expect(read?.fen).toBe(afterE4.fen);
    expect(read?.lines[0].depth).toBe(20);
    expect(written).toMatchObject({ kind: "entity", ref: { type: "analysis-case", id: "session" } });

    const record = await caseOf();
    expect(record?.merges).toEqual([queued.id]);
    // The answering engine's line — the position's first legal move, +0.20 for Black, White's −0.20 — hung after 1. e4.
    expect(record?.pgn).toContain("1. e4 e5 (1... Nc6 { [%eval -0.20,20] }) 2. Nf3");
    // Its own engine, the preset it was given, MultiPV the lines asked for, terminated with the run.
    expect(FakeEngine.latest().setOptions).toContainEqual(["Move Overhead", 300]);
    expect(FakeEngine.latest().setOptions).toContainEqual(["MultiPV", 3]);
    expect(FakeEngine.latest().terminated).toBe(true);
  });

  it("writes its lines into the Case once, and loses none, when the tab dies between any two writes", async () => {
    const kinds = [evaluatePositionKind({ engine: engineDeps() })];
    await seed();
    const counting = crashingStore(memoryJobStore(), Number.POSITIVE_INFINITY);
    const clock = manualClock();
    const whole = started(testRuntime(kinds, counting.store, clock));
    const reference = await whole.enqueue(EVALUATE_POSITION_KIND, inputOf());
    if (!("id" in reference)) throw new Error("not queued");
    await runToEnd(whole, clock, reference.id);
    const referencePgn = (await caseOf())?.pgn;
    const total = counting.writes();

    for (let after = 1; after < total; after += 1) {
      await removeAnalysisCases(["session"]);
      await seed();
      const { job, crashed } = await crashThenRecover({ kinds, inner: memoryJobStore(), after, enqueue: (runtime) => runtime.enqueue(EVALUATE_POSITION_KIND, inputOf()) });
      expect(crashed, `crash after write ${after}`).toBe(true);
      if (job === undefined) continue;
      expect(job.status, `crash after write ${after}`).toBe("done");
      const record = await caseOf();
      expect(record?.merges, `crash after write ${after}`).toEqual([job.id]);
      expect(record?.pgn, `crash after write ${after}`).toBe(referencePgn);
    }
  }, 120_000);

  it("is removed with its Case while unfinished — the deletion rule", async () => {
    await seed("gone");
    const clock = manualClock();
    const runtime = started(testRuntime([evaluatePositionKind({ engine: engineDeps() })], memoryJobStore(), clock));
    await registerSubjectRemover((subjects) => runtime.removeUnfinishedOf(subjects));
    const queued = await runtime.enqueue(EVALUATE_POSITION_KIND, inputOf("gone"), { runAfter: new Date(clock.now().getTime() + 3_600_000) });
    if (!("id" in queued)) throw new Error("not queued");
    await runUntilIdle(runtime);
    expect(runtime.snapshot()).toHaveLength(1);
    await removeAnalysisCases(["gone"]);
    await runUntilIdle(runtime);
    expect(runtime.snapshot()).toEqual([]);
  });

  it("fails `target` when the Case is gone before its lines are written", async () => {
    const clock = manualClock();
    const runtime = started(testRuntime([evaluatePositionKind({ engine: engineDeps() })], memoryJobStore(), clock));
    const queued = await runtime.enqueue(EVALUATE_POSITION_KIND, inputOf("never"));
    if (!("id" in queued)) throw new Error("not queued");
    await runToEnd(runtime, clock, queued.id);
    expect(runtime.snapshot()?.find((each) => each.id === queued.id)).toMatchObject({ status: "failed", error: { code: "target" } });
  });
});
