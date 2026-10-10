import { annotatorOf } from "./engineEvals";
import {
  moveVerdicts,
  shouldStopEarly,
  terminalResultOf,
  withSearchInfo,
  type AnalysisPosition,
  type ComputerAnalysisOptions,
  type PositionLine,
  type PositionResult,
} from "./computerAnalysis";
import { computerAnalysisTree } from "./computerAnalysisTree";
import { DEFAULT_ANALYSIS_SETTINGS } from "./analysisSettings";
import { connectEngineServer, readEngineServerUrl } from "./engineServer";
import { BOARD_OWNED_OPTIONS, resolveEnginePreset, selectedPresetValues } from "./enginePresets";
import { loadEnginePresetSelections, loadEnginePresets } from "./enginePresetStore";
import type { EngineDescriptor, EngineHandle, EngineOption } from "./engineTypes";
import { engineSettingBoundsOf } from "./engineSettings";
import type { GameTree } from "./gameTree";
import { getEngine, isHostedEngineId, resolveEngine } from "./engines";
import { jobOutputName, jobSearchOf, withCheckpoint, type Job, type JobError, type JobOutput } from "./jobs";
import { interruptRunningJobs, jobsSnapshot, loadJobs, subscribeJobs, updateJob } from "./jobStore";
import { newRecordId } from "./recordId";
import { savedAnalysisOf } from "./savedAnalyses";
import { loadAnalysisFolders } from "./savedAnalysisFolderStore";
import { addAnalyses } from "./savedAnalysisStore";

/**
 * **The background job runner** (CTA-173, CTA-171) — one per page, started
 * by the app shell (`views/jobs/JobRunner.tsx`), never by a board, so a job
 * outlives every navigation. It runs **one job at a time**, oldest queued
 * first, over the store (`lib/jobStore.ts`); the reference is
 * `.claude/rules/jobs.md`.
 *
 * - **One tab runs jobs.** It holds a Web Lock (`navigator.locks`) for as
 *   long as the page lives; another tab's runner waits for it, and takes over
 *   when this tab closes. Only the holder turns a job it reads as `running`
 *   into `interrupted` on taking the lock — a run that tab no longer has.
 *   Where the browser has no Web Locks (jsdom), every runner runs.
 * - **The store is the only channel in.** Enqueue, Cancel, Resume and Delete
 *   are store writes from any tab; the runner subscribes and acts on what it
 *   reads — a job no longer `running` (cancelled) or gone (deleted) is
 *   stopped at once: its search ended, its engine terminated.
 * - **Its own engine.** A job builds an `EngineHandle` from the registry —
 *   the options' engine, falling back to the default as `useEngineModule`
 *   does (`resolveEngine`) — separate from any board's, and sets `Threads`,
 *   `Hash` and each position's `MultiPV`, each clamped to what the engine
 *   declared, and beside them **the engine's preset** (CTA-179,
 *   `lib/enginePresets.ts`) — the values its selected preset sets, met
 *   against what it declared, the job's own three never taken from it. The
 *   protocol discipline (`chessboard.md` §4.1) is the handle's.
 * - **Each position** is searched to the options' depth and time; its lines
 *   are folded in as they arrive (`withSearchInfo`) and the search is stopped
 *   early when `shouldStopEarly` says so. A mate or stalemate on the board is
 *   not searched (`terminalResultOf`), nor a position whose move is not
 *   analysed and whose stored `[%eval]` is already as deep as asked.
 * - **A checkpoint after every position** — its result written into the
 *   record — so a resumed job starts from the first position with none.
 * - **At the end** every ticked variant is built (`computerAnalysisTree`)
 *   and saved as a new Saved analysis in the source's folder, all in one
 *   `addAnalyses`; the job is then `done` and names them.
 * - **A failure** — the source no longer reads, the engine never answers or
 *   goes silent, the outputs cannot be written — marks the job `failed` with
 *   its reason; Resume tries again from the checkpoint.
 *
 * **Nothing runs at import** (the pre-render imports the shell under Node):
 * {@link startJobRunner} is called from an effect.
 */

/** What the runner is built from — the defaults for the app, small timeouts and a clock for a test. */
export type JobRunnerDeps = {
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

export type JobRunner = {
  /** Stop: the job being run is left as it is (a reload reads it as interrupted), the lock let go. */
  stop: () => void;
  /** **For tests**: resolves once the runner has nothing to do — no job running, none queued it could take. */
  idle: () => Promise<void>;
};

/** The name of the lock only one tab's runner holds. */
export const JOB_RUNNER_LOCK = "chessapp.jobs.runner";

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
  readonly code: JobError;
  constructor(code: JobError) {
    super(code);
    this.code = code;
  }
}

/** The stop signal of one run: whether it was asked to stop, and what to do when it is. */
type Abort = { aborted: boolean; onAbort: Set<() => void> };

export const createJobRunner = ({
  engineFor = registryEngineFor,
  handshakeTimeoutMs = HANDSHAKE_TIMEOUT_MS,
  silenceTimeoutMs = SILENCE_TIMEOUT_MS,
  useLock = typeof navigator !== "undefined" && navigator.locks !== undefined,
  now = () => new Date(),
}: JobRunnerDeps = {}): JobRunner => {
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
    !signal.aborted && jobsSnapshot()?.find((row) => row.id === id)?.status === "running";

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

  /** Every ticked variant as a new Saved analysis, in the source's folder (Unfiled where it has gone). */
  const saveOutputs = async (
    job: Job,
    input: { tree: GameTree; positions: AnalysisPosition[] },
    results: readonly (PositionResult | undefined)[],
    descriptor: EngineDescriptor,
  ): Promise<JobOutput[]> => {
    const verdicts = moveVerdicts(input.positions, results, job.options);
    const folders = await loadAnalysisFolders();
    const folderId =
      job.source.folderId !== null && folders.some((folder) => folder.id === job.source.folderId) ? job.source.folderId : null;
    const at = now();
    const records = job.options.outputs.map((variant) => {
      const tree = computerAnalysisTree({
        source: input.tree,
        positions: input.positions,
        results,
        verdicts,
        variant,
        engine: annotatorOf(descriptor),
        options: job.options,
      });
      return {
        variant,
        record: {
          ...savedAnalysisOf(newRecordId(at), tree, [], DEFAULT_ANALYSIS_SETTINGS, "white", at),
          name: jobOutputName(job.source.name, variant),
          folderId,
        },
      };
    });
    const problem = await addAnalyses(records.map(({ record }) => record));
    if (problem !== undefined) throw new JobFailure(problem === "too-many" ? "too-many" : "storage");
    return records.map(({ variant, record }) => ({ variant, analysisId: record.id }));
  };

  /** Mark the job failed — only while it is still this run's. */
  const fail = (id: string, code: JobError, signal: Abort) =>
    stillRunning(id, signal)
      ? updateJob(id, (job) =>
          job.status === "running" ? { ...job, status: "failed", error: code, finishedAt: iso(), updatedAt: iso() } : job,
        )
      : Promise.resolve(undefined);

  /** **One job, from its checkpoint to its outputs.** */
  const run = async (queued: Job, signal: Abort): Promise<void> => {
    const { id } = queued;
    const descriptor = await engineFor(queued.options.engine);
    if (signal.aborted) return;
    // Claim it: queued → running, unless it was cancelled or deleted meanwhile.
    await updateJob(id, (job) =>
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
      const job = jobsSnapshot()?.find((row) => row.id === id) ?? queued;
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
            // The engine's preset, as a board sends it — read now, so a change made since the job was queued applies.
            const [presets, selections] = await Promise.all([loadEnginePresets(), loadEnginePresetSelections()]);
            if (!stillRunning(id, signal)) return;
            const { send } = resolveEnginePreset(selectedPresetValues(presets, selections, descriptor.id), engine.options, {
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
        await updateJob(id, (row) => (row.status === "running" ? withCheckpoint(row, index, checkpointed, now()) : row));
      }

      handle?.terminate();
      handle = undefined;
      if (!stillRunning(id, signal)) return;
      const outputs = await saveOutputs(job, source, results, descriptor);
      await updateJob(id, (row) =>
        row.status === "running" ? { ...row, status: "done", outputs, finishedAt: iso(), updatedAt: iso() } : row,
      );
    } catch (error) {
      await fail(id, error instanceof JobFailure ? error.code : "engine", signal);
    } finally {
      handle?.terminate();
    }
  };

  /** The oldest queued job — the list is newest first. */
  const nextQueued = (): Job | undefined => {
    const rows = jobsSnapshot() ?? [];
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
    const rows = jobsSnapshot();
    if (rows === undefined) return;
    if (current !== undefined) {
      const status = rows.find((row) => row.id === current?.id)?.status;
      if (status !== "running" && status !== "queued") abort(current.abort);
    }
    pick();
  };

  /** Taking over: what this page now runs, from a store whose `running` jobs are no one's. */
  const begin = async () => {
    await loadJobs();
    if (stopped) return;
    await interruptRunningJobs(now());
    if (stopped) return;
    unsubscribe = subscribeJobs(onStoreChange);
    onStoreChange();
  };

  if (useLock && typeof navigator !== "undefined" && navigator.locks !== undefined) {
    started = new Promise<void>((resolve) => {
      navigator.locks
        .request(JOB_RUNNER_LOCK, { mode: "exclusive", signal: lockAbort?.signal }, async () => {
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

let pageRunner: JobRunner | undefined;

/**
 * **Start this page's runner** — once; a second call is a no-op. Called by
 * the app shell from an effect, so the pre-render never starts one.
 */
export const startJobRunner = (deps?: JobRunnerDeps): JobRunner => (pageRunner ??= createJobRunner(deps));

/** **For tests**: stop this page's runner and forget it. */
export const stopJobRunner = (): void => {
  pageRunner?.stop();
  pageRunner = undefined;
};
