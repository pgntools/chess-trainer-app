import { subscribeEngineServer } from "./engineServer";
import { getEngine, resolveEngine } from "./engines";

/**
 * **The reader's engine** (CTA-153) — which of the registered engines
 * (`lib/engines/`, [`docs/engine.md`](../../docs/engine.md)) every board runs,
 * chosen in Settings → Engine. One global preference, so it lives in
 * `localStorage` beside the theme and the language (`database.md`: only
 * preferences are `localStorage`) and, being a preference and not the reader's
 * data, **it is not in the export zip** (`settings.md`).
 *
 * The store keeps the **raw** id the reader chose. What a board runs is
 * {@link engineChoiceId}: that engine when the app ships it and it can run on
 * this page, otherwise the default — so a stored id naming an engine that has
 * gone (a hand edit, the retired 2019 build), or one this host cannot run (the
 * multi-thread build on GitHub Pages), falls back for now and **comes back by
 * itself** where it can run, because the stored choice was never overwritten.
 *
 * Plain functions over a tiny subscription, so any module reads it and
 * `views/shared/useEngineChoice.ts` binds it to React.
 */
export const ENGINE_STORAGE_KEY = "chessapp.engine";

const listeners = new Set<() => void>();

/** Held for the visit when storage refuses the write — a private window still gets its choice. */
let remembered: string | undefined;

/** The stored id as it was written, or `undefined` for none (or where storage cannot be read). */
export const readStoredEngineId = (): string | undefined => {
  try {
    const stored = localStorage.getItem(ENGINE_STORAGE_KEY);
    return stored === null || stored === "" ? undefined : stored;
  } catch {
    return remembered;
  }
};

/**
 * The engine a board runs: the stored choice when it is shipped and
 * available on this page, else the default. Always a shipped engine's id.
 */
export const engineChoiceId = (): string => resolveEngine(readStoredEngineId()).id;

/**
 * Keep the choice and tell every board; an id the app does not ship is
 * ignored, like an unknown theme. A storage that refuses it only forgets it
 * after this visit.
 */
export const storeEngineId = (id: string): void => {
  if (getEngine(id) === undefined) return;
  remembered = id;
  try {
    localStorage.setItem(ENGINE_STORAGE_KEY, id);
  } catch {
    // Private mode or a full quota: the choice still applies to this visit.
  }
  listeners.forEach((listener) => listener());
};

/**
 * Call `listener` when the choice may have changed: this tab's write, another
 * tab's (`storage`), or the engine server's engines coming or going — a
 * stored `hosted:…` choice resolves to that engine only while the server has
 * it (`lib/engineServer.ts`). Returns an unsubscribe fn.
 */
export const subscribeEngineChoice = (listener: () => void): (() => void) => {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === ENGINE_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  const unsubscribeServer = subscribeEngineServer(listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
    unsubscribeServer();
  };
};
