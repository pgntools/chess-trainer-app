import { useSyncExternalStore } from "react";

import {
  DEFAULT_ENGINE_SEARCH_SETTINGS,
  readEngineSearchSettings,
  storeEngineSearchSettings,
  subscribeEngineSearchSettings,
  type EngineSearchSettings,
} from "../../lib/engineSearchSettings";

export type EngineSearchSettingsChoice = {
  /** The settings every board searches with — the reader's, or the defaults. */
  settings: EngineSearchSettings;
  /** Change some of them; every board and the top bar follow from their next search. */
  setSettings: (patch: Partial<EngineSearchSettings>) => void;
};

/**
 * **The engine's search settings, live** (CTA-181) — lines, depth, move time,
 * infinite analysis, Threads and Hash: one global set, which every board
 * reads and the top bar's Engine menu sets (`lib/engineSearchSettings.ts`,
 * the engine choice's pattern, `useEngineChoice`). The server snapshot (the
 * pre-render) is the defaults — nothing there has a preference.
 */
export const useEngineSearchSettings = (): EngineSearchSettingsChoice => {
  const settings = useSyncExternalStore(
    subscribeEngineSearchSettings,
    readEngineSearchSettings,
    () => DEFAULT_ENGINE_SEARCH_SETTINGS,
  );
  return { settings, setSettings: storeEngineSearchSettings };
};
