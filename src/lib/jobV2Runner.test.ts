import { Chess } from "chess.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FakeEngine } from "../views/board/boardTestHarness";
import { loadCaseLinks } from "./analysisCaseLinkStore";
import { addAnalysisCases, importAnalysisCases, loadAnalysisCases, removeAnalysisCases, saveCaseState } from "./analysisCaseStore";
import { createAnalysisProject, removeAnalysisProject } from "./analysisProjectStore";
import { caseStateOf, gameCaseOf, type AnalysisCase } from "./analysisProjects";
import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS, type ComputerAnalysisOptions } from "./computerAnalysis";
import { resolveEngine } from "./engines";
import { createEnginePreset, selectEnginePreset, setEnginePresetValue } from "./enginePresetStore";
import { mainline } from "./gameTree";
import { jobV2Of, type JobV2, type JobV2Target } from "./jobsV2";
import { createJobV2LiveFeed, jobV2LiveSnapshot } from "./jobV2Live";
import { createJobV2Runner, JOB_V2_RUNNER_LOCK, type JobV2Runner, type JobV2RunnerDeps } from "./jobV2Runner";
import { subscribeEvalSourceUnreachable } from "./evalSources";
import { LICHESS_EVAL_API_STORAGE_KEY } from "./evalSources/lichess/settings";
import { addJobV2, findJobV2, pauseJobV2, resumeJobV2, subscribeJobsV2 } from "./jobV2Store";
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
const start = (deps: JobV2RunnerDeps = {}) => (runner = createJobV2Runner({ useLock: false, ...deps }));
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
  vi.unstubAllGlobals();
});

describe("the Jobs V2 runner (CTA-188)", () => {
  it("holds a lock of its own, in its database's namespace", () => {
    expect(JOB_V2_RUNNER_LOCK).toBe("chessapp.analysisProjects.jobs.runner");
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
    // Each new Case linked from its source.
    expect((await loadCaseLinks()).map(({ fromId, toId }) => [fromId, toId])).toEqual(outputs.map((output) => ["case", output.caseId]));
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

  it("files the new Cases in another Project, linked from the source, and fails `target` when that Project has gone", async () => {
    const { projectId } = await seed();
    const linked = (await createAnalysisProject("Analysed", null))!;
    const job = jobOf(projectId, { kind: "other", projectId: linked.id });
    await addJobV2(job);
    start();
    await answerAll(job);
    await vi.waitFor(() => expect(findJobV2("job")?.status).toBe("done"));
    expect(findJobV2("job")?.outputs[0].projectId).toBe(linked.id);
    expect((await loadAnalysisCases()).find((record) => record.id === findJobV2("job")?.outputs[0].caseId)?.projectId).toBe(linked.id);
    expect((await loadCaseLinks()).map(({ fromId, toId }) => [fromId, toId])).toEqual([["case", findJobV2("job")?.outputs[0].caseId]]);

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
    // A merge into the Case itself makes no link.
    expect(await loadCaseLinks()).toEqual([]);

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

  describe("its live progress (CTA-190)", () => {
    it("publishes the engine's depth, nodes, nps, time, hash and best line off its info lines — no store write per line", async () => {
      const { projectId } = await seed();
      const job = jobOf(projectId, { kind: "project", projectId });
      await addJobV2(job);
      start({ liveFeed: createJobV2LiveFeed({ intervalMs: 0 }) });
      await searched(1);
      const { fen } = job.positions[0];
      const pv = legalMove(fen);

      let writes = 0;
      const off = subscribeJobsV2(() => (writes += 1));
      for (let depth = 1; depth <= 30; depth += 1) {
        engine().say({ fen, depth, seldepth: depth + 6, nodes: depth * 1000, nps: 500_000, time: depth * 10, hashfull: 120, multipv: 1, positionEvaluation: "35", pv });
      }
      // A `currmove` line carries no counts: the last ones stand.
      engine().say({ fen, depth: 30, currmove: pv, currmovenumber: 1 });
      expect(jobV2LiveSnapshot()).toMatchObject({
        jobId: "job",
        index: 0,
        depth: 30,
        seldepth: 36,
        nodes: 30_000,
        nps: 500_000,
        hashfull: 120,
        elapsedMs: 300,
        score: { kind: "cp", value: 35 },
      });
      expect(jobV2LiveSnapshot()?.line).toHaveLength(1);
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(writes).toBe(0);
      off();

      // The position ends: the snapshot goes, the checkpoint is the one write.
      engine().say({ fen, bestMove: pv });
      expect(jobV2LiveSnapshot()).toBeUndefined();
      await searched(2);
      expect(findJobV2("job")?.checkpoint.filter((entry) => entry !== null)).toHaveLength(1);
      expect(jobV2LiveSnapshot()).toBeUndefined();
      // The next position's first word is live again, its own index and move.
      const next = job.positions[1];
      engine().say({ fen: next.fen, depth: 4, nodes: 900 });
      expect(jobV2LiveSnapshot()).toMatchObject({ index: 1, move: "1... e5", depth: 4, nodes: 900 });
    });

    it("throttles what it publishes — the first word at once, then the interval's last", async () => {
      const { projectId } = await seed();
      const job = jobOf(projectId, { kind: "project", projectId });
      await addJobV2(job);
      const publish = vi.fn();
      start({ liveFeed: createJobV2LiveFeed({ intervalMs: 80, publish }) });
      await searched(1);
      const { fen } = job.positions[0];
      for (let depth = 1; depth <= 20; depth += 1) engine().say({ fen, depth, nodes: depth });
      expect(publish).toHaveBeenCalledTimes(1);
      expect(publish.mock.calls[0][0]).toMatchObject({ depth: 1 });
      await vi.waitFor(() => expect(publish).toHaveBeenCalledTimes(2));
      expect(publish.mock.calls[1][0]).toMatchObject({ depth: 20, nodes: 20 });
    });

    it("clears it when the job is paused mid-search", async () => {
      const { projectId } = await seed();
      const job = jobOf(projectId, { kind: "project", projectId });
      await addJobV2(job);
      start({ liveFeed: createJobV2LiveFeed({ intervalMs: 0 }) });
      await searched(1);
      engine().say({ fen: job.positions[0].fen, depth: 8, nodes: 4000 });
      expect(jobV2LiveSnapshot()).toMatchObject({ jobId: "job", depth: 8 });
      await pauseJobV2("job");
      await vi.waitFor(() => expect(jobV2LiveSnapshot()).toBeUndefined());
    });
  });

  describe("an engine server's heartbeat (CTA-194)", () => {
    const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    it("keeps a quiet search alive past the silence timeout — heard, no line, depth or score changed — and it finishes on its bestmove", async () => {
      const { projectId } = await seed();
      const job = jobOf(projectId, { kind: "project", projectId });
      await addJobV2(job);
      let clock = Date.parse("2026-10-14T10:00:00Z");
      start({ silenceTimeoutMs: 300, liveFeed: createJobV2LiveFeed({ intervalMs: 0 }), now: () => new Date(clock) });
      await searched(1);
      const { fen } = job.positions[0];
      const pv = legalMove(fen);
      engine().say({ fen, depth: 32, seldepth: 40, nodes: 9_000_000, multipv: 1, positionEvaluation: "35", pv });
      const heard = jobV2LiveSnapshot()!;

      // Three times the timeout without a line — a heartbeat every half of it.
      for (let beat = 1; beat <= 6; beat += 1) {
        await pause(150);
        clock += 15_000;
        engine().say({ fen, heartbeat: true });
        expect(jobV2LiveSnapshot()).toMatchObject({ depth: 32, seldepth: 40, nodes: 9_000_000, score: heard.score, line: heard.line, heardAt: clock });
      }
      expect(findJobV2("job")?.status).toBe("running");

      engine().say({ fen, bestMove: pv });
      for (let index = 1; index < job.positions.length; index += 1) {
        await searched(index + 1);
        const next = job.positions[index].fen;
        const move = legalMove(next);
        engine().say({ fen: next, depth: 20, multipv: 1, positionEvaluation: "20", pv: move });
        engine().say({ fen: next, bestMove: move });
      }
      await vi.waitFor(() => expect(findJobV2("job")?.status).toBe("done"));
      expect(findJobV2("job")?.checkpoint[0]?.lines[0]).toMatchObject({ depth: 32 });
    });

    it("still fails `engine` after the silence timeout without one — and a heartbeat about another position is not one", async () => {
      const { projectId } = await seed();
      const job = jobOf(projectId, { kind: "project", projectId });
      await addJobV2(job);
      start({ silenceTimeoutMs: 200 });
      await searched(1);
      const { fen } = job.positions[0];
      engine().say({ fen, depth: 32, multipv: 1, positionEvaluation: "35", pv: legalMove(fen) });
      for (let beat = 1; beat <= 4; beat += 1) {
        await pause(100);
        engine().say({ fen: job.positions[1].fen, heartbeat: true });
      }
      await vi.waitFor(() => expect(findJobV2("job")).toMatchObject({ status: "failed", error: "engine" }));
    });
  });

  describe("the lichess evaluation API first (CTA-193) — through the eval-source layer (CTA-196)", () => {
    const API = "http://10.0.0.3:8000";
    /** The API on — writing, `write`, anything as deep as `minWriteDepth` (1 here: the fake engine's searches are shallow; CTA-202). */
    const turnApiOn = (write = false, minWriteDepth = 1) =>
      localStorage.setItem(LICHESS_EVAL_API_STORAGE_KEY, JSON.stringify({ enabled: true, url: API, write, minWriteDepth }));
    /** What a job's warning carried: its job, name and kind, and the source's id. */
    const warnings = (heard: ReturnType<typeof vi.fn>) =>
      heard.mock.calls.map(([event]) => ({ jobId: event.jobId, name: event.name, kind: event.kind, source: event.source.id }));

    /** The API's answer for a FEN asked: a found eval (a legal line, White's view) at `depth`, or what `answer` says. */
    const apiAnswering = (answer: (fen: string) => "found" | "missing" | number = () => "found", depth = 40, writeStatus = 200) => {
      const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method === "POST") return new Response(JSON.stringify({ stored: 1, skipped: 0, results: [] }), { status: writeStatus });
        const fen = new URL(url).searchParams.get("fen") ?? "";
        const said = answer(fen);
        if (said === "missing") return new Response(JSON.stringify({ detail: "position not found" }), { status: 404 });
        const line = legalMove(`${fen} 0 1`);
        const evalDepth = typeof said === "number" ? said : depth;
        return new Response(
          JSON.stringify({ query: fen, positions: [{ fen, source: "lichess", evals: [{ depth: evalDepth, knodes: 1, pvs: [{ cp: 31, mate: null, line }] }] }] }),
          { status: 200 },
        );
      });
      vi.stubGlobal("fetch", fetchMock);
      return fetchMock;
    };

    it("takes every position from the API at the job's depth or deeper — no engine is ever started", async () => {
      turnApiOn();
      const fetchMock = apiAnswering();
      const { projectId } = await seed();
      const job = jobOf(projectId, { kind: "project", projectId });
      await addJobV2(job);
      start();
      await vi.waitFor(() => expect(findJobV2("job")?.status).toBe("done"));
      const asked = job.positions.filter((position) => new Chess(position.fen).moves().length > 0);
      expect(fetchMock).toHaveBeenCalledTimes(asked.length);
      expect(String(fetchMock.mock.calls[0][0])).toContain(`${API}/fen?fen=`);
      expect(FakeEngine.instances).toHaveLength(0);
      // Read like an engine's result: each checkpoint the API's score and depth, and an annotated Case.
      expect(findJobV2("job")?.checkpoint[0]?.lines[0]).toMatchObject({ score: { kind: "cp", value: 31 }, depth: 40 });
      const output = (await loadAnalysisCases()).find((record) => record.id === findJobV2("job")?.outputs[0].caseId);
      expect(output?.pgn).toContain("[%eval");
    });

    it("searches with the engine a position the API lacks (a 404) or holds shallower than the job asks", async () => {
      turnApiOn();
      const { projectId } = await seed();
      const job = jobOf(projectId, { kind: "project", projectId }, { depth: 20 });
      const missing = job.positions[0].fen;
      const shallow = job.positions[1].fen;
      apiAnswering((fen) => (missing.startsWith(fen) ? "missing" : shallow.startsWith(fen) ? 12 : "found"));
      await addJobV2(job);
      start();
      for (const index of [0, 1]) {
        await searched(index + 1);
        const { fen } = job.positions[index];
        expect(engine().searches.at(-1)).toBe(fen);
        const pv = legalMove(fen);
        engine().say({ fen, depth: 20, multipv: 1, positionEvaluation: "20", pv });
        engine().say({ fen, bestMove: pv });
      }
      await vi.waitFor(() => expect(findJobV2("job")?.status).toBe("done"));
      expect(engine().searches).toHaveLength(2);
    });

    it("goes on with the engine when the API does not answer — said once, and not asked again this run", async () => {
      turnApiOn();
      const fetchMock = vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      });
      vi.stubGlobal("fetch", fetchMock);
      const heard = vi.fn();
      const off = subscribeEvalSourceUnreachable(heard);
      const { projectId } = await seed();
      const job = jobOf(projectId, { kind: "project", projectId });
      await addJobV2(job);
      start();
      await answerAll(job);
      await vi.waitFor(() => expect(findJobV2("job")?.status).toBe("done"));
      off();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(warnings(heard)).toEqual([{ jobId: "job", name: "Alice – Bob", kind: "read", source: "lichess" }]);
    });

    /** The entries the job sent to `POST /evals`. */
    const posted = (fetchMock: ReturnType<typeof apiAnswering>) =>
      fetchMock.mock.calls
        .filter(([, init]) => init?.method === "POST")
        .map(([url, init]) => ({ url, entries: JSON.parse(String(init?.body)).entries }));

    it("sends each position the engine searched to POST /evals while writing is on — never one the API answered", async () => {
      turnApiOn(true);
      const { projectId } = await seed();
      const job = jobOf(projectId, { kind: "project", projectId });
      const missing = job.positions[0].fen;
      const fetchMock = apiAnswering((fen) => (missing.startsWith(fen) ? "missing" : "found"));
      await addJobV2(job);
      start();
      await searched(1);
      const pv = legalMove(missing);
      engine().say({ fen: missing, depth: 20, multipv: 1, positionEvaluation: "20", nodes: 2_500_000, pv });
      engine().say({ fen: missing, bestMove: pv });
      await vi.waitFor(() => expect(findJobV2("job")?.status).toBe("done"));
      expect(posted(fetchMock)).toEqual([
        {
          url: `${API}/evals`,
          entries: [{ fen: missing, depth: 20, knodes: 2500, pov: "white", pvs: [{ cp: 20, line: pv }], engine: "Stockfish 19 Lite" }],
        },
      ]);
    });

    it("sends nothing shallower than the minimum depth to write — and that is no refusal, no warning (CTA-202)", async () => {
      turnApiOn(true, 35);
      const heard = vi.fn();
      const off = subscribeEvalSourceUnreachable(heard);
      const { projectId } = await seed();
      const job = jobOf(projectId, { kind: "project", projectId });
      const missing = job.positions[0].fen;
      const fetchMock = apiAnswering((fen) => (missing.startsWith(fen) ? "missing" : "found"));
      await addJobV2(job);
      start();
      await searched(1);
      const pv = legalMove(missing);
      engine().say({ fen: missing, depth: 20, multipv: 1, positionEvaluation: "20", nodes: 2_500_000, pv });
      engine().say({ fen: missing, bestMove: pv });
      await vi.waitFor(() => expect(findJobV2("job")?.status).toBe("done"));
      off();
      expect(posted(fetchMock)).toEqual([]);
      expect(warnings(heard)).toEqual([]);
    });

    it("sends nothing while writing is off", async () => {
      turnApiOn(false);
      const { projectId } = await seed();
      const job = jobOf(projectId, { kind: "project", projectId });
      const fetchMock = apiAnswering(() => "missing");
      await addJobV2(job);
      start();
      await answerAll(job);
      await vi.waitFor(() => expect(findJobV2("job")?.status).toBe("done"));
      expect(posted(fetchMock)).toEqual([]);
    });

    it("goes on without sending when the API does not take a write — said once, and nothing more sent this run", async () => {
      turnApiOn(true);
      const heard = vi.fn();
      const off = subscribeEvalSourceUnreachable(heard);
      const { projectId } = await seed();
      const job = jobOf(projectId, { kind: "project", projectId });
      // Started without --write: every POST /evals is a 403.
      const fetchMock = apiAnswering(() => "missing", 40, 403);
      await addJobV2(job);
      start();
      await answerAll(job);
      await vi.waitFor(() => expect(findJobV2("job")?.status).toBe("done"));
      off();
      expect(posted(fetchMock)).toHaveLength(1);
      expect(warnings(heard)).toEqual([{ jobId: "job", name: "Alice – Bob", kind: "write", source: "lichess" }]);
      // Lookups go on: every position was still asked about.
      expect(fetchMock.mock.calls.filter(([, init]) => init?.method !== "POST").length).toBeGreaterThan(1);
    });

    it("asks nothing while the API is off", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      const { projectId } = await seed();
      const job = jobOf(projectId, { kind: "project", projectId });
      await addJobV2(job);
      start();
      await answerAll(job);
      await vi.waitFor(() => expect(findJobV2("job")?.status).toBe("done"));
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
