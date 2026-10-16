import { addCaseLinks } from "./analysisCaseLinkStore";
import { addAnalysisCases, loadAnalysisCases, mergeIntoAnalysisCase } from "./analysisCaseStore";
import { loadAnalysisProjects } from "./analysisProjectStore";
import { gameCaseOf } from "./analysisProjects";
import type { EngineDescriptor } from "./engineTypes";
import { openEngineSession, type EngineSessionHooks } from "./jobs/engineSession";
import { ComputerAnalysisError, sourceTreeOf, stepOf, type ComputerAnalysisState } from "./jobs/kinds/computerAnalysis/core";
import {
  jobMoveLabel,
  jobV2AnalysisOf,
  jobV2MergedPgn,
  jobV2OutputName,
  withCheckpointV2,
  type JobV2,
  type JobV2Error,
  type JobV2Output,
} from "./jobsV2";
import { createJobV2LiveFeed, type JobV2LiveFeed } from "./jobV2Live";
import { interruptRunningJobsV2, jobsV2Snapshot, loadJobsV2, subscribeJobsV2, updateJobV2 } from "./jobV2Store";
import { newRecordId } from "./recordId";
import type { GameTree } from "./gameTree";

/**
 * **The Jobs V2 runner** (CTA-188) — Analysis V2's own: one per page, started
 * by the app shell (`JobsV2Shell.tsx`'s `JobV2Runner`), running **one Jobs V2
 * job at a time**, oldest queued first, over `lib/jobV2Store.ts`. The
 * reference is `.claude/rules/analysis-v2.md` §6.
 *
 * - **One tab runs Jobs V2**: it holds its own Web Lock,
 *   {@link JOB_V2_RUNNER_LOCK}, for the page's life; another tab's waits.
 * - **The store is the only channel in** — Pause, Cancel, Resume and Delete,
 *   and a Case or Project deleted taking its jobs: a job no longer `running`
 *   or gone is stopped at once.
 * - **Its own engine, through the engine session** (`lib/jobs/engineSession.ts`,
 *   CTA-218 — the engine work every engine job kind shares): the job's
 *   engine (`options.engine`, falling back as a board does); `Threads`,
 *   `Hash` and each position's `MultiPV` from the job's options, clamped to
 *   what the engine declared, and **the job's own preset** — never the preset
 *   selected when it runs. Each position is one step of the computer-analysis
 *   kind's core (`lib/jobs/kinds/computerAnalysis/core.ts`, `stepOf`) over the
 *   session's `evaluate`; the runner has no engine code of its own.
 * - **The eval sources first** (CTA-193's lichess evaluation API, every
 *   source of the layer since CTA-196 — `lib/evalSources/`, turned on in
 *   Settings → Engine), by the session: a position a source holds at the
 *   job's depth or deeper is its result, one none holds is searched and sent
 *   back to the sources that take writes; a source that does not answer is
 *   said once (the shell's warning) and left alone for the rest of the run.
 * - **A checkpoint after every position** — and, while a position is
 *   searched, **its live progress** (CTA-190): the engine's depth, nodes,
 *   nps, time and best line off each `info` line, a throttled in-memory
 *   snapshot every tab hears (`lib/jobV2Live.ts`), never a store write.
 * - **At the end, by its target**: each ticked variant a new **Game Case** in
 *   the source's Project or another (one `addAnalysisCases`), named
 *   `jobV2OutputName` and **linked from the source Case** (`addCaseLinks` — a
 *   refused link leaves the Case unlinked, the job done); or the one variant
 *   **merged into the source Case** as the
 *   store holds it then (`mergeIntoAnalysisCase` over `jobV2MergedPgn` — the
 *   reader's moves, side lines and comments kept). A target gone fails it
 *   `target`.
 *
 * **Nothing runs at import**: {@link startJobV2Runner} is called from an effect.
 */

/** What the runner is built from — the defaults for the app, small timeouts and a clock for a test. */
export type JobV2RunnerDeps = {
  /** The engine for an id: the registry's, waiting for the engine server's list when the id is one of its engines. */
  engineFor?: (id: string) => Promise<EngineDescriptor>;
  /** How long the engine has to answer `uci` before the job fails. */
  handshakeTimeoutMs?: number;
  /** How long a search may go without a word from the engine — a line or an engine server's heartbeat — before the job fails. */
  silenceTimeoutMs?: number;
  /** Whether to take the Web Lock (absent: where the browser has one). */
  useLock?: boolean;
  now?: () => Date;
  /** Where the running position's live progress goes (CTA-190) — absent, a throttled feed to this tab and the others. */
  liveFeed?: JobV2LiveFeed;
};

export type JobV2Runner = {
  /** Stop: the job being run is left as it is (a reload reads it as interrupted), the lock let go. */
  stop: () => void;
  /** **For tests**: resolves once the runner has nothing to do — no job running, none queued it could take. */
  idle: () => Promise<void>;
};

/** The name of the lock only one tab's Jobs V2 runner holds. */
export const JOB_V2_RUNNER_LOCK = "chessapp.analysisProjects.jobs.runner";

export const createJobV2Runner = ({
  engineFor,
  handshakeTimeoutMs,
  silenceTimeoutMs,
  useLock = typeof navigator !== "undefined" && navigator.locks !== undefined,
  now = () => new Date(),
  liveFeed = createJobV2LiveFeed(),
}: JobV2RunnerDeps = {}): JobV2Runner => {
  let stopped = false;
  let current: { id: string; controller: AbortController; run: Promise<void> } | undefined;
  let unsubscribe: (() => void) | undefined;
  let releaseLock: (() => void) | undefined;
  const lockAbort = typeof AbortController === "undefined" ? undefined : new AbortController();
  let started: Promise<void> = Promise.resolve();

  const iso = () => now().toISOString();

  /** Still this job's run: the record is there, `running`, and nobody asked it to stop. */
  const stillRunning = (id: string, signal: AbortSignal): boolean =>
    !signal.aborted && jobsV2Snapshot()?.find((row) => row.id === id)?.status === "running";

  /**
   * **The results, by the job's target** — each ticked variant a new Game
   * Case in the source's Project or another, linked from the source Case, or
   * the one variant merged into the source Case. A Project or Case gone fails
   * it `target`.
   */
  const saveOutputs = async (job: JobV2, tree: GameTree, descriptor: EngineDescriptor): Promise<JobV2Output[]> => {
    // The engine that ran it names the annotator.
    const ran: JobV2 = { ...job, engine: { id: descriptor.id, name: descriptor.name, version: descriptor.version } };
    const { target } = job;
    if (target.kind === "case") {
      const variant = job.options.outputs[0];
      const problem = await mergeIntoAnalysisCase(job.source.caseId, job.id, (pgn) => jobV2MergedPgn(ran, pgn), now());
      if (problem === "gone") throw new ComputerAnalysisError("target");
      if (problem !== undefined) throw new ComputerAnalysisError(problem === "too-many" ? "too-many" : "storage");
      return [{ variant, projectId: job.source.projectId, caseId: job.source.caseId }];
    }
    if (!(await loadAnalysisProjects()).some((project) => project.id === target.projectId)) throw new ComputerAnalysisError("target");
    const at = now();
    const records = job.options.outputs.map((variant) =>
      gameCaseOf(
        { id: newRecordId(at), projectId: target.projectId, name: jobV2OutputName(job.source.name, variant), now: at },
        jobV2AnalysisOf(ran, tree, variant),
      ),
    );
    await loadAnalysisCases();
    const problem = await addAnalysisCases(records);
    if (problem !== undefined) throw new ComputerAnalysisError(problem === "too-many" ? "too-many" : "storage");
    // Each new Case linked from its source — the Cases are made either way, so a refused link does not fail the job.
    await addCaseLinks(records.map((record) => ({ fromId: job.source.caseId, toId: record.id })), at);
    return records.map((record, index) => ({ variant: job.options.outputs[index], projectId: target.projectId, caseId: record.id }));
  };

  /** Mark the job failed — only while it is still this run's. */
  const fail = (id: string, code: JobV2Error, signal: AbortSignal) =>
    stillRunning(id, signal)
      ? updateJobV2(id, (job) =>
          job.status === "running" ? { ...job, status: "failed", error: code, finishedAt: iso(), updatedAt: iso() } : job,
        )
      : Promise.resolve(undefined);

  /** **One job, from its checkpoint to its outputs.** */
  const run = async (queued: JobV2, signal: AbortSignal): Promise<void> => {
    const { id } = queued;
    const session = await openEngineSession(
      { jobId: id, name: queued.source.name, search: queued.options, preset: queued.preset.values },
      { engineFor, handshakeTimeoutMs, silenceTimeoutMs, now },
    );
    if (signal.aborted) return;
    const descriptor = session.engine;
    // Claim it: queued → running, unless it was cancelled or deleted meanwhile.
    await updateJobV2(id, (job) =>
      job.status === "queued"
        ? {
            ...job,
            status: "running",
            error: null,
            engine: { id: descriptor.id, name: descriptor.name, version: descriptor.version },
            startedAt: job.startedAt ?? iso(),
            updatedAt: iso(),
          }
        : job,
    );
    if (!stillRunning(id, signal)) return;

    // The session's hooks: this run's signal, no lease to renew, the live progress to the feed — cleared after each position.
    const hooks: EngineSessionHooks = {
      signal,
      heartbeat: () => undefined,
      live: (live) => liveFeed.update(live),
      endLive: () => liveFeed.clear(),
    };
    try {
      const job = jobsV2Snapshot()?.find((row) => row.id === id) ?? queued;
      let state: ComputerAnalysisState = { positions: job.positions, checkpoint: job.checkpoint };
      for (;;) {
        if (!stillRunning(id, signal)) return;
        // One position: the source checked against the record's positions (a mismatch fails it `source`), then evaluated.
        const positions = state.positions;
        const step = await stepOf(state, job, (position, index) =>
          session.evaluate({ ...position, index, moveLabel: jobMoveLabel(positions[index]) }, hooks),
        );
        if (step === undefined || !stillRunning(id, signal)) return;
        state = step.state;
        const written = step.checkpointed;
        if (written !== undefined) {
          await updateJobV2(id, (row) => (row.status === "running" ? withCheckpointV2(row, written.index, written.result, now()) : row));
        }
        if (step.done) break;
      }

      session.close();
      if (!stillRunning(id, signal)) return;
      const latest = jobsV2Snapshot()?.find((row) => row.id === id) ?? job;
      const tree = sourceTreeOf(job);
      if (tree === undefined) throw new ComputerAnalysisError("source");
      const outputs = await saveOutputs({ ...latest, checkpoint: state.checkpoint }, tree, descriptor);
      if (!stillRunning(id, signal)) return;
      await updateJobV2(id, (row) =>
        row.status === "running" ? { ...row, status: "done", outputs, finishedAt: iso(), updatedAt: iso() } : row,
      );
    } catch (error) {
      // An engine that failed — no handle, no `uci` answer, silence, no scored line — fails it `engine`.
      await fail(id, error instanceof ComputerAnalysisError ? error.code : "engine", signal);
    } finally {
      session.close();
    }
  };

  /** The oldest queued job — the list is newest first. */
  const nextQueued = (): JobV2 | undefined => {
    const rows = jobsV2Snapshot() ?? [];
    for (let index = rows.length - 1; index >= 0; index -= 1) if (rows[index].status === "queued") return rows[index];
    return undefined;
  };

  /** Start the next job when nothing is running. */
  const pick = () => {
    if (stopped || current !== undefined) return;
    const next = nextQueued();
    if (next === undefined) return;
    const controller = new AbortController();
    const running = run(next, controller.signal)
      .catch(() => undefined)
      .finally(() => {
        current = undefined;
        pick();
      });
    current = { id: next.id, controller, run: running };
  };

  /** The store changed: stop a run its record no longer allows, and take the next job. */
  const onStoreChange = () => {
    const rows = jobsV2Snapshot();
    if (rows === undefined) return;
    if (current !== undefined) {
      const status = rows.find((row) => row.id === current?.id)?.status;
      if (status !== "running" && status !== "queued") current.controller.abort();
    }
    pick();
  };

  /** Taking over: what this page now runs, from a store whose `running` jobs are no one's. */
  const begin = async () => {
    await loadJobsV2();
    if (stopped) return;
    await interruptRunningJobsV2(now());
    if (stopped) return;
    unsubscribe = subscribeJobsV2(onStoreChange);
    onStoreChange();
  };

  if (useLock && typeof navigator !== "undefined" && navigator.locks !== undefined) {
    started = new Promise<void>((resolve) => {
      navigator.locks
        .request(JOB_V2_RUNNER_LOCK, { mode: "exclusive", signal: lockAbort?.signal }, async () => {
          await begin();
          resolve();
          // Held until this page stops the runner (or closes).
          await new Promise<void>((release) => {
            releaseLock = release;
            if (stopped) release();
          });
        })
        .catch(() => resolve());
    });
  } else {
    started = begin();
  }

  const stop = () => {
    stopped = true;
    unsubscribe?.();
    current?.controller.abort();
    liveFeed.clear();
    releaseLock?.();
    lockAbort?.abort();
  };

  const idle = async (): Promise<void> => {
    await started;
    while (current !== undefined) await current.run;
  };

  return { stop, idle };
};

let pageRunner: JobV2Runner | undefined;

/** **Start this page's Jobs V2 runner** — once; a second call is a no-op. Called by the shell from an effect, in dev only. */
export const startJobV2Runner = (deps?: JobV2RunnerDeps): JobV2Runner => (pageRunner ??= createJobV2Runner(deps));

/** **For tests**: stop this page's Jobs V2 runner and forget it. */
export const stopJobV2Runner = (): void => {
  pageRunner?.stop();
  pageRunner = undefined;
};
