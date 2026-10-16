import { useSyncExternalStore } from "react";

import type { ComputerAnalysisEngineChoice } from "../../../blocks/forms";
import { presetSearchOf, presetSentValues, selectedPresetOf, withDefaultPreset, type EnginePreset } from "../../../lib/enginePresets";
import {
  enginePresetSelectionsSnapshot,
  enginePresetsSnapshot,
  subscribeEnginePresetSelections,
  subscribeEnginePresets,
} from "../../../lib/enginePresetStore";
import { describeEngines, resolveEngine } from "../../../lib/engines";
import { useEngineChoice } from "../../shared/useEngineChoice";
import { useSelectedEnginePreset } from "../../shared/useSelectedEnginePreset";
import { defaultPresetInEffect, useJobsSettings } from "../useJobsSettings";

/** The engine and preset an engine-lane job starts with, and the search the preset prefills. */
export type EngineJobSeed = { engineId: string; presetId: string; search: { depth: number; moveTimeMs: number } };

/** The preset a job was given, as its input keeps it: its id, its name as the menu says it, the values it sends. */
export type EngineJobPreset = { id: string; name: string; values: ReturnType<typeof presetSentValues> };

/**
 * **The engine and preset of an engine-lane job's New-job form** (CTA-221,
 * New Job V2's seeding — CTA-188, CTA-193): seeded from the Jobs settings'
 * default where one is set and still there, else the board's engine and its
 * selected preset; the preset prefills the depth and time per move, both
 * editable; changing the engine takes its selected preset. Shared by the
 * computer analysis and the repertoire evaluation.
 */
export const useEngineJobChoice = (engineId: string) => {
  const { engineId: chosenEngine } = useEngineChoice();
  const presets = useSyncExternalStore(subscribeEnginePresets, enginePresetsSnapshot, enginePresetsSnapshot);
  const selections = useSyncExternalStore(subscribeEnginePresetSelections, enginePresetSelectionsSnapshot, enginePresetSelectionsSnapshot);
  const jobsSettings = useJobsSettings();
  const named = useSelectedEnginePreset(engineId);

  const presetOf = (id: string): EnginePreset => withDefaultPreset(presets ?? []).find((preset) => preset.id === id) ?? withDefaultPreset([])[0];

  /** The seed as the dialog opens. */
  const seed = (): EngineJobSeed => {
    const preferred = defaultPresetInEffect(jobsSettings, presets);
    const engine = preferred?.engineId ?? resolveEngine(chosenEngine).id;
    const preset =
      withDefaultPreset(presets ?? []).find((each) => each.id === preferred?.presetId) ?? selectedPresetOf(presets ?? [], selections ?? [], engine);
    return { engineId: engine, presetId: preset.id, search: presetSearchOf(preset) };
  };

  /** Another engine: its id as the registry resolves it, its selected preset, that preset's search. */
  const forEngine = (next: string): EngineJobSeed => {
    const engine = resolveEngine(next).id;
    const preset = selectedPresetOf(presets ?? [], selections ?? [], engine);
    return { engineId: engine, presetId: preset.id, search: presetSearchOf(preset) };
  };

  /** The preset as a job's input keeps it — named as the Engine menu names it. */
  const jobPreset = (presetId: string): EngineJobPreset => {
    const preset = presetOf(presetId);
    return { id: preset.id, name: named.presets.find((each) => each.id === preset.id)?.name ?? preset.name, values: presetSentValues(preset) };
  };

  /** The selects at the head of the form's Engine section. */
  const engineChoice = (
    presetId: string,
    onEngine: (seed: EngineJobSeed) => void,
    onPreset: (presetId: string, search: EngineJobSeed["search"]) => void,
  ): ComputerAnalysisEngineChoice => ({
    engines: describeEngines(),
    engineId,
    onEngineChange: (next) => onEngine(forEngine(next)),
    presets: named.presets,
    presetId,
    onPresetChange: (next) => onPreset(next, presetSearchOf(presetOf(next))),
  });

  return { seed, jobPreset, engineChoice };
};
