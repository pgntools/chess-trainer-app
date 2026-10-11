import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";

import { DEFAULT_PRESET_ID, DEFAULT_PRESET_NAME, selectedPresetOf, selectedPresetValues } from "../../lib/enginePresets";
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
 */
export const useSelectedEnginePreset = (engineId: string): { name: string; values: Readonly<Record<string, UciOptionValue>> } => {
  const { t } = useTranslation();
  const presets = useSyncExternalStore(subscribeEnginePresets, enginePresetsSnapshot, enginePresetsSnapshot);
  const selections = useSyncExternalStore(subscribeEnginePresetSelections, enginePresetSelectionsSnapshot, enginePresetSelectionsSnapshot);
  const preset = selectedPresetOf(presets ?? [], selections ?? [], engineId);
  return {
    name:
      preset.id === DEFAULT_PRESET_ID && preset.name === DEFAULT_PRESET_NAME ? t("settings.engine.presets.defaultName") : preset.name,
    values: selectedPresetValues(presets, selections, engineId),
  };
};
