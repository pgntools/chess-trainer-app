/*
  **The eval sources** (CTA-196, docs/engine.md §10): sources of ready-made
  evaluations every analysis search asks before its engine — the generic
  layer, which names no source; the sources are `registry.ts`'s.
*/
export type {
  EvalLookup,
  EvalQuery,
  EvalRecordMeta,
  EvalSource,
  EvalSourceConnection,
  EvalSourceConnectionState,
} from "./types";
export { EVAL_SOURCES } from "./registry";
export {
  askEvalSources,
  enabledEvalSources,
  recordInEvalSources,
  reportEvalSourceUnreachable,
  resetEvalSources,
  subscribeEvalSourceUnreachable,
  type EvalSourceUnreachable,
  type EvalSourcesAnswer,
} from "./evalSources";
export { EVAL_SOURCE_BACKOFF_MS } from "./backOff";
export { withEvalSources, type EvalSourcesContext } from "./withEvalSources";
