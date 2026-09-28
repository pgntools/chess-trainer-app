import type { ReactNode } from "react";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";

import type { VisibleLabel } from "../../a11y";

/** One choice. */
export type SelectOption = { value: string; label: ReactNode; disabled?: boolean };

export type SelectFieldProps = {
  label: VisibleLabel;
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  /** A first "any" choice, whose value is `""` — a filter's "All openings". */
  emptyOption?: ReactNode;
  helperText?: ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Each option's text direction — `ltr` for SAN or an ECO code, `auto` for names. */
  optionDir?: "ltr" | "auto";
  /** On the select's input; each option is `<testId>-option` with its `data-value`. */
  testId: string;
};

/**
 * **A select** (CTA-108): MUI's `TextField select`, small, its label always
 * shrunk (an empty "any" choice still shows its words), the test id on the
 * input. A value the options do not hold is still shown as chosen — a filter
 * read from a URL whose choice has since gone.
 */
function SelectField({
  label,
  value,
  onChange,
  options,
  emptyOption,
  helperText,
  disabled = false,
  fullWidth = false,
  optionDir,
  testId,
}: SelectFieldProps) {
  const known = value === "" || options.some((option) => option.value === value);
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      helperText={helperText}
      disabled={disabled}
      fullWidth={fullWidth}
      slotProps={{
        htmlInput: { "data-testid": testId },
        select: { displayEmpty: emptyOption !== undefined },
        inputLabel: { shrink: true },
      }}
      sx={{ minWidth: 160 }}
    >
      {emptyOption !== undefined && (
        <MenuItem value="" data-testid={`${testId}-option`}>
          {emptyOption}
        </MenuItem>
      )}
      {!known && (
        <MenuItem value={value} dir={optionDir}>
          {value}
        </MenuItem>
      )}
      {options.map((option) => (
        <MenuItem
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          dir={optionDir}
          data-testid={`${testId}-option`}
        >
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

export default SelectField;
