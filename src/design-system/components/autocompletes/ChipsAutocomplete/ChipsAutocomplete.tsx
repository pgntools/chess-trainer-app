import Autocomplete from "@mui/material/Autocomplete";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";

import type { VisibleLabel } from "../../a11y";

export type ChipsAutocompleteProps = {
  label: VisibleLabel;
  /** The chips — every name chosen. */
  value: readonly string[];
  onChange: (value: string[]) => void;
  /** The suggestions. */
  options: readonly string[];
  /**
   * The list is opening — the moment to refresh `options` when working them
   * out is costly and nobody reads them until then (the import popup's
   * players, narrowed by an Elo range that moves many times a second).
   */
  onOpen?: () => void;
  /** Typed words become a chip on Enter, whether suggested or not (the default). */
  freeSolo?: boolean;
  /** Chips shown while the field is not focused; the rest read "+N". */
  limitTags?: number;
  placeholder?: string;
  disabled?: boolean;
  /** On the root; the text input is `<testId>-input`. */
  testId: string;
};

/**
 * **Several names as chips** (CTA-108) — the player filter of a collection
 * and of the import popup: small, several at once, free text allowed, the
 * list staying open while picking. Chips and suggestions take `dir="auto"`,
 * so a name reads its own way. MUI's own words ("No options", "Clear") come
 * from the theme's locale bundle.
 */
function ChipsAutocomplete({
  label,
  value,
  onChange,
  options,
  onOpen,
  freeSolo = true,
  limitTags,
  placeholder,
  disabled = false,
  testId,
}: ChipsAutocompleteProps) {
  return (
    <Autocomplete<string, true, false, boolean>
      multiple
      freeSolo={freeSolo}
      size="small"
      disableCloseOnSelect
      filterSelectedOptions
      limitTags={limitTags}
      disabled={disabled}
      options={options as string[]}
      value={value as string[]}
      onOpen={onOpen}
      onChange={(_event, next) => onChange(next.map((entry) => entry.trim()).filter((entry) => entry !== ""))}
      data-testid={testId}
      renderValue={(chosen, getItemProps) =>
        chosen.map((name, index) => {
          const { key, ...itemProps } = getItemProps({ index });
          return <Chip key={key} {...itemProps} size="small" label={<bdi>{name}</bdi>} dir="auto" />;
        })
      }
      renderOption={({ key, ...props }, option) => (
        <li key={key} {...props} dir="auto">
          {option}
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={value.length === 0 ? placeholder : undefined}
          slotProps={{
            ...params.slotProps,
            htmlInput: { ...params.slotProps.htmlInput, "data-testid": `${testId}-input`, dir: "auto" },
          }}
        />
      )}
    />
  );
}

export default ChipsAutocomplete;
