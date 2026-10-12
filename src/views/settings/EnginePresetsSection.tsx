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
  presetSearchOf,
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
  subscribeEnginePresetSelections,
  subscribeEnginePresets,
  type EnginePresetProblem,
} from "../../lib/enginePresetStore";
import {
  draftEnginePresetGroup,
  draftEnginePresetSearch,
  draftEnginePresetValue,
  draftEngineResources,
  enginePresetDraftOf,
  presetInEffectOf,
  readEnginePresetDraft,
  saveEnginePresetDraft,
  saveEnginePresetDraftAsNew,
  subscribeEnginePresetDraft,
} from "../../lib/enginePresetDraft";
import { readSearchPreferences, searchSettingLimitsOf, searchSettingTypedLimitsOf } from "../../lib/engineSearchSettings";
import type { UciOptionValue } from "../../lib/engineTypes";
import { useEngineModule } from "../board/core/useEngineModule";
import { useEngineSearchSettings } from "../shared/useEngineSearchSettings";

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
 * hardcoded roster. **Nothing is written as it changes** (CTA-185): every
 * change edits the preset's draft (`lib/enginePresetDraft.ts`), which every
 * board running the engine takes from its next search (`useEngineModule`),
 * and the strip it brings writes it — Save, or Save as new preset. Above the
 * options, **where the preset's searches stop** — its depth and move time
 * (CTA-185), the same two the top bar's Engine menu sets; and under them
 * Threads and Hash as sliders — the global request, not the preset's.
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
  // Read for their re-render: the draft, and the Threads and Hash in effect (the menu edits them too).
  const draft = useSyncExternalStore(subscribeEnginePresetDraft, readEnginePresetDraft, readEnginePresetDraft);
  useEngineSearchSettings();

  const inBrowser = descriptor.server === undefined;
  const declared = engineOptions.size > 0 ? [...engineOptions.values()] : descriptor.options;
  const library = withDefaultPreset(presets ?? []);
  const selected = selectedPresetOf(presets ?? [], selections ?? [], descriptor.id);
  // What the form shows: the preset with its unsaved draft over it.
  const shown = presetInEffectOf(presets ?? [], selections ?? [], descriptor.id);
  const ownDraft = draft === undefined ? undefined : enginePresetDraftOf(descriptor.id);
  const rows =
    presets === undefined || selections === undefined || declared === undefined
      ? undefined
      : enginePresetRows(shown.values, declared, { inBrowser });

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
  /** Where the selected preset's searches stop (CTA-185) — the draft's, as the top bar's menu edits them too. */
  const search = {
    ...presetSearchOf(shown),
    onChange: (patch: { depth?: number; moveTimeMs?: number }) => draftEnginePresetSearch(descriptor.id, patch),
  };

  /** Threads and Hash (CTA-185): the one global request, held with the draft — slider to the device, box to the engine. */
  const preferences = readSearchPreferences();
  const resources = {
    threads: ownDraft?.resources.threads ?? preferences.threads,
    hashMb: ownDraft?.resources.hashMb ?? preferences.hashMb,
    sliderLimits: searchSettingLimitsOf(descriptor),
    typedLimits: searchSettingTypedLimitsOf(descriptor),
    onChange: (patch: { threads?: number; hashMb?: number }) => draftEngineResources(descriptor.id, patch),
  };

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
        onChange={(name, value) => draftEnginePresetValue(descriptor.id, name, value)}
        groups={shown.groups}
        onGroupChange={(group, on) => draftEnginePresetGroup(descriptor.id, group, on)}
        search={search}
        resources={resources}
        changes={
          ownDraft === undefined
            ? undefined
            : {
                onSave: () => void saveEnginePresetDraft().then(answer),
                onSaveAs: (name) => void saveEnginePresetDraftAsNew(name).then(answer),
              }
        }
        testId="engine-presets"
      />
    </SettingsSection>
  );
}

export default EnginePresetsSection;
