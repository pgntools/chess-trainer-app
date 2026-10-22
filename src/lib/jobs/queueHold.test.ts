import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JobRuntime } from "@pgntools/jobs-runtime";
import { manualClock, memoryJobStore, memoryLock, runUntilIdle } from "@pgntools/jobs-runtime/testing";

import { AnsweringEngine, crashingStore, engineDeps, legalMove, runToEnd, testRuntime } from "../../test/jobsKit";
import { FakeEngine } from "../../views/board/boardTestHarness";
import { loadCaseLinks } from "../analysisCaseLinkStore";
import { addAnalysisCases, loadAnalysisCases } from "../analysisCaseStore";
import { createAnalysisProject } from "../analysisProjectStore";
import { gameCaseOf } from "../analysisProjects";
import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS } from "../computerAnalysis";
import type { SearchOptions } from "../engineTypes";
import { parsePgnTree } from "../pgn";
import { COMPUTER_ANALYSIS_KIND, type ComputerAnalysisTarget } from "./kinds/computerAnalysis/core";
import { computerAnalysisKind } from "./kinds/computerAnalysis/kind";
import { jobRuntime, startJobRuntime, stopJobRuntime } from "./runtime";
import { registerSubjectRemover } from "./subjectDeletion";

vi.mock("../engines/builtin", async (importOriginal) => (await import("../../views/board/boardTestHarness")).builtinEnginesMock(importOriginal));

/*
  **The queue hold** (CTA-258) — the runtime's `hold()` / `release()` /
  `held()` (JBR-3) as the app's jobs meet it: a running engine job stopped at
  its checkpoint and handed back to the queue, nothing queued starting, a job
  queued meanwhile waiting, Resume queue going on from the checkpoint and
  leaving a job paused on its own paused; the hold kept across a reload and
  seen by every tab; and the crash-between-writes kit run through a hold.
*/

const PGN = '[White "Alice"]\n[Black "Bob"]\n\n1. e4 e5 2. Nf3 Nc6 *';

const seed = async () => {
  const project = (await createAnalysisProject("Openings", null))!;
  await addAnalysisCases([gameCaseOf({ id: "case", projectId: project.id, name: "" }, parsePgnTree(PGN))]);
  return project.id;
};

const inputOf = (projectId: string, target: ComputerAnalysisTarget = { kind: "project", projectId }) => ({
  source: { projectId, caseId: "case", name: "Alice – Bob", pgn: PGN },
  options: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, outputs: ["light"] },
  preset: { id: "given", name: "Given", values: {} },
  target,
});

const idOf = (queued: { id: string } | { problem: string }) => {
  if (!("id" in queued)) throw new Error(`not queued: ${queued.problem}`);
  return queued.id;
};

const statusOf = (runtime: JobRuntime, id: string) => runtime.snapshot()?.find((job) => job.id === id)?.status;
const jobOf = (runtime: JobRuntime, id: string) => runtime.snapshot()?.find((job) => job.id === id);

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

describe("Pause queue — the runtime's queue hold (CTA-258)", () => {
  it("stops the running job at its checkpoint, starts nothing queued — nor a job queued while held — and Resume queue goes on from the checkpoint", async () => {
    const projectId = await seed();
    const clock = manualClock();
    const store = memoryJobStore();
    const lock = memoryLock();
    const kinds = [computerAnalysisKind({ engine: engineDeps(() => new FakeEngine()) })];
    // The tab running the jobs (it took the lock first), and another one, where the reader presses Pause queue.
    const runner = started(testRuntime(kinds, store, clock, lock));
    await runUntilIdle(runner);
    const other = started(testRuntime(kinds, store, clock, lock));
    const first = idOf(await other.enqueue(COMPUTER_ANALYSIS_KIND, inputOf(projectId)));

    // The first position answered; the engine is searching the second.
    await vi.waitFor(() => expect(FakeEngine.latest().searches).toHaveLength(1));
    const engine = FakeEngine.latest();
    const searched = engine.searches[0];
    engine.say({ fen: searched, depth: 20, multipv: 1, positionEvaluation: "20", pv: legalMove(searched) });
    engine.say({ fen: searched, bestMove: legalMove(searched) });
    await vi.waitFor(() => expect(engine.searches).toHaveLength(2));
    const second = idOf(await other.enqueue(COMPUTER_ANALYSIS_KIND, inputOf(projectId)));
    await runUntilIdle(other);
    expect(jobOf(other, first)).toMatchObject({ status: "running", progress: { done: 1 } });
    expect(other.held()).toBe(false);

    // Pause queue: the running job is handed back to the queue, its engine stopped, its checkpoint kept.
    expect(await other.hold()).toBeUndefined();
    await runUntilIdle(runner);
    await vi.waitFor(() => expect(statusOf(other, first)).toBe("queued"));
    expect(engine.terminated).toBe(true);
    const held = jobOf(other, first)!;
    expect(held.progress.done).toBe(1);
    expect(held.attempts.at(-1)?.outcome).toBe("held");
    expect(held.history.map((event) => event.type)).toContain("held");
    expect(other.held()).toBe(true);
    await runUntilIdle(runner);
    expect(runner.held()).toBe(true);

    // Nothing starts while held — neither the job queued before, nor one queued now.
    const third = idOf(await other.enqueue(COMPUTER_ANALYSIS_KIND, inputOf(projectId)));
    const engines = FakeEngine.instances.length;
    for (let round = 0; round < 5; round += 1) {
      await clock.advance(10_000);
      await runUntilIdle(runner);
      await runUntilIdle(other);
    }
    expect(FakeEngine.instances).toHaveLength(engines);
    expect([first, second, third].map((id) => statusOf(other, id))).toEqual(["queued", "queued", "queued"]);

    // Resume queue: the stopped job goes on first, from its second position — the first is never searched again.
    FakeEngine.reset();
    expect(await other.release()).toBeUndefined();
    await vi.waitFor(() => expect(FakeEngine.instances.length).toBeGreaterThan(0));
    await vi.waitFor(() => expect(FakeEngine.latest().searches).toHaveLength(1));
    expect(FakeEngine.latest().searches[0]).not.toBe(searched);
    await runUntilIdle(other);
    expect(statusOf(other, first)).toBe("running");
    expect([second, third].map((id) => statusOf(other, id))).toEqual(["queued", "queued"]);
    expect(other.held()).toBe(false);
  });

  it("leaves a job paused on its own paused through Resume queue, and keeps the rows' commands working while held", async () => {
    const projectId = await seed();
    const clock = manualClock();
    const kinds = [computerAnalysisKind({ engine: engineDeps(() => new AnsweringEngine()) })];
    const runtime = testRuntime(kinds, memoryJobStore(), clock);
    // Paused by the reader before the hold.
    const paused = idOf(await runtime.enqueue(COMPUTER_ANALYSIS_KIND, inputOf(projectId)));
    expect(await runtime.pause(paused)).toBeUndefined();
    expect(await runtime.hold()).toBeUndefined();
    started(runtime);
    await runUntilIdle(runtime);
    expect(runtime.held()).toBe(true);

    // Under the hold: one paused and resumed — back in the queue, waiting — one cancelled.
    const waiting = idOf(await runtime.enqueue(COMPUTER_ANALYSIS_KIND, inputOf(projectId)));
    const cancelled = idOf(await runtime.enqueue(COMPUTER_ANALYSIS_KIND, inputOf(projectId)));
    expect(await runtime.pause(waiting)).toBeUndefined();
    await runUntilIdle(runtime);
    expect(statusOf(runtime, waiting)).toBe("paused");
    expect(await runtime.resume(waiting)).toBeUndefined();
    expect(await runtime.cancel(cancelled)).toBeUndefined();
    await clock.advance(10_000);
    await runUntilIdle(runtime);
    expect(statusOf(runtime, waiting)).toBe("queued");
    expect(statusOf(runtime, cancelled)).toBe("cancelled");
    expect(FakeEngine.instances).toHaveLength(0);

    // Resume queue: the waiting job runs to its end; the one the reader paused stays paused.
    expect(await runtime.release()).toBeUndefined();
    await runToEnd(runtime, clock, waiting);
    expect(statusOf(runtime, waiting)).toBe("done");
    expect(statusOf(runtime, paused)).toBe("paused");
  });

  it("is kept across a reload and read by every tab — the page's runtime over IndexedDB", async () => {
    startJobRuntime();
    await vi.waitFor(() => expect(jobRuntime().held()).toBe(false));
    expect(await jobRuntime().hold()).toBeUndefined();
    await vi.waitFor(() => expect(jobRuntime().held()).toBe(true));

    // The page reloaded: a new runtime over the same database reads the queue held.
    await stopJobRuntime();
    startJobRuntime();
    await vi.waitFor(() => expect(jobRuntime().held()).toBe(true));
    expect(await jobRuntime().release()).toBeUndefined();
    await stopJobRuntime();
    startJobRuntime();
    await vi.waitFor(() => expect(jobRuntime().held()).toBe(false));
  });

  it("tells every subscriber when the hold changes", async () => {
    const store = memoryJobStore();
    const lock = memoryLock();
    const clock = manualClock();
    const one = started(testRuntime([], store, clock, lock));
    const two = started(testRuntime([], store, clock, lock));
    await runUntilIdle(one);
    await runUntilIdle(two);
    const heard: (boolean | undefined)[] = [];
    const unsubscribe = two.subscribe(() => heard.push(two.held()));
    expect(await one.hold()).toBeUndefined();
    await vi.waitFor(() => expect(two.held()).toBe(true));
    expect(heard).toContain(true);
    expect(await one.release()).toBeUndefined();
    await vi.waitFor(() => expect(two.held()).toBe(false));
    unsubscribe();
  });
});

/**
 * An engine that holds the queue when the job reaches its second position —
 * the reader pressing Pause queue mid-run — once per run of the test.
 */
const holdingEngines = () => {
  let searches = 0;
  let holder: JobRuntime | undefined;
  class HoldingEngine extends AnsweringEngine {
    override search(fen: string, options: SearchOptions) {
      searches += 1;
      if (searches === 2) void holder?.hold();
      super.search(fen, options);
    }
  }
  return {
    deps: engineDeps(() => new HoldingEngine()),
    holdFrom: (runtime: JobRuntime) => {
      searches = 0;
      holder = runtime;
    },
  };
};

const breath = (ms = 5): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const LEASE_MS = 30_000;

/**
 * Run a job through a hold and its release on a tab whose store dies after
 * `after` writes; then a second tab over the surviving store takes over —
 * Resume queue if it is still held, Resume if the job was interrupted — and
 * runs it to its end.
 */
const holdThenRecover = async (engines: ReturnType<typeof holdingEngines>, after: number, enqueue: (runtime: JobRuntime) => Promise<{ id: string } | { problem: string }>) => {
  const kinds = [computerAnalysisKind({ engine: engines.deps })];
  const inner = memoryJobStore();
  const clock = manualClock();
  const dying = crashingStore(inner, after);
  const first = testRuntime(kinds, dying.store, clock);
  engines.holdFrom(first);
  first.start();
  const queued = await enqueue(first);
  let released = false;
  for (let round = 0; round < 400 && "id" in queued && !dying.crashed(); round += 1) {
    await runUntilIdle(first);
    const status = statusOf(first, queued.id);
    if (status === "done" || status === "failed" || status === "cancelled") break;
    if (!released && first.held() === true && status === "queued") {
      released = true;
      await first.release();
    }
    await clock.advance(1_000);
    await breath();
  }
  await first.stop();
  if (!("id" in queued)) return { job: undefined, crashed: dying.crashed(), released };

  const second = testRuntime(kinds, inner, clock);
  second.start();
  await runUntilIdle(second);
  if (second.held() === true) await second.release();
  await clock.advance(LEASE_MS + 1_000);
  await runUntilIdle(second);
  const stalled = statusOf(second, queued.id);
  if (stalled === "interrupted" || stalled === "paused") await second.resume(queued.id);
  await runToEnd(second, clock, queued.id);
  const job = jobOf(second, queued.id);
  const held = second.held();
  await second.stop();
  return { job, crashed: dying.crashed(), released, held };
};

describe("the hold meeting a running job, the tab dying between any two writes (CTA-258)", () => {
  it("ends every run done, with each Case made exactly once and the queue no longer held", async () => {
    const projectId = await seed();
    const engines = holdingEngines();

    // An uncrashed run through the hold, to count its writes.
    const reference = await holdThenRecover(engines, Number.POSITIVE_INFINITY, (runtime) => runtime.enqueue(COMPUTER_ANALYSIS_KIND, inputOf(projectId)));
    expect(reference.released).toBe(true);
    expect(reference.job?.status).toBe("done");
    expect(reference.job?.attempts.some((attempt) => attempt.outcome === "held")).toBe(true);
    const counting = crashingStore(memoryJobStore(), Number.POSITIVE_INFINITY);
    {
      const clock = manualClock();
      const whole = testRuntime([computerAnalysisKind({ engine: engines.deps })], counting.store, clock);
      engines.holdFrom(whole);
      whole.start();
      const id = idOf(await whole.enqueue(COMPUTER_ANALYSIS_KIND, inputOf(projectId)));
      for (let round = 0; round < 400; round += 1) {
        await runUntilIdle(whole);
        if (statusOf(whole, id) === "done") break;
        if (whole.held() === true && statusOf(whole, id) === "queued") await whole.release();
        await clock.advance(1_000);
        await breath();
      }
      expect(statusOf(whole, id)).toBe("done");
      await whole.stop();
    }
    const total = counting.writes();
    expect(total).toBeGreaterThan(5);

    for (let after = 1; after < total; after += 1) {
      const target = (await createAnalysisProject(`Run ${after}`, null))!;
      const { job, crashed, held } = await holdThenRecover(engines, after, (runtime) =>
        runtime.enqueue(COMPUTER_ANALYSIS_KIND, inputOf(projectId, { kind: "other", projectId: target.id })),
      );
      expect(crashed, `crash after write ${after}`).toBe(true);
      if (job === undefined) continue;
      expect(job.status, `crash after write ${after}`).toBe("done");
      expect(held, `crash after write ${after}`).toBe(false);
      const made = (await loadAnalysisCases()).filter((record) => record.projectId === target.id);
      expect(made.map((record) => record.id), `crash after write ${after}`).toEqual([`${job.id}:light`]);
      const links = (await loadCaseLinks()).filter((link) => link.toId.startsWith(`${job.id}:`));
      expect(links, `crash after write ${after}`).toHaveLength(1);
    }
  }, 120_000);
});
