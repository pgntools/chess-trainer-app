import type { EngineHandle, EngineMessageCallback, EngineOption, SearchOptions } from "./engineTypes";
import { DEFAULT_MAX_DEPTH, isSettableOption, parseEngineLine } from "./uciEngine";

/**
 * **An engine on the engine server** — a native Stockfish on the reader's own
 * computer, searched over HTTP ([`server/engine-api/README.md`](../../server/engine-api/README.md),
 * [`docs/engine.md`](../../docs/engine.md) §8) instead of in a Web Worker.
 *
 * It is the same {@link EngineHandle} every board already drives, so no board
 * knows the difference:
 *
 * - **One session per handle** — one engine process on the server, opened at
 *   the first search and deleted at {@link terminate}, so the engine's memory
 *   carries over from position to position as a board steps through a game,
 *   and the process quits as soon as the board switches to another engine or
 *   goes away.
 * - **Every search is a request**, its answer a stream of NDJSON events, each
 *   carrying the engine's raw line — read by `parseEngineLine`, the parser the
 *   worker's lines go through, and stamped with the event's FEN.
 * - **The server keeps the protocol discipline**: a new search stops the
 *   running one (which still ends with its `bestmove`), options are applied
 *   only between searches and only when changed. Requests are numbered
 *   (`seq`), so one overtaken in flight by a newer one is ignored there.
 * - **Options travel with every search** — the whole set {@link setOption}
 *   asked for; whether one is taken is judged here, against what the engine
 *   declared, by `UciEngine`'s own rule (`isSettableOption`).
 * - **A session the server no longer has** (it expired, the server
 *   restarted) is replaced once, silently — only the engine's memory is lost.
 *   Anything else that fails is `onFailure`'s, which re-checks the server
 *   (`lib/engineServer.ts`): an unreachable one takes its engines out of the
 *   registry, and every board falls back to the default engine.
 *
 * Nothing happens until `search` — the registry's descriptors build one only
 * when chosen (`lib/engines/hosted.ts`).
 */

/** One engine as `GET /v1/engines` lists it, read and checked. */
export type HostedEngineInfo = {
  /** The server's id — stable, the app stores `hosted:<id>`. */
  id: string;
  name: string;
  version?: string;
  /** What the binary declared in its `uci` reply, `Threads` and `Hash` under the server's ceilings. */
  options: EngineOption[];
  /** The deepest `go depth` the server allows. */
  maxDepth: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const optionFrom = (raw: unknown): EngineOption | null => {
  if (!isRecord(raw) || typeof raw.name !== "string" || typeof raw.type !== "string") return null;
  const number = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);
  return {
    name: raw.name,
    type: raw.type,
    defaultValue: typeof raw.default === "string" ? raw.default : undefined,
    min: number(raw.min),
    max: number(raw.max),
    vars: Array.isArray(raw.vars) ? raw.vars.filter((v): v is string => typeof v === "string") : undefined,
  };
};

/** One engine of the server's list, or `null` for an entry that is not one. Non-throwing. */
export const hostedEngineInfoFrom = (raw: unknown): HostedEngineInfo | null => {
  if (!isRecord(raw) || typeof raw.id !== "string" || raw.id === "" || typeof raw.name !== "string") return null;
  const limits = isRecord(raw.limits) ? raw.limits : {};
  const maxDepth = typeof limits.maxDepth === "number" && limits.maxDepth >= 1 ? limits.maxDepth : DEFAULT_MAX_DEPTH;
  return {
    id: raw.id,
    name: raw.name,
    version: typeof raw.version === "string" ? raw.version : undefined,
    options: (Array.isArray(raw.options) ? raw.options : []).map(optionFrom).filter((o): o is EngineOption => o !== null),
    maxDepth,
  };
};

/** The server's whole list, or `null` when the answer is not a list of engines. */
export const hostedEnginesFrom = (raw: unknown): HostedEngineInfo[] | null => {
  if (!Array.isArray(raw)) return null;
  return raw.map(hostedEngineInfoFrom).filter((info): info is HostedEngineInfo => info !== null);
};

/** Whether the page is being hidden or unloaded — a request then must be `keepalive` to go out at all. */
const pageLeaving = (): boolean => typeof document !== "undefined" && document.visibilityState === "hidden";

/** A `check` option's value as a boolean — the engine module asks with `1` / `0`. */
const checkValue = (value: string | number): boolean => value === 1 || value === "1" || value === "true";

/** The server's `limit` for a search, the depth clamped to what it allows. */
const limitOf = (options: SearchOptions, maxDepth: number) =>
  "infinite" in options
    ? { infinite: true }
    : {
        depth: Math.min(options.depth, maxDepth),
        ...(options.movetime && options.movetime > 0 ? { movetimeMs: options.movetime } : {}),
      };

type Request = { fen: string; options: SearchOptions; retried?: boolean };

export type HostedEngineHooks = {
  /** A request failed (not a session that merely expired) — the server may be gone. */
  onFailure?: (error: unknown) => void;
};

export class HostedEngine implements EngineHandle {
  readonly options: ReadonlyMap<string, EngineOption>;

  private readonly callbacks = new Set<EngineMessageCallback>();
  /** Every option asked for, as it will be sent — the server applies only the changed ones. */
  private readonly requested = new Map<string, string | number | boolean>();
  private readonly inFlight = new Set<AbortController>();
  private session: Promise<string> | undefined;
  /** The session's id once it is open — what a stop or the delete is sent to. */
  private sessionId: string | undefined;
  private pending: Request | null = null;
  private seq = 0;
  private flushing = false;
  private terminated = false;
  private readonly serverUrl: string;
  private readonly info: HostedEngineInfo;
  private readonly hooks: HostedEngineHooks;

  constructor(serverUrl: string, info: HostedEngineInfo, hooks: HostedEngineHooks = {}) {
    this.serverUrl = serverUrl;
    this.info = info;
    this.hooks = hooks;
    this.options = new Map(info.options.map((option) => [option.name, option]));
  }

  /** The options came with the server's list: ready at once. */
  whenOptionsReady(callback: () => void): () => void {
    callback();
    return () => {};
  }

  onMessage(callback: EngineMessageCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  setOption(name: string, value: string | number): boolean {
    const option = this.options.get(name);
    if (!isSettableOption(option)) return false;
    this.requested.set(name, option?.type === "check" ? checkValue(value) : value);
    return true;
  }

  search(fen: string, options: SearchOptions): void {
    if (this.terminated) return;
    // A second call before the first went out replaces it — the newer position is the one on screen.
    this.pending = { fen, options };
    void this.flush();
  }

  stop(): void {
    this.pending = null;
    if (this.sessionId === undefined) return;
    void this.post(`/v1/sessions/${this.sessionId}/stop`, { seq: ++this.seq }).catch(() => {});
  }

  terminate(): void {
    if (this.terminated) return;
    this.terminated = true;
    this.pending = null;
    this.callbacks.clear();
    this.inFlight.forEach((controller) => controller.abort());
    this.inFlight.clear();
    if (this.sessionId !== undefined) this.deleteSession(this.sessionId);
    // A session still being opened is deleted as it lands (`openSession`).
  }

  // --- the wire ------------------------------------------------------------

  private post(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
    return fetch(`${this.serverUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  }

  private deleteSession(id: string): void {
    /*
      The engine process on the server quits with its session — what frees the
      reader's machine when a board switches to a browser build or goes away.
      A plain request while the page lives: a cross-origin DELETE needs a
      preflight, which `keepalive` has not always been allowed to make, and a
      failed delete would leave the engine idle until the server's timeout.
      `keepalive` only while the page is being hidden or unloaded, when a plain
      request would be cancelled; the server's idle timeout is the backstop.
    */
    void fetch(`${this.serverUrl}/v1/sessions/${id}`, { method: "DELETE", keepalive: pageLeaving() }).catch(() => {});
  }

  private ensureSession(): Promise<string> {
    this.session ??= this.openSession().catch((error: unknown) => {
      this.session = undefined;
      throw error;
    });
    return this.session;
  }

  private async openSession(): Promise<string> {
    const response = await this.post("/v1/sessions", { engine: this.info.id });
    if (!response.ok) throw new Error(`engine server: opening a session answered ${response.status}`);
    const body: unknown = await response.json();
    if (!isRecord(body) || typeof body.session !== "string") throw new Error("engine server: no session in its answer");
    if (this.terminated) {
      this.deleteSession(body.session);
      throw new Error("terminated");
    }
    this.sessionId = body.session;
    return body.session;
  }

  /** Send what is waiting, once a session is open — only the newest search, if several came first. */
  private async flush(): Promise<void> {
    if (this.flushing) return;
    this.flushing = true;
    try {
      while (this.pending !== null && !this.terminated) {
        const session = await this.ensureSession();
        const next = this.pending;
        if (next === null || this.terminated) break;
        this.pending = null;
        void this.analyse(session, next);
      }
    } catch (error) {
      this.pending = null;
      this.fail(error);
    } finally {
      this.flushing = false;
    }
  }

  private async analyse(session: string, request: Request): Promise<void> {
    const controller = new AbortController();
    this.inFlight.add(controller);
    try {
      const response = await this.post(
        `/v1/sessions/${session}/analyse`,
        {
          fen: request.fen,
          limit: limitOf(request.options, this.info.maxDepth),
          options: Object.fromEntries(this.requested),
          seq: ++this.seq,
        },
        controller.signal,
      );
      if (response.status === 404 && !request.retried) {
        // The server no longer has the session: open another and search again, once — unless a newer search is waiting.
        if (this.sessionId === session) {
          this.session = undefined;
          this.sessionId = undefined;
        }
        this.pending ??= { ...request, retried: true };
        void this.flush();
        return;
      }
      if (!response.ok || response.body === null) throw new Error(`engine server: a search answered ${response.status}`);
      await this.read(response.body);
    } catch (error) {
      if (!controller.signal.aborted) this.fail(error);
    } finally {
      this.inFlight.delete(controller);
    }
  }

  /** The stream, one JSON event per line, each one with a raw UCI line handed on as an engine message. */
  private async read(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffered = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffered += decoder.decode(value, { stream: true });
      let newline = buffered.indexOf("\n");
      while (newline >= 0) {
        this.dispatch(buffered.slice(0, newline));
        buffered = buffered.slice(newline + 1);
        newline = buffered.indexOf("\n");
      }
    }
    this.dispatch(buffered + decoder.decode());
  }

  private dispatch(line: string): void {
    if (line.trim() === "" || this.terminated) return;
    let event: unknown;
    try {
      event = JSON.parse(line);
    } catch {
      return;
    }
    if (!isRecord(event)) return;
    if (event.type === "error") {
      // The session's engine died: the next search opens a new one.
      this.session = undefined;
      this.sessionId = undefined;
      this.fail(new Error(`engine server: ${String(event.detail ?? "the engine stopped")}`));
      return;
    }
    if (typeof event.uci !== "string") return; // `start`, `superseded`: nothing a board reads
    const message = parseEngineLine(event.uci, typeof event.fen === "string" ? event.fen : undefined);
    this.callbacks.forEach((callback) => callback(message));
  }

  private fail(error: unknown): void {
    if (this.terminated) return;
    console.warn(`Engine server ${this.serverUrl}:`, error);
    this.hooks.onFailure?.(error);
  }
}
