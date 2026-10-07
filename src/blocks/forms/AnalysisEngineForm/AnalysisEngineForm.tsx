import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import { useTranslation } from "react-i18next";

import { SliderField, SwitchField } from "../../../design-system/components/forms";
import { ANALYSIS_SETTING_BOUNDS, ANALYSIS_UCI_OPTION, type AnalysisSettings } from "../../../lib/analysisSettings";
import type { DeviceEngineLimits } from "../../../lib/engineSettings";
import type { EngineOption } from "../../../lib/engineTypes";
import { MAX_VARIATIONS_OFFERED } from "../../../lib/engineAnalysis";
import { engineOptionState, optionSlug } from "../EngineSettingsForm";

export type AnalysisEngineFormProps = {
  settings: AnalysisSettings;
  onChange: (patch: Partial<AnalysisSettings>) => void;
  /** What the running worker declared. Empty until the handshake lands. */
  engineOptions: ReadonlyMap<string, EngineOption>;
  /** The engine's switch (above the tab strip) — what gates the search's sliders. */
  engineOn: boolean;
  showEvalBar: boolean;
  onShowEvalBarChange: (next: boolean) => void;
  /**
   * The most Threads and Hash this device should be offered — the screen's
   * `deviceEngineLimits()`, as on Play with Engine's form (CTA-160). Absent:
   * `ANALYSIS_SETTING_BOUNDS`' ceilings.
   */
  deviceLimits?: DeviceEngineLimits;
  /** The Clear button — absent, no button (a Library game is not cleared). */
  onClear?: () => void;
  /**
   * The prefix of the form's own ids: the form `<testId>-settings`, the eval
   * bar's switch `<testId>-setting-evalbar`, Clear `<testId>-clear`. The
   * sliders are `engine-setting-<option>` (with `-value`, `-unsupported`,
   * `-fixed`) — every board's, and Play with Engine's form's.
   */
  testId: string;
};

/** The sliders' ids, whichever board: the engine's rule since CTA-51. */
const SLIDER = "engine-setting";

/** The option-backed sliders, in Play with Engine's form's order and with its ids (`engine-setting-multipv`, `-threads`, `-hash`). */
type OptionRow = {
  setting: "multiPv" | "threads" | "hashMb";
  labelKey: string;
  /** The fallback range before the handshake, and the top the form offers. */
  bounds: { min: number; max: number };
};

/**
 * **The Engine tab of an analysis board** (CTA-113; `AnalysisSettings` since
 * CTA-51) — how hard to search (infinite analysis, or a depth and a move
 * time), how many lines, the threads and the hash, the eval bar, and a Clear
 * back to an empty board: the Analysis Board's, the Library's game board's, the Openings explorer's and the repertoire
 * player's. Shorter than Play with Engine's `EngineSettingsForm` on purpose:
 * no opponent, so no strength to weaken.
 *
 * `MultiPV`, `Threads` and `Hash` are judged by what the running engine
 * declared (`engineOptionState`, `EngineSettingsForm`'s rule — this is where
 * `OptionSlider` went): absent, pinned or adjustable, the lines' top capped at
 * `MAX_VARIATIONS_OFFERED` and Threads' and Hash's at what the device can give
 * — every board as Play with Engine (CTA-160). Depth and move time are `go` arguments, always
 * there, but off while the engine is; they stay live under infinite analysis,
 * because Play still searches to them (CTA-160).
 *
 * Presentational: the settings arrive, a change leaves as a patch. Its words
 * are the analysis panel's (`analysis.settings.*`, `engineOption.*`), which
 * every board with this tab shares.
 */
function AnalysisEngineForm({
  settings,
  onChange,
  engineOptions,
  engineOn,
  showEvalBar,
  onShowEvalBarChange,
  deviceLimits,
  onClear,
  testId,
}: AnalysisEngineFormProps) {
  const { t } = useTranslation();
  // Before the handshake there is nothing to judge a control against, so no control is called unsupported.
  const handshakeLanded = engineOptions.size > 0;

  const optionSlider = ({ setting, labelKey, bounds }: OptionRow) => {
    const optionName = ANALYSIS_UCI_OPTION[setting];
    const id = `${SLIDER}-${optionSlug(optionName)}`;
    const state = engineOptionState(
      handshakeLanded ? engineOptions.get(optionName) : { name: optionName, type: "spin" },
      bounds,
      bounds.max,
    );
    return (
      <SliderField
        label={t(labelKey)}
        value={settings[setting]}
        min={state.min}
        max={state.max}
        disabled={state.kind !== "adjustable"}
        onChange={(next) => onChange({ [setting]: next })}
        notice={
          state.kind === "absent" ? (
            <span data-testid={`${id}-unsupported`}>{t("engineOption.unsupported", { option: optionName })}</span>
          ) : state.kind === "pinned" ? (
            <span data-testid={`${id}-fixed`}>{t("engineOption.fixed", { option: optionName, value: state.fixedAt })}</span>
          ) : undefined
        }
        testId={id}
      />
    );
  };

  return (
    <Box data-testid={`${testId}-settings`} sx={{ display: "grid", gap: 2 }}>
      <SwitchField
        label={t("analysis.settings.infinite")}
        help={t("analysis.settings.infiniteHelp")}
        checked={settings.infinite}
        disabled={!engineOn}
        onChange={(infinite) => onChange({ infinite })}
        testId={`${SLIDER}-infinite`}
      />
      <SliderField
        label={t("analysis.settings.depth")}
        value={settings.depth}
        min={ANALYSIS_SETTING_BOUNDS.depth.min}
        max={ANALYSIS_SETTING_BOUNDS.depth.max}
        disabled={!engineOn}
        onChange={(depth) => onChange({ depth })}
        testId={`${SLIDER}-depth`}
      />
      <SliderField
        label={t("analysis.settings.moveTime")}
        value={settings.moveTimeMs}
        min={ANALYSIS_SETTING_BOUNDS.moveTimeMs.min}
        max={ANALYSIS_SETTING_BOUNDS.moveTimeMs.max}
        step={250}
        disabled={!engineOn}
        valueLabel={
          settings.moveTimeMs === 0
            ? t("analysis.settings.moveTimeNone")
            : t("analysis.settings.moveTimeValue", { seconds: (settings.moveTimeMs / 1000).toFixed(1) })
        }
        onChange={(moveTimeMs) => onChange({ moveTimeMs })}
        testId={`${SLIDER}-movetime`}
      />
      {optionSlider({ setting: "multiPv", labelKey: "analysis.settings.multiPv", bounds: { min: 1, max: MAX_VARIATIONS_OFFERED } })}
      {optionSlider({
        setting: "threads",
        labelKey: "analysis.settings.threads",
        bounds: { min: ANALYSIS_SETTING_BOUNDS.threads.min, max: deviceLimits?.threads ?? ANALYSIS_SETTING_BOUNDS.threads.max },
      })}
      {optionSlider({
        setting: "hashMb",
        labelKey: "analysis.settings.hash",
        bounds: { min: ANALYSIS_SETTING_BOUNDS.hashMb.min, max: deviceLimits?.hashMb ?? ANALYSIS_SETTING_BOUNDS.hashMb.max },
      })}
      <SwitchField
        label={t("analysis.settings.evalBar")}
        checked={showEvalBar}
        onChange={onShowEvalBarChange}
        // The boards' tests reach the input inside the switch.
        testIdOn="control"
        testId={`${testId}-setting-evalbar`}
      />
      {onClear !== undefined && (
        <Box>
          <Button variant="outlined" startIcon={<RestartAltRoundedIcon />} data-testid={`${testId}-clear`} onClick={onClear}>
            {t("analysis.settings.clear")}
          </Button>
        </Box>
      )}
    </Box>
  );
}

export default AnalysisEngineForm;
