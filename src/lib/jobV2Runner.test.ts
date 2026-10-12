import { Chess } from "chess.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FakeEngine } from "../views/board/boardTestHarness";
import { addAnalysisCases, importAnalysisCases, loadAnalysisCases, removeAnalysisCases, saveCaseState } from "./analysisCaseStore";
import { createAnalysisProject, removeAnalysisProject } from "./analysisProjectStore";
import { caseStateOf, gameCaseOf, type AnalysisCase } from "./analysisProjects";
import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS, type ComputerAnalysisOptions } from "./computerAnalysis";
import { resolveEngine } from "./engines";
import { createEnginePreset, selectEnginePreset, setEnginePresetValue } from "./enginePresetStore";
import { mainline } from "./gameTree";
import { JOB_RUNNER_LOCK } from "./jobRunner";
import { jobV2Of, type JobV2, type JobV2Target } from "./jobsV2";
import { createJobV2Runner, JOB_V2_RUNNER_LOCK, type JobV2Runner } from "./jobV2Runner";
import { addJobV2, findJobV2, pauseJobV2, resumeJobV2 } from "./jobV2Store";
import { parsePgnTree } from "./pgn";

vi.mock("./engines/builtin", async (importOriginal) =>
  (await import("../views/board/boardTestHarness")).builtinEnginesMock(importOriginal),
);

const PGN = '[White "Alice"]\n[Black "Bob"]\n\n1. e4 e5 2. Nf3 Nc6 *';

/** A Project and a Game Case in it — the job's source. */
const seed = async (): Promise<{ projectId: string; record: AnalysisCase }> => {
  const project = (await createAnalysisProject("Openings", null))!;
  const record = gameCaseOf({ id: "case", projectId: project.id, name: "" }, parsePgnTree(PGN));
  await addAnalysisCases([record]);
  return { projectId: project.id, record };
};

const jobOf = (projectId: string, target: JobV2Target, options: Partial<ComputerAnalysisOptions> = {}): JobV2 =>
  jobV2Of(
    "job",
    {
      source: { projectId, caseId: "case", name: "Alice – Bob", pgn: PGN },
      options: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, outputs: ["light"], ...options },
      preset: { id: "given", name: "Given", values: { "Move Overhead": 300 } },
      target,
    },
    new Date("2026-10-12T12:00:00Z"),
  )!;

const legalMove = (fen: string): string => {
  const move = new Chess(fen).moves({ verbose: true })[0];
  return `${move.from}${move.to}`;
};

let runner: JobV2Runner | undefined;
const start = () => (runner = createJobV2Runner({ useLock: false }));
const engine = () => FakeEngine.latest();
const searched = (count: number) => vi.waitFor(() => expect(engine().searches).toHaveLength(count));

const answerAll = async (job: JobV2, from = 0) => {
  for (let index = from; index < job.positions.length; index += 1) {
    await searched(index - from + 1);
    const { fen } = job.positions[index];
    const pv = legalMove(fen);
    engine().say({ fen, depth: 20, multipv: 1, positionEvaluation: "20", pv });
    engine().say({ fen, bestMove: pv });
  }
};

beforeEach(() => {
  FakeEngine.reset();
});

afterEach(async () => {
  runner?.stop();
  await runner?.idle();
  runner = undefined;
});

describe("the Jobs V2 runner (CTA-188)", () => {
  it("holds a lock of its own, not V1's", () => {
    expect(JOB_V2_RUNNER_LOCK).not.toBe(JOB_RUNNER_LOCK);
  });

  it("searches every position, then saves each ticked variant as a new Game Case in the source's Project", async () => {
    const { projectId } = await seed();
    const job = jobOf(projectId, { kind: "project", projectId }, { outputs: ["light", "full"] });
    await addJobV2(job);
    start();
    await answerAll(job);
    await vi.waitFor(() => expect(findJobV2("job")?.status).toBe("done"));

    const outputs = findJobV2("job")!.outputs;
    expect(outputs.map((output) => [output.variant, output.projectId])).toEqual([
      ["light", projectId],
      ["full", projectId],
    ]);
    const cases = new Map((await loadAnalysisCases()).map((record) => [record.id, record]));
    expect(outputs.map((output) => cases.get(output.caseId)?.name)).toEqual([
      "Alice – Bob - computer analysis (light)",
      "Alice – Bob - computer analysis (full)",
    ]);
    expect(cases.get(outputs[0].caseId)).toMatchObject({ type: "game", projectId });
    expect(cases.get(outputs[0].caseId)?.pgn).toContain('[Annotator "Stockfish 19 Lite [light]"]');
    expect(cases.get(outputs[0].caseId)?.pgn).toContain("[%eval");
    expect(engine().terminated).toBe(true);
  });

  it("sends the preset the job was given — never the one selected now — Threads, Hash and lines its own", async () => {
    const { projectId } = await seed();
    const selected = await createEnginePreset("selected");
    if (!("id" in selected)) throw new Error("no preset");
    await setEnginePresetValue(selected.id, "Move Overhead", 999);
    await selectEnginePreset(resolveEngine().id, selected.id);
    await addJobV2(jobOf(projectId, { kind: "project", projectId }, { hashMb: 64, multiPv: 2 }));
    start();
    await searched(1);
    expect(engine().setOptions).toContainEqual(["Move Overhead", 300]);
    expect(engine().setOptions).not.toContainEqual(["Move Overhead", 999]);
    expect(engine().setOptions).toContainEqual(["Hash", 64]);
    expect(engine().setOptions.at(-1)).toEqual(["MultiPV", 2]);
  });

  it("files the new Cases in a linked Project, and fails `target` when that Project has gone", async () => {
    const { projectId } = await seed();
    const linked = (await createAnalysisProject("Analysed", null))!;
    const job = jobOf(projectId, { kind: "linked", projectId: linked.id });
    await addJobV2(job);
    start();
    await answerAll(job);
    await vi.waitFor(() => expect(findJobV2("job")?.status).toBe("done"));
    expect(findJobV2("job")?.outputs[0].projectId).toBe(linked.id);
    expect((await loadAnalysisCases()).find((record) => record.id === findJobV2("job")?.outputs[0].caseId)?.projectId).toBe(linked.id);

    FakeEngine.reset();
    await removeAnalysisProject(linked.id);
    await addJobV2({ ...job, id: "again" });
    await answerAll(job);
    await vi.waitFor(() => expect(findJobV2("again")).toMatchObject({ status: "failed", error: "target" }));
  });

  it("merges the one variant into the source Case as it stands then, the reader's own work kept", async () => {
    const { projectId, record } = await seed();
    const job = jobOf(projectId, { kind: "case" });
    await addJobV2(job);
    // The reader goes on working on the Case after sending it: a comment of their own.
    const edited = parsePgnTree(PGN.replace("2. Nf3", "2. Nf3 {my plan}"));
    await saveCaseState(record.id, caseStateOf(edited, mainline(edited)[2].id, "black"));
    start();
    await answerAll(job);
    await vi.waitFor(() => expect(findJobV2("job")?.status).toBe("done"));

    expect(findJobV2("job")?.outputs).toEqual([{ variant: "light", projectId, caseId: record.id }]);
    const merged = (await loadAnalysisCases()).find((each) => each.id === record.id)!;
    expect(merged.merges).toEqual(["job"]);
    expect(merged.pgn).toContain("my plan");
    expect(merged.pgn).toContain("[%eval");
    expect(merged.orientation).toBe("black");

    // An open board's autosave from before the merge never writes the older tree back — its place and side still land.
    await saveCaseState(record.id, { ...caseStateOf(edited, null, "white"), merges: [] });
    const after = (await loadAnalysisCases()).find((each) => each.id === record.id)!;
    expect(after.pgn).toBe(merged.pgn);
    expect(after.orientation).toBe("white");
  });

  it("fails `target` when the source Case is gone before it merges", async () => {
    const { projectId } = await seed();
    const job = jobOf(projectId, { kind: "case" });
    await addJobV2(job);
    start();
    await searched(1);
    // The Case goes, its job record left (the import's write, which does not reach the jobs).
    await importAnalysisCases({ add: [], remove: ["case"] });
    await answerAll(job);
    await vi.waitFor(() => expect(findJobV2("job")).toMatchObject({ status: "failed", error: "target" }));
  });

  it("stops a job whose Case is deleted while it runs — the Case takes its jobs with it", async () => {
    const { projectId, record } = await seed();
    await addJobV2(jobOf(projectId, { kind: "project", projectId }));
    start();
    await searched(1);
    await removeAnalysisCases([record.id]);
    await vi.waitFor(() => expect(engine().terminated).toBe(true));
    expect(findJobV2("job")).toBeUndefined();
  });

  it("pauses and resumes from its checkpoint; a job left running reads as interrupted", async () => {
    const { projectId } = await seed();
    const job = jobOf(projectId, { kind: "project", projectId });
    await addJobV2({ ...job, id: "left", status: "running" });
    await addJobV2(job);
    start();
    await searched(1);
    expect(findJobV2("left")?.status).toBe("interrupted");
    const { fen } = job.positions[0];
    engine().say({ fen, depth: 20, multipv: 1, positionEvaluation: "20", pv: legalMove(fen) });
    engine().say({ fen, bestMove: legalMove(fen) });
    await searched(2);
    await pauseJobV2("job");
    await vi.waitFor(() => expect(engine().terminated).toBe(true));
    expect(findJobV2("job")?.checkpoint.filter((entry) => entry !== null)).toHaveLength(1);

    await resumeJobV2("job");
    await vi.waitFor(() => expect(FakeEngine.instances).toHaveLength(2));
    await searched(1);
    expect(engine().searches).toEqual([job.positions[1].fen]);
  });
});
