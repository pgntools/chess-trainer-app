/**
 * **The default engine's identity** — plain constants, no engine behind them,
 * so a record (`lib/playedGames.ts`) and a preference (`lib/engineChoice.ts`)
 * can name it without importing the builds.
 *
 * It is the engine every board used before there was a choice
 * ([`docs/engine.md`](../../../docs/engine.md)), so **a record that names no
 * engine was played by it**.
 */
export const DEFAULT_ENGINE_ID = "stockfish-2019-wasm";

/** The default engine's own version — what a record that names no engine is read as. */
export const DEFAULT_ENGINE_VERSION = "2019-08-15";
