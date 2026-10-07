/**
 * **The engine's types** — what a board sees of an engine, and what an engine
 * is built from (CTA-152, [`docs/engine.md`](../../docs/engine.md)).
 *
 * Three layers, each knowing only the one below:
 *
 * ```
 * useEngineModule ──▶ EngineHandle ◀── UciEngine ──▶ UciTransport ◀── WorkerTransport
 *   (the boards)       (the surface)    (the protocol)   (the wire)      (a local worker)
 * ```
 *
 * - {@link EngineHandle} is the whole of what a board may ask of an engine.
 *   Nothing outside the transport knows whether it is a Web Worker, so a
 *   WebSocket to a hosted engine (planned, not built) is one more
 *   {@link UciTransport} — no board changes.
 * - {@link EngineDescriptor} is a registry entry: what an engine is called,
 *   what it needs, what it can do, and how to build a handle.
 *
 * Types only — this module has no runtime, so importing it never starts
 * anything (the pre-render imports it under Node).
 */

/**
 * One option the running engine declared during the `uci` handshake.
 *
 * Read, never assumed. Which options exist — and which of them will take a
 * value — is a property of the *binary*, not of the UCI spec. The 2019 build
 * shipped in `public/stockfish/` answers `uci` with, among others:
 *
 * ```
 * option name Threads type spin default 1 min 1 max 1
 * option name Hash type spin default 16 min 16 max 16
 * option name MultiPV type spin default 1 min 1 max 500
 * option name Skill Level type spin default 20 min 0 max 20
 * ```
 *
 * So `Threads` and `Hash` are declared but **pinned** — `min` equals `max`, one
 * legal value each — while `MultiPV` and `Skill Level` are genuinely
 * adjustable, and there is no `UCI_Elo` or `UCI_LimitStrength` at all. Three
 * states, not two. The Stockfish 19 builds declare `UCI_Elo` and
 * `UCI_LimitStrength`, and the multi-thread one an adjustable `Threads`. A
 * settings UI that hardcoded the usual list would show knobs that silently do
 * nothing, so it reads {@link EngineHandle.options} instead and can say
 * honestly which ones this engine does not have and which ones it has already
 * made up its mind about.
 */
export type EngineOption = {
  name: string;
  /** `spin`, `check`, `combo`, `button`, `string` — as the engine reported it. */
  type: string;
  /** The engine's own default, verbatim; absent for a `button`. */
  defaultValue?: string;
  /** Bounds of a `spin`, when it gave them. */
  min?: number;
  max?: number;
  /** The permitted values of a `combo`. */
  vars?: string[];
};

/** What one `go` search should do. */
export type SearchOptions = {
  /**
   * Plies to search. Clamped to the engine's own limit
   * ({@link EngineCapabilities.maxDepth}) — the worker shares the tab with the
   * UI.
   */
  depth?: number;
  /** Milliseconds to spend, on top of the depth limit. 0 or absent means no time limit. */
  movetime?: number;
};

export type EngineMessage = {
  /** stockfish engine message in UCI format*/
  uciMessage: string;
  /** found best move for current position in format `e2e4`*/
  bestMove?: string;
  /** found best move for opponent in format `e7e5` */
  ponder?: string;
  /**  material balance's difference in centipawns(IMPORTANT! stockfish gives the cp score in terms of whose turn it is)*/
  positionEvaluation?: string;
  /** count of moves until mate */
  possibleMate?: string;
  /** the best line found */
  pv?: string;
  /** number of halfmoves the engine looks ahead */
  depth?: number;
  /**
   * Which of the `MultiPV` lines this `info` describes, 1-based. Absent on a
   * single-PV search and on every non-`info` message.
   */
  multipv?: number;
  /**
   * The FEN this message is about.
   *
   * UCI carries no such tag, so the engine wrapper supplies one: it tracks
   * which searches are still running and stamps each message with the position
   * of the one that produced it. Without it a consumer cannot tell a result for
   * the position on screen from one still draining out of the search it
   * replaced — and the Play with Engine screen must never play a move that was
   * computed for a position the player has navigated away from.
   */
  fen?: string;
};

/** Callback registered with {@link EngineHandle.onMessage}. */
export type EngineMessageCallback = (messageData: EngineMessage) => void;

/**
 * **What a board may ask of an engine** — the whole surface `useEngineModule`
 * depends on, and nothing more.
 *
 * The protocol discipline (§4.1 of `.claude/rules/chessboard.md`) is the
 * handle's, not the caller's: `search` and `setOption` are *requests* the
 * handle posts when the engine can take them — nothing before `uciok`, nothing
 * into a running search — so a caller never sequences them.
 */
export interface EngineHandle {
  /**
   * What the running engine declared in its `uci` reply. Empty until
   * `uciok` — read it through {@link whenOptionsReady}.
   */
  readonly options: ReadonlyMap<string, EngineOption>;
  /**
   * Ask for `fen` to be searched. May not start immediately; a second call
   * before the first has started replaces it.
   */
  search(fen: string, options?: SearchOptions): void;
  /** End the running search early; the engine still answers with a `bestmove`. */
  stop(): void;
  /**
   * Request an option. Returns whether this engine will take the value —
   * `false` when it has no such option or has pinned it to one value. Calls
   * before the handshake report `true` optimistically.
   */
  setOption(name: string, value: string | number): boolean;
  /**
   * Run `callback` once {@link options} is complete — at once if the handshake
   * already finished. Returns an unsubscribe fn.
   */
  whenOptionsReady(callback: () => void): () => void;
  /** Subscribe to parsed engine output. **Call the returned unsubscribe.** */
  onMessage(callback: EngineMessageCallback): () => void;
  /** Shut the engine down and release everything it held. Call on unmount. */
  terminate(): void;
}

/**
 * **The wire to an engine** — lines of UCI in, lines of UCI out, and nothing
 * about how they travel. {@link UciEngine} is written against this; a Web
 * Worker is one implementation (`WorkerTransport`), a WebSocket to a hosted
 * engine would be another.
 *
 * A transport starts delivering lines as soon as it exists, so the engine
 * subscribes first and only then sends `uci`.
 */
export interface UciTransport {
  /** Send one line of UCI (no trailing newline). */
  send(line: string): void;
  /** Subscribe to the engine's lines, one per call. Returns an unsubscribe fn. */
  onLine(callback: (line: string) => void): () => void;
  /** Close the wire and whatever is behind it (terminate the worker, shut the socket). */
  close(): void;
}

/**
 * Where an engine runs. Only `"local"` exists; `"remote"` will be added with
 * the hosted-engine transport — nothing reads it yet.
 */
export type EngineKind = "local";

/** What an engine can do — read by the UI before one is even built. */
export type EngineCapabilities = {
  /** The deepest `go depth` the engine is asked for; deeper requests are clamped to it. */
  maxDepth: number;
  /**
   * How its strength can be limited: `"skill"` — `Skill Level` only; `"elo"` —
   * `UCI_Elo` only; `"both"` — either. A *declaration of the build*, shown
   * before the engine runs; the running engine's own `uci` reply
   * ({@link EngineHandle.options}) is what the settings are clamped to.
   */
  strength: "skill" | "elo" | "both";
  /** Whether it can search on more than one thread (it declares an adjustable `Threads`). */
  multiThread: boolean;
};

/** What the page must be for an engine to run at all. */
export type EngineRequirements = {
  /**
   * The page is cross-origin isolated (`crossOriginIsolated`) — the
   * `SharedArrayBuffer` a multi-thread WASM build needs. Needs COOP / COEP
   * headers from the host.
   */
  crossOriginIsolated?: boolean;
};

/** One entry of the registry (`lib/engines/`). */
export type EngineDescriptor = {
  /** Stable, stored in a preference and on a played game — never renamed. */
  id: string;
  /** What a reader is shown. */
  name: string;
  /** The engine's own version, as a reader would say it ("19", "2019-08-15"). */
  version: string;
  kind: EngineKind;
  requires?: EngineRequirements;
  capabilities: EngineCapabilities;
  /**
   * Build a handle — the only place an engine, a Worker, a socket is made, and
   * only when called: a descriptor in the registry costs nothing until chosen.
   */
  create(): EngineHandle;
};
