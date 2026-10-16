import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JobRuntime } from "@pgntools/jobs-runtime";
import { manualClock, memoryJobStore, memoryLock, runUntilIdle } from "@pgntools/jobs-runtime/testing";

import { AnsweringEngine, crashingStore, crashThenRecover, runToEnd, engineDeps, legalMove, testRuntime } from "../../../../test/jobsKit";
import { FakeEngine } from "../../../../views/board/boardTestHarness";
import { loadCaseLinks } from "../../../analysisCaseLinkStore";
import { addAnalysisCases, analysisCasesSnapshot, loadAnalysisCases, removeAnalysisCases } from "../../../analysisCaseStore";
import { createAnalysisProject, removeAnalysisProject } from "../../../analysisProjectStore";
import { gameCaseOf } from "../../../analysisProjects";
import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS, type ComputerAnalysisOptions } from "../../../computerAnalysis";
import { parsePgnTree } from "../../../pgn";
import { EngineSessionError } from "../../engineSession";
import { registerSubjectRemover } from "../../subjectDeletion";
import { EngineServerUnreachableError } from "../engineRuns";
import { COMPUTER_ANALYSIS_KIND, type ComputerAnalysisTarget } from "./core";
import { classifyComputerAnalysisError, computerAnalysisKind, readComputerAnalysisJob } from "./kind";

vi.mock("../../../engines/builtin", async (importOriginal) =>
  (await import("../../../../views/board/boardTestHarness")).builtinEnginesMock(importOriginal),
);

const PGN = '[White "Alice"]\n[Black "Bob"]\n\n1. e4 e5 2. Nf3 Nc6 *';

/** A Project and a Game Case in it — the job's source. */
const seed = async (caseId = "case") => {
  const project = (await createAnalysisProject("Openings", null))!;
  await addAnalysisCases([gameCaseOf({ id: caseId, projectId: project.id, name: "" }, parsePgnTree(PGN))]);
  return project.id;
};

const inputOf = (projectId: string, target: ComputerAnalysisTarget, options: Partial<ComputerAnalysisOptions> = {}, caseId = "case") => ({
  source: { projectId, caseId, name: "Alice – Bob", pgn: PGN },
  options: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, outputs: ["light"], ...options },
  preset: { id: "given", name: "Given", values: { "Move Overhead": 300 } },
  target,
});

let runtimes: JobRuntime[] = [];
const started = (runtime: JobRuntime) => {
  runtimes.push(runtime);
  runtime.start();
  return runtime;
};

/** Run to the end: settle, and move the clock on while the job is not finished. */
const finish = runToEnd;

beforeEach(() => {
  FakeEngine.reset();
});

afterEach(async () => {
  for (const runtime of runtimes) await runtime.stop();
  runtimes = [];
  await registerSubjectRemover(undefined);
});

describe("the computer-analysis kind (CTA-221) on the jobs runtime", () => {
  it("searches every position, then saves each ticked variant as a new Game Case — its id the job's — linked from the source", async () => {
    const projectId = await seed();
    const clock = manualClock();
    const runtime = started(testRuntime([computerAnalysisKind({ engine: engineDeps() })], memoryJobStore(), clock));
    const queued = await runtime.enqueue(COMPUTER_ANALYSIS_KIND, inputOf(projectId, { kind: "project", projectId }, { outputs: ["light", "full"] }));
    if (!("id" in queued)) throw new Error("not queued");
    await finish(runtime, clock, queued.id);

    const job = runtime.snapshot()?.find((each) => each.id === queued.id);
    expect(job).toMatchObject({ status: "done", subjects: [{ type: "analysis-case", id: "case" }], title: "Alice – Bob" });
    expect(job?.outputs.map((output) => (output.kind === "entity" ? output.ref.id : undefined))).toEqual([`${queued.id}:light`, `${queued.id}:full`]);
    const cases = new Map((await loadAnalysisCases()).map((record) => [record.id, record]));
    expect(cases.get(`${queued.id}:light`)).toMatchObject({ type: "game", projectId, name: "Alice – Bob - computer analysis (light)" });
    expect(cases.get(`${queued.id}:light`)?.pgn).toContain("[%eval");
    expect(cases.get(`${queued.id}:light`)?.pgn).toContain('[Annotator "Stockfish 19 Lite [light]"]');
    expect((await loadCaseLinks()).map(({ fromId, toId }) => [fromId, toId])).toEqual([
      ["case", `${queued.id}:light`],
      ["case", `${queued.id}:full`],
    ]);
    // The preset it was given, never the one selected now; its engine terminated with the run.
    const engine = FakeEngine.latest();
    expect(engine.setOptions).toContainEqual(["Move Overhead", 300]);
    expect(engine.terminated).toBe(true);
    // The state names the engine that ran it — the annotator a merge into an open board uses.
    expect(readComputerAnalysisJob(job!)?.state?.engine?.name).toBe(engine.descriptor?.name ?? "Stockfish 19 Lite");
  });

  it("merges the one variant into the source Case — once, by the job's id — and fails `target` when the Case or the other Project has gone", async () => {
    const projectId = await seed();
    const clock = manualClock();
    const runtime = started(testRuntime([computerAnalysisKind({ engine: engineDeps() })], memoryJobStore(), clock));
    const merged = await runtime.enqueue(COMPUTER_ANALYSIS_KIND, inputOf(projectId, { kind: "case" }));
    if (!("id" in merged)) throw new Error("not queued");
    await finish(runtime, clock, merged.id);
    expect(runtime.snapshot()?.find((job) => job.id === merged.id)?.status).toBe("done");
    const record = (await loadAnalysisCases()).find((each) => each.id === "case");
    expect(record?.merges).toEqual([merged.id]);
    expect(record?.pgn).toContain("[%eval");

    const other = (await createAnalysisProject("Elsewhere", null))!;
    await removeAnalysisProject(other.id);
    const gone = await runtime.enqueue(COMPUTER_ANALYSIS_KIND, inputOf(projectId, { kind: "other", projectId: other.id }));
    if (!("id" in gone)) throw new Error("not queued");
    await finish(runtime, clock, gone.id);
    expect(runtime.snapshot()?.find((job) => job.id === gone.id)).toMatchObject({ status: "failed", error: { code: "target", retryable: false } });
  });

  it("refuses an input with nothing to run — no variant, or two merged into the Case", async () => {
    const runtime = testRuntime([computerAnalysisKind({ engine: engineDeps() })], memoryJobStore(), manualClock());
    expect(await runtime.enqueue(COMPUTER_ANALYSIS_KIND, inputOf("p", { kind: "project", projectId: "p" }, { outputs: [] }))).toEqual({ problem: "invalid" });
    expect(await runtime.enqueue(COMPUTER_ANALYSIS_KIND, inputOf("p", { kind: "case" }, { outputs: ["light", "full"] }))).toEqual({ problem: "invalid" });
  });

  it("retries an engine server gone away, and fails every other engine error at once", () => {
    expect(classifyComputerAnalysisError(new EngineServerUnreachableError("silence"))).toMatchObject({ code: "engine", retryable: true });
    expect(classifyComputerAnalysisError(new EngineSessionError("no-line"))).toMatchObject({ code: "engine", retryable: false });
    expect(classifyComputerAnalysisError(Object.assign(new Error("slow"), { name: "TimeoutError" }))).toMatchObject({ code: "engine", retryable: false });
  });

  it("makes no Case twice, and loses none, when the tab dies between any two writes", async () => {
    const kinds = [computerAnalysisKind({ engine: engineDeps() })];
    // An uncrashed run, to count its writes.
    const projectId = await seed();
    const counting = crashingStore(memoryJobStore(), Number.POSITIVE_INFINITY);
    const clock = manualClock();
    const whole = started(testRuntime(kinds, counting.store, clock));
    const reference = await whole.enqueue(COMPUTER_ANALYSIS_KIND, inputOf(projectId, { kind: "project", projectId }, { outputs: ["light", "full"] }));
    if (!("id" in reference)) throw new Error("not queued");
    await finish(whole, clock, reference.id);
    expect(whole.snapshot()?.find((job) => job.id === reference.id)?.status).toBe("done");
    const total = counting.writes();
    expect(total).toBeGreaterThan(5);

    for (let after = 1; after < total; after += 1) {
      const target = (await createAnalysisProject(`Run ${after}`, null))!;
      const { job, crashed } = await crashThenRecover({
        kinds,
        inner: memoryJobStore(),
        after,
        enqueue: (runtime) =>
          runtime.enqueue(COMPUTER_ANALYSIS_KIND, inputOf(projectId, { kind: "other", projectId: target.id }, { outputs: ["light", "full"] })),
      });
      expect(crashed, `crash after write ${after}`).toBe(true);
      if (job === undefined) continue;
      expect(job.status, `crash after write ${after}`).toBe("done");
      const made = (await loadAnalysisCases()).filter((record) => record.projectId === target.id);
      expect(made.map((record) => record.id).sort(), `crash after write ${after}`).toEqual([`${job.id}:full`, `${job.id}:light`]);
      const links = (await loadCaseLinks()).filter((link) => link.toId.startsWith(`${job.id}:`));
      expect(links, `crash after write ${after}`).toHaveLength(2);
    }
  }, 120_000);
});

describe("any tab controls any job (CTA-221)", () => {
  it("pauses a job running in another tab, which stops its engine — and resumes it from its checkpoint", async () => {
    const projectId = await seed();
    const clock = manualClock();
    const store = memoryJobStore();
    const lock = memoryLock();
    // The tab that runs the job (it took the lock first), and another one.
    const kinds = [computerAnalysisKind({ engine: engineDeps(() => new FakeEngine()) })];
    const runner = started(testRuntime(kinds, store, clock, lock));
    await runUntilIdle(runner);
    const other = started(testRuntime(kinds, store, clock, lock));
    const queued = await other.enqueue(COMPUTER_ANALYSIS_KIND, inputOf(projectId, { kind: "project", projectId }));
    if (!("id" in queued)) throw new Error("not queued");

    // The running tab searches the first position; the engine answers it, and is searching the second.
    await vi.waitFor(() => expect(FakeEngine.latest().searches).toHaveLength(1));
    const engine = FakeEngine.latest();
    const first = engine.searches[0];
    engine.say({ fen: first, depth: 20, multipv: 1, positionEvaluation: "20", pv: legalMove(first) });
    engine.say({ fen: first, bestMove: legalMove(first) });
    await vi.waitFor(() => expect(engine.searches).toHaveLength(2));
    await runUntilIdle(other);
    expect(other.snapshot()?.find((job) => job.id === queued.id)).toMatchObject({ status: "running", progress: { done: 1 } });

    // The other tab pauses it: the running tab stops its search and its engine.
    expect(await other.pause(queued.id)).toBeUndefined();
    await runUntilIdle(runner);
    await vi.waitFor(() => expect(other.snapshot()?.find((job) => job.id === queued.id)?.status).toBe("paused"));
    expect(engine.terminated).toBe(true);
    expect(other.snapshot()?.find((job) => job.id === queued.id)?.progress.done).toBe(1);

    // Resumed from the other tab: the running tab goes on from the second position — the first is never searched again.
    FakeEngine.reset();
    expect(await other.resume(queued.id)).toBeUndefined();
    await vi.waitFor(() => expect(FakeEngine.instances.length).toBeGreaterThan(0));
    await vi.waitFor(() => expect(FakeEngine.latest().searches).toHaveLength(1));
    expect(FakeEngine.latest().searches[0]).not.toBe(first);
  });
});

describe("the deletion rule (CTA-221)", () => {
  it("takes a Case's unfinished jobs with it, a running one aborted, and keeps its finished ones", async () => {
    const projectId = await seed();
    const clock = manualClock();
    const store = memoryJobStore();
    const kinds = [computerAnalysisKind({ engine: engineDeps(() => new AnsweringEngine()) })];
    const runtime = started(testRuntime(kinds, store, clock));
    await registerSubjectRemover((subjects) => runtime.removeUnfinishedOf(subjects));
    const done = await runtime.enqueue(COMPUTER_ANALYSIS_KIND, inputOf(projectId, { kind: "project", projectId }));
    if (!("id" in done)) throw new Error("not queued");
    await finish(runtime, clock, done.id);
    const waiting = await runtime.enqueue(COMPUTER_ANALYSIS_KIND, inputOf(projectId, { kind: "project", projectId }), { runAfter: new Date(clock.now().getTime() + 3_600_000) });
    if (!("id" in waiting)) throw new Error("not queued");
    await runUntilIdle(runtime);

    await removeAnalysisCases(["case"]);
    await runUntilIdle(runtime);
    expect(runtime.snapshot()?.map((job) => job.id)).toEqual([done.id]);
    expect(analysisCasesSnapshot()?.some((record) => record.id === "case")).toBe(false);
  });
});
