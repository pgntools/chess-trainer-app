import { useId, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";
import Typography from "@mui/material/Typography";

import type { VisibleLabel } from "../../a11y";

export type SliderFieldProps = {
  label: VisibleLabel;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  /** What the header shows beside the label — absent, the number itself. */
  valueLabel?: ReactNode;
  /** A caption under the slider (a notice: "fixed at 1 in this build"). */
  notice?: ReactNode;
  disabled?: boolean;
  /** The root's test id; `<testId>-value` is the header's value, `<testId>-input` the slider's input, `<testId>-notice` the caption. */
  testId: string;
};

/**
 * **A labelled slider** (CTA-108): a header with the label at the start and
 * the value at the end (`dir="ltr"`, so a number never reverses), a small
 * slider under it, dimmed while off. `OptionSlider` and the four
 * depth and move-time rows each wrote this header; this is it once.
 *
 * The notice is never dimmed (CTA-109): it says why the slider is off, and at
 * 60 % a warning caption fell to 2.5:1 — a browser audit of the Engine tab
 * found it. Only the header and the slider fade.
 */
function SliderField({ label, value, onChange, min, max, step = 1, valueLabel, notice, disabled = false, testId }: SliderFieldProps) {
  const labelId = useId();
  return (
    <Box data-testid={testId}>
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1, opacity: disabled ? 0.6 : 1 }}>
        <Typography id={labelId} variant="body2" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary" dir="ltr" data-testid={`${testId}-value`}>
          {valueLabel ?? value}
        </Typography>
      </Box>
      <Slider
        size="small"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(_event, next) => onChange(Array.isArray(next) ? next[0] : next)}
        sx={{ opacity: disabled ? 0.6 : 1 }}
        slotProps={{ input: { "aria-labelledby": labelId, "data-testid": `${testId}-input` } as object }}
      />
      {notice !== undefined && (
        <Typography variant="caption" sx={{ display: "block", color: "warning.main" }} data-testid={`${testId}-notice`}>
          {notice}
        </Typography>
      )}
    </Box>
  );
}

export default SliderField;
