import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";

import { RadioGroupField, SwitchField } from "../../design-system/components/forms";

type Side = "white" | "black";

/**
 * **A Case board's Settings tab** (CTA-186) — the board's own choices, where
 * the other boards keep them in a menu off the header: the side the board
 * faces (kept with the Case as its orientation), the eval bar (its
 * `display`), and *Write evaluations into the game* (the analysis session's,
 * as on the Analysis Board). Every one autosaved but the last, which is the
 * reader's.
 */
function CaseSettingsTab({
  orientation,
  onOrientationChange,
  showEvalBar,
  onShowEvalBarChange,
  writeEvals,
  onWriteEvalsChange,
}: {
  orientation: Side;
  onOrientationChange: (side: Side) => void;
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
