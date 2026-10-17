import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JobRuntime } from "@pgntools/jobs-runtime";
import { manualClock, memoryJobStore, runUntilIdle } from "@pgntools/jobs-runtime/testing";

import { crashingStore, crashThenRecover, runToEnd, engineDeps, testRuntime } from "../../../../test/jobsKit";
import { FakeEngine } from "../../../../views/board/boardTestHarness";
import { parsePgnTree } from "../../../pgn";
import { addRepertoires, loadSavedRepertoires, removeSavedRepertoires } from "../../../savedRepertoireStore";
import { savedRepertoireOf } from "../../../savedRepertoires";
import { registerSubjectRemover } from "../../subjectDeletion";
import {
  DEFAULT_REPERTOIRE_EVALUATION_SETTINGS,
  evaluatedRepertoireId,
  parseRepertoireEvaluationReport,
  REPERTOIRE_EVALUATION_KIND,
} from "./core";
import { repertoireEvaluationKind } from "./kind";

vi.mock("../../../engines/builtin", async (importOriginal) =>
  (await import("../../../../views/board/boardTestHarness")).builtinEnginesMock(importOriginal),
);

const PGN = '[Event "Queen\'s Gambit"]\n\n1. d4 d5 2. c4 e6 (2... c6 3. Nf3) 3. Nc3 *';

/** The repertoire, kept — the job's subject. */
const seed = async (id = "rep1") => {
  await addRepertoires([savedRepertoireOf(id, { index: 0, name: "Queen's Gambit", pgn: PGN, tree: parsePgnTree(PGN) }, "Queen's Gambit", undefined)]);
};

const inputOf = (outputs = { repertoire: true, pgnFile: true }, repertoireId = "rep1") => ({
  repertoireId,
  name: "Queen's Gambit",
  pgn: PGN,
  engine: "stockfish-19-lite",
  preset: { id: "given", name: "Given", values: { "Move Overhead": 300 } },
  ...DEFAULT_REPERTOIRE_EVALUATION_SETTINGS,
  maxPlies: 6,
  outputs,
});

let runtimes: JobRuntime[] = [];
const started = (runtime: JobRuntime) => {
  runtimes.push(runtime);
  runtime.start();
  return runtime;
};

const finish = runToEnd;

const textOf = async (runtime: JobRuntime, artifactId: string) => (await runtime.readArtifact(artifactId))?.text();

beforeEach(() => {
  FakeEngine.reset();
});

afterEach(async () => {
  for (const runtime of runtimes) await runtime.stop();
  runtimes = [];
  await registerSubjectRemover(undefined);
});

describe("the repertoire-evaluation kind (CTA-221) on the jobs runtime", () => {
  it("evaluates every position once, then makes its report, a new repertoire — its id the job's — and the annotated PGN as a file", async () => {
    await seed();
    const clock = manualClock();
    const runtime = started(testRuntime([repertoireEvaluationKind({ engine: engineDeps() })], memoryJobStore(), clock));
    const queued = await runtime.enqueue(REPERTOIRE_EVALUATION_KIND, inputOf());
    if (!("id" in queued)) throw new Error("not queued");
    await finish(runtime, clock, queued.id);

    const job = runtime.snapshot()?.find((each) => each.id === queued.id);
    expect(job).toMatchObject({ status: "done", lane: "engine", subjects: [{ type: "repertoire", id: "rep1" }], title: "Queen's Gambit" });
    const [report, repertoire, file] = job!.outputs;
    expect(report).toMatchObject({ key: "report", kind: "data" });
    const read = parseRepertoireEvaluationReport(report.kind === "data" ? report.value : undefined);
    expect(read?.positions.done).toBe(read?.positions.total);
    expect(read?.moves.map((move) => move.san)).toEqual(expect.arrayContaining(["d4", "c4", "Nc3", "Nf3"]));
    expect(repertoire).toMatchObject({ kind: "entity", ref: { type: "repertoire", id: evaluatedRepertoireId(queued.id) } });
    const made = (await loadSavedRepertoires()).find((each) => each.id === evaluatedRepertoireId(queued.id));
    expect(made?.name).toBe("Queen's Gambit — evaluated");
    expect(made?.pgn).toContain("[%eval");
    expect(file).toMatchObject({ kind: "artifact", name: "Queen's Gambit-evaluated.pgn", mimeType: "application/x-chess-pgn" });
    expect(await textOf(runtime, file.kind === "artifact" ? file.artifactId : "")).toContain("[%eval");
    // Its own engine, the preset it was given, terminated with the run.
    expect(FakeEngine.latest().setOptions).toContainEqual(["Move Overhead", 300]);
    expect(FakeEngine.latest().terminated).toBe(true);
  });

  it("makes no repertoire twice, and loses none, when the tab dies between any two writes — the file the same, byte for byte", async () => {
    const kinds = [repertoireEvaluationKind({ engine: engineDeps() })];
    await seed();
    const counting = crashingStore(memoryJobStore(), Number.POSITIVE_INFINITY);
    const clock = manualClock();
    const whole = started(testRuntime(kinds, counting.store, clock));
    const reference = await whole.enqueue(REPERTOIRE_EVALUATION_KIND, inputOf());
    if (!("id" in reference)) throw new Error("not queued");
    await finish(whole, clock, reference.id);
    const referenceFile = whole.snapshot()?.find((job) => job.id === reference.id)?.outputs.find((output) => output.kind === "artifact");
    const referenceText = referenceFile?.kind === "artifact" ? await textOf(whole, referenceFile.artifactId) : undefined;
    expect(referenceText).toContain("[%eval");
    const total = counting.writes();

    for (let after = 1; after < total; after += 1) {
      const inner = memoryJobStore();
      const { job, crashed } = await crashThenRecover({ kinds, inner, after, enqueue: (runtime) => runtime.enqueue(REPERTOIRE_EVALUATION_KIND, inputOf()) });
      expect(crashed, `crash after write ${after}`).toBe(true);
      if (job === undefined) continue;
      expect(job.status, `crash after write ${after}`).toBe("done");
      expect((await loadSavedRepertoires()).filter((each) => each.id === evaluatedRepertoireId(job.id)), `crash after write ${after}`).toHaveLength(1);
      const file = job.outputs.find((output) => output.kind === "artifact");
      const text = file?.kind === "artifact" ? await (await inner.readArtifact(file.artifactId))?.text() : undefined;
      // The same moves, evals and verdicts; only the Annotator tag and the job's own ids could differ — none do here.
      expect(text, `crash after write ${after}`).toBe(referenceText);
    }
  }, 120_000);

  it("is removed with its repertoire while unfinished — the deletion rule", async () => {
    await seed("rep2");
    const clock = manualClock();
    const runtime = started(testRuntime([repertoireEvaluationKind({ engine: engineDeps() })], memoryJobStore(), clock));
    await registerSubjectRemover((subjects) => runtime.removeUnfinishedOf(subjects));
    const queued = await runtime.enqueue(REPERTOIRE_EVALUATION_KIND, inputOf(undefined, "rep2"), { runAfter: new Date(clock.now().getTime() + 3_600_000) });
    if (!("id" in queued)) throw new Error("not queued");
    await runUntilIdle(runtime);
    expect(runtime.snapshot()).toHaveLength(1);
    await removeSavedRepertoires(["rep2"]);
    await runUntilIdle(runtime);
    expect(runtime.snapshot()).toEqual([]);
  });
});
