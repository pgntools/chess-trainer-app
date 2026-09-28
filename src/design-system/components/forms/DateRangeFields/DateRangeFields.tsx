import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";

import type { VisibleLabel } from "../../a11y";

/** A range of days as `YYYY-MM-DD`; `""` is an open end. */
export type DateRange = { from: string; to: string };

export type DateRangeFieldsProps = {
  value: DateRange;
  onChange: (value: DateRange) => void;
  fromLabel: VisibleLabel;
  toLabel: VisibleLabel;
  disabled?: boolean;
  /** The inputs are `<testId>-from` and `<testId>-to`. */
  testId: string;
};

/**
 * **A date range** (CTA-108): two date fields side by side, **each bounding
 * the other** — the first cannot pass the second's day, nor the second come
 * before the first's — their labels always shrunk (a date field has its own
 * placeholder), their inputs `dir="ltr"`. The collection's filters and the
 * import popup each wrote it.
 */
function DateRangeFields({ value, onChange, fromLabel, toLabel, disabled = false, testId }: DateRangeFieldsProps) {
  return (
    <Box data-testid={testId} sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
      <TextField
        type="date"
        size="small"
        label={fromLabel}
        value={value.from}
        disabled={disabled}
        onChange={(event) => onChange({ ...value, from: event.target.value })}
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: { "data-testid": `${testId}-from`, dir: "ltr", max: value.to === "" ? undefined : value.to },
        }}
      />
      <TextField
        type="date"
        size="small"
        label={toLabel}
        value={value.to}
        disabled={disabled}
        onChange={(event) => onChange({ ...value, to: event.target.value })}
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: { "data-testid": `${testId}-to`, dir: "ltr", min: value.from === "" ? undefined : value.from },
        }}
      />
    </Box>
  );
}

export default DateRangeFields;
