import type { ReactNode } from "react";
import TextField from "@mui/material/TextField";

import type { VisibleLabel } from "../../a11y";

export type TextInputFieldProps = {
  label: VisibleLabel;
  value: string;
  onChange: (value: string) => void;
  /** A caption under it — what goes in it; it describes the input. */
  helperText?: ReactNode;
  /** The value is not one it takes: the field is marked invalid, and `helperText` should say why. */
  error?: boolean;
  /** Shown while it is empty — an example, never the label's words. */
  placeholder?: string;
  /** `ltr` for machine words (an id, a CSS value), `auto` for a reader's own. Absent, the page's. */
  dir?: "ltr" | "auto";
  disabled?: boolean;
  /** The input's `id` — for a host that moves focus to it. Absent, MUI's own. */
  id?: string;
  /**
   * Several lines (CTA-135) — a summary, a description: the box grows with
   * the words, from two lines to six. Absent, one line.
   */
  multiline?: boolean;
  /**
   * What the input takes (CTA-135): `number` (a spin box) or `date` (the
   * browser's date picker, `YYYY-MM-DD`). The value is still a string, `""`
   * for none. Absent, words.
   */
  type?: "text" | "number" | "date";
  /** On the input. */
  testId: string;
};

/**
 * **A labelled text input** (CTA-115) — one line of words, its label always
 * shrunk above it (as `SelectField`'s), a caption that describes it and an
 * invalid state. The theme editor's ids, names, font stacks and sizes; the
 * MDX editor's metadata, several lines of it, a number or a date (CTA-135).
 */
function TextInputField({ label, value, onChange, helperText, error = false, placeholder, dir, disabled = false, id, multiline = false, type = "text", testId }: TextInputFieldProps) {
  return (
    <TextField
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      helperText={helperText}
      error={error}
      placeholder={placeholder}
      disabled={disabled}
      id={id}
      type={type}
      size="small"
      fullWidth
      {...(multiline ? { multiline: true, minRows: 2, maxRows: 6 } : {})}
      slotProps={{
        inputLabel: { shrink: true },
        htmlInput: { "data-testid": testId, dir, spellCheck: multiline, autoComplete: "off" },
      }}
    />
  );
}

export default TextInputField;
