import { useState } from "react";
import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";

import { ArrowSettingsFields } from "../../blocks/forms";
import { SwitchField } from "../../design-system/components/forms";
import { EmptyState } from "../../design-system/components/states";
import { PanelTabs, tabPanelProps } from "../../design-system/components/tabs";
import type { CaseDisplay } from "../../lib/analysisProjects";
import type { ArrowWidthSource } from "../../lib/arrowSettings";

/** The inner tabs, in order. */
type DisplayTab = "arrows" | "engine" | "accessibility";

/**
 * **A Case board's Display tab** (CTA-186) — how the board draws, kept with
 * the Case (`CaseDisplay`, autosaved):
 *
 * - **the common option** on top: the move marks on the board (the
 *   next-move arrows' on / off is the Settings tab's since CTA-211,
 *   `CaseSettingsTab`);
 * - **inner tabs** under them: **Arrows** — what sizes the arrows and their
 *   colours (the Analysis Board's Arrows tab's fields, `ArrowSettingsFields`,
 *   a tag no move carries offered but off), **Engine** — the engine's lines
 *   (the eval bar is the Settings tab's, `CaseSettingsTab`), and
 *   **Accessibility** — the board's accessibility options, still to come.
 */
function CaseDisplayTab({
  display,
  onChange,
  available,
  engineLines,
}: {
  display: CaseDisplay;
  onChange: (patch: Partial<CaseDisplay>) => void;
  /** The width sources the tree on screen carries (`arrowWidthSourcesIn`). */
  available: ReadonlySet<ArrowWidthSource>;
  /** Whether the engine's lines for the position on screen are in hand — what Variations draws (CTA-197). */
  engineLines: boolean;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<DisplayTab>("arrows");
  return (
    <Box data-testid="analysis-case-display" sx={{ display: "flex", flexDirection: "column", gap: 2, px: 1, py: 1 }}>
      <Box sx={{ display: "grid", gap: 1 }}>
        <SwitchField
          size="small"
          label={t("analysisV2.display.moveMarks")}
          help={t("analysisV2.display.moveMarksHelp")}
          checked={display.showMoveMarks}
          onChange={(showMoveMarks) => onChange({ showMoveMarks })}
          testIdOn="control"
          testId="analysis-case-display-move-marks"
        />
      </Box>
      <PanelTabs
        tabs={[
          { id: "arrows", label: t("analysisV2.display.tabs.arrows") },
          { id: "engine", label: t("analysisV2.display.tabs.engine") },
          { id: "accessibility", label: t("analysisV2.display.tabs.accessibility") },
        ]}
        value={tab}
        onChange={(id) => setTab(id as DisplayTab)}
        fullWidth={false}
        ariaLabel={t("analysisV2.display.tabs.label")}
        idPrefix="analysis-case-display"
        testId="analysis-case-display-tabs"
      />
      {tab === "arrows" && (
        <Box {...tabPanelProps("analysis-case-display", "arrows")}>
          <ArrowSettingsFields
            widthSource={display.arrowWidthSource}
            onWidthSourceChange={(arrowWidthSource) => onChange({ arrowWidthSource })}
            available={available}
            engineLines={engineLines}
            palette={display.arrowPalette}
            onPaletteChange={(arrowPalette) => onChange({ arrowPalette })}
            testId="analysis-case-display"
          />
        </Box>
      )}
      {tab === "engine" && (
        <Box {...tabPanelProps("analysis-case-display", "engine")} sx={{ display: "grid", gap: 1 }}>
          <SwitchField
            size="small"
            label={t("analysisV2.display.variations")}
            help={t("analysisV2.display.variationsHelp")}
            checked={display.showVariations}
            onChange={(showVariations) => onChange({ showVariations })}
            testIdOn="control"
            testId="analysis-case-display-variations"
          />
        </Box>
      )}
      {tab === "accessibility" && (
        <Box {...tabPanelProps("analysis-case-display", "accessibility")}>
          <EmptyState testId="analysis-case-display-accessibility">{t("analysisV2.display.accessibilitySoon")}</EmptyState>
        </Box>
      )}
    </Box>
  );
}

export default CaseDisplayTab;
