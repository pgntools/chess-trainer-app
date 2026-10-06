import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { StatusText } from "../../design-system/components/feedback";
import { SelectField, SliderField, SwitchField, TextInputField } from "../../design-system/components/forms";
import { elementOf, SETTINGS, valuesOf, writeElement, type SettingField, type SettingValues } from "./componentSettings";

const ID = "mdx-editor-settings";

type SettingsFieldsProps = {
  fields: readonly SettingField[];
  values: SettingValues;
  onChange: (prop: string, value: string | boolean) => void;
  /** The prefix of each field's test id — `<testId>-<prop>`. */
  testId?: string;
};

/**
 * **Settings as fields** (CTA-137) — each prop of `componentSettings.ts`'s
 * description as the field it is: words, a number, a size on a slider, on
 * or off, one of a few; each value the component's own default where none
 * is set.
 */
export function SettingsFields({ fields, values, onChange, testId = ID }: SettingsFieldsProps) {
  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      {fields.map((field) => {
        const id = `${testId}-${field.prop}`;
        const value = values[field.prop];
        if (field.kind === "switch") {
          return (
            <Box key={field.prop}>
              <SwitchField label={field.label} checked={typeof value === "boolean" ? value : field.on} onChange={(checked) => onChange(field.prop, checked)} size="small" testId={id} />
              {field.help !== undefined && (
                <Typography variant="caption" color="text.secondary" component="p">
                  {field.help}
                </Typography>
              )}
            </Box>
          );
        }
        if (field.kind === "slider") {
          const number = typeof value === "string" && !Number.isNaN(Number.parseFloat(value)) ? Number.parseFloat(value) : field.none;
          return (
            <Box key={field.prop}>
              <SliderField
                label={field.label}
                value={number}
                onChange={(next) => onChange(field.prop, `${next}${field.unit}`)}
                min={field.min}
                max={field.max}
                step={field.step}
                valueLabel={number === field.none && field.none === field.max && field.unit === "vh" ? "No limit" : `${number}${field.unit === "vh" ? "% of the window" : "%"}`}
                testId={id}
              />
              {field.help !== undefined && (
                <Typography variant="caption" color="text.secondary" component="p">
                  {field.help}
                </Typography>
              )}
            </Box>
          );
        }
        if (field.kind === "choice") {
          return (
            <SelectField
              key={field.prop}
              label={field.label}
              value={typeof value === "string" ? value : ""}
              onChange={(chosen) => onChange(field.prop, chosen)}
              options={field.options}
              emptyOption={field.none}
              helperText={field.help}
              testId={id}
            />
          );
        }
        return (
          <TextInputField
            key={field.prop}
            label={field.label}
            value={typeof value === "string" ? value : ""}
            onChange={(typed) => onChange(field.prop, typed)}
            type={field.kind === "number" ? "number" : "text"}
            placeholder={field.placeholder}
            dir={field.kind === "number" ? "ltr" : "auto"}
            helperText={field.help}
            testId={id}
          />
        );
      })}
    </Box>
  );
}

/**
 * **A component's settings, as a form** — read from its code and written
 * back to it (`componentSettings.ts`), so the code stays the one source: a
 * change here rewrites it, and the code typed by hand shows here. Add
 * component's, and the Components and Images sections' editors.
 */
function SettingsForm({ code, onCode, testId = ID }: { code: string; onCode: (code: string) => void; testId?: string }) {
  const element = elementOf(code);
  const fields = element === undefined ? undefined : SETTINGS[element.component];
  if (element === undefined) {
    return (
      <StatusText tone="neutral" testId={`${testId}-none`}>
        The code is not one component the form can read — several of them, or one half typed. Its settings show here again once it is.
      </StatusText>
    );
  }
  if (fields === undefined || fields.length === 0) {
    return (
      <StatusText tone="neutral" testId={`${testId}-none`}>
        {`<${element.component}> has no settings to set here — its code is all there is.`}
      </StatusText>
    );
  }
  const values = valuesOf(element.attributes, fields);
  return (
    <Box data-testid={testId}>
      <SettingsFields
        fields={fields}
        values={values}
        onChange={(prop, value) => onCode(writeElement(element.component, element.attributes, fields, { ...values, [prop]: value }))}
        testId={`${testId}-setting`}
      />
    </Box>
  );
}

export default SettingsForm;
