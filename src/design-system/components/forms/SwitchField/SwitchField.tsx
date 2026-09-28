import { useId, type ReactNode } from "react";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";

import type { VisibleLabel } from "../../a11y";

export type SwitchFieldProps = {
  label: VisibleLabel;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** A caption under it saying what it does — it also describes the switch. */
  help?: ReactNode;
  /** `small` in a panel or a board header; `medium` on a settings screen. */
  size?: "small" | "medium";
  disabled?: boolean;
  /** On the **input** (the checkbox under the switch); the help is `<testId>-help`. */
  testId: string;
};

/**
 * **A labelled switch, with or without a help caption** (CTA-108) — the
 * six captioned copies and twelve plain ones, which differed in size, margin
 * and where the test id went: here the test id is always on the input, the
 * label never takes margins, and the caption is the input's description.
 */
function SwitchField({ label, checked, onChange, help, size = "medium", disabled = false, testId }: SwitchFieldProps) {
  const helpId = useId();
  return (
    <Box sx={{ display: "grid", justifyItems: "start" }}>
      <FormControlLabel
        sx={{ m: 0, gap: 0.5 }}
        disabled={disabled}
        control={
          <Switch
            size={size}
            checked={checked}
            onChange={(event) => onChange(event.target.checked)}
            slotProps={{
              input: {
                "data-testid": testId,
                "aria-describedby": help === undefined ? undefined : helpId,
              } as object,
            }}
          />
        }
        label={<Typography variant={size === "small" ? "body2" : "body1"}>{label}</Typography>}
      />
      {help !== undefined && (
        <Typography
          id={helpId}
          variant="caption"
          color="text.secondary"
          data-testid={`${testId}-help`}
          sx={{ paddingInlineStart: size === "small" ? 5 : 6.5 }}
        >
          {help}
        </Typography>
      )}
    </Box>
  );
}

export default SwitchField;
