import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";

import { progressFillOf } from "../../../theme/progressFill";

type ProgressChipBase = {
  /** The words in view ("Depth 18/24"). */
  label: ReactNode;
  /** The chip's test id; its fill is `<testId>-fill`. */
  testId: string;
};

export type ProgressChipProps = ProgressChipBase &
  (
    | {
        /** 0–100, clamped: how far the fill reaches from the chip's inline start. Absent: a plain chip, no fill. */
        value: number;
        /** The progress's accessible name ("Depth 18 of 24") — required with a value, so a progress is never nameless (CTA-111). */
        progressLabel: string;
      }
    | { value?: undefined; progressLabel?: undefined }
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
 */
function ProgressChip({ label, value, progressLabel, testId }: ProgressChipProps) {
  const shown = value === undefined ? undefined : Math.round(Math.max(0, Math.min(100, value)));
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
                position: "absolute",
                insetBlock: 0,
                insetInlineStart: 0,
                width: `${shown}%`,
                bgcolor: progressFillOf(theme.palette),
                transition: theme.transitions.create("width", {
                  duration: theme.transitions.duration.shorter,
                  easing: theme.transitions.easing.easeOut,
                }),
              })}
            />
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
