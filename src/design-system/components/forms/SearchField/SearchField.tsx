import type { ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

export type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** A visible label; absent, `placeholder` names the field. */
  label?: ReactNode;
  /** The clear button's accessible name; the button shows while there is text. */
  clearLabel: string;
  fullWidth?: boolean;
  autoFocus?: boolean;
  /** On the input; the clear button is `<testId>-clear`. */
  testId: string;
};

/**
 * **A words box** (CTA-108) — the Library's and the collection's filter: a
 * search glyph at the start, the words (`dir="auto"`, so a Hebrew or Latin
 * name reads its own way), and a clear button at the end while there are
 * any. Escape clears it too.
 */
function SearchField({ value, onChange, placeholder, label, clearLabel, fullWidth = true, autoFocus, testId }: SearchFieldProps) {
  return (
    <TextField
      size="small"
      type="search"
      value={value}
      label={label}
      placeholder={placeholder}
      fullWidth={fullWidth}
      autoFocus={autoFocus}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Escape" && value !== "") {
          event.preventDefault();
          onChange("");
        }
      }}
      slotProps={{
        htmlInput: {
          "data-testid": testId,
          dir: "auto",
          "aria-label": label === undefined ? placeholder : undefined,
        },
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon fontSize="small" />
            </InputAdornment>
          ),
          endAdornment:
            value === "" ? undefined : (
              <InputAdornment position="end">
                <IconButton size="small" edge="end" aria-label={clearLabel} onClick={() => onChange("")} data-testid={`${testId}-clear`}>
                  <ClearRoundedIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
        },
      }}
      sx={{
        // The browser's own clear cross would double the button.
        "& input::-webkit-search-cancel-button": { display: "none" },
      }}
    />
  );
}

export default SearchField;
