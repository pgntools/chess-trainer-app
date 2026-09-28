import { useId, type ReactNode } from "react";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Typography from "@mui/material/Typography";

import type { VisibleLabel } from "../../a11y";
import FieldLabel from "../FieldLabel/FieldLabel";

/** One choice of the group. */
export type RadioOption<V extends string = string> = { value: V; label: VisibleLabel; disabled?: boolean };

export type RadioGroupFieldProps<V extends string = string> = {
  /** The group's name — its legend, and what a screen reader says on entering it. */
  label: VisibleLabel;
  options: readonly RadioOption<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Side by side (a short choice: Merge / Override / Skip) rather than one under another. */
  row?: boolean;
  /** A caption under the choices, describing the group — what the one chosen does. */
  help?: ReactNode;
  size?: "small" | "medium";
  disabled?: boolean;
  /** On the radio group (`role="radiogroup"`); each radio's input is `<testId>-<value>`, the help `<testId>-help`. */
  testId: string;
};

/**
 * **One choice of several, as radios** (CTA-109): a `fieldset` whose legend
 * (the `FieldLabel` style) names the group, MUI's `RadioGroup` of labelled
 * radios — the arrow keys move the choice, as the pattern asks — and an
 * optional help caption that describes it. The Import dialog's Merge /
 * Override / Skip, per category and per folder, was two hand-built groups
 * with no name.
 */
function RadioGroupField<V extends string = string>({
  label,
  options,
  value,
  onChange,
  row = false,
  help,
  size = "small",
  disabled = false,
  testId,
}: RadioGroupFieldProps<V>) {
  const legendId = useId();
  const helpId = useId();
  return (
    <Box component="fieldset" disabled={disabled} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
      <FieldLabel component="legend" id={legendId}>
        {label}
      </FieldLabel>
      <RadioGroup
        row={row}
        value={value}
        onChange={(_event, next) => onChange(next as V)}
        aria-labelledby={legendId}
        aria-describedby={help === undefined ? undefined : helpId}
        data-testid={testId}
      >
        {options.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            disabled={disabled || option.disabled}
            control={<Radio size={size} slotProps={{ input: { "data-testid": `${testId}-${option.value}` } as object }} />}
            label={<Typography variant={size === "small" ? "body2" : "body1"}>{option.label}</Typography>}
          />
        ))}
      </RadioGroup>
      {help !== undefined && (
        <Typography id={helpId} variant="caption" color="text.secondary" data-testid={`${testId}-help`} sx={{ display: "block" }}>
          {help}
        </Typography>
      )}
    </Box>
  );
}

export default RadioGroupField;
