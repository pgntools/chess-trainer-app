import {
  shouldStopEarly,
  terminalResultOf,
  withSearchInfo,
  type AnalysisPosition,
  type ComputerAnalysisOptions,
  type PositionLine,
  type PositionResult,
} from "../computerAnalysis";
import { pvToSan, type Score } from "../engineAnalysis";
import { connectEngineServer, readEngineServerUrl } from "../engineServer";
import { BOARD_OWNED_OPTIONS, resolveEnginePreset } from "../enginePresets";
import type { EngineDescriptor, EngineHandle, EngineOption, UciOptionValue } from "../engineTypes";
import { engineSettingBoundsOf } from "../engineSettings";
import { getEngine, isHostedEngineId, resolveEngine } from "../engines";
import { askEvalSources, recordInEvalSources, reportEvalSourceUnreachable } from "../evalSources";

/**
 * **The engine session** (CTA-218) — the engine work every engine-lane job
 * kind shares, extracted from the Jobs V2 runner: one job's run of one
 * engine, position after position.
 *
 * - **Its engine**: the job's (`search.engine`), falling back as a board does
 *   (`resolveEngine`), a `hosted:…` id waiting for the engine server's list
 *   first — resolved by {@link openEngineSession}; the handle **built lazily**,
 *   at the first position the session has to search, and terminated by
 *   {@link EngineSession.close}. Nothing at module scope.
 * - **The handshake**: the `uci` answer within 30 s, then `Threads` and `Hash`
 *   from the search and **the job's preset** (`resolveEnginePreset`, the
 *   board-owned options never taken from it), and before each search
 *   `MultiPV` — each clamped to what the engine declared.
 * - **The eval sources first** (CTA-196): a position they hold at the
 *   search's depth or deeper is their answer; one they do not is searched,
 *   and what the engine found is sent back to those that take writes
 *   (CTA-202's minimum depth is theirs). A source that does not answer — a
 *   read or a write — is said once (`reportEvalSourceUnreachable`) and left
 *   alone for the rest of the session.
 * - **One {@link EngineSession.evaluate} per position**: a mate or stalemate,
 *   and a position whose move is not analysed with a stored `[%eval]` deep
 *   enough, need no engine; a search stops early by `shouldStopEarly`, and
 *   fails when the engine goes silent for longer than the timeout — **fed by
 *   its `info` lines and by an engine server's heartbeat** (CTA-194) — or
 *   ends without a scored line.
 * - **Its hooks** are a structural subset of the jobs runtime's `StepContext`
 *   — `signal` (the search stopped at once), `heartbeat()` (each word heard)
 *   and `live(payload)` (each word, as an {@link EngineSessionLive}) — so a
 *   kind hands it its step's context as it is.
 */

/** The engine's live progress on the position it searches — a job's `live` payload (CTA-190). */
export type EngineSessionLive = {
  jobId: string;
  /** The position being searched — its index in the job's positions. */
  index: number;
  /** The move judged from that position ("7. Nf3"), as the panel's progress caption names it — `undefined` at the game's last position. */
  move?: string;
  depth: number;
  seldepth?: number;
  nodes?: number;
  nps?: number;
  /** How full the engine's hash table is, in permille, where it says. */
  hashfull?: number;
  /** Milliseconds spent on this position — the engine's own `time`, else the session's clock. */
  elapsedMs: number;
  /** The best line so far: its score (White's view) and its first moves in SAN. */
  score?: Score;
  line: readonly string[];
  /**
   * When the engine was last heard about this position (ms since the epoch) —
   * an `info` line, or an engine server's heartbeat through a long silence
   * (CTA-194).
   */
  heardAt: number;
};

/**
 * **What a step lends the session** — the runtime's `StepContext` fits it as
 * it is. `endLive` is not the runtime's (which clears a job's live progress
 * when its run ends): a caller that clears it between positions passes one.
 */
export type EngineSessionHooks = {
  readonly signal: AbortSignal;
  heartbeat(): void;
  live(payload: EngineSessionLive): void;
  /** The position's search ended, however — optional; called at once. */
  endLive?(): void;
};

/** The search a job asks for — its engine, the depth and time per position, Threads and Hash, and the early stop's. */
export type EngineSessionSearch = Pick<
  ComputerAnalysisOptions,
  "engine" | "depth" | "moveTimeMs" | "threads" | "hashMb" | "minDepth" | "variationRangeCp"
>;

export type EngineSessionConfig = {
  /** The job — named in the live progress and in a source's warning. */
  jobId: string;
  /** The job's name, as a source's warning says it. */
  name: string;
  search: EngineSessionSearch;
  /** The preset's values the job was given — never the one selected when it runs. */
  preset: Readonly<Record<string, UciOptionValue>>;
};

/** A position to evaluate — its own fields, and its place for the live progress. */
export type EngineSessionPosition = Pick<AnalysisPosition, "fen" | "turn" | "multiPv" | "terminal" | "analysed" | "storedEval"> & {
  index: number;
  /** The move judged from it, as the live progress names it ("7. Nf3"). */
  moveLabel?: string;
};

/** What the session is built from — the defaults for the app, small timeouts and a clock for a test. */
export type EngineSessionDeps = {
  /** The engine for an id: the registry's, waiting for the engine server's list when the id is one of its engines. */
  engineFor?: (id: string) => Promise<EngineDescriptor>;
  /** How long the engine has to answer `uci`. */
  handshakeTimeoutMs?: number;
  /** How long a search may go without a word from the engine — a line or an engine server's heartbeat. */
  silenceTimeoutMs?: number;
  now?: () => Date;
};

/** Why the engine failed a job: no handle, no `uci` answer, silence, or a search with no scored line. */
export type EngineSessionFailure = "create" | "handshake" | "silence" | "no-line";

export class EngineSessionError extends Error {
  readonly reason: EngineSessionFailure;
  constructor(reason: EngineSessionFailure) {
    super(`engine: ${reason}`);
    this.name = "EngineSessionError";
    this.reason = reason;
  }
}

export type EngineSession = {
  /** The engine that runs it — the job's choice, or the one it fell back to. */
  readonly engine: EngineDescriptor;
  /**
   * **One position's result** — without the engine where it can, else from
   * the eval sources, else searched (and sent back to the sources). `undefined`
   * when `hooks.signal` stopped it; an {@link EngineSessionError} when the engine failed.
   */
  evaluate(position: EngineSessionPosition, hooks: EngineSessionHooks): Promise<PositionResult | undefined>;
  /** Terminate the engine, if one was built. Idempotent; the session evaluates nothing after it. */
  close(): void;
};

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

/** A position's result without the engine: a finished position's, or a deep enough stored eval's. */
const resultWithoutSearch = (position: EngineSessionPosition, depth: number): PositionResult | undefined => {
  if (position.terminal) return terminalResultOf(position.fen);
  const stored = position.storedEval;
  if (!position.analysed && stored?.depth !== undefined && stored.depth >= depth) {
    return { fen: position.fen, lines: [{ score: stored.score, depth: stored.depth, pv: [] }] };
  }
  return undefined;
};

/** **A job's engine session** — its engine resolved now, its handle built at the first search. */
export const openEngineSession = async (
  { jobId, name, search, preset }: EngineSessionConfig,
  {
    engineFor = registryEngineFor,
    handshakeTimeoutMs = HANDSHAKE_TIMEOUT_MS,
    silenceTimeoutMs = SILENCE_TIMEOUT_MS,
    now = () => new Date(),
  }: EngineSessionDeps = {},
): Promise<EngineSession> => {
  const descriptor = await engineFor(search.engine);

  let closed = false;
  let handle: EngineHandle | undefined;
  /** The handshake and the options sent after it — one per handle, whichever position asked first. */
  let ready: Promise<void> | undefined;
  let cancelHandshake: (() => void) | undefined;
  // The eval sources this session no longer asks — each said once — and no longer writes to.
  const unread = new Set<string>();
  const unwritten = new Set<string>();

  /** Threads, Hash and the preset, once the engine has said what it declares. */
  const configure = (engine: EngineHandle) => {
    /*
      Held first to the running engine's own bounds — a job queued for an
      engine server's engine that fell back to an in-browser build must not
      ask it for a hash the tab cannot hold (CTA-175) — then to what the
      engine declared, the last word.
    */
    const bounds = engineSettingBoundsOf(descriptor.id);
    engine.setOption("Threads", clampToOption(engine.options.get("Threads"), Math.min(search.threads, bounds.threads.max)));
    engine.setOption("Hash", clampToOption(engine.options.get("Hash"), Math.min(search.hashMb, bounds.hashMb.max)));
    // The preset the job was given, met against what the engine declared.
    const { send } = resolveEnginePreset(preset, engine.options, {
      inBrowser: descriptor.server === undefined,
      owned: BOARD_OWNED_OPTIONS,
    });
    for (const [option, value] of Object.entries(send)) engine.setOption(option, value);
  };

  /** The handle, built and handshaken once — a failure after the timeout. */
  const open = (): { engine: EngineHandle; ready: Promise<void> } => {
    if (handle !== undefined && ready !== undefined) return { engine: handle, ready };
    let engine: EngineHandle;
    try {
      engine = descriptor.create();
    } catch {
      throw new EngineSessionError("create");
    }
    handle = engine;
    const answered = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        off();
        reject(new EngineSessionError("handshake"));
      }, handshakeTimeoutMs);
      const off = engine.whenOptionsReady(() => {
        clearTimeout(timer);
        resolve();
      });
      cancelHandshake = () => {
        clearTimeout(timer);
        off();
      };
    });
    ready = answered.then(() => configure(engine));
    // Awaited by whichever position asked; a session closed before the answer never hears it.
    ready.catch(() => undefined);
    return { engine, ready };
  };

  /** `true` once `ready` settles well, `false` when the signal stops the wait first. */
  const untilReady = (wait: Promise<void>, signal: AbortSignal): Promise<boolean> =>
    new Promise((resolve, reject) => {
      const onAbort = () => resolve(false);
      signal.addEventListener("abort", onAbort, { once: true });
      wait.then(
        () => {
          signal.removeEventListener("abort", onAbort);
          resolve(true);
        },
        (error: unknown) => {
          signal.removeEventListener("abort", onAbort);
          reject(error);
        },
      );
    });

  /**
   * **One position's search**: its lines, line 1 first, and the nodes the
   * engine last reported — `undefined` when the signal stopped it. Stopped
   * early by `shouldStopEarly`; failed when the engine goes quiet for longer
   * than the silence timeout, or ends the search without a scored line. Every
   * word the engine says about it is a heartbeat and a live payload.
   *
   * **Quiet is not silent** (CTA-194): deep in a search Stockfish says nothing
   * for minutes, so an engine server sends a `heartbeat` while its engine is
   * alive but quiet — heard like an `info` line (the timer starts again, the
   * live payload's `heardAt` moves on), changing no line, depth or score. An
   * engine that sends none is held to the silence timeout.
   */
  const searchPosition = (
    engine: EngineHandle,
    position: EngineSessionPosition,
    hooks: EngineSessionHooks,
  ): Promise<{ lines: PositionLine[]; nodes?: number } | undefined> =>
    new Promise((resolve, reject) => {
      let lines: (PositionLine | undefined)[] = [];
      let stopping = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const startedAt = now().getTime();
      let live: EngineSessionLive = {
        jobId,
        index: position.index,
        move: position.moveLabel,
        depth: 0,
        elapsedMs: 0,
        line: [],
        heardAt: startedAt,
      };
      const finish = () => {
        clearTimeout(timer);
        off();
        hooks.signal.removeEventListener("abort", onAbort);
        hooks.endLive?.();
      };
      const listen = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          finish();
          reject(new EngineSessionError("silence"));
        }, silenceTimeoutMs);
      };
      const onAbort = () => {
        finish();
        engine.stop();
        resolve(undefined);
      };
      const off = engine.onMessage((message) => {
        if (message.fen !== position.fen) return;
        listen();
        hooks.heartbeat();
        if (message.heartbeat) {
          // The engine server's word that its engine is alive through a long silence (CTA-194): heard, nothing more.
          const heardAt = now().getTime();
          live = { ...live, elapsedMs: Math.max(live.elapsedMs, heardAt - startedAt), heardAt };
          hooks.live(live);
          return;
        }
        const best = lines[0];
        if (message.pv !== undefined && message.depth !== undefined) {
          lines = withSearchInfo(lines, message, position.turn);
          if (!stopping && shouldStopEarly(lines, position.turn, message.depth, search)) {
            stopping = true;
            engine.stop();
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
            // The engine's own clock where it says; else the session's, never going back.
            elapsedMs: message.time ?? Math.max(live.elapsedMs, heardAt - startedAt),
            score: first?.score,
            line: first === best ? live.line : pvToSan(position.fen, first?.pv.slice(0, LIVE_LINE_MOVES).join(" ") ?? ""),
            heardAt,
          };
          hooks.live(live);
          return;
        }
        finish();
        if (lines[0] === undefined) {
          reject(new EngineSessionError("no-line"));
          return;
        }
        // Lines the search never reached past a gap are out of order: they end there.
        const gap = lines.findIndex((line) => line === undefined);
        resolve({ lines: (gap === -1 ? lines : lines.slice(0, gap)) as PositionLine[], nodes: live.nodes });
      });
      hooks.signal.addEventListener("abort", onAbort, { once: true });
      listen();
      engine.setOption("MultiPV", clampToOption(engine.options.get("MultiPV"), position.multiPv));
      engine.search(position.fen, { depth: search.depth, movetime: search.moveTimeMs });
    });

  const evaluate = async (position: EngineSessionPosition, hooks: EngineSessionHooks): Promise<PositionResult | undefined> => {
    const { signal } = hooks;
    if (closed || signal.aborted) return undefined;
    const known = resultWithoutSearch(position, search.depth);
    if (known !== undefined) return known;

    const answer = await askEvalSources(
      { fen: position.fen, depth: search.depth, multiPv: position.multiPv },
      { signal, skip: (source) => unread.has(source.id) },
    );
    if (closed || signal.aborted) return undefined;
    for (const gone of answer.unreachable) {
      // A source that does not answer a lookup takes no write either.
      unread.add(gone.id);
      unwritten.add(gone.id);
      reportEvalSourceUnreachable({ jobId, name, kind: "read", source: gone });
    }
    if (answer.found !== undefined) return answer.found.result;

    const { engine, ready: waiting } = open();
    if (!(await untilReady(waiting, signal)) || closed || signal.aborted) return undefined;
    const searched = await searchPosition(engine, position, hooks);
    if (searched === undefined || closed || signal.aborted) return undefined;
    const result: PositionResult = { fen: position.fen, lines: searched.lines };

    // The engine's eval sent to the sources that take writes — only what the engine searched, never a source's own.
    const refused = await recordInEvalSources(
      result,
      { nodes: searched.nodes, engine: descriptor.name },
      { signal, skip: (writer) => unwritten.has(writer.id) },
    );
    if (closed || signal.aborted) return undefined;
    for (const writer of refused) {
      unwritten.add(writer.id);
      reportEvalSourceUnreachable({ jobId, name, kind: "write", source: writer });
    }
    return result;
  };

  const close = () => {
    closed = true;
    cancelHandshake?.();
    cancelHandshake = undefined;
    handle?.terminate();
    handle = undefined;
    ready = undefined;
  };

  return { engine: descriptor, evaluate, close };
};
