import type { StepContext } from "@pgntools/jobs-runtime";

import {
  EngineSessionError,
  openEngineSession,
  type EngineSession,
  type EngineSessionConfig,
  type EngineSessionDeps,
  type EngineSessionHooks,
  type EngineSessionLive,
} from "../engineSession";

/**
 * **One engine per job run** (CTA-221) — what both engine-lane kinds (the
 * computer analysis, the repertoire evaluation) share over the engine
 * session (`lib/jobs/engineSession.ts`). The runtime calls a kind once per
 * step and has no hook for a run's end, so the session — and its engine
 * handle, built at the first position it has to search — is kept here by job
 * id across the steps of one run, and closed:
 *
 * - when a step's `ctx.signal` aborts (a pause, a cancel, a delete, the lease
 *   lost, the runtime stopped) — the handle terminated at once, as Jobs V2's
 *   runner did;
 * - when a step throws (the job fails or retries — a retry builds a fresh one);
 * - at `finalize` ({@link endEngineRun}).
 *
 * Nothing at module scope but an empty map.
 */

type Run = { session: EngineSession; attempt: number };

const runs = new Map<string, Run>();

/** **The job's session for this attempt** — opened (its engine resolved) on the first step of a run. */
export const engineRunOf = async (ctx: StepContext, config: EngineSessionConfig, deps?: EngineSessionDeps): Promise<EngineSession> => {
  const kept = runs.get(ctx.jobId);
  if (kept !== undefined && kept.attempt === ctx.attempt) return kept.session;
  kept?.session.close();
  runs.delete(ctx.jobId);
  const session = await openEngineSession(config, deps);
  runs.set(ctx.jobId, { session, attempt: ctx.attempt });
  return session;
};

/** **The run is over** — its engine terminated. Idempotent. */
export const endEngineRun = (jobId: string): void => {
  runs.get(jobId)?.session.close();
  runs.delete(jobId);
};

/**
 * **An engine server's engine that failed** — no handle, no `uci` answer, or
 * silence beyond the timeout, from a `hosted:…` engine: the server went away
 * (CTA-215's retry rule — retried, 3 attempts from 30 s). Every other engine
 * failure fails the job at once.
 */
export class EngineServerUnreachableError extends Error {
  readonly reason: EngineSessionError["reason"];
  constructor(reason: EngineSessionError["reason"]) {
    super(`engine server: ${reason}`);
    this.name = "EngineServerUnreachableError";
    this.reason = reason;
  }
}

/**
 * **One position through the run's session**, the step's context lent as its
 * hooks — its signal, its heartbeat, its live progress. The run ends when the
 * step's signal aborts; an error ends it too, an engine server's failure
 * re-thrown as {@link EngineServerUnreachableError}.
 */
export const evaluateInRun = async <T>(
  ctx: StepContext,
  session: EngineSession,
  evaluate: (hooks: EngineSessionHooks) => Promise<T>,
): Promise<T> => {
  const onAbort = () => endEngineRun(ctx.jobId);
  ctx.signal.addEventListener("abort", onAbort, { once: true });
  const hooks: EngineSessionHooks = {
    signal: ctx.signal,
    heartbeat: () => ctx.heartbeat(),
    live: (payload: EngineSessionLive) => ctx.live(payload),
  };
  try {
    return await evaluate(hooks);
  } catch (error) {
    endEngineRun(ctx.jobId);
    if (error instanceof EngineSessionError && session.engine.server !== undefined && error.reason !== "no-line") {
      throw new EngineServerUnreachableError(error.reason);
    }
    throw error;
  } finally {
    ctx.signal.removeEventListener("abort", onAbort);
  }
};

/** The retry policy of an engine-lane kind: an engine server gone is retried, 3 attempts from 30 s. */
export const ENGINE_RETRY = { maxAttempts: 3, backoff: { initialMs: 30_000, factor: 2, maxMs: 120_000, jitter: true } } as const;

/**
 * **The step's liveness bound** — above the session's own silence timeout
 * (120 s, fed by the engine's lines and an engine server's heartbeat) and its
 * handshake's, so a quiet engine fails as the session says, not as the runtime's timer does.
 */
export const ENGINE_HEARTBEAT_MS = 180_000;
