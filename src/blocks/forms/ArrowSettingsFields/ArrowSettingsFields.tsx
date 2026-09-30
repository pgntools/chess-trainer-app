import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";

import { StatusText } from "../../../design-system/components/feedback";
import { RadioGroupField } from "../../../design-system/components/forms";
import { useChessTokens } from "../../../design-system/theme";
import { ARROW_PALETTES, ARROW_WIDTH_SOURCES, type ArrowPaletteId, type ArrowWidthSource } from "../../../lib/arrowSettings";

export type ArrowSettingsFieldsProps = {
  widthSource: ArrowWidthSource;
  onWidthSourceChange: (next: ArrowWidthSource) => void;
  /**
   * What the tree on screen carries (`arrowWidthSourcesIn`): a tag no move
   * has is offered but off, and a chosen one that is gone says the arrows are
   * drawn as None. Absent (a record's settings screen), every source is on.
   */
  available?: ReadonlySet<ArrowWidthSource>;
  palette: ArrowPaletteId;
  onPaletteChange: (next: ArrowPaletteId) => void;
  /**
   * The prefix of every id: the groups `<testId>-width` and `-palette`, each
   * radio's input `-width-<source>` / `-palette-<id>`, the note
   * `-width-drawn-as-none`.
   */
  testId: string;
};

/**
 * **How the next-move arrows are drawn** (CTA-113; `ArrowSettingsFields`
 * since CTA-98) — what sizes each arrow and their colours, two
 * `RadioGroupField`s: each source with a line saying what it reads, each
 * palette with its three swatches (the theme's, what the board will draw —
 * mainline, side line, hovered). The Analysis Board's Arrows tab (the
 * session's, with `available`) and a saved analysis' settings screen (what
 * the board opens on) share it; the arrows' switch stays each screen's.
 *
 * Presentational: the choices arrive, each change leaves as a callback. Its
 * words are the Analysis Board's (`analysis.arrows.*`).
 */
function ArrowSettingsFields({ widthSource, onWidthSourceChange, available, palette, onPaletteChange, testId }: ArrowSettingsFieldsProps) {
  const { t } = useTranslation();
  const { arrowPalettes } = useChessTokens();
  const drawnAsNone = available !== undefined && !available.has(widthSource);

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box>
        <RadioGroupField<ArrowWidthSource>
          label={t("analysis.arrows.widthSource")}
          value={widthSource}
          onChange={onWidthSourceChange}
          options={ARROW_WIDTH_SOURCES.map((source) => {
            const off = available !== undefined && !available.has(source);
            return {
              value: source,
              disabled: off,
              label: (
                <Box component="span" sx={{ display: "block", py: 0.25 }}>
                  <Box component="span" sx={{ display: "block" }}>
                    {t(`analysis.arrows.sources.${source}`)}
                  </Box>
                  <Box component="span" sx={{ display: "block", typography: "caption", color: "text.secondary", lineHeight: 1.3 }}>
                    {t(off ? "analysis.arrows.unavailable" : `analysis.arrows.sourceHelp.${source}`)}
                  </Box>
                </Box>
              ),
            };
          })}
          testId={`${testId}-width`}
        />
        {drawnAsNone && (
          <StatusText tone="warning" testId={`${testId}-width-drawn-as-none`}>
            {t("analysis.arrows.drawnAsNone")}
          </StatusText>
        )}
      </Box>
      <RadioGroupField<ArrowPaletteId>
        label={t("analysis.arrows.palette")}
        value={palette}
        onChange={onPaletteChange}
        help={t("analysis.arrows.paletteHelp")}
        options={ARROW_PALETTES.map((id) => {
          const colors = arrowPalettes[id];
          return {
            value: id,
            label: (
              <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                {t(`analysis.arrows.palettes.${id}`)}
                <Box component="span" aria-hidden="true" sx={{ display: "inline-flex", gap: 0.5 }}>
                  {[colors.mainline, colors.sideline, colors.hovered].map((color) => (
                    <Box key={color} component="span" sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: color }} />
                  ))}
                </Box>
              </Box>
            ),
          };
        })}
        testId={`${testId}-palette`}
      />
    </Box>
  );
}

export default ArrowSettingsFields;
