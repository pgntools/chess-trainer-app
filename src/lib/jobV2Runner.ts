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
import { pvToSan } from "./engineAnalysis";
import { connectEngineServer, readEngineServerUrl } from "./engineServer";
import { BOARD_OWNED_OPTIONS, resolveEnginePreset } from "./enginePresets";
import type { EngineDescriptor, EngineHandle, EngineOption } from "./engineTypes";
import { engineSettingBoundsOf } from "./engineSettings";
import { getEngine, isHostedEngineId, resolveEngine } from "./engines";
import {
  jobMoveLabel,
  jobSearchOf,
  jobV2AnalysisOf,
  jobV2MergedPgn,
  jobV2OutputName,
  withCheckpointV2,
  type JobV2,
  type JobV2Error,
  type JobV2Output,
} from "./jobsV2";
import { createJobV2LiveFeed, type JobV2Live, type JobV2LiveFeed } from "./jobV2Live";
import { lichessEvalApiUrl, lichessEvalApiWriteUrl, reportLichessEvalUnreachable } from "./jobsSettings";
import {
  lichessEvalEntryOf,
  lookupLichessEval,
  positionResultOfLichessEval,
  writeLichessEval,
  type LichessEvalLookup,
} from "./lichessEvalApi";
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
 * - **Its own engine**, the job's (`options.engine`, falling back as a board
 *   does); `Threads`, `Hash` and each position's `MultiPV` from the job's
 *   options, clamped to what the engine declared, and **the job's own preset**
 *   (`job.preset.values`, met against the engine) — never the preset selected
 *   when it runs.
 * - **The lichess evaluation API first** (CTA-193), while the Jobs settings
 *   turn it on (`lib/jobsSettings.ts`): a position the API holds at the job's
 *   depth or deeper is its result — its lines up to the position's `MultiPV`
 *   — and no engine searches it; one it lacks, or holds shallower, is
 *   searched. An API that does not answer is said once
 *   (`reportLichessEvalUnreachable`, the shell's warning) and left alone for
 *   the rest of the run, which goes on with the engine. With **write** ticked
 *   too, each position the engine searched is sent to it (`POST /evals`);
 *   a write it does not take is said once, and the run sends no more.
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

const HANDSHAKE_TIMEOUT_MS = 30_000;
const SILENCE_TIMEOUT_MS = 120_000;
/** How many moves of the best line the live progress carries. */
const LIVE_LINE_MOVES = 6;

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
  liveFeed = createJobV2LiveFeed(),
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
   * **One position's search**: its lines, line 1 first, and the nodes the
   * engine last reported — `undefined` when the run was stopped. Stopped early by `shouldStopEarly`; failed when the
   * engine goes quiet for longer than the silence timeout, or ends the search
   * without a single scored line. Every word the engine says about it goes to
   * the live feed (CTA-190), cleared however the search ends.
   *
   * **Quiet is not silent** (CTA-194): deep in a search Stockfish says nothing
   * for minutes, so an engine server sends a `heartbeat` while its engine is
   * alive but quiet — heard like an `info` line (the timer starts again, the
   * live snapshot's `heardAt` moves on), changing no line, depth or score. An
   * engine that sends none — an in-browser one, an older engine server — is
   * held to the silence timeout as before, and so is a server whose engine died.
   */
  const searchPosition = (
    handle: EngineHandle,
    job: JobV2,
    index: number,
    position: AnalysisPosition,
    options: ComputerAnalysisOptions,
    signal: Abort,
  ): Promise<{ lines: PositionLine[]; nodes?: number } | undefined> =>
    new Promise((resolve, reject) => {
      let lines: (PositionLine | undefined)[] = [];
      let stopping = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const startedAt = now().getTime();
      const jobPosition = job.positions[index];
      let live: JobV2Live = {
        jobId: job.id,
        index,
        move: jobPosition === undefined ? undefined : jobMoveLabel(jobPosition),
        depth: 0,
        elapsedMs: 0,
        line: [],
        heardAt: startedAt,
      };
      const finish = () => {
        clearTimeout(timer);
        off();
        signal.onAbort.delete(onAbort);
        liveFeed.clear();
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
        if (message.heartbeat) {
          // The engine server's word that its engine is alive through a long silence (CTA-194): heard, nothing more.
          const heardAt = now().getTime();
          live = { ...live, elapsedMs: Math.max(live.elapsedMs, heardAt - startedAt), heardAt };
          liveFeed.update(live);
          return;
        }
        const best = lines[0];
        if (message.pv !== undefined && message.depth !== undefined) {
          lines = withSearchInfo(lines, message, position.turn);
          if (!stopping && shouldStopEarly(lines, position.turn, message.depth, options)) {
            stopping = true;
            handle.stop();
          }
        }
        if (message.bestMove === undefined) {
          // A field a line does not carry keeps what an earlier one said (a `currmove` line has no nodes).
          const heardAt = now().getTime();
          const first = lines[0];
          live = {
            ...live,
            depth: message.depth || live.depth,
            seldepth: message.seldepth ?? live.seldepth,
            nodes: message.nodes ?? live.nodes,
            nps: message.nps ?? live.nps,
            hashfull: message.hashfull ?? live.hashfull,
            // The engine's own clock where it says; else the runner's, never going back.
            elapsedMs: message.time ?? Math.max(live.elapsedMs, heardAt - startedAt),
            score: first?.score,
            line: first === best ? live.line : pvToSan(position.fen, first?.pv.slice(0, LIVE_LINE_MOVES).join(" ") ?? ""),
            heardAt,
          };
          liveFeed.update(live);
          return;
        }
        finish();
        if (lines[0] === undefined) {
          reject(new JobFailure("engine"));
          return;
        }
        // Lines the search never reached past a gap are out of order: they end there.
        const gap = lines.findIndex((line) => line === undefined);
        resolve({ lines: (gap === -1 ? lines : lines.slice(0, gap)) as PositionLine[], nodes: live.nodes });
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

  /** `call` with an `AbortSignal` given up at once when the run is stopped. */
  const untilAborted = async <T>(signal: Abort, call: (aborted: AbortSignal) => Promise<T>): Promise<T> => {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal.onAbort.add(onAbort);
    try {
      return await call(controller.signal);
    } finally {
      signal.onAbort.delete(onAbort);
    }
  };

  /** Ask the lichess evaluation API about a position. */
  const askEvalApi = (url: string, fen: string, signal: Abort): Promise<LichessEvalLookup> =>
    untilAborted(signal, (aborted) => lookupLichessEval(url, fen, aborted));

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
    // The engine that ran it names the annotator.
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
      // The lichess evaluation API, while it is on — until it fails to answer once in this run (CTA-193).
      let evalApi = lichessEvalApiUrl();
      // Where the engine's evals go, while writing is ticked — until a write is not taken once in this run.
      let evalApiWrite = lichessEvalApiWriteUrl();
      for (const [index, position] of source.positions.entries()) {
        if (!stillRunning(id, signal)) return;
        if (results[index] !== undefined) continue;

        let result = resultWithoutSearch(position, job.options);
        if (result === undefined && evalApi !== undefined) {
          const answer = await askEvalApi(evalApi, position.fen, signal);
          if (!stillRunning(id, signal)) return;
          if (answer.kind === "found") result = positionResultOfLichessEval(position, answer.eval, job.options.depth);
          else if (answer.kind === "unreachable") {
            // An API that does not answer a lookup takes no write either.
            evalApi = undefined;
            evalApiWrite = undefined;
            reportLichessEvalUnreachable({ jobId: id, name: job.source.name, kind: "read" });
          }
        }
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
          const searched = await searchPosition(handle, job, index, position, job.options, signal);
          if (searched === undefined || !stillRunning(id, signal)) return;
          result = { fen: position.fen, lines: searched.lines };
          // The engine's eval sent to the API, where writing is on — only what the engine searched, never the API's own.
          const entry = evalApiWrite === undefined ? undefined : lichessEvalEntryOf(result, { nodes: searched.nodes, engine: descriptor.name });
          if (evalApiWrite !== undefined && entry !== undefined) {
            const url = evalApiWrite;
            const taken = await untilAborted(signal, (aborted) => writeLichessEval(url, entry, aborted));
            if (!stillRunning(id, signal)) return;
            if (!taken) {
              evalApiWrite = undefined;
              reportLichessEvalUnreachable({ jobId: id, name: job.source.name, kind: "write" });
            }
          }
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
