import type { ReactNode } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

/** One choice: its value, the words shown, and — for a grouped list — its group's heading. */
export type AutocompleteOption = { value: string; label: string; group?: string };

export type SelectAutocompleteProps = {
  label: ReactNode;
  /** The chosen value, or `null` for none. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** The choices — in their groups' order when grouped (MUI groups runs of the same `group`). */
  options: readonly AutocompleteOption[];
  placeholder?: string;
  /** The options' direction: `ltr` for ECO codes and SAN, `auto` for names (the default). */
  optionDir?: "ltr" | "auto";
  /** Choosing nothing is allowed (the default): a clear button. */
  clearable?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /** On the root; the text input is `<testId>-input`. */
  testId: string;
};

/**
 * **One choice out of many, typed to find** (CTA-108) — the select-style
 * pickers over long lists (every opening, every event): single, typed to
 * filter, grouped when the options carry a `group`. A value no option holds
 * reads as none.
 */
function SelectAutocomplete({
  label,
  value,
  onChange,
  options,
  placeholder,
  optionDir = "auto",
  clearable = true,
  disabled = false,
  fullWidth = true,
  testId,
}: SelectAutocompleteProps) {
  const chosen = options.find((option) => option.value === value) ?? null;
  const grouped = options.some((option) => option.group !== undefined);
  return (
    <Autocomplete<AutocompleteOption, false, boolean, false>
      size="small"
      options={options as AutocompleteOption[]}
      value={chosen}
      onChange={(_event, next) => onChange(next?.value ?? null)}
      disableClearable={!clearable}
      disabled={disabled}
      fullWidth={fullWidth}
      groupBy={grouped ? (option) => option.group ?? "" : undefined}
      isOptionEqualToValue={(option, current) => option.value === current.value}
      getOptionLabel={(option) => option.label}
      data-testid={testId}
      renderOption={({ key, ...props }, option) => (
        <li key={key} {...props} dir={optionDir}>
          {option.label}
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          slotProps={{
            ...params.slotProps,
            htmlInput: { ...params.slotProps.htmlInput, "data-testid": `${testId}-input`, dir: optionDir },
          }}
        />
      )}
    />
  );
}

export default SelectAutocomplete;
