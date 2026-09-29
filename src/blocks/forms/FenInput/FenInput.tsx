import { useId, type FormEvent } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";

import { InlineAlert } from "../../../design-system/components/feedback";

export type FenInputProps = {
  /** The field's label ("Paste a FEN"). */
  label: string;
  /** The button's words ("Set position"). */
  submitLabel: string;
  value: string;
  onChange: (text: string) => void;
  /** Read the FEN — the button, or Enter in the field. Off while it is blank. */
  onSubmit: () => void;
  /** What was wrong with the last one, worded — an alert under the field. `null` for nothing. */
  error: string | null;
  /** Off (a dialog over it). */
  disabled?: boolean;
  /** The button beside the field rather than under it — a row of quick loads. */
  inline?: boolean;
  /** The prefix of its ids: the field `<testId>-fen-input`, the button `-fen-load`, the error `-fen-error`. */
  testId: string;
  /** The button's and the error's own test ids, for a screen whose tests named them before (the Load tab's `analysis-load-fen`). */
  submitTestId?: string;
  errorTestId?: string;
};

/**
 * **A FEN in** (CTA-113) — one field and a button, a form (Enter in the field
 * reads it too), the field left to right, the last FEN's problem as an alert
 * that describes the field. The position editor's FEN tab, the Load tab's and
 * the new-analysis form's FEN field were three with three behaviours.
 *
 * Presentational: reading the FEN is the screen's (`parseFen`).
 */
function FenInput({
  label,
  submitLabel,
  value,
  onChange,
  onSubmit,
  error,
  disabled = false,
  inline = false,
  testId,
  submitTestId = `${testId}-fen-load`,
  errorTestId = `${testId}-fen-error`,
}: FenInputProps) {
  const errorId = useId();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (value.trim() !== "" && !disabled) onSubmit();
  };
  return (
    <Box
      component="form"
      noValidate
      onSubmit={submit}
      sx={{ display: "grid", gap: 1 }}
    >
      <Box
        sx={
          inline
            ? { display: "flex", gap: 1, alignItems: "center" }
            : { display: "grid", gap: 1, justifyItems: "start" }
        }
      >
        <TextField
          fullWidth
          size="small"
          label={label}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          // Enter reads it — the form would too, but not every browser submits a form with a button of its own.
          onKeyDown={(event) => {
            if (event.key === "Enter") submit(event);
          }}
          sx={{ flex: 1 }}
          slotProps={{
            htmlInput: {
              dir: "ltr",
              "data-testid": `${testId}-fen-input`,
              "aria-describedby": error === null ? undefined : errorId,
              "aria-invalid": error === null ? undefined : true,
            },
          }}
        />
        <Button
          type="submit"
          size="small"
          variant="outlined"
          disabled={disabled || value.trim() === ""}
          data-testid={submitTestId}
          sx={{ flexShrink: 0 }}
        >
          {submitLabel}
        </Button>
      </Box>
      {error !== null && (
        <Box id={errorId}>
          <InlineAlert severity="error" testId={errorTestId}>
            {error}
          </InlineAlert>
        </Box>
      )}
    </Box>
  );
}

export default FenInput;
