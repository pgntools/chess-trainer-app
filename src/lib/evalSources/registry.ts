import { lichessEvalSource } from "./lichess";
import type { EvalSource } from "./types";

/**
 * **The eval sources** (CTA-196), in the order they are asked — the first that
 * holds a position deep enough answers. Adding one is a folder beside
 * `lichess/` and a line here; removing one, the reverse (and its locale keys) —
 * [`docs/engine.md`](../../../docs/engine.md) §10.
 */
export const EVAL_SOURCES: readonly EvalSource[] = [lichessEvalSource];
