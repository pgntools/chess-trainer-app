import type {
  EngineHandle,
  EngineMessage,
  EngineMessageCallback,
  EngineOption,
  SearchOptions,
  UciTransport,
} from "./engineTypes";

/*
 * Description of the universal chess interface (UCI)  https://gist.github.com/aliostad/f4470274f39d29b788c1b09519e67372/
 */

/**
 * The deepest search an engine is asked for unless its descriptor says
 * otherwise — and the top of the depth a settings form offers
 * (`ENGINE_SETTING_BOUNDS.depth`): the worker shares the tab with the UI.
 */
export const DEFAULT_MAX_DEPTH = 24;

/**
 * Parse one `option name ... type ...` line from the `uci` handshake.
 *
 * Tokenised rather than matched with one regex, because an option *name* may
 * contain spaces (`Skill Level`, `Debug Log File`) and so may a `default` — the
 * keywords are the only reliable delimiters. Returns `null` for any other line.
 */
export const parseEngineOption = (line: string): EngineOption | null => {
  if (!line.startsWith("option name ")) return null;

  const KEYWORDS = new Set(["name", "type", "default", "min", "max", "var"]);
  const parts: Record<string, string> = {};
  const vars: string[] = [];

  let key: string | null = null;
  let buffer: string[] = [];
  const flush = () => {
    if (key === "var") {
      vars.push(buffer.join(" "));
    } else if (key !== null) {
      parts[key] = buffer.join(" ");
    }
    buffer = [];
  };

  // `slice(1)` drops the leading "option"; every following keyword opens a field.
  for (const token of line.trim().split(/\s+/).slice(1)) {
    if (KEYWORDS.has(token)) {
      flush();
      key = token;
    } else {
      buffer.push(token);
    }
  }
  flush();

  if (!parts.name || !parts.type) return null;

  const bound = (raw: string | undefined) => {
    const value = Number(raw);
    return raw !== undefined && raw !== "" && Number.isFinite(value)
      ? value
      : undefined;
  };

  return {
    name: parts.name,
    type: parts.type,
    defaultValue: parts.default,
    min: bound(parts.min),
    max: bound(parts.max),
    vars: vars.length > 0 ? vars : undefined,
  };
};

/**
 * One line of engine output as an {@link EngineMessage}, stamped with the
 * position of the search that produced it (`fen`, which UCI does not carry).
 */
const parseEngineLine = (line: string, fen: string | undefined): EngineMessage => {
  /*
    `score cp N` and `score mate N` are alternatives on one `info` line, and a
    line only ever carries one of them. Matching them together rather than with
    two independent searches is what lets a consumer clear a stale mate when
    the engine goes back to reporting centipawns — two loose regexes would
    leave the previous mate standing.
  */
  const score = line.match(/\bscore\s+(cp|mate)\s+(-?\d+)/);
  const multipv = line.match(/\bmultipv\s+(\d+)/)?.[1];

  return {
    uciMessage: line,
    bestMove: line.match(/bestmove\s+(\S+)/)?.[1],
    ponder: line.match(/ponder\s+(\S+)/)?.[1],
    positionEvaluation: score?.[1] === "cp" ? score[2] : undefined,
    possibleMate: score?.[1] === "mate" ? score[2] : undefined,
    pv: line.match(/ pv\s+(.*)/)?.[1],
    // The leading space keeps this off `seldepth`.
    depth: Number(line.match(/ depth\s+(\S+)/)?.[1] ?? 0),
    multipv: multipv === undefined ? undefined : Number(multipv),
    fen,
  };
};

/** What a {@link UciEngine} is told about the engine behind its transport. */
export type UciEngineConfig = {
  /** The deepest `go depth` it posts — the descriptor's `capabilities.maxDepth`. */
  maxDepth?: number;
};

/**
 * **The UCI protocol over a {@link UciTransport}** — option discovery, the
 * `setoption` / `stop` deferral, the pinned-option rule and FEN stamping, for
 * any engine that speaks UCI, wherever it runs (CTA-152).
 *
 * The discipline ({@link flush}) holds for every engine, **including ones that
 * would survive without it**: the shipped Stockfish 19 builds were measured to
 * keep searching through a mid-search `setoption` (`public/stockfish/README.md`),
 * but UCI only permits one while the engine is idle, a hosted engine or the
 * next build has not been measured, and an engine that loses a search to it
 * fails silently. Deferring costs nothing.
 */
export class UciEngine implements EngineHandle {
  /**
   * What the running engine said it supports, filled in during the handshake
   * and complete at `uciok`. Empty until then — read it through
   * {@link whenOptionsReady} rather than at an arbitrary moment.
   */
  readonly options = new Map<string, EngineOption>();

  private readonly transport: UciTransport;
  private readonly maxDepth: number;

  /** Every live subscriber. One transport listener fans out to all of them. */
  private readonly callbacks = new Set<EngineMessageCallback>();

  /** True once `uciok` has arrived and {@link options} is complete. */
  private optionsReady = false;
  private readonly optionsReadyCallbacks = new Set<() => void>();

  /**
   * Option values waiting to go out, as the caller wrote them. Never posted the
   * moment they are set — see {@link flush}.
   */
  private readonly pendingOptions = new Map<string, string>();

  /**
   * The value each option was last posted with. Asking again for the value the
   * engine already has is not a change: nothing is posted and no search is
   * stopped for it — a board re-requests every option whenever any setting
   * moves, and `setoption name Hash` clears the engine's hash table.
   */
  private readonly applied = new Map<string, string>();

  /**
   * The search the caller wants running, if it is not running yet. Only ever one:
   * a newer position supersedes an older one outright, and a queue of searches
   * nobody is looking at any more is exactly what we do not want.
   */
  private pendingSearch: { fen: string; options: SearchOptions } | null = null;

  /**
   * The position of the search the engine is actually working on, or `undefined`
   * when it is idle. UCI answers every `go` with exactly one `bestmove`, which is
   * what keeps this in step — and it is what every `info` line is stamped with,
   * including lines that arrive after a newer position has been requested.
   */
  private searching: string | undefined;

  /** Whether the running search has been told to `stop` — one `stop` per search is enough. */
  private stopSent = false;

  private readonly unsubscribeLines: () => void;

  constructor(
    transport: UciTransport,
    { maxDepth = DEFAULT_MAX_DEPTH }: UciEngineConfig = {},
  ) {
    this.transport = transport;
    this.maxDepth = maxDepth;

    /*
      A single listener on the transport, fanning out to the subscribers: the UCI
      line is parsed once per message rather than once per subscriber, and — the
      reason it has to be this way — the search bookkeeping below runs exactly
      once per message however many components are listening. Subscribed before
      anything is said, since a transport delivers lines as soon as it exists.
    */
    this.unsubscribeLines = transport.onLine((line) => {
      const message = parseEngineLine(line, this.searching);
      if (message.bestMove) {
        // The search is over and the engine is idle again, which is the moment
        // anything that has been waiting for it can go out.
        this.searching = undefined;
        this.stopSent = false;
      }
      this.handshake(line);
      this.callbacks.forEach((callback) => callback(message));
      if (message.bestMove) this.flush();
    });

    this.transport.send("uci");
  }

  /**
   * Subscribe to engine output. Returns an unsubscribe function — always call it
   * on React unmount so listeners don't accumulate across position changes /
   * re-renders.
   */
  onMessage = (callback: EngineMessageCallback): (() => void) => {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  };

  /** The handshake half of the message handling: option discovery, complete at `uciok`. */
  private handshake(line: string) {
    const option = parseEngineOption(line);
    if (option) {
      this.options.set(option.name, option);
      return;
    }

    if (line === "uciok") {
      this.optionsReady = true;

      const waiting = [...this.optionsReadyCallbacks];
      this.optionsReadyCallbacks.clear();
      waiting.forEach((callback) => callback());

      // Everything held back during the handshake can now go out.
      this.flush();
    }
  }

  /**
   * Send whatever is waiting, if the engine is in a state to receive it.
   *
   * **This is the whole of the wrapper's protocol discipline.** UCI only
   * permits `setoption` while the engine is idle, and an engine that takes one
   * mid-search badly does not say so: it abandons the search — no error, no
   * `bestmove`, no further `info`, and the board simply never evaluates again.
   * Two conditions therefore gate everything:
   *
   * - **before `uciok`** nothing goes out at all, because until the engine has
   *   listed its options there is no way to tell a real option from a name this
   *   build has never heard of;
   * - **while a search is running** nothing goes out either. One `stop` is
   *   posted instead, and the `bestmove` that ends the search calls back in here.
   *
   * Only with the engine idle and the handshake done are the options posted, and
   * only then does a waiting search start — so a search always runs under the
   * settings the caller asked for.
   */
  private flush() {
    if (!this.optionsReady) return;

    if (this.searching !== undefined) {
      // Come back when the engine says it has finished.
      if (this.pendingOptions.size > 0 || this.pendingSearch) this.sendStop();
      return;
    }

    for (const [name, value] of this.pendingOptions) {
      // An option this build does not have — or has pinned — never reaches the
      // wire. See `isSettable` for why the pinned case is not merely tidiness.
      if (this.isSettable(name)) {
        this.transport.send(`setoption name ${name} value ${this.wireValue(name, value)}`);
        this.applied.set(name, value);
      }
    }
    this.pendingOptions.clear();

    const next = this.pendingSearch;
    if (!next) return;
    this.pendingSearch = null;

    const depth = Math.min(next.options.depth, this.maxDepth);
    const { movetime } = next.options;

    this.searching = next.fen;
    this.transport.send(`position fen ${next.fen}`);
    this.transport.send(
      movetime && movetime > 0
        ? `go depth ${depth} movetime ${movetime}`
        : `go depth ${depth}`,
    );
  }

  /** Ask the running search to end — once; the `bestmove` it answers with resumes the queue. */
  private sendStop() {
    if (this.searching === undefined || this.stopSent) return;
    this.stopSent = true;
    this.transport.send("stop");
  }

  /**
   * Run `callback` once {@link options} is complete — immediately if the
   * handshake already finished. Returns an unsubscribe fn.
   *
   * Both halves matter in React: a component that subscribes on mount may well
   * be mounting *after* `uciok` (the engine outlives a tab switch), and one that
   * unmounts first must not leave a callback behind.
   */
  whenOptionsReady(callback: () => void): () => void {
    if (this.optionsReady) {
      callback();
      return () => {};
    }
    this.optionsReadyCallbacks.add(callback);
    return () => {
      this.optionsReadyCallbacks.delete(callback);
    };
  }

  /**
   * Whether an option can actually be *set* — declared, and with more than one
   * legal value.
   *
   * An option whose `min` equals its `max` is pinned by the build, so posting it
   * could at best be a no-op — and it has not always been one: an earlier
   * Stockfish build declared `Threads type spin default 1 min 1 max 1` and
   * stopped answering for good after `setoption name Threads value 1`, its own
   * default, with nothing on the wire to tell that option from a harmless pinned
   * one beforehand. (The 19 single-thread build pins `Threads` too and takes the
   * value without harm — measured in CTA-152 — but the rule is about what an
   * engine *might* do, so it stays generic.)
   *
   * So a pinned option is never sent. That costs nothing — there was only ever
   * one value it could take — and the settings tab already renders it as fixed.
   */
  private isSettable(name: string): boolean {
    const option = this.options.get(name);
    if (option === undefined) return false;
    return option.min === undefined || option.min !== option.max;
  }

  /**
   * The value as UCI writes it. A `check` option takes the words `true` and
   * `false`; a caller that only has numbers (the engine module's requests are
   * `name → number`) asks for `1` / `0`, which Stockfish would read as false.
   * Anything that is not a `check`'s own wording goes through unchanged.
   */
  private wireValue(name: string, value: string): string {
    if (this.options.get(name)?.type !== "check") return value;
    if (value === "1") return "true";
    if (value === "0") return "false";
    return value;
  }

  /**
   * Request `setoption name <name> value <value>`, if this engine has that option.
   *
   * Returns whether this engine will take the value — `false` when it has no
   * such option, or has pinned it to a single value ({@link isSettable}). In
   * both cases nothing is posted, which is what keeps the settings tab from
   * showing a knob that does nothing. Calls made before the handshake are held
   * and re-checked at `uciok`, and report `true` optimistically because the
   * answer does not exist yet.
   */
  setOption(name: string, value: string | number): boolean {
    // Once the roster is known, a name this engine cannot take is refused here,
    // rather than queued only to be dropped — queued, it would stop a search.
    if (this.optionsReady && !this.isSettable(name)) return false;

    const requested = String(value);
    if (this.applied.get(name) === requested) {
      // Already the engine's value: a request for another one that is still
      // waiting is withdrawn, and nothing is stopped for it.
      this.pendingOptions.delete(name);
    } else {
      // Buffered rather than posted: {@link flush} decides when it is safe to
      // send, and drops the names this build cannot take.
      this.pendingOptions.set(name, requested);
      this.flush();
    }
    return true;
  }

  /**
   * Ask for `fen` to be searched.
   *
   * It may not start immediately: {@link flush} holds it until the handshake is
   * done and any running search has ended, so that pending option changes go out
   * first. A second call before the first has started replaces it — the newer
   * position is the one anybody is looking at.
   */
  search(fen: string, options: SearchOptions) {
    this.pendingSearch = { fen, options };
    this.flush();
  }

  /**
   * Drop the search that was asked for: a waiting one never starts, and a
   * running one is told to `stop` — it answers with the `bestmove` of the
   * depth it reached. What a board does when its engine is switched off.
   */
  stop() {
    this.pendingSearch = null;
    this.sendStop();
  }

  terminate() {
    this.unsubscribeLines();
    this.callbacks.clear();
    this.optionsReadyCallbacks.clear();
    this.pendingOptions.clear();
    this.pendingSearch = null;
    this.searching = undefined;
    this.transport.send("quit"); // ask the engine to shut down cleanly
    this.transport.close(); // then close the wire. Run this on chessboard unmount.
  }
}
