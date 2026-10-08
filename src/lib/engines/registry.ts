import type { EngineDescriptor } from "../engineTypes";
import { BUILTIN_ENGINES } from "./builtin";
import { DEFAULT_ENGINE_ID } from "./ids";

/**
 * **The engine registry** (CTA-152) — the engines a reader can choose between,
 * [`docs/engine.md`](../../../docs/engine.md).
 *
 * - **A fixed list, the shipped builds** ({@link BUILTIN_ENGINES}). It grew at
 *   runtime once, for a hosted engine not yet built; nothing but tests used
 *   that, so it went (CTA-160) — `docs/engine.md` §8 says how a hosted engine
 *   would bring it back.
 * - **Availability is read at runtime, never baked in.** An engine that
 *   `requires` cross-origin isolation is *listed* everywhere and *available*
 *   only where the page really is isolated (`crossOriginIsolated`) — the same
 *   build runs on GitHub Pages (which cannot set the headers) and on the
 *   chessapp.dev host (which does). An unavailable engine carries its reason
 *   so a picker can show it disabled and say why.
 * - **An id that cannot run falls back to the default**, {@link resolveEngine}:
 *   a stored preference naming an engine that no longer exists (the retired
 *   2019 build's `stockfish-2019-wasm`), or one this page cannot run, must
 *   never leave a board without an engine.
 *
 * Importing this builds no worker: descriptors are data until `create()`.
 */

export { DEFAULT_ENGINE_ID } from "./ids";

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

/** Whether this page is cross-origin isolated — false under Node and jsdom, which have no such global. */
export const isCrossOriginIsolated = (): boolean =>
  (globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated === true;

/** The descriptor with this id, if the app ships one. */
export const getEngine = (id: string): EngineDescriptor | undefined =>
  BUILTIN_ENGINES.find((descriptor) => descriptor.id === id);

/** The default engine's descriptor — every fallback lands here. */
const defaultEngine = (): EngineDescriptor => {
  const descriptor = getEngine(DEFAULT_ENGINE_ID);
  if (descriptor === undefined) throw new Error(`the default engine ${DEFAULT_ENGINE_ID} is not shipped`);
  return descriptor;
};

/** Whether `descriptor` can run on this page — read now, not at build time. */
export const engineAvailability = (
  descriptor: EngineDescriptor,
  isolated: boolean = isCrossOriginIsolated(),
): EngineAvailability =>
  descriptor.requires?.crossOriginIsolated && !isolated
    ? { available: false, reason: "cross-origin-isolation" }
    : { available: true };

/** Every engine with its availability — what a picker lists, the default first. */
export const describeEngines = (
  isolated: boolean = isCrossOriginIsolated(),
): EngineEntry[] =>
  BUILTIN_ENGINES.map((descriptor) => ({
    descriptor,
    availability: engineAvailability(descriptor, isolated),
  }));

/**
 * The engine to run for a stored or requested `id`: that engine when it is
 * shipped and available on this page, otherwise the default. `undefined`
 * (no preference) is the default too.
 */
export const resolveEngine = (
  id?: string | null,
  isolated: boolean = isCrossOriginIsolated(),
): EngineDescriptor => {
  const wanted = id ? getEngine(id) : undefined;
  if (wanted && engineAvailability(wanted, isolated).available) return wanted;
  return defaultEngine();
};
