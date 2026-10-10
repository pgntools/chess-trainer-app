import { DEFAULT_POSITION } from "chess.js";
import { useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";

import { EnginePresetForm } from "../../blocks/forms";
import { InlineAlert } from "../../design-system/components/feedback";
import { SettingsSection } from "../../design-system/components/forms";
import {
  DEFAULT_PRESET_ID,
  DEFAULT_PRESET_NAME,
  MAX_ENGINE_PRESETS,
  enginePresetRows,
  selectedPresetOf,
  withDefaultPreset,
  type EnginePreset,
} from "../../lib/enginePresets";
import {
  createEnginePreset,
  deleteEnginePreset,
  duplicateEnginePreset,
  enginePresetSelectionsSnapshot,
  enginePresetsSnapshot,
  renameEnginePreset,
  selectEnginePreset,
  setEnginePresetGroup,
  setEnginePresetValue,
  subscribeEnginePresetSelections,
  subscribeEnginePresets,
  type EnginePresetProblem,
} from "../../lib/enginePresetStore";
import type { UciOptionValue } from "../../lib/engineTypes";
import { useEngineModule } from "../board/core/useEngineModule";

/** No board options: the form's engine only says what it declares, and never searches. */
const NO_OPTIONS: Readonly<Record<string, UciOptionValue>> = {};

/**
 * **The engine's options, kept in presets** (CTA-179) — Settings → Engine's
 * section under the engine lists: the `EnginePresetForm` block for the engine
 * the reader chose, over the preset stores (`lib/enginePresetStore.ts`).
 *
 * What the engine declares is read **from the engine itself**: an engine
 * server's engine from the server's list, a page's own build from its `uci`
 * handshake — built here by the engine module as the Lobby's form builds it
 * (switched off: it never searches), so the form is data-driven and never a
 * hardcoded roster. Every change is a store write, and every board running
 * the engine takes it from its next search (`useEngineModule`).
 */
function EnginePresetsSection({ engineId }: { engineId: string }) {
  const { t } = useTranslation();
  const presets = useSyncExternalStore(subscribeEnginePresets, enginePresetsSnapshot, enginePresetsSnapshot);
  const selections = useSyncExternalStore(
    subscribeEnginePresetSelections,
    enginePresetSelectionsSnapshot,
    enginePresetSelectionsSnapshot,
  );
  const { descriptor, engineOptions } = useEngineModule({
    enabled: false,
    engine: engineId,
    fen: DEFAULT_POSITION,
    depth: 1,
    moveTimeMs: 0,
    uciOptions: NO_OPTIONS,
  });
  const [problem, setProblem] = useState<string | undefined>(undefined);

  const inBrowser = descriptor.server === undefined;
  const declared = engineOptions.size > 0 ? [...engineOptions.values()] : descriptor.options;
  const library = withDefaultPreset(presets ?? []);
  const selected = selectedPresetOf(presets ?? [], selections ?? [], descriptor.id);
  const rows =
    presets === undefined || selections === undefined || declared === undefined
      ? undefined
      : enginePresetRows(selected.values, declared, { inBrowser });

  /** Default under its name in the reader's language, until the reader renames it. */
  const labelOf = (preset: EnginePreset): string =>
    preset.id === DEFAULT_PRESET_ID && preset.name === DEFAULT_PRESET_NAME ? t("settings.engine.presets.defaultName") : preset.name;

  /** A write's answer: nothing, or a line saying what went wrong. */
  const answer = (result: EnginePresetProblem | undefined) =>
    setProblem(
      result === undefined
        ? undefined
        : result === "too-many"
          ? t("settings.engine.presets.full", { max: MAX_ENGINE_PRESETS })
          : t("settings.engine.presets.failed"),
    );
  /** A new preset — the engine runs it at once. */
  const created = async (made: Promise<{ id: string } | { problem: EnginePresetProblem }>) => {
    const result = await made;
    if ("problem" in result) answer(result.problem);
    else answer(await selectEnginePreset(descriptor.id, result.id));
  };

  return (
    <SettingsSection
      title={t("settings.engine.presets.title", { engine: descriptor.name })}
      description={t("settings.engine.presets.description")}
      testId="engine-presets-section"
    >
      {problem !== undefined && (
        <InlineAlert severity="error" onClose={() => setProblem(undefined)} testId="engine-presets-problem">
          {problem}
        </InlineAlert>
      )}
      <EnginePresetForm
        engineName={descriptor.name}
        presets={library.map((preset) => ({ id: preset.id, name: labelOf(preset), deletable: preset.id !== DEFAULT_PRESET_ID }))}
        selectedId={selected.id}
        onSelect={(presetId) => void selectEnginePreset(descriptor.id, presetId).then(answer)}
        onCreate={(name) => void created(createEnginePreset(name))}
        onRename={(presetId, name) => void renameEnginePreset(presetId, name).then(answer)}
        onDuplicate={(presetId, name) => void created(duplicateEnginePreset(presetId, name))}
        onDelete={(presetId) => void deleteEnginePreset(presetId).then(answer)}
        rows={rows}
        onChange={(name, value) => void setEnginePresetValue(selected.id, name, value).then(answer)}
        groups={selected.groups}
        onGroupChange={(group, on) => void setEnginePresetGroup(selected.id, group, on).then(answer)}
        testId="engine-presets"
      />
    </SettingsSection>
  );
}

export default EnginePresetsSection;
