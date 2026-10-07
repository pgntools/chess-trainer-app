import type { EngineDescriptor } from "../engineTypes";
import { BUILTIN_ENGINES, DEFAULT_ENGINE_ID, STOCKFISH_2019 } from "./builtin";

/**
 * **The engine registry** (CTA-152) — the engines a reader can choose between,
 * [`docs/engine.md`](../../../docs/engine.md).
 *
 * - **A list that can grow at runtime.** {@link registerEngine} adds (or
 *   replaces, by id) a descriptor and tells {@link subscribeEngines}'s
 *   listeners, so a hosted engine's list — fetched from a backend later — joins
 *   the built-in ones without a build change. {@link listEngines} returns the
 *   same array until the list changes, so it is a valid
 *   `useSyncExternalStore` snapshot.
 * - **Availability is read at runtime, never baked in.** An engine that
 *   `requires` cross-origin isolation is *listed* everywhere and *available*
 *   only where the page really is isolated (`crossOriginIsolated`) — the same
 *   build runs on GitHub Pages (which cannot set the headers) and on the
 *   chessapp.dev host (which does). An unavailable engine carries its reason
 *   so a picker can show it disabled and say why.
 * - **An id that cannot run falls back to the default**, {@link resolveEngine}:
 *   a stored preference naming an engine that no longer exists, or one this
 *   page cannot run, must never leave a board without an engine.
 *
 * Importing this builds no worker: descriptors are data until `create()`.
 */

export { DEFAULT_ENGINE_ID };

/** Why an engine cannot be chosen here. A picker maps it to a localized sentence. */
export type EngineUnavailableReason = "cross-origin-isolation";

export type EngineAvailability =
  | { available: true }
  | { available: false; reason: EngineUnavailableReason };

/** One row of a picker: the descriptor and whether it can be chosen on this page. */
export type EngineEntry = {
  descriptor: EngineDescriptor;
  availability: EngineAvailability;
};

let engines: readonly EngineDescriptor[] = BUILTIN_ENGINES;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

/** Whether this page is cross-origin isolated — false under Node and jsdom, which have no such global. */
export const isCrossOriginIsolated = (): boolean =>
  (globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated === true;

/** Every registered engine, the default first. The same array until the list changes. */
export const listEngines = (): readonly EngineDescriptor[] => engines;

/** Call `listener` whenever the list changes. Returns an unsubscribe fn. */
export const subscribeEngines = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** The descriptor with this id, if one is registered. */
export const getEngine = (id: string): EngineDescriptor | undefined =>
  engines.find((descriptor) => descriptor.id === id);

/**
 * Add an engine — or replace the one with the same id — and return a function
 * that removes it again. The default engine cannot be removed: it is the
 * fallback every unresolvable id lands on.
 */
export const registerEngine = (descriptor: EngineDescriptor): (() => void) => {
  const replaced = engines.some((existing) => existing.id === descriptor.id);
  engines = replaced
    ? engines.map((existing) => (existing.id === descriptor.id ? descriptor : existing))
    : [...engines, descriptor];
  notify();

  return () => {
    if (descriptor.id === DEFAULT_ENGINE_ID) return;
    if (getEngine(descriptor.id) !== descriptor) return; // replaced since — not ours to remove
    engines = engines.filter((existing) => existing !== descriptor);
    notify();
  };
};

/** Whether `descriptor` can run on this page — read now, not at build time. */
export const engineAvailability = (
  descriptor: EngineDescriptor,
  isolated: boolean = isCrossOriginIsolated(),
): EngineAvailability =>
  descriptor.requires?.crossOriginIsolated && !isolated
    ? { available: false, reason: "cross-origin-isolation" }
    : { available: true };

/** Every engine with its availability — what a picker lists. */
export const describeEngines = (
  isolated: boolean = isCrossOriginIsolated(),
): EngineEntry[] =>
  engines.map((descriptor) => ({
    descriptor,
    availability: engineAvailability(descriptor, isolated),
  }));

/**
 * The engine to run for a stored or requested `id`: that engine when it is
 * registered and available on this page, otherwise the default. `undefined`
 * (no preference) is the default too — which is today's behaviour.
 */
export const resolveEngine = (
  id?: string | null,
  isolated: boolean = isCrossOriginIsolated(),
): EngineDescriptor => {
  const wanted = id ? getEngine(id) : undefined;
  if (wanted && engineAvailability(wanted, isolated).available) return wanted;
  return getEngine(DEFAULT_ENGINE_ID) ?? STOCKFISH_2019;
};
