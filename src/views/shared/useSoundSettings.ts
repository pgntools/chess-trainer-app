import { useSyncExternalStore } from "react";

import {
  DEFAULT_SOUND_SETTINGS,
  readSoundSettings,
  storeSoundSettings,
  subscribeSoundSettings,
  type SoundSettings,
} from "../../lib/soundSettings";

export type SoundSettingsChoice = {
  /** The move sounds' settings — the reader's, or the defaults. */
  settings: SoundSettings;
  /** Change some of them; every board plays its next sound with them. */
  setSettings: (patch: Partial<SoundSettings>) => void;
};

/**
 * **The move sounds' settings, live** (CTA-260) — what Settings → Sounds shows
 * and sets. The server snapshot (the pre-render) is the defaults.
 */
export const useSoundSettings = (): SoundSettingsChoice => {
  const settings = useSyncExternalStore(subscribeSoundSettings, readSoundSettings, () => DEFAULT_SOUND_SETTINGS);
  return { settings, setSettings: storeSoundSettings };
};
