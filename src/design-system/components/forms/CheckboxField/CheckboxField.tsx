import { useId, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";

import { nativeIndeterminate, type VisibleLabel } from "../../a11y";

export type CheckboxFieldProps = {
  label: VisibleLabel;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Part of a group is ticked (a parent over its children). */
  indeterminate?: boolean;
  /** A caption under it, describing the box. */
  help?: ReactNode;
  size?: "small" | "medium";
  disabled?: boolean;
  /** On the input; the help is `<testId>-help`. */
  testId: string;
  /**
   * Where the test id goes: on the `input` (the default), or on the
   * `control` — MUI's checkbox, around the input — for a screen whose tests
   * reached the input inside it before it moved onto this field.
   */
  testIdOn?: "input" | "control";
};

/**
 * **A labelled checkbox** (CTA-108), SwitchField's twin: the test id on the
 * input, no label margins, an optional help caption that describes it.
 */
function CheckboxField({
  label,
  checked,
  onChange,
  indeterminate = false,
  help,
  size = "small",
  disabled = false,
  testId,
  testIdOn = "input",
}: CheckboxFieldProps) {
  const helpId = useId();
  return (
    <Box sx={{ display: "grid", justifyItems: "start" }}>
      <FormControlLabel
        sx={{ m: 0 }}
        disabled={disabled}
        control={
          <Checkbox
            size={size}
            checked={checked}
            indeterminate={indeterminate}
            onChange={(event) => onChange(event.target.checked)}
            data-testid={testIdOn === "control" ? testId : undefined}
            slotProps={{
              input: {
                ref: nativeIndeterminate(indeterminate),
                "data-testid": testIdOn === "input" ? testId : undefined,
                "aria-describedby": help === undefined ? undefined : helpId,
              } as object,
            }}
          />
        }
        label={<Typography variant="body2">{label}</Typography>}
      />
      {help !== undefined && (
        <Typography
          id={helpId}
          variant="caption"
          color="text.secondary"
          data-testid={`${testId}-help`}
          sx={{ paddingInlineStart: size === "small" ? 4.25 : 5.25 }}
        >
          {help}
        </Typography>
      )}
    </Box>
  );
}

export default CheckboxField;
