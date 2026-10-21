import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import type { Theme } from "@mui/material/styles";

import { progressFillOf, progressSecondaryFillOf } from "../../../theme/progressFill";

/** The second fill's thickness: a strip, not a second chip. */
const SECONDARY_FILL_PX = 3;

const clampPercent = (value: number): number => Math.round(Math.max(0, Math.min(100, value)));

/** What both fills share: held to the chip's inline start, as wide as their value, moving through the theme. */
const fillSx = (theme: Theme, width: number) => ({
  position: "absolute",
  insetInlineStart: 0,
  width: `${width}%`,
  transition: theme.transitions.create("width", {
    duration: theme.transitions.duration.shorter,
    easing: theme.transitions.easing.easeOut,
  }),
}) as const;

type ProgressChipBase = {
  /** The words in view ("Depth 18/24"). */
  label: ReactNode;
  /** The chip's test id; its fill is `<testId>-fill`, its second fill `<testId>-secondary-fill`. */
  testId: string;
};

export type ProgressChipProps = ProgressChipBase &
  (
    | {
        /** 0–100, clamped: how far the fill reaches from the chip's inline start. Absent: a plain chip, no fill. */
        value: number;
        /**
         * The progress's accessible name ("Depth 18 of 24") — required with a value, so a progress is never nameless (CTA-111).
         * With a `secondaryValue` it names both ("Depth 18 of 24, 3 of 5 seconds"): one sentence, so a language orders it its own way.
         */
        progressLabel: string;
        /**
         * 0–100, clamped: a second measure of the same progress (CTA-251) — a thin strip along the chip's bottom edge,
         * from its inline start, in a stronger colour than the fill behind the words. Absent: no strip, the chip as before.
         */
        secondaryValue?: number;
      }
    | { value?: undefined; progressLabel?: undefined; secondaryValue?: undefined }
  );

/**
 * **A small outlined chip that fills as something progresses** (CTA-195) —
 * the variations box's depth chip while the engine searches: its words in
 * view, and behind them a tint of the primary colour reaching from the
 * chip's inline start as far as `value` says — the right in Hebrew, where
 * the chip's start is. No separate bar: the chip is the bar.
 *
 * Without a `value` it is a plain outlined chip, nothing else — the chip a
 * finished search shows.
 *
 * Accessible: with a value it is a `progressbar` named by `progressLabel`,
 * reporting its value (`aria-valuenow`, 0–100) — not a live region, so a
 * value that changes many times a second is not read out at each step. The
 * text over the fill is the surface's own `text.primary`, measured over the
 * fill in every theme (`themes/contrast.ts`), and the fill moves through
 * `theme.transitions`, so under reduced motion it steps rather than slides.
 *
 * With a `secondaryValue` (CTA-251) a second measure runs beside the first:
 * a thin strip along the chip's bottom edge, the primary at full strength
 * (`progressSecondaryFillOf`, measured at 3:1 over the paper and over the
 * fill), from the same inline start — the variations box's move-time clock
 * under its depth. Still one `progressbar`, its value the first measure's,
 * its name (`progressLabel`) saying both; the strip moves as the fill does.
 */
function ProgressChip({ label, value, progressLabel, secondaryValue, testId }: ProgressChipProps) {
  const shown = value === undefined ? undefined : clampPercent(value);
  const secondary = shown === undefined || secondaryValue === undefined ? undefined : clampPercent(secondaryValue);
  return (
    <Chip
      size="small"
      variant="outlined"
      data-testid={testId}
      {...(shown === undefined
        ? {}
        : {
            role: "progressbar",
            "aria-label": progressLabel,
            "aria-valuemin": 0,
            "aria-valuemax": 100,
            "aria-valuenow": shown,
          })}
      sx={shown === undefined ? undefined : { position: "relative", overflow: "hidden" }}
      label={
        shown === undefined ? (
          label
        ) : (
          <>
            {/*
              The fill: positioned against the chip itself (the label's span is
              not positioned), so it spans the chip's whole height and its
              rounded ends clip it. Drawn first, the words over it.
            */}
            <Box
              component="span"
              aria-hidden
              data-testid={`${testId}-fill`}
              data-value={shown}
              sx={(theme) => ({
                ...fillSx(theme, shown),
                insetBlock: 0,
                bgcolor: progressFillOf(theme.palette),
              })}
            />
            {secondary !== undefined && (
              // The second measure: a strip on the chip's bottom edge, over the fill, under the words.
              <Box
                component="span"
                aria-hidden
                data-testid={`${testId}-secondary-fill`}
                data-value={secondary}
                sx={(theme) => ({
                  ...fillSx(theme, secondary),
                  insetBlockEnd: 0,
                  height: SECONDARY_FILL_PX,
                  bgcolor: progressSecondaryFillOf(theme.palette),
                })}
              />
            )}
            <Box component="span" sx={{ position: "relative" }}>
              {label}
            </Box>
          </>
        )
      }
    />
  );
}

export default ProgressChip;
