import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JobRecord, JobRuntime } from "@pgntools/jobs-runtime";
import { manualClock, memoryJobStore, runUntilIdle } from "@pgntools/jobs-runtime/testing";

import { engineDeps, legalMove, runToEnd, testRuntime } from "../../test/jobsKit";
import { FakeEngine } from "../../views/board/boardTestHarness";
import { addAnalysisCases, loadAnalysisCases } from "../analysisCaseStore";
import { createAnalysisProject } from "../analysisProjectStore";
import { gameCaseOf } from "../analysisProjects";
import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS } from "../computerAnalysis";
import type { SearchOptions } from "../engineTypes";
import { DEFAULT_ENGINE_ID } from "../engines";
import { parsePgnTree } from "../pgn";
import { continueWithCurrentSettings, isEngineJobKind, resumeChangesOf } from "./continueJob";
import type { JobEngineSettings } from "./engineJobSettings";
import { COMPUTER_ANALYSIS_KIND } from "./kinds/computerAnalysis/core";
import { computerAnalysisKind } from "./kinds/computerAnalysis/kind";
import { DEFAULT_REPERTOIRE_EVALUATION_SETTINGS, REPERTOIRE_EVALUATION_KIND } from "./kinds/repertoireEvaluation/core";
import { repertoireEvaluationKind } from "./kinds/repertoireEvaluation/kind";
import { registerSubjectRemover } from "./subjectDeletion";

vi.mock("../engines/builtin", async (importOriginal) => (await import("../../views/board/boardTestHarness")).builtinEnginesMock(importOriginal));

/*
  **Resume against the settings in effect** (CTA-236) — on the real runtime:
  an engine job paused part-way, compared with the current settings, then
  *Continue with current settings*: a new job queued with today's engine,
  preset and search, the old one's results carried over, only the rest
  searched — and the old job removed only once the new one is queued.
*/

const PGN = '[White "Alice"]\n[Black "Bob"]\n\n1. e4 e5 2. Nf3 Nc6 *';
const REPERTOIRE = "1. d4 d5 2. c4 e6 (2... c6 3. Nf3) 3. Nc3 *";

/** The settings in effect now: another preset, a shallower search with a time limit. */
const CURRENT: JobEngineSettings = {
  engine: DEFAULT_ENGINE_ID,
  preset: { id: "fast", name: "Fast", values: { Contempt: 10 } },
  depth: 14,
  moveTimeMs: 2_000,
  threads: 1,
  hashMb: 32,
};

/** How many more searches the engines answer — past it they search on, and the job waits there. */
let answers = Infinity;
/** Every position any engine was asked about, in order. */
let searched: string[] = [];

/** An engine answering a search at once while {@link answers} lasts. */
class CountingEngine extends FakeEngine {
  override search(fen: string, options: SearchOptions) {
    super.search(fen, options);
    searched.push(fen);
    if (answers <= 0) return;
    answers -= 1;
    queueMicrotask(() => {
      const pv = legalMove(fen);
      this.say({ fen, depth: 20, multipv: 1, positionEvaluation: "20", pv });
      this.say({ fen, bestMove: pv });
    });
  }
}

const kinds = () => {
  const engine = engineDeps(() => new CountingEngine());
  return [computerAnalysisKind({ engine }), repertoireEvaluationKind({ engine })];
};

let runtimes: JobRuntime[] = [];
const started = (runtime: JobRuntime) => {
  runtimes.push(runtime);
  runtime.start();
  return runtime;
};

const recordOf = (runtime: JobRuntime, id: string): JobRecord | undefined => runtime.snapshot()?.find((job) => job.id === id);

/** Queue `input`, let `first` positions be answered, then pause it there. */
const pausedAfter = async (runtime: JobRuntime, kind: string, input: unknown, first: number): Promise<JobRecord> => {
  answers = first;
  const queued = await runtime.enqueue(kind, input);
  if (!("id" in queued)) throw new Error("not queued");
  await vi.waitFor(() => expect(searched).toHaveLength(first + 1));
  await runUntilIdle(runtime);
  expect(await runtime.pause(queued.id)).toBeUndefined();
  await vi.waitFor(async () => {
    await runUntilIdle(runtime);
    expect(recordOf(runtime, queued.id)?.status).toBe("paused");
  });
  const job = recordOf(runtime, queued.id)!;
  expect(job.progress.done).toBe(first);
  return job;
};

beforeEach(() => {
  FakeEngine.reset();
  answers = Infinity;
  searched = [];
});

afterEach(async () => {
  for (const runtime of runtimes) await runtime.stop();
  runtimes = [];
  await registerSubjectRemover(undefined);
});

describe("Continue with current settings (CTA-236)", () => {
  it("queues a computer analysis again with the current settings, its results carried over — only the rest searched — then removes the old job", async () => {
    const project = (await createAnalysisProject("Openings", null))!;
    await addAnalysisCases([gameCaseOf({ id: "case", projectId: project.id, name: "Alice – Bob" }, parsePgnTree(PGN))]);
    const clock = manualClock();
    const runtime = started(testRuntime(kinds(), memoryJobStore(), clock));
    const old = await pausedAfter(
      runtime,
      COMPUTER_ANALYSIS_KIND,
      {
        source: { projectId: project.id, caseId: "case", name: "Alice – Bob", pgn: PGN },
        options: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, outputs: ["light"] },
        preset: { id: "deep", name: "Deep", values: { Contempt: 20 } },
        target: { kind: "project", projectId: project.id },
      },
      2,
    );
    const done = searched.slice(0, 2);

    expect(resumeChangesOf(old, CURRENT).map((change) => change.field)).toEqual(["preset", "option", "depth", "moveTimeMs", "hashMb"]);

    answers = Infinity;
    searched = [];
    const result = await continueWithCurrentSettings(runtime, old, CURRENT);
    if (!("id" in result)) throw new Error("not continued");
    await runUntilIdle(runtime);
    expect(recordOf(runtime, old.id)).toBeUndefined();
    const job = recordOf(runtime, result.id)!;
    expect(job).toMatchObject({ kind: COMPUTER_ANALYSIS_KIND, title: "Alice – Bob", subjects: [{ type: "analysis-case", id: "case" }] });
    expect(job.input).toMatchObject({
      options: { depth: 14, moveTimeMs: 2_000, hashMb: 32 },
      preset: CURRENT.preset,
      continues: { jobId: old.id, title: "Alice – Bob", createdAt: old.createdAt },
    });
    // The new job is the current settings': nothing to ask on its own Resume.
    expect(resumeChangesOf(job, CURRENT)).toEqual([]);

    await runToEnd(runtime, clock, result.id);
    expect(recordOf(runtime, result.id)?.status).toBe("done");
    // The five positions: the two searched before are not searched again.
    expect(searched).toHaveLength(3);
    for (const fen of done) expect(searched).not.toContain(fen);
    // Its output is the new job's: a Case under its own id.
    expect((await loadAnalysisCases()).map((record) => record.id)).toContain(`${result.id}:light`);
  }, 60_000);

  it("queues a repertoire evaluation again the same way", async () => {
    const clock = manualClock();
    const runtime = started(testRuntime(kinds(), memoryJobStore(), clock));
    const old = await pausedAfter(
      runtime,
      REPERTOIRE_EVALUATION_KIND,
      {
        repertoireId: "rep1",
        name: "Queen's Gambit",
        pgn: REPERTOIRE,
        engine: DEFAULT_ENGINE_ID,
        preset: { id: "deep", name: "Deep", values: {} },
        ...DEFAULT_REPERTOIRE_EVALUATION_SETTINGS,
        maxPlies: 6,
      },
      2,
    );
    const total = old.progress.total;
    const done = searched.slice(0, 2);
    expect(resumeChangesOf(old, CURRENT).map((change) => change.field)).toEqual(["preset", "option", "depth", "moveTimeMs", "hashMb"]);

    answers = Infinity;
    searched = [];
    const result = await continueWithCurrentSettings(runtime, old, CURRENT);
    if (!("id" in result)) throw new Error("not continued");
    await runToEnd(runtime, clock, result.id);
    const job = recordOf(runtime, result.id)!;
    expect(job.status).toBe("done");
    expect(job.input).toMatchObject({ search: { depth: 14, moveTimeMs: 2_000 }, continues: { jobId: old.id } });
    expect(recordOf(runtime, old.id)).toBeUndefined();
    expect(searched).toHaveLength(total - 2);
    for (const fen of done) expect(searched).not.toContain(fen);
  }, 60_000);

  it("leaves the old job as it was when the new one is refused", async () => {
    const clock = manualClock();
    const runtime = started(testRuntime(kinds(), memoryJobStore(), clock));
    const old = await pausedAfter(
      runtime,
      REPERTOIRE_EVALUATION_KIND,
      { repertoireId: "rep1", name: "Queen's Gambit", pgn: REPERTOIRE, engine: DEFAULT_ENGINE_ID, preset: null, ...DEFAULT_REPERTOIRE_EVALUATION_SETTINGS },
      1,
    );
    const remove = vi.fn(runtime.remove);
    expect(await continueWithCurrentSettings({ enqueue: async () => ({ problem: "too-many" }), remove }, old, CURRENT)).toEqual({ problem: "too-many" });
    expect(remove).not.toHaveBeenCalled();
    expect(recordOf(runtime, old.id)).toMatchObject({ status: "paused", progress: { done: 1 } });
    // An input that no longer reads queues nothing either.
    expect(await continueWithCurrentSettings(runtime, { ...old, input: { pgn: 1 } }, CURRENT)).toEqual({ problem: "invalid" });
    expect(runtime.snapshot()).toHaveLength(1);
  }, 60_000);
});

describe("what Resume asks about (CTA-236)", () => {
  const record = (patch: Partial<JobRecord>): JobRecord =>
    ({
      id: "j1",
      kind: COMPUTER_ANALYSIS_KIND,
      kindVersion: 1,
      status: "paused",
      phase: "steps",
      progress: { done: 1, total: 5 },
      input: { source: {}, options: { depth: 30 } },
      state: null,
      ...patch,
    }) as JobRecord;

  it("compares the engine kinds alone — a retired kind's job never asks", () => {
    expect(isEngineJobKind(COMPUTER_ANALYSIS_KIND)).toBe(true);
    expect(isEngineJobKind(REPERTOIRE_EVALUATION_KIND)).toBe(true);
    expect(isEngineJobKind("library.collection-merge")).toBe(false);
    expect(resumeChangesOf(record({}), CURRENT)).toEqual([{ field: "depth", job: 30, current: 14 }]);
    expect(resumeChangesOf(record({ kind: "library.collection-merge" }), CURRENT)).toEqual([]);
  });

  it("asks about a job not yet planned, and never one whose search is done — only its outputs are left", () => {
    expect(resumeChangesOf(record({ phase: "plan", progress: { done: 0, total: 0 } }), CURRENT)).toHaveLength(1);
    expect(resumeChangesOf(record({ progress: { done: 5, total: 5 } }), CURRENT)).toEqual([]);
    expect(resumeChangesOf(record({ phase: "finalize" }), CURRENT)).toEqual([]);
    expect(resumeChangesOf(record({ phase: "outputs" }), CURRENT)).toEqual([]);
  });

  it("refuses a kind it does not know", async () => {
    const runtime = { enqueue: vi.fn(), remove: vi.fn() };
    expect(await continueWithCurrentSettings(runtime, record({ kind: "library.collection-merge" }), CURRENT)).toEqual({ problem: "unknown-kind" });
    expect(runtime.enqueue).not.toHaveBeenCalled();
  });
});
