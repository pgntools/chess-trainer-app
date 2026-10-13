import { useEffect, useSyncExternalStore } from "react";

import { withDefaultPreset, type EnginePreset } from "../../../lib/enginePresets";
import { resolveEngine } from "../../../lib/engines";
import {
  DEFAULT_JOBS_SETTINGS,
  ensureLichessEvalApiChecked,
  lichessEvalApiStatus,
  readJobsSettings,
  subscribeJobsSettings,
  type JobsDefaultPreset,
  type JobsSettings,
  type LichessEvalApiStatus,
} from "../../../lib/jobsSettings";

const OFF: LichessEvalApiStatus = { state: "off" };

/** **The Jobs settings, live** (CTA-193, `lib/jobsSettings.ts`) — the pre-render reads the defaults. */
export const useJobsSettings = (): JobsSettings =>
  useSyncExternalStore(subscribeJobsSettings, readJobsSettings, () => DEFAULT_JOBS_SETTINGS);

/**
 * **The lichess evaluation API's status, live** — and its first check, where
 * the reader turned it on, once the Settings tab shows it. The pre-render
 * reads it off: nothing there asks a server.
 */
export const useLichessEvalApiStatus = (): LichessEvalApiStatus => {
  const status = useSyncExternalStore(subscribeJobsSettings, lichessEvalApiStatus, () => OFF);
  useEffect(ensureLichessEvalApiChecked, []);
  return status;
};

/**
 * **The default engine and preset that applies** — the stored pair while its
 * engine runs here (`resolveEngine` names it, not the fallback) and its
 * preset is still in the library; else `null`, the board's engine and its
 * selected preset (the pair stays stored, back when they are).
 */
export const defaultPresetInEffect = (
  settings: JobsSettings,
  presets: readonly EnginePreset[] | undefined,
): JobsDefaultPreset | null => {
  const stored = settings.defaultPreset;
  if (stored === null || resolveEngine(stored.engineId).id !== stored.engineId) return null;
  return withDefaultPreset(presets ?? []).some((preset) => preset.id === stored.presetId) ? stored : null;
};
