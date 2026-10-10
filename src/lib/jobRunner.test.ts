import { Chess } from "chess.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FakeEngine } from "../views/board/boardTestHarness";
import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS, type ComputerAnalysisOptions } from "./computerAnalysis";
import type { EngineDescriptor } from "./engineTypes";
import { resolveEngine } from "./engines";
import { createJobRunner, type JobRunner, type JobRunnerDeps } from "./jobRunner";
import { computerAnalysisJobOf, withCheckpoint, type Job } from "./jobs";
import { addJob, cancelJob, findJob, pauseJob, removeJob, resumeJob } from "./jobStore";
import { createAnalysisFolder } from "./savedAnalysisFolderStore";
import { loadSavedAnalyses } from "./savedAnalysisStore";

vi.mock("./engines/builtin", async (importOriginal) =>
  (await import("../views/board/boardTestHarness")).builtinEnginesMock(importOriginal),
);

const PGN = '[White "Alice"]\n[Black "Bob"]\n\n1. e4 e5 2. Nf3 Nc6 *';

const jobOf = (options: Partial<ComputerAnalysisOptions> = {}, folderId: string | null = null): Job =>
  computerAnalysisJobOf(
    "job",
    {
      source: { analysisId: null, name: "Alice – Bob", folderId, pgn: PGN },
      options: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, outputs: ["light"], ...options },
    },
    new Date("2026-10-10T12:00:00Z"),
  )!;

/** A legal first move from `fen`, in UCI — what a line's PV starts with. */
const legalMove = (fen: string, index = 0): string => {
  const move = new Chess(fen).moves({ verbose: true })[index];
  return `${move.from}${move.to}`;
};

let runner: JobRunner | undefined;
const start = (deps: JobRunnerDeps = {}) => (runner = createJobRunner({ useLock: false, ...deps }));

/** The engine the runner built. */
const engine = () => FakeEngine.latest();

/** Wait until the engine has been asked for its `count`th search. */
const searched = (count: number) => vi.waitFor(() => expect(engine().searches).toHaveLength(count));

/** The engine answers the search it was asked for: line 1 at `cp` (the side to move's view), then its best move. */
const answer = (fen: string, cp = 20) => {
  const pv = legalMove(fen);
  engine().say({ fen, depth: 20, multipv: 1, positionEvaluation: String(cp), pv });
  engine().say({ fen, bestMove: pv });
};

/** Run the engine through every search a job asks for, answering each. */
const answerAll = async (job: Job, from = 0) => {
  for (let index = from; index < job.positions.length; index += 1) {
    await searched(index - from + 1);
    expect(engine().lastSearch).toBe(job.positions[index].fen);
    answer(job.positions[index].fen);
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

describe("the job runner (CTA-173)", () => {
  it("searches the positions in order, writing a checkpoint after each", async () => {
    const job = jobOf();
    await addJob(job);
    start();

    for (let index = 0; index < job.positions.length; index += 1) {
      await searched(index + 1);
      expect(engine().lastSearch).toBe(job.positions[index].fen);
      expect(engine().searchOptions.at(-1)).toEqual({ depth: 20, movetime: 30000 });
      expect(findJob("job")?.status).toBe("running");
      answer(job.positions[index].fen);
      await vi.waitFor(() => expect(findJob("job")?.checkpoint[index]?.fen).toBe(job.positions[index].fen));
    }
    await vi.waitFor(() => expect(findJob("job")?.status).toBe("done"));
    expect(findJob("job")).toMatchObject({
      engine: { id: resolveEngine().id, name: "Stockfish 19 Lite" },
      error: null,
    });
    expect(findJob("job")?.startedAt).not.toBeNull();
    expect(findJob("job")?.finishedAt).not.toBeNull();
    expect(engine().terminated).toBe(true);
  });

  it("sets Threads and Hash clamped to what the engine declares, and each position's lines", async () => {
    await addJob(jobOf({ threads: 8, hashMb: 128, multiPv: 3 }));
    start();
    await searched(1);
    // The single-thread build pins Threads to 1.
    expect(engine().setOptions).toContainEqual(["Threads", 1]);
    expect(engine().setOptions).toContainEqual(["Hash", 128]);
    expect(engine().setOptions.at(-1)).toEqual(["MultiPV", 3]);
  });

  it("holds a job sent to an engine server's engine to the tab's ceiling when an in-browser build runs it instead (CTA-175)", async () => {
    // The server is gone (none configured): the default build runs the job, and a 4096 MB hash would crash its tab.
    await addJob(jobOf({ engine: "hosted:stockfish-19", threads: 12, hashMb: 4096 }));
    start();
    await searched(1);
    expect(findJob("job")?.options.hashMb).toBe(4096);
    expect(engine().setOptions).toContainEqual(["Hash", 1024]);
    expect(engine().setOptions).not.toContainEqual(["Hash", 4096]);
  });

  it("stops a search early once another line falls too far below line 1", async () => {
    const job = jobOf({ multiPv: 2, minDepth: 8, depth: 20 });
    await addJob(job);
    start();
    await searched(1);
    const { fen } = job.positions[0];
    const say = (depth: number, multipv: number, cp: number) =>
      engine().say({ fen, depth, multipv, positionEvaluation: String(cp), pv: legalMove(fen, multipv - 1) });

    // Below the least depth, a line 300 cp worse does not stop it.
    say(6, 1, 40);
    say(6, 2, -260);
    expect(engine().stops).toBe(0);
    say(8, 1, 40);
    say(8, 2, -80);
    expect(engine().stops).toBe(1);
    // Stopped once: the lines still landing do not stop it again.
    say(8, 2, -90);
    expect(engine().stops).toBe(1);
    engine().say({ fen, bestMove: legalMove(fen) });

    await vi.waitFor(() => expect(findJob("job")?.checkpoint[0]?.lines).toHaveLength(2));
    expect(findJob("job")?.checkpoint[0]?.lines.map((line) => line.depth)).toEqual([8, 8]);
  });

  it("saves every ticked variant as a Saved analysis, named for it, in the source's folder", async () => {
    const folder = (await createAnalysisFolder("Computer", null))!;
    const job = jobOf({ outputs: ["light", "full"] }, folder.id);
    await addJob(job);
    start();
    await answerAll(job);
    await vi.waitFor(() => expect(findJob("job")?.status).toBe("done"));

    const outputs = findJob("job")!.outputs;
    expect(outputs.map((output) => output.variant)).toEqual(["light", "full"]);
    const saved = await loadSavedAnalyses();
    const byId = new Map(saved.map((record) => [record.id, record]));
    expect(outputs.map((output) => byId.get(output.analysisId)?.name)).toEqual([
      "Alice – Bob — computer analysis (light)",
      "Alice – Bob — computer analysis (full)",
    ]);
    expect(outputs.every((output) => byId.get(output.analysisId)?.folderId === folder.id)).toBe(true);
    expect(byId.get(outputs[0].analysisId)?.pgn).toContain('[Annotator "Stockfish 19 Lite [light]"]');
    expect(byId.get(outputs[0].analysisId)?.pgn).toContain("[%eval");
  });

  it("files the outputs Unfiled when the source's folder has gone", async () => {
    const job = jobOf({}, "a-folder-deleted-since");
    await addJob(job);
    start();
    await answerAll(job);
    await vi.waitFor(() => expect(findJob("job")?.status).toBe("done"));
    const saved = await loadSavedAnalyses();
    expect(saved[0].folderId).toBeNull();
  });

  it("cancels: the search stopped, the engine terminated, the job cancelled and nothing more searched", async () => {
    const job = jobOf();
    await addJob(job);
    start();
    await searched(1);
    answer(job.positions[0].fen);
    await searched(2);

    await cancelJob("job");
    await vi.waitFor(() => expect(engine().terminated).toBe(true));
    expect(engine().stops).toBeGreaterThan(0);
    // A result arriving after the cancel is not written.
    answer(job.positions[1].fen);
    await runner!.idle();
    expect(findJob("job")).toMatchObject({ status: "cancelled" });
    expect(findJob("job")?.checkpoint.filter((entry) => entry !== null)).toHaveLength(1);
    expect(engine().searches).toHaveLength(2);
  });

  it("pauses: the search stopped, the engine terminated, the checkpoint kept — and Resume goes on from it (CTA-178)", async () => {
    const job = jobOf();
    await addJob(job);
    start();
    await searched(1);
    answer(job.positions[0].fen);
    await searched(2);

    await pauseJob("job");
    await vi.waitFor(() => expect(engine().terminated).toBe(true));
    // A result arriving after the pause is not written.
    answer(job.positions[1].fen);
    await runner!.idle();
    expect(findJob("job")).toMatchObject({ status: "paused" });
    expect(findJob("job")?.checkpoint.filter((entry) => entry !== null)).toHaveLength(1);

    await resumeJob("job");
    await vi.waitFor(() => expect(FakeEngine.instances).toHaveLength(2));
    await searched(1);
    expect(engine().searches).toEqual([job.positions[1].fen]);
    await answerAll(job, 1);
    await vi.waitFor(() => expect(findJob("job")?.status).toBe("done"));
  });

  it("stops a job that is deleted while it runs", async () => {
    await addJob(jobOf());
    start();
    await searched(1);
    await removeJob("job");
    await vi.waitFor(() => expect(engine().terminated).toBe(true));
    expect(findJob("job")).toBeUndefined();
  });

  it("reads a job left running as interrupted, and never starts it on its own", async () => {
    await addJob({ ...jobOf(), status: "running" });
    start();
    await runner!.idle();
    expect(findJob("job")?.status).toBe("interrupted");
    expect(FakeEngine.instances).toHaveLength(0);
  });

  it("resumes from the checkpoint, not from the first position", async () => {
    let job = jobOf();
    for (const index of [0, 1, 2]) {
      const { fen } = job.positions[index];
      job = withCheckpoint(job, index, { fen, lines: [{ score: { kind: "cp", value: 10 }, depth: 20, pv: [legalMove(fen)] }] });
    }
    await addJob({ ...job, status: "interrupted" });
    start();
    await runner!.idle();
    expect(FakeEngine.instances).toHaveLength(0);

    await resumeJob("job");
    await searched(1);
    expect(engine().searches).toEqual([job.positions[3].fen]);
    await answerAll(job, 3);
    await vi.waitFor(() => expect(findJob("job")?.status).toBe("done"));
    expect(engine().searches).toEqual([job.positions[3].fen, job.positions[4].fen]);
  });

  it("runs one job at a time, oldest queued first", async () => {
    const first = jobOf();
    await addJob({ ...first, id: "first" });
    await addJob({ ...first, id: "second" });
    start();
    await searched(1);
    expect(findJob("first")?.status).toBe("running");
    expect(findJob("second")?.status).toBe("queued");
    await answerAll(first);
    await vi.waitFor(() => expect(findJob("second")?.status).toBe("running"));
    expect(findJob("first")?.status).toBe("done");
  });

  it("fails a job whose engine cannot be built", async () => {
    const broken: EngineDescriptor = {
      ...resolveEngine(),
      create: () => {
        throw new Error("no worker");
      },
    };
    await addJob(jobOf());
    start({ engineFor: async () => broken });
    await vi.waitFor(() => expect(findJob("job")).toMatchObject({ status: "failed", error: "engine" }));
    expect(findJob("job")?.finishedAt).not.toBeNull();
  });

  it("fails a job whose engine goes silent, keeping the checkpoint for a resume", async () => {
    const job = jobOf();
    await addJob(job);
    start({ silenceTimeoutMs: 50 });
    await searched(1);
    answer(job.positions[0].fen);
    await searched(2);
    await vi.waitFor(() => expect(findJob("job")).toMatchObject({ status: "failed", error: "engine" }));
    expect(engine().terminated).toBe(true);
    expect(findJob("job")?.checkpoint[0]).not.toBeNull();
  });
});
