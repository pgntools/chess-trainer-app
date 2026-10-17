import { useSyncExternalStore } from "react";

import { readEngineSearchSettings, storeEngineSearchSettings, subscribeEngineSearchSettings } from "../../lib/engineSearchInEffect";
import { DEFAULT_ENGINE_SEARCH_SETTINGS, type EngineSearchSettings } from "../../lib/engineSearchSettings";

export type EngineSearchSettingsChoice = {
  /** The settings every board searches with — the reader's, or the defaults. */
  settings: EngineSearchSettings;
  /** Change some of them; every board and the top bar follow from their next search. */
  setSettings: (patch: Partial<EngineSearchSettings>) => void;
};

/**
 * **The engine's search settings, live** (CTA-181) — lines, depth, move time,
 * Threads and Hash, which every board reads and the top bar's Engine menu
 * sets: the lines, Threads and Hash a preference, the depth and move time the
 * chosen engine's selected preset's (CTA-185, `lib/engineSearchInEffect.ts`).
 * The server snapshot (the pre-render) is the defaults — nothing there has a
 * preference or a preset.
 */
export const useEngineSearchSettings = (): EngineSearchSettingsChoice => {
  const settings = useSyncExternalStore(
    subscribeEngineSearchSettings,
    readEngineSearchSettings,
    () => DEFAULT_ENGINE_SEARCH_SETTINGS,
  );
  return { settings, setSettings: storeEngineSearchSettings };
};
