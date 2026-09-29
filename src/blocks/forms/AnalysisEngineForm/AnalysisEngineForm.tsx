import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import { useTranslation } from "react-i18next";

import { SliderField, SwitchField } from "../../../design-system/components/forms";
import { ANALYSIS_UCI_OPTION, type AnalysisSettings } from "../../../lib/analysisSettings";
import type { EngineOption } from "../../../lib/engine";
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

/**
 * **The Engine tab of an analysis board** (CTA-113; `AnalysisSettings` since
 * CTA-51) — how hard to search (depth, move time), how many lines, the eval
 * bar, and a Clear back to an empty board: the Analysis Board's, the
 * Library's game board's, the Openings explorer's and the repertoire
 * player's. Shorter than Play with Engine's `EngineSettingsForm` on purpose:
 * no opponent, so no strength to weaken.
 *
 * `MultiPV` is judged by what the running engine declared
 * (`engineOptionState`, `EngineSettingsForm`'s rule — this is where
 * `OptionSlider` went): absent, pinned or adjustable, its top capped at
 * `MAX_VARIATIONS_OFFERED`. Depth and move time are `go` arguments, always
 * there, but off while the engine is.
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
  onClear,
  testId,
}: AnalysisEngineFormProps) {
  const { t } = useTranslation();
  // Before the handshake there is nothing to judge a control against, so no control is called unsupported.
  const handshakeLanded = engineOptions.size > 0;
  const optionName = ANALYSIS_UCI_OPTION.multiPv;
  const multiPvId = `${SLIDER}-${optionSlug(optionName)}`;
  const multiPv = engineOptionState(
    handshakeLanded ? engineOptions.get(optionName) : { name: optionName, type: "spin" },
    { min: 1, max: MAX_VARIATIONS_OFFERED },
    MAX_VARIATIONS_OFFERED,
  );

  return (
    <Box data-testid={`${testId}-settings`} sx={{ display: "grid", gap: 2 }}>
      <SliderField
        label={t("analysis.settings.depth")}
        value={settings.depth}
        min={1}
        // The wrapper clamps a search to 24 plies; offering more would be a control that silently stops moving.
        max={24}
        disabled={!engineOn}
        onChange={(depth) => onChange({ depth })}
        testId={`${SLIDER}-depth`}
      />
      <SliderField
        label={t("analysis.settings.moveTime")}
        value={settings.moveTimeMs}
        min={0}
        max={10000}
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
      <SliderField
        label={t("analysis.settings.multiPv")}
        value={settings.multiPv}
        min={multiPv.min}
        max={multiPv.max}
        disabled={multiPv.kind !== "adjustable"}
        onChange={(next) => onChange({ multiPv: next })}
        notice={
          multiPv.kind === "absent" ? (
            <span data-testid={`${multiPvId}-unsupported`}>{t("engineOption.unsupported", { option: optionName })}</span>
          ) : multiPv.kind === "pinned" ? (
            <span data-testid={`${multiPvId}-fixed`}>{t("engineOption.fixed", { option: optionName, value: multiPv.fixedAt })}</span>
          ) : undefined
        }
        testId={multiPvId}
      />
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
