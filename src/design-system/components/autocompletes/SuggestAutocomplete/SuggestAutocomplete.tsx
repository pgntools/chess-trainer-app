import type { ReactNode } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import ListSubheader from "@mui/material/ListSubheader";
import TextField from "@mui/material/TextField";

import type { VisibleLabel } from "../../a11y";
import type { AutocompleteOption } from "../SelectAutocomplete";

export type SuggestAutocompleteProps = {
  label: VisibleLabel;
  /** The text in the field — typed, pasted, or filled by a pick. */
  value: string;
  onChange: (value: string) => void;
  /**
   * The suggestions for the text — **already narrowed by the screen** (it
   * knows what a name is), in their groups' order when grouped. The field
   * does not filter them again.
   */
  options: readonly AutocompleteOption[];
  /** A suggestion was chosen: the text has become its `value`, and this says which one. */
  onPick?: (option: AutocompleteOption) => void;
  placeholder?: string;
  /** A caption under it — what goes in it; it describes the input. */
  helperText?: ReactNode;
  /** The text is not one it takes: the field is marked invalid, and `helperText` should say why. */
  error?: boolean;
  /** The text's direction: `ltr` for machine words (a path, an id), `auto` for names. Absent, the page's. */
  dir?: "ltr" | "auto";
  /** The suggestions' direction: `auto` for names (the default), `ltr` for codes. */
  optionDir?: "ltr" | "auto";
  disabled?: boolean;
  /** On the root; the text input is `<testId>-input`. */
  testId: string;
};

/**
 * **Free text, with suggestions** (CTA-150) — the field is its text, which a
 * reader may type or paste whole; the list beneath only offers to fill it
 * (a record's name found, its address put in). Picking calls `onChange`
 * with the option's `value` and then `onPick`; Enter with nothing
 * highlighted is the form's own, so a dialog still submits on it.
 * `SelectAutocomplete` is the one for a value that must be one of the
 * options.
 */
function SuggestAutocomplete({ label, value, onChange, options, onPick, placeholder, helperText, error = false, dir, optionDir = "auto", disabled = false, testId }: SuggestAutocompleteProps) {
  const grouped = options.some((option) => option.group !== undefined);
  return (
    <Autocomplete<AutocompleteOption, false, false, true>
      freeSolo
      size="small"
      fullWidth
      disabled={disabled}
      options={options as AutocompleteOption[]}
      filterOptions={(all) => all}
      inputValue={value}
      onInputChange={(_event, text) => onChange(text)}
      onChange={(_event, picked) => {
        if (picked !== null && typeof picked !== "string") onPick?.(picked);
      }}
      groupBy={grouped ? (option) => option.group ?? "" : undefined}
      // MUI's own group markup (a `ul` of `option`s inside a `li`) fails axe's list rules once the list is open: a labelled `group` it is.
      renderGroup={(params) => (
        <li key={params.key} role="presentation" style={{ listStyle: "none" }}>
          <ListSubheader component="div" id={`${testId}-group-${params.key}`} className="MuiAutocomplete-groupLabel" sx={{ top: -8 }}>
            {params.group}
          </ListSubheader>
          <ul role="group" aria-labelledby={`${testId}-group-${params.key}`} className="MuiAutocomplete-groupUl" style={{ padding: 0 }}>
            {params.children}
          </ul>
        </li>
      )}
      isOptionEqualToValue={(option, current) => option.value === (typeof current === "string" ? current : current.value)}
      // The text a pick puts in the field is its value; the list shows its label.
      getOptionLabel={(option) => (typeof option === "string" ? option : option.value)}
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
          helperText={helperText}
          error={error}
          slotProps={{
            ...params.slotProps,
            inputLabel: { ...params.slotProps.inputLabel, shrink: true },
            htmlInput: { ...params.slotProps.htmlInput, "data-testid": `${testId}-input`, dir },
          }}
        />
      )}
    />
  );
}

export default SuggestAutocomplete;
