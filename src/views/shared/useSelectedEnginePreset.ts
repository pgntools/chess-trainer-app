import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";

import {
  DEFAULT_PRESET_ID,
  DEFAULT_PRESET_NAME,
  selectedPresetOf,
  withDefaultPreset,
  type EnginePreset,
} from "../../lib/enginePresets";
import {
  enginePresetDraftOf,
  presetValuesInEffect,
  readEnginePresetDraft,
  subscribeEnginePresetDraft,
} from "../../lib/enginePresetDraft";
import {
  enginePresetSelectionsSnapshot,
  enginePresetsSnapshot,
  subscribeEnginePresetSelections,
  subscribeEnginePresets,
} from "../../lib/enginePresetStore";
import type { UciOptionValue } from "../../lib/engineTypes";

/**
 * **The preset an engine runs** (CTA-179, read outside Settings since
 * CTA-181) — its name in the reader's language (Default's own words until it
 * is renamed) and the values it sends, the same object while the preset is
 * unchanged. What the top bar's Engine menu names and what Play's strength
 * reads its `UCI_LimitStrength` from. The stores are read on first use.
 * With it, its `id` and **every preset** to choose from, each named the same
 * way (CTA-185 — the Engine menu's preset select). The values are the
 * unsaved draft's where there is one (CTA-185), and `changed` says so.
 */
export const useSelectedEnginePreset = (
  engineId: string,
): {
  id: string;
  name: string;
  values: Readonly<Record<string, UciOptionValue>>;
  presets: readonly { id: string; name: string }[];
  changed: boolean;
} => {
  const { t } = useTranslation();
  const presets = useSyncExternalStore(subscribeEnginePresets, enginePresetsSnapshot, enginePresetsSnapshot);
  const selections = useSyncExternalStore(subscribeEnginePresetSelections, enginePresetSelectionsSnapshot, enginePresetSelectionsSnapshot);
  useSyncExternalStore(subscribeEnginePresetDraft, readEnginePresetDraft, readEnginePresetDraft);
  /** Default under its name in the reader's language, until the reader renames it. */
  const nameOf = (preset: EnginePreset): string =>
    preset.id === DEFAULT_PRESET_ID && preset.name === DEFAULT_PRESET_NAME ? t("settings.engine.presets.defaultName") : preset.name;
  const preset = selectedPresetOf(presets ?? [], selections ?? [], engineId);
  return {
    id: preset.id,
    name: nameOf(preset),
    values: presetValuesInEffect(presets, selections, engineId),
    presets: withDefaultPreset(presets ?? []).map((each) => ({ id: each.id, name: nameOf(each) })),
    changed: enginePresetDraftOf(engineId) !== undefined,
  };
};
