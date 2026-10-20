import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JobKind, JobRuntime } from "@pgntools/jobs-runtime";
import { manualClock, memoryJobStore, runUntilIdle } from "@pgntools/jobs-runtime/testing";

import { applied, PLAIN_WORDS, sessionOfPgn } from "../../../../test/findBestMoveKit";
import { crashingStore, crashThenRecover, engineDeps, runToEnd, testRuntime } from "../../../../test/jobsKit";
import { FakeEngine } from "../../../../views/board/boardTestHarness";
import { addAnalysisCases, loadAnalysisCases, removeAnalysisCases } from "../../../analysisCaseStore";
import { gameCaseOf } from "../../../analysisProjects";
import { positionFenOf } from "../../../findBestMove/model";
import { sessionRecordOf } from "../../../findBestMove/pgn";
import { sessionEvents as e } from "../../../findBestMove/reducer";
import { sessionTreeOf } from "../../../findBestMove/store";
import { parsePgnTree, readPgnTags } from "../../../pgn";
import { isRegisteredJobKind } from "..";
import { registerSubjectRemover } from "../../subjectDeletion";
import { EVALUATE_POSITION_INPUT_VERSION, EVALUATE_POSITION_KIND, RETIRED_EVALUATE_POSITION_KIND, parseEvaluatePositionResult } from "./core";
import { evaluatePositionKind } from "./kind";

vi.mock("../../../engines/builtin", async (importOriginal) =>
  (await import("../../../../views/board/boardTestHarness")).builtinEnginesMock(importOriginal),
);

/*
  Evaluate Position on the jobs runtime (CTA-238; the session's record its
  output since CTA-244): one search, its result a data output, then the
  session's record taking it — `engineSearched` through the session's one
  writer, once — and the Case's deletion taking it while unfinished; v3's
  stored jobs a retired kind's.
*/

const GAME = '[White "Alice"]\n[Black "Bob"]\n\n1. e4 e5 2. Nf3 *';
/** A session over the game, the engine on, position 2 (after 1. e4) wanting its search. */
const session = applied(sessionOfPgn(GAME, { settings: { engine: true, moves: 3 } }), [e.goTo(2), e.firstMove(2)]);
const AFTER_E4 = positionFenOf(session.game, 2)!;

/** The session's Case — the job's subject. */
const seed = async (id = "session") => {
  await addAnalysisCases([gameCaseOf({ id, projectId: "p", name: "Alice – Bob — Find Best Move" }, sessionTreeOf(session, readPgnTags(GAME), PLAIN_WORDS))]);
};

const inputOf = (caseId = "session") => ({
  version: EVALUATE_POSITION_INPUT_VERSION,
  caseId,
  key: 2,
  name: "Evaluate position — Alice – Bob, 1. Black",
  fen: AFTER_E4,
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
  it("searches the position once — its result a data output, then the session's record taking it", async () => {
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
    expect(read?.fen).toBe(AFTER_E4);
    expect(read?.lines[0].depth).toBe(20);
    expect(written).toMatchObject({ kind: "entity", ref: { type: "analysis-case", id: "session" } });

    const record = await caseOf();
    // An event, not a merge: no merge id, the record's tags say it.
    expect(record?.merges).toEqual([]);
    const position = sessionRecordOf(readPgnTags(record!.pgn))?.record.positions.get(2);
    expect(position?.engine).toEqual({ kind: "searched", jobId: queued.id });
    // The answering engine's line — the position's first legal move, +0.20 for Black, White's −0.20.
    expect(position?.lines).toContainEqual(expect.objectContaining({ san: "Nc6", score: { kind: "cp", value: -20 }, listed: true }));
    expect(record?.pgn).not.toContain("[%fbm");
    // Its own engine, the preset it was given, MultiPV the lines asked for, terminated with the run.
    expect(FakeEngine.latest().setOptions).toContainEqual(["Move Overhead", 300]);
    expect(FakeEngine.latest().setOptions).toContainEqual(["MultiPV", 3]);
    expect(FakeEngine.latest().terminated).toBe(true);
  });

  it("writes its search into the session once, and loses none, when the tab dies between any two writes", async () => {
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
      // The same session as the whole run's, but its job's id.
      expect(record?.pgn.replaceAll(job.id, "<job>"), `crash after write ${after}`).toBe(referencePgn?.replaceAll(reference.id, "<job>"));
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

  it("fails `target` when the Case is gone, or holds no session, before its search is written", async () => {
    const clock = manualClock();
    const runtime = started(testRuntime([evaluatePositionKind({ engine: engineDeps() })], memoryJobStore(), clock));
    const queued = await runtime.enqueue(EVALUATE_POSITION_KIND, inputOf("never"));
    if (!("id" in queued)) throw new Error("not queued");
    await runToEnd(runtime, clock, queued.id);
    expect(runtime.snapshot()?.find((each) => each.id === queued.id)).toMatchObject({ status: "failed", error: { code: "target" } });

    // A plain game — no session's tags — is no target either.
    await addAnalysisCases([gameCaseOf({ id: "plain", projectId: "p", name: "Plain" }, parsePgnTree(GAME))]);
    const plain = await runtime.enqueue(EVALUATE_POSITION_KIND, inputOf("plain"));
    if (!("id" in plain)) throw new Error("not queued");
    await runToEnd(runtime, clock, plain.id);
    expect(runtime.snapshot()?.find((each) => each.id === plain.id)).toMatchObject({ status: "failed", error: { code: "target" } });
  });

  it("keeps v3's stored jobs, a retired kind's — never run, deleted alone", async () => {
    const clock = manualClock();
    const store = memoryJobStore();
    // Find Best Move v3's kind, as a build before CTA-244 ran it.
    const v3Kind: JobKind<{ caseId: string }, { done: boolean }> = {
      id: RETIRED_EVALUATE_POSITION_KIND,
      version: 1,
      lane: "engine",
      appliesTo: [],
      resumable: false,
      autoResume: true,
      retry: { maxAttempts: 1, backoff: { initialMs: 1_000, factor: 2, maxMs: 1_000, jitter: false } },
      parseInput: (value) => value as { caseId: string },
      parseState: (value) => value as { done: boolean },
      title: () => "Evaluate position — v3",
      subjects: (input) => [{ type: "analysis-case", id: input.caseId }],
      plan: async () => ({ state: { done: false }, progress: { done: 0, total: 1 } }),
      step: async (state) => ({ state, progress: { done: 1, total: 1 }, done: true }),
      finalize: async () => [],
      applyOutput: async () => {
        throw new Error("never applied");
      },
      classifyError: () => ({ code: "engine", message: "", retryable: false }),
    };
    const before = testRuntime([v3Kind], store, clock);
    const old = await before.enqueue(RETIRED_EVALUATE_POSITION_KIND, { caseId: "session", fen: AFTER_E4, path: ["e4"] });
    if (!("id" in old)) throw new Error("not queued");
    await before.stop();

    expect(isRegisteredJobKind(RETIRED_EVALUATE_POSITION_KIND)).toBe(false);
    expect(isRegisteredJobKind(EVALUATE_POSITION_KIND)).toBe(true);
    const runtime = started(testRuntime([evaluatePositionKind({ engine: engineDeps() })], store, clock));
    await runUntilIdle(runtime);
    expect(runtime.snapshot()?.find((each) => each.id === old.id)).toMatchObject({ status: "queued", kind: RETIRED_EVALUATE_POSITION_KIND });
    expect(await runtime.pause(old.id)).toBeDefined();
    expect(await runtime.remove([old.id])).toBeUndefined();
    await runUntilIdle(runtime);
    expect(runtime.snapshot()?.find((each) => each.id === old.id)).toBeUndefined();
  });
});
