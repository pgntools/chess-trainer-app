/**
 * **The boards' back-off** (CTA-196): a source that did not answer a board's
 * lookup (or take a board's write) is left alone for
 * {@link EVAL_SOURCE_BACKOFF_MS}, every board alike — so an API that is down
 * costs one timeout a minute, not one on every move. A source's settings
 * changing (turned on again, a new address) clears it
 * ({@link clearEvalSourceBackOff}). The jobs keep their own rule — once per
 * run (`lib/jobV2Runner.ts`).
 *
 * Module state, nothing at import; its own module so a source can clear it
 * without importing the registry.
 */

/** How long a board leaves a source alone after it failed to answer. */
export const EVAL_SOURCE_BACKOFF_MS = 60_000;

export type EvalSourceUse = "read" | "write";

const until = new Map<string, number>();
const keyOf = (id: string, use: EvalSourceUse) => `${id}:${use}`;

/** Whether the boards leave `id` alone for `use` now. */
export const evalSourceBackedOff = (id: string, use: EvalSourceUse, now = Date.now()): boolean =>
  (until.get(keyOf(id, use)) ?? 0) > now;

/** `id` did not answer: leave it alone for `use` a while. A failed read stops the writes too. */
export const backOffEvalSource = (id: string, use: EvalSourceUse, now = Date.now()): void => {
  until.set(keyOf(id, use), now + EVAL_SOURCE_BACKOFF_MS);
  if (use === "read") until.set(keyOf(id, "write"), now + EVAL_SOURCE_BACKOFF_MS);
};

/** Ask `id` again from the next search — its settings changed. */
export const clearEvalSourceBackOff = (id: string): void => {
  until.delete(keyOf(id, "read"));
  until.delete(keyOf(id, "write"));
};

/** **For tests**: forget every back-off. */
export const resetEvalSourceBackOff = (): void => until.clear();
