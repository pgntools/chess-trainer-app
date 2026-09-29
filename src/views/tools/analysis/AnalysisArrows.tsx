import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";

import { ArrowSettingsFields } from "../../../blocks/forms";
import { SwitchField } from "../../../design-system/components/forms";
import type { ArrowPaletteId, ArrowWidthSource } from "../../../lib/arrowSettings";

/**
 * **The Analysis Board's Arrows tab** (CTA-98): the next-move arrows switch
 * (moved here from the Engine tab), what sizes them and their colours — all
 * the session's, opened as the record's settings say. `available` is what the
 * tree on screen carries (`arrowWidthSourcesIn`), recomputed by the screen as
 * the tree changes. A `SwitchField` over the `ArrowSettingsFields` block
 * since CTA-113.
 */
function AnalysisArrows({
  showArrows,
  onShowArrowsChange,
  widthSource,
  onWidthSourceChange,
  available,
  palette,
  onPaletteChange,
}: {
  showArrows: boolean;
  onShowArrowsChange: (next: boolean) => void;
  widthSource: ArrowWidthSource;
  onWidthSourceChange: (next: ArrowWidthSource) => void;
  available: ReadonlySet<ArrowWidthSource>;
  palette: ArrowPaletteId;
  onPaletteChange: (next: ArrowPaletteId) => void;
}) {
  const { t } = useTranslation();
  return (
    <Box data-testid="analysis-arrows-tab" sx={{ display: "flex", flexDirection: "column", gap: 2, px: 1, py: 1 }}>
      <SwitchField
        size="small"
        label={t("analysis.settings.arrows")}
        help={t("analysis.arrows.showHelp")}
        checked={showArrows}
        onChange={onShowArrowsChange}
        // The board's tests reach the input inside the switch.
        testIdOn="control"
        testId="analysis-arrows"
      />
      <ArrowSettingsFields
        widthSource={widthSource}
        onWidthSourceChange={onWidthSourceChange}
        available={available}
        palette={palette}
        onPaletteChange={onPaletteChange}
        testId="analysis-arrows"
      />
    </Box>
  );
}

export default AnalysisArrows;
