import { useSyncExternalStore } from "react";

import { DEFAULT_ENGINE_ID } from "../../lib/engines";
import { engineChoiceId, storeEngineId, subscribeEngineChoice } from "../../lib/engineChoice";

export type EngineChoice = {
  /** The registered engine in use — the reader's choice, or the default where it cannot run. */
  engineId: string;
  /** Switches the engine at once and keeps the choice; an unregistered id is ignored. */
  setEngineId: (id: string) => void;
};

/**
 * **The engine the reader chose** (CTA-153), live: every board reads it and
 * hands it to `useEngineModule({ engine })`, so choosing in Settings → Engine
 * reaches each one from its next search. The server snapshot (the pre-render)
 * is the default — nothing there has a preference.
 */
export const useEngineChoice = (): EngineChoice => {
  const engineId = useSyncExternalStore(subscribeEngineChoice, engineChoiceId, () => DEFAULT_ENGINE_ID);
  return { engineId, setEngineId: storeEngineId };
};
