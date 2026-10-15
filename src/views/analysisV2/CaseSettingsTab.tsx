import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";

import { RadioGroupField, SwitchField } from "../../design-system/components/forms";

type Side = "white" | "black";

/**
 * **A Case board's Settings tab** (CTA-186) — the board's own choices, where
 * the other boards keep them in a menu off the header: the side the board
 * faces (kept with the Case as its orientation), the next-move arrows and
 * the move marks on or off (its `display`, CTA-211 — the Display tab's
 * before), the eval bar (its
 * `display`), and *Write evaluations into the game* (its `display` too since
 * CTA-199). Every one autosaved with the Case.
 */
function CaseSettingsTab({
  orientation,
  onOrientationChange,
  showArrows,
  onShowArrowsChange,
  showMoveMarks,
  onShowMoveMarksChange,
  showEvalBar,
  onShowEvalBarChange,
  writeEvals,
  onWriteEvalsChange,
}: {
  orientation: Side;
  onOrientationChange: (side: Side) => void;
  showArrows: boolean;
  onShowArrowsChange: (next: boolean) => void;
  showMoveMarks: boolean;
  onShowMoveMarksChange: (next: boolean) => void;
  showEvalBar: boolean;
  onShowEvalBarChange: (next: boolean) => void;
  writeEvals: boolean;
  onWriteEvalsChange: (next: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <Box data-testid="analysis-case-settings" sx={{ display: "grid", gap: 2, px: 1, py: 1 }}>
      <RadioGroupField<Side>
        label={t("analysisV2.settings.orientation")}
        options={[
          { value: "white", label: t("analysisV2.settings.white") },
          { value: "black", label: t("analysisV2.settings.black") },
        ]}
        value={orientation}
        onChange={onOrientationChange}
        row
        size="small"
        testId="analysis-case-settings-orientation"
      />
      <SwitchField
        size="small"
        label={t("analysisV2.display.arrows")}
        help={t("analysisV2.display.arrowsHelp")}
        checked={showArrows}
        onChange={onShowArrowsChange}
        testIdOn="control"
        testId="analysis-case-setting-arrows"
      />
      <SwitchField
        size="small"
        label={t("analysisV2.display.moveMarks")}
        help={t("analysisV2.display.moveMarksHelp")}
        checked={showMoveMarks}
        onChange={onShowMoveMarksChange}
        testIdOn="control"
        testId="analysis-case-setting-move-marks"
      />
      <SwitchField
        size="small"
        label={t("analysisV2.settings.evalBar")}
        help={t("analysisV2.settings.evalBarHelp")}
        checked={showEvalBar}
        onChange={onShowEvalBarChange}
        testIdOn="control"
        testId="analysis-case-setting-evalbar"
      />
      <SwitchField
        size="small"
        label={t("analysis.settings.writeEvals")}
        help={t("analysis.settings.writeEvalsHelp")}
        checked={writeEvals}
        onChange={onWriteEvalsChange}
        testId="analysis-case-setting-write-evals"
      />
    </Box>
  );
}

export default CaseSettingsTab;
