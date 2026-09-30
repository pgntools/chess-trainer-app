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
  /**
   * The days there are to choose from (CTA-113) — a collection's first and
   * last game: neither field goes outside them. Absent, only each other.
   */
  bounds?: { min?: string; max?: string };
  /** The inputs are `<testId>-from` and `<testId>-to`. */
  testId: string;
  /** The inputs' own test ids, for a screen whose tests named them before (CTA-113: the collection's `library-filter-from`). */
  inputTestIds?: { from?: string; to?: string };
};

/**
 * **A date range** (CTA-108): two date fields side by side, **each bounding
 * the other** — the first cannot pass the second's day, nor the second come
 * before the first's — their labels always shrunk (a date field has its own
 * placeholder), their inputs `dir="ltr"`. The collection's filters and the
 * import popup each wrote it.
 */
function DateRangeFields({
  value,
  onChange,
  fromLabel,
  toLabel,
  disabled = false,
  bounds = {},
  testId,
  inputTestIds = {},
}: DateRangeFieldsProps) {
  const day = (value: string | undefined) => (value === "" ? undefined : value);
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
          htmlInput: {
            "data-testid": inputTestIds.from ?? `${testId}-from`,
            dir: "ltr",
            min: day(bounds.min),
            max: day(value.to) ?? day(bounds.max),
          },
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
          htmlInput: {
            "data-testid": inputTestIds.to ?? `${testId}-to`,
            dir: "ltr",
            min: day(value.from) ?? day(bounds.min),
            max: day(bounds.max),
          },
        }}
      />
    </Box>
  );
}

export default DateRangeFields;
