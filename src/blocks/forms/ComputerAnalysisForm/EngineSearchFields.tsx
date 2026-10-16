import { useState } from "react";
import { useTranslation } from "react-i18next";

import { SelectField, SliderField, SwitchField } from "../../../design-system/components/forms";
import { COMPUTER_ANALYSIS_BOUNDS, DEFAULT_COMPUTER_ANALYSIS_OPTIONS, type ComputerAnalysisOptions } from "../../../lib/computerAnalysis";
import { MAX_VARIATIONS_OFFERED } from "../../../lib/engineAnalysis";
import type { DeviceEngineLimits } from "../../../lib/engineSettings";
import type { EngineOption } from "../../../lib/engineTypes";
import type { EngineEntry } from "../../../lib/engines";
import { engineSelectOptions } from "../EnginePicker";
import { engineOptionState, optionSlug } from "../EngineSettingsForm";

/**
 * **The engine and its preset, each a select** (CTA-188, the New Job V2
 * popup) — as the top bar's Engine menu offers them: the engines
 * (`describeEngines()`, one this page cannot run disabled with its reason) and
 * every preset, the one chosen prefilling the depth and time per move — the
 * screen's to do.
 */
export type ComputerAnalysisEngineChoice = {
  engines: readonly EngineEntry[];
  engineId: string;
  onEngineChange: (engineId: string) => void;
  /** Every preset, Default in the screen's words. */
  presets: readonly { id: string; name: string }[];
  presetId: string;
  onPresetChange: (presetId: string) => void;
};

/** The search a job runs — computerAnalysis's knobs; `minDepth`, the early stop, only where the job has one. */
export type EngineSearchValues = Pick<ComputerAnalysisOptions, "threads" | "hashMb" | "depth" | "moveTimeMs" | "multiPv"> & {
  minDepth?: number;
};

export type EngineSearchFieldsProps = {
  values: EngineSearchValues;
  /** A change, as a patch — the screen holds the values to their bounds. */
  onChange: (patch: Partial<EngineSearchValues>) => void;
  /** What the engine declared (`engineOptionState`): Threads, Hash and MultiPV absent, pinned or adjustable. Empty before its handshake. */
  engineOptions: ReadonlyMap<string, EngineOption>;
  /** The engine's `capabilities.multiThread`, read only before the handshake. Absent: nothing is assumed. */
  multiThread?: boolean;
  /** The most Threads and Hash to offer (`engineLimitsOf(descriptor)`). Absent, the bounds' ceilings. */
  deviceLimits?: DeviceEngineLimits;
  /** The engine and preset selects first — absent, none. */
  engineChoice?: ComputerAnalysisEngineChoice;
  /**
   * The prefix of every field's test id: `-engine-select`, `-preset`,
   * `-threads`, `-hash`, `-depth`, `-no-time-limit`, `-movetime`, `-multipv`,
   * `-mindepth`. The fields are a fragment, for the host's section — no root.
   */
  testId: string;
};

/**
 * **A job's engine and search, as fields** (CTA-219, out of
 * `ComputerAnalysisForm`, whose Engine section they are): the engine and its
 * preset where a choice is given, then Threads, Hash (each by what the
 * engine declared — absent, pinned or adjustable, `engineOptionState`; a
 * single-thread engine's Threads pinned at 1 before its handshake), the
 * depth, **No time limit** over the time per move (on, `moveTimeMs` 0; off,
 * the last time set comes back), the lines, and the early stop's depth when
 * the values carry one. Shared by every engine job's form — the computer
 * analysis and the repertoire evaluation. Presentational; its words are
 * `computerAnalysis.form.*`.
 */
function EngineSearchFields({ values, onChange, engineOptions, multiThread, deviceLimits, engineChoice, testId }: EngineSearchFieldsProps) {
  const { t } = useTranslation();
  // The time a "No time limit" switched off again brings back: the last one set, else the default.
  const [lastMoveTimeMs, setLastMoveTimeMs] = useState(values.moveTimeMs || DEFAULT_COMPUTER_ANALYSIS_OPTIONS.moveTimeMs);
  const noTimeLimit = values.moveTimeMs === 0;
  const bounds = COMPUTER_ANALYSIS_BOUNDS;
  const handshakeLanded = engineOptions.size > 0;

  const optionSlider = (
    setting: "threads" | "hashMb" | "multiPv",
    optionName: string,
    label: string,
    range: { min: number; max: number },
  ) => {
    const declared = handshakeLanded
      ? engineOptions.get(optionName)
      : setting === "threads" && multiThread === false
        ? { name: optionName, type: "spin" as const, min: 1, max: 1 }
        : { name: optionName, type: "spin" as const };
    const state = engineOptionState(declared, range, range.max);
    return (
      <SliderField
        label={label}
        value={state.kind === "pinned" ? state.fixedAt : values[setting]}
        min={state.min}
        max={state.max}
        disabled={state.kind !== "adjustable"}
        onChange={(next) => onChange({ [setting]: next })}
        notice={
          state.kind === "absent"
            ? t("engineOption.unsupported", { option: optionName })
            : state.kind === "pinned"
              ? t("engineOption.fixed", { option: optionName, value: state.fixedAt })
              : undefined
        }
        testId={`${testId}-${optionSlug(optionName)}`}
      />
    );
  };

  return (
    <>
      {engineChoice !== undefined && (
        <>
          <SelectField
            label={t("computerAnalysis.form.engineSelect")}
            value={engineChoice.engineId}
            onChange={engineChoice.onEngineChange}
            options={engineSelectOptions(engineChoice.engines, t)}
            fullWidth
            testId={`${testId}-engine-select`}
          />
          <SelectField
            label={t("computerAnalysis.form.preset")}
            value={engineChoice.presetId}
            onChange={engineChoice.onPresetChange}
            options={engineChoice.presets.map((preset) => ({ value: preset.id, label: <bdi>{preset.name}</bdi> }))}
            fullWidth
            testId={`${testId}-preset`}
          />
        </>
      )}
      {optionSlider("threads", "Threads", t("computerAnalysis.form.threads"), {
        min: bounds.threads.min,
        max: deviceLimits?.threads ?? bounds.threads.max,
      })}
      {optionSlider("hashMb", "Hash", t("computerAnalysis.form.hash"), {
        min: bounds.hashMb.min,
        max: deviceLimits?.hashMb ?? bounds.hashMb.max,
      })}
      <SliderField
        label={t("computerAnalysis.form.depth")}
        value={values.depth}
        min={bounds.depth.min}
        max={bounds.depth.max}
        onChange={(depth) => onChange({ depth })}
        testId={`${testId}-depth`}
      />
      <SwitchField
        label={t("computerAnalysis.form.noTimeLimit")}
        help={t("computerAnalysis.form.noTimeLimitHelp")}
        checked={noTimeLimit}
        onChange={(on) => onChange({ moveTimeMs: on ? 0 : lastMoveTimeMs })}
        testId={`${testId}-no-time-limit`}
      />
      <SliderField
        label={t("computerAnalysis.form.moveTime")}
        value={noTimeLimit ? lastMoveTimeMs : values.moveTimeMs}
        // No time limit is the switch above, not the slider's far end.
        min={Math.max(1000, bounds.moveTimeMs.min)}
        max={bounds.moveTimeMs.max}
        step={1000}
        disabled={noTimeLimit}
        valueLabel={
          noTimeLimit
            ? t("computerAnalysis.form.moveTimeNone")
            : t("computerAnalysis.form.seconds", { seconds: Math.round(values.moveTimeMs / 100) / 10 })
        }
        onChange={(moveTimeMs) => {
          setLastMoveTimeMs(moveTimeMs);
          onChange({ moveTimeMs });
        }}
        testId={`${testId}-movetime`}
      />
      {optionSlider("multiPv", "MultiPV", t("computerAnalysis.form.lines"), {
        min: bounds.multiPv.min,
        max: Math.min(bounds.multiPv.max, MAX_VARIATIONS_OFFERED),
      })}
      {values.minDepth !== undefined && (
        <SliderField
          label={t("computerAnalysis.form.minDepth")}
          value={values.minDepth}
          min={bounds.minDepth.min}
          max={values.depth}
          help={t("computerAnalysis.form.minDepthHelp")}
          onChange={(minDepth) => onChange({ minDepth })}
          testId={`${testId}-mindepth`}
        />
      )}
    </>
  );
}

export default EngineSearchFields;
