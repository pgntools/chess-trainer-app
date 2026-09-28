import type { ReactNode } from "react";
import Typography from "@mui/material/Typography";

export type FieldLabelProps = {
  children: ReactNode;
  /** `label` for one control (give `htmlFor`), `legend` heading a `fieldset`, `span` for a group named by `id`. */
  component?: "label" | "legend" | "span";
  /** The control a `label` names. */
  htmlFor?: string;
  /** For `aria-labelledby` on a group that is not a `fieldset`. */
  id?: string;
  testId?: string;
};

/**
 * **A field's label** (CTA-108) — the **one** label style (`body2`, 600),
 * where the forms had four (`body2` 600, `subtitle2` 700, `subtitle2` 600,
 * a `FormLabel` legend in either). As a `legend` it sits flush at the top of
 * its `fieldset`.
 */
function FieldLabel({ children, component = "label", htmlFor, id, testId }: FieldLabelProps) {
  return (
    <Typography
      variant="body2"
      component={component}
      htmlFor={component === "label" ? htmlFor : undefined}
      id={id}
      data-testid={testId}
      sx={{ display: "block", fontWeight: 600, color: "text.primary", mb: 0.5, ...(component === "legend" && { p: 0 }) }}
    >
      {children}
    </Typography>
  );
}

export default FieldLabel;
