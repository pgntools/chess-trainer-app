import type { PositionResult } from "../computerAnalysis";
import { resetEvalSourceBackOff } from "./backOff";
import { EVAL_SOURCES } from "./registry";
import type { EvalQuery, EvalRecordMeta, EvalSource } from "./types";

/**
 * **The eval-source layer** (CTA-196, [`docs/engine.md`](../../../docs/engine.md)
 * §10) — the functions every consumer goes through, naming no source:
 * {@link askEvalSources} before an engine searches, {@link recordInEvalSources}
 * after it did. The boards reach them through the `EngineHandle` decorator
 * (`withEvalSources.ts`); the Jobs V2 runner calls them itself (it asks before
 * it builds an engine at all).
 */

/** The sources the reader turned on, in the order they are asked. */
export const enabledEvalSources = (sources: readonly EvalSource[] = EVAL_SOURCES): EvalSource[] =>
  sources.filter((source) => source.isEnabled());

/** What asking came to: the first source's answer that holds the position deep enough, and every source that did not answer. */
export type EvalSourcesAnswer = {
  found?: { source: EvalSource; result: PositionResult };
  unreachable: EvalSource[];
};

type Options = {
  signal?: AbortSignal;
  /** A source to leave out — one that failed to answer earlier. */
  skip?: (source: EvalSource) => boolean;
  /** **For tests**: the sources instead of the registry's. */
  sources?: readonly EvalSource[];
};

/**
 * **Ask the enabled sources about a position**, one after another in registry
 * order, until one holds it at `query.depth` or deeper. A source that does not
 * answer is listed in `unreachable`, and the next is asked. Never throws.
 */
export const askEvalSources = async (query: EvalQuery, { signal, skip, sources }: Options = {}): Promise<EvalSourcesAnswer> => {
  const unreachable: EvalSource[] = [];
  for (const source of enabledEvalSources(sources)) {
    if (skip?.(source)) continue;
    if (signal?.aborted) break;
    let answer;
    try {
      answer = await source.lookup(query, signal);
    } catch {
      answer = { kind: "unreachable" } as const;
    }
    if (signal?.aborted) break;
    if (answer.kind === "found" && answer.result.lines.length > 0) return { found: { source, result: answer.result }, unreachable };
    if (answer.kind === "unreachable") unreachable.push(source);
  }
  return { unreachable };
};

/**
 * **Send what an engine found** to every source that takes writes now —
 * **only an engine's search**, never a source's own answer. Resolves to the
 * sources that did not take it. Never throws.
 */
export const recordInEvalSources = async (
  result: PositionResult,
  meta: EvalRecordMeta,
  { signal, skip, sources }: Options = {},
): Promise<EvalSource[]> => {
  const writers = enabledEvalSources(sources).filter(
    (source) => source.record !== undefined && source.writesEnabled?.() === true && !skip?.(source),
  );
  const taken = await Promise.all(
    writers.map(async (source) => {
      try {
        return (await source.record?.(result, meta, signal)) === true;
      } catch {
        return false;
      }
    }),
  );
  return writers.filter((_, index) => !taken[index]);
};

/** Whether any source would be asked now — the decorator's cheap check before it delays a search. */
export const anyEvalSourceEnabled = (sources: readonly EvalSource[] = EVAL_SOURCES): boolean =>
  sources.some((source) => source.isEnabled());

// --- A running job's word that a source did not answer ---

/**
 * The job whose run found a source of no use: it did not answer a lookup
 * (`read` — the run goes on with the engine alone), or did not take the
 * engine's evals (`write` — the run goes on without sending them).
 */
export type EvalSourceUnreachable = { jobId: string; name: string; kind: "read" | "write"; source: EvalSource };

const unreachableListeners = new Set<(event: EvalSourceUnreachable) => void>();

/** **The runner's**: a source did not answer, or took no write, during this job's run — once per run, source and kind. */
export const reportEvalSourceUnreachable = (event: EvalSourceUnreachable): void => {
  unreachableListeners.forEach((listener) => listener(event));
};

/** Hear {@link reportEvalSourceUnreachable} — the shell, which shows the warning. */
export const subscribeEvalSourceUnreachable = (listener: (event: EvalSourceUnreachable) => void): (() => void) => {
  unreachableListeners.add(listener);
  return () => {
    unreachableListeners.delete(listener);
  };
};

/** **For tests**: forget every source's visit state and the back-off — the teardown's. */
export const resetEvalSources = (): void => {
  for (const source of EVAL_SOURCES) source.reset?.();
  resetEvalSourceBackOff();
};
