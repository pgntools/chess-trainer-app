import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import { ColorField, SelectField, SliderField, SwitchField, TextInputField } from "../../../design-system/components/forms";
import { formatRatio, type ContrastCheck } from "../../../design-system/themes";
import { contrastCaptionOf, fromChoice, lengthOf, toChoice } from "./fieldValues";
import { fieldIdOf, type FieldSpec } from "./sections";

type TokenFieldProps = {
  field: FieldSpec;
  /** The token's value in the draft — `undefined` when the theme leaves it to MUI. */
  value: unknown;
  /** What MUI draws when the theme leaves it out (an optional palette colour). */
  fallback?: string;
  /** The contrast checks this token decides. */
  checks: readonly ContrastCheck[];
  onChange: (path: string, value: unknown) => void;
};

/**
 * **A length, typed** — a size in pixels or any CSS length. It keeps what is
 * typed ("1." on the way to "1.05") and reports the number or the words;
 * a new value from outside (an undo) replaces the text.
 */
function LengthField({ field, value, onChange }: Pick<TokenFieldProps, "value" | "onChange"> & { field: Extract<FieldSpec, { kind: "length" }> }) {
  const shown = value === undefined ? "" : String(value);
  const [text, setText] = useState(shown);
  const [seen, setSeen] = useState(value);
  if (!Object.is(value, seen)) {
    setSeen(value);
    setText(shown);
  }
  return (
    <TextInputField
      label={field.label}
      value={text}
      onChange={(next) => {
        setText(next);
        const parsed = lengthOf(next);
        setSeen(parsed);
        onChange(field.path, parsed);
      }}
      helperText={field.help}
      placeholder={field.optional ? "MUI's own" : field.placeholder}
      dir="ltr"
      id={fieldIdOf(field.path)}
      testId={fieldIdOf(field.path)}
    />
  );
}

/** **One token's field** — by its kind: a colour, a number, words, a length, a choice or a switch. */
function TokenField({ field, value, fallback, checks, onChange }: TokenFieldProps) {
  const testId = fieldIdOf(field.path);
  switch (field.kind) {
    case "color": {
      const caption = contrastCaptionOf(checks, formatRatio);
      const unset = value === undefined;
      return (
        <Box sx={{ display: "grid", gap: 0.5 }}>
          <ColorField
            label={field.label}
            value={typeof value === "string" ? value : (fallback ?? "")}
            onChange={(next) => onChange(field.path, next)}
            pickerLabel={`Pick a colour for ${field.label}`}
            invalidText="Not a colour — #rgb, #rrggbb, #rrggbbaa, rgb() or rgba()."
            help={[unset ? "MUI's default." : undefined, caption?.text].filter(Boolean).join(" ") || undefined}
            helpTone={caption?.tone ?? "neutral"}
            id={testId}
            testId={testId}
          />
          {field.optional && !unset && (
            <Box>
              <Button size="small" onClick={() => onChange(field.path, undefined)} data-testid={`${testId}-default`}>
                Use MUI's default
              </Button>
            </Box>
          )}
        </Box>
      );
    }
    case "number":
      return (
        <Box>
          <SliderField
            label={field.label}
            value={typeof value === "number" ? value : field.min}
            onChange={(next) => onChange(field.path, next)}
            min={field.min}
            max={field.max}
            step={field.step}
            valueLabel={`${typeof value === "number" ? value : "—"}${field.unit === undefined ? "" : ` ${field.unit}`}`}
            testId={testId}
          />
          {field.help !== undefined && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              {field.help}
            </Typography>
          )}
        </Box>
      );
    case "text":
      return (
        <TextInputField
          label={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={(next) => onChange(field.path, next === "" ? undefined : next)}
          helperText={field.help}
          placeholder={field.placeholder}
          dir="ltr"
          id={testId}
          testId={testId}
        />
      );
    case "length":
      return <LengthField field={field} value={value} onChange={onChange} />;
    case "select":
      return (
        <SelectField
          label={field.label}
          value={toChoice(value)}
          onChange={(next) => onChange(field.path, fromChoice(next, field.path))}
          options={field.choices.map((choice) => ({ value: toChoice(choice.value), label: choice.label }))}
          helperText={field.help}
          fullWidth
          testId={testId}
        />
      );
    case "toggle":
      return (
        <SwitchField
          label={field.label}
          checked={value !== null && value !== undefined}
          onChange={(on) => onChange(field.path, on ? field.on : null)}
          help={field.help}
          testId={testId}
        />
      );
  }
}

export default TokenField;
