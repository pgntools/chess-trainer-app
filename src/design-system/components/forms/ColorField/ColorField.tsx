import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";

import { MIN_TARGET_PX } from "../../../theme";
import type { VisibleLabel } from "../../a11y";
import { hexOf, parseColor, withPickedColor } from "./color";

export type ColorFieldProps = {
  /** The field's label ("Primary"). */
  label: VisibleLabel;
  /** The colour — any form {@link parseColor} reads. */
  value: string;
  /** A new colour, only ever a valid one: as typed (trimmed), or the picker's. */
  onChange: (value: string) => void;
  /** The swatch's accessible name — it opens the system's colour picker ("Pick a colour for Primary"). */
  pickerLabel: string;
  /** Said under the field while its text is not a colour it reads. */
  invalidText: string;
  /** A caption under it — what the colour measures against its background; it describes the input. */
  help?: ReactNode;
  /** The caption's colour: its outcome's tone, or the text's own. */
  helpTone?: "success" | "error" | "warning" | "neutral";
  disabled?: boolean;
  /** The text input's `id` — for a host that moves focus to it. Absent, MUI's own. */
  id?: string;
  /** On the text input; the parts are `-picker` (the native colour input) and `-swatch`. */
  testId: string;
};

/**
 * **A colour, picked or typed** (CTA-115) — the theme editor's every token:
 * a swatch that shows the colour over a checkerboard (so a translucent one
 * shows as translucent) and opens the system's colour picker, and a text
 * input that takes `#rgb`, `#rrggbb`, `#rrggbbaa` or `rgba()` — the forms a
 * translucent token needs, which the native picker cannot write. The
 * picker keeps a translucent colour's alpha. While the text is not a colour
 * the field says so and reports nothing; a new `value` from outside (an
 * undo) replaces the text.
 */
function ColorField({ label, value, onChange, pickerLabel, invalidText, help, helpTone = "neutral", disabled = false, id, testId }: ColorFieldProps) {
  const [text, setText] = useState(value);
  // The last value this field saw — a different one from outside replaces the text (adjusted during render).
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setText(value);
  }
  const parsed = parseColor(text);
  const invalid = parsed === null;

  const report = (next: string) => {
    setSeen(next);
    onChange(next);
  };
  const type = (next: string) => {
    setText(next);
    if (parseColor(next) !== null) report(next.trim());
  };
  const pick = (picked: string) => {
    const next = withPickedColor(text, picked);
    setText(next);
    report(next);
  };

  return (
    <TextField
      label={label}
      value={text}
      onChange={(event) => type(event.target.value)}
      disabled={disabled}
      error={invalid}
      helperText={invalid ? invalidText : help}
      size="small"
      fullWidth
      id={id}
      slotProps={{
        inputLabel: { shrink: true },
        htmlInput: { "data-testid": testId, dir: "ltr", spellCheck: false, autoComplete: "off" },
        formHelperText: {
          sx: invalid || helpTone === "neutral" ? undefined : { color: `${helpTone}.main` },
        },
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Box
                data-testid={`${testId}-swatch`}
                sx={(theme) => ({
                  position: "relative",
                  width: MIN_TARGET_PX,
                  height: MIN_TARGET_PX,
                  flexShrink: 0,
                  borderRadius: 0.5,
                  overflow: "hidden",
                  border: "1px solid",
                  borderColor: "controlBorder",
                  // A checkerboard in the theme's own colours, under the colour.
                  backgroundColor: theme.palette.background.paper,
                  backgroundImage: `conic-gradient(${theme.palette.divider} 90deg, transparent 90deg 180deg, ${theme.palette.divider} 180deg 270deg, transparent 270deg)`,
                  backgroundSize: "12px 12px",
                  opacity: disabled ? 0.6 : 1,
                  "&:has(input:focus-visible)": theme.mixins.focusRing ?? {},
                })}
              >
                <Box aria-hidden="true" sx={{ position: "absolute", inset: 0, backgroundColor: invalid ? "transparent" : text.trim() }} />
                <Box
                  component="input"
                  type="color"
                  value={hexOf(parsed ?? parseColor(seen) ?? { r: 0, g: 0, b: 0, a: 1 })}
                  onChange={(event) => pick((event.target as HTMLInputElement).value)}
                  disabled={disabled}
                  aria-label={pickerLabel}
                  data-testid={`${testId}-picker`}
                  sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", m: 0, p: 0, border: 0, opacity: 0, cursor: disabled ? "default" : "pointer" }}
                />
              </Box>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}

export default ColorField;
