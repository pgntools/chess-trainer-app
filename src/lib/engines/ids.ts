/**
 * **The default engine's identity** — plain constants, no engine behind them,
 * so a record (`lib/playedGames.ts`) and a preference (`lib/engineChoice.ts`)
 * can name it without importing the builds. `builtin.ts`'s descriptor is built
 * from them, and `registry.test.ts` holds the two together.
 *
 * It is the engine every board runs unless the reader chose another, and what
 * **a played game that names no engine** is read as
 * ([`docs/engine.md`](../../../docs/engine.md)).
 */
export const DEFAULT_ENGINE_ID = "stockfish-19-lite-single";

/** The default engine's name, as a reader is shown it. */
export const DEFAULT_ENGINE_NAME = "Stockfish 19 Lite";

/** The default engine's own version. */
export const DEFAULT_ENGINE_VERSION = "19";

/**
 * The prefix of an engine server's engine id — `hosted:<the server's id>`
 * (`hosted.ts`). Here, beside the default's id, so plain data (the engine
 * settings' bounds, a job's options) can tell such an engine by its id
 * without importing the server's client.
 */
export const HOSTED_ENGINE_PREFIX = "hosted:";

/** Whether `id` names one of the engine server's engines — a native binary, not a build running in the page. */
export const isHostedEngineId = (id: string | null | undefined): boolean =>
  typeof id === "string" && id.startsWith(HOSTED_ENGINE_PREFIX);
