import { addCaseLinks } from "./analysisCaseLinkStore";
import { addAnalysisCases, loadAnalysisCases, mergeIntoAnalysisCase } from "./analysisCaseStore";
import { loadAnalysisProjects } from "./analysisProjectStore";
import { gameCaseOf } from "./analysisProjects";
import {
  shouldStopEarly,
  terminalResultOf,
  withSearchInfo,
  type AnalysisPosition,
  type ComputerAnalysisOptions,
  type PositionLine,
  type PositionResult,
} from "./computerAnalysis";
import { connectEngineServer, readEngineServerUrl } from "./engineServer";
import { BOARD_OWNED_OPTIONS, resolveEnginePreset } from "./enginePresets";
import type { EngineDescriptor, EngineHandle, EngineOption } from "./engineTypes";
import { engineSettingBoundsOf } from "./engineSettings";
import { getEngine, isHostedEngineId, resolveEngine } from "./engines";
import { jobSearchOf } from "./jobs";
import {
  jobV2AnalysisOf,
  jobV2MergedPgn,
  jobV2OutputName,
  withCheckpointV2,
  type JobV2,
  type JobV2Error,
  type JobV2Output,
} from "./jobsV2";
import { interruptRunningJobsV2, jobsV2Snapshot, loadJobsV2, subscribeJobsV2, updateJobV2 } from "./jobV2Store";
import { newRecordId } from "./recordId";
import type { GameTree } from "./gameTree";

/**
 * **The Jobs V2 runner** (CTA-188) — Analysis V2's own, a clone of the legacy
 * `lib/jobRunner.ts` (`.claude/rules/jobs.md` §3), which it never touches: one
 * per page, started by the app shell in dev only (`JobsV2Shell.tsx`'s
 * `JobV2Runner`), running **one Jobs V2 job at a time**, oldest queued first,
 * over `lib/jobV2Store.ts`. A V1 job and a V2 job may run at the same time —
 * each runner its own engine. The reference is `.claude/rules/analysis-v2.md` §6.
 *
 * - **One tab runs Jobs V2**: it holds its own Web Lock,
 *   {@link JOB_V2_RUNNER_LOCK}, for the page's life; another tab's waits.
 * - **The store is the only channel in** — Pause, Cancel, Resume and Delete,
 *   and a Case or Project deleted taking its jobs: a job no longer `running`
 *   or gone is stopped at once.
 * - **Its own engine**, the job's (`options.engine`, falling back as a board
 *   does); `Threads`, `Hash` and each position's `MultiPV` from the job's
 *   options, clamped to what the engine declared, and **the job's own preset**
 *   (`job.preset.values`, met against the engine) — never the preset selected
 *   when it runs.
 * - **A checkpoint after every position.**
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
  /** How long a search may go without a word from the engine before the job fails. */
  silenceTimeoutMs?: number;
  /** Whether to take the Web Lock (absent: where the browser has one). */
  useLock?: boolean;
  now?: () => Date;
};

export type JobV2Runner = {
  /** Stop: the job being run is left as it is (a reload reads it as interrupted), the lock let go. */
  stop: () => void;
  /** **For tests**: resolves once the runner has nothing to do — no job running, none queued it could take. */
  idle: () => Promise<void>;
};

/** The name of the lock only one tab's Jobs V2 runner holds — not V1's (`chessapp.jobs.runner`). */
export const JOB_V2_RUNNER_LOCK = "chessapp.analysisProjects.jobs.runner";

const HANDSHAKE_TIMEOUT_MS = 30_000;
const SILENCE_TIMEOUT_MS = 120_000;

/** The registry's engine for `id`, after the engine server's list has been read for one of its engines. */
const registryEngineFor = async (id: string): Promise<EngineDescriptor> => {
  if (isHostedEngineId(id) && getEngine(id) === undefined && readEngineServerUrl() !== undefined) {
    await connectEngineServer();
  }
  return resolveEngine(id);
};

/** `value` pulled into the bounds an engine declared for an option (unchanged where it gave none). */
const clampToOption = (option: EngineOption | undefined, value: number): number =>
  option?.min === undefined || option.max === undefined ? value : Math.min(option.max, Math.max(option.min, value));

/** A job ended for a reason, with what the runner learnt. */
class JobFailure extends Error {
  readonly code: JobV2Error;
  constructor(code: JobV2Error) {
    super(code);
    this.code = code;
  }
}

/** The stop signal of one run: whether it was asked to stop, and what to do when it is. */
type Abort = { aborted: boolean; onAbort: Set<() => void> };

export const createJobV2Runner = ({
  engineFor = registryEngineFor,
  handshakeTimeoutMs = HANDSHAKE_TIMEOUT_MS,
  silenceTimeoutMs = SILENCE_TIMEOUT_MS,
  useLock = typeof navigator !== "undefined" && navigator.locks !== undefined,
  now = () => new Date(),
}: JobV2RunnerDeps = {}): JobV2Runner => {
  let stopped = false;
  let current: { id: string; abort: Abort; run: Promise<void> } | undefined;
  let unsubscribe: (() => void) | undefined;
  let releaseLock: (() => void) | undefined;
  const lockAbort = typeof AbortController === "undefined" ? undefined : new AbortController();
  let started: Promise<void> = Promise.resolve();

  const iso = () => now().toISOString();

  const abort = (signal: Abort) => {
    if (signal.aborted) return;
    signal.aborted = true;
    for (const callback of signal.onAbort) callback();
  };

  /** Still this job's run: the record is there, `running`, and nobody asked it to stop. */
  const stillRunning = (id: string, signal: Abort): boolean =>
    !signal.aborted && jobsV2Snapshot()?.find((row) => row.id === id)?.status === "running";

  /** The engine's `uci` answer, or a failure after the timeout. */
  const handshake = (handle: EngineHandle, signal: Abort): Promise<void> =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        off();
        reject(new JobFailure("engine"));
      }, handshakeTimeoutMs);
      const cleanup = () => {
        clearTimeout(timer);
        signal.onAbort.delete(onAbort);
      };
      const onAbort = () => {
        cleanup();
        off();
        resolve();
      };
      signal.onAbort.add(onAbort);
      const off = handle.whenOptionsReady(() => {
        cleanup();
        resolve();
      });
    });

  /**
   * **One position's search**: its lines, line 1 first — `undefined` when the
   * run was stopped. Stopped early by `shouldStopEarly`; failed when the
   * engine goes quiet for longer than the silence timeout, or ends the search
   * without a single scored line.
   */
  const searchPosition = (
    handle: EngineHandle,
    position: AnalysisPosition,
    options: ComputerAnalysisOptions,
    signal: Abort,
  ): Promise<PositionLine[] | undefined> =>
    new Promise((resolve, reject) => {
      let lines: (PositionLine | undefined)[] = [];
      let stopping = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = () => {
        clearTimeout(timer);
        off();
        signal.onAbort.delete(onAbort);
      };
      const listen = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          finish();
          reject(new JobFailure("engine"));
        }, silenceTimeoutMs);
      };
      const onAbort = () => {
        finish();
        resolve(undefined);
      };
      const off = handle.onMessage((message) => {
        if (message.fen !== position.fen) return;
        listen();
        if (message.pv !== undefined && message.depth !== undefined) {
          lines = withSearchInfo(lines, message, position.turn);
          if (!stopping && shouldStopEarly(lines, position.turn, message.depth, options)) {
            stopping = true;
            handle.stop();
          }
        }
        if (message.bestMove === undefined) return;
        finish();
        if (lines[0] === undefined) {
          reject(new JobFailure("engine"));
          return;
        }
        // Lines the search never reached past a gap are out of order: they end there.
        const gap = lines.findIndex((line) => line === undefined);
        resolve((gap === -1 ? lines : lines.slice(0, gap)) as PositionLine[]);
      });
      signal.onAbort.add(onAbort);
      listen();
      handle.setOption("MultiPV", clampToOption(handle.options.get("MultiPV"), position.multiPv));
      handle.search(position.fen, { depth: options.depth, movetime: options.moveTimeMs });
    });

  /** A position's result without the engine: a finished position's, or a deep enough stored eval's. */
  const resultWithoutSearch = (position: AnalysisPosition, options: ComputerAnalysisOptions): PositionResult | undefined => {
    if (position.terminal) return terminalResultOf(position.fen);
    const stored = position.storedEval;
    if (!position.analysed && stored?.depth !== undefined && stored.depth >= options.depth) {
      return { fen: position.fen, lines: [{ score: stored.score, depth: stored.depth, pv: [] }] };
    }
    return undefined;
  };

  /**
   * **The results, by the job's target** — each ticked variant a new Game
   * Case in the source's Project or another, linked from the source Case, or
   * the one variant merged into the source Case. A Project or Case gone fails
   * it `target`.
   */
  const saveOutputs = async (
    job: JobV2,
    input: { tree: GameTree },
    descriptor: EngineDescriptor,
  ): Promise<JobV2Output[]> => {
    // The engine that ran it names the annotator, as V1's outputs do.
    const ran: JobV2 = { ...job, engine: { id: descriptor.id, name: descriptor.name, version: descriptor.version } };
    const { target } = job;
    if (target.kind === "case") {
      const variant = job.options.outputs[0];
      const problem = await mergeIntoAnalysisCase(job.source.caseId, job.id, (pgn) => jobV2MergedPgn(ran, pgn), now());
      if (problem === "gone") throw new JobFailure("target");
      if (problem !== undefined) throw new JobFailure(problem === "too-many" ? "too-many" : "storage");
      return [{ variant, projectId: job.source.projectId, caseId: job.source.caseId }];
    }
    if (!(await loadAnalysisProjects()).some((project) => project.id === target.projectId)) throw new JobFailure("target");
    const at = now();
    const records = job.options.outputs.map((variant) =>
      gameCaseOf(
        { id: newRecordId(at), projectId: target.projectId, name: jobV2OutputName(job.source.name, variant), now: at },
        jobV2AnalysisOf(ran, input.tree, variant),
      ),
    );
    await loadAnalysisCases();
    const problem = await addAnalysisCases(records);
    if (problem !== undefined) throw new JobFailure(problem === "too-many" ? "too-many" : "storage");
    // Each new Case linked from its source — the Cases are made either way, so a refused link does not fail the job.
    await addCaseLinks(records.map((record) => ({ fromId: job.source.caseId, toId: record.id })), at);
    return records.map((record, index) => ({ variant: job.options.outputs[index], projectId: target.projectId, caseId: record.id }));
  };

  /** Mark the job failed — only while it is still this run's. */
  const fail = (id: string, code: JobV2Error, signal: Abort) =>
    stillRunning(id, signal)
      ? updateJobV2(id, (job) =>
          job.status === "running" ? { ...job, status: "failed", error: code, finishedAt: iso(), updatedAt: iso() } : job,
        )
      : Promise.resolve(undefined);

  /** **One job, from its checkpoint to its outputs.** */
  const run = async (queued: JobV2, signal: Abort): Promise<void> => {
    const { id } = queued;
    const descriptor = await engineFor(queued.options.engine);
    if (signal.aborted) return;
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

    let handle: EngineHandle | undefined;
    try {
      const job = jobsV2Snapshot()?.find((row) => row.id === id) ?? queued;
      const source = jobSearchOf(job.source, job.options);
      // The positions searched must be the ones the record's checkpoint is about.
      if (
        source === undefined ||
        source.positions.length !== job.positions.length ||
        source.positions.some((position, index) => position.fen !== job.positions[index].fen)
      ) {
        throw new JobFailure("source");
      }

      const results: (PositionResult | undefined)[] = job.checkpoint.map((entry) => entry ?? undefined);
      for (const [index, position] of source.positions.entries()) {
        if (!stillRunning(id, signal)) return;
        if (results[index] !== undefined) continue;

        let result = resultWithoutSearch(position, job.options);
        if (result === undefined) {
          if (handle === undefined) {
            try {
              handle = descriptor.create();
            } catch {
              throw new JobFailure("engine");
            }
            const engine = handle;
            signal.onAbort.add(() => engine.stop());
            await handshake(engine, signal);
            if (!stillRunning(id, signal)) return;
            /*
              Held first to the running engine's own bounds — a job queued for
              an engine server's engine that fell back to an in-browser build
              must not ask it for a hash the tab cannot hold (CTA-175) — then
              to what the engine declared, the last word.
            */
            const bounds = engineSettingBoundsOf(descriptor.id);
            engine.setOption(
              "Threads",
              clampToOption(engine.options.get("Threads"), Math.min(job.options.threads, bounds.threads.max)),
            );
            engine.setOption("Hash", clampToOption(engine.options.get("Hash"), Math.min(job.options.hashMb, bounds.hashMb.max)));
            // The preset the job was given — never the one selected now — met against what the engine declared.
            const { send } = resolveEnginePreset(job.preset.values, engine.options, {
              inBrowser: descriptor.server === undefined,
              owned: BOARD_OWNED_OPTIONS,
            });
            for (const [name, value] of Object.entries(send)) engine.setOption(name, value);
          }
          const lines = await searchPosition(handle, position, job.options, signal);
          if (lines === undefined || !stillRunning(id, signal)) return;
          result = { fen: position.fen, lines };
        }

        results[index] = result;
        const checkpointed = result;
        await updateJobV2(id, (row) => (row.status === "running" ? withCheckpointV2(row, index, checkpointed, now()) : row));
      }

      handle?.terminate();
      handle = undefined;
      if (!stillRunning(id, signal)) return;
      const latest = jobsV2Snapshot()?.find((row) => row.id === id) ?? job;
      const outputs = await saveOutputs({ ...latest, checkpoint: results.map((entry) => entry ?? null) }, source, descriptor);
      if (!stillRunning(id, signal)) return;
      await updateJobV2(id, (row) =>
        row.status === "running" ? { ...row, status: "done", outputs, finishedAt: iso(), updatedAt: iso() } : row,
      );
    } catch (error) {
      await fail(id, error instanceof JobFailure ? error.code : "engine", signal);
    } finally {
      handle?.terminate();
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
    const signal: Abort = { aborted: false, onAbort: new Set() };
    const running = run(next, signal)
      .catch(() => undefined)
      .finally(() => {
        current = undefined;
        pick();
      });
    current = { id: next.id, abort: signal, run: running };
  };

  /** The store changed: stop a run its record no longer allows, and take the next job. */
  const onStoreChange = () => {
    const rows = jobsV2Snapshot();
    if (rows === undefined) return;
    if (current !== undefined) {
      const status = rows.find((row) => row.id === current?.id)?.status;
      if (status !== "running" && status !== "queued") abort(current.abort);
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
    if (current !== undefined) abort(current.abort);
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
