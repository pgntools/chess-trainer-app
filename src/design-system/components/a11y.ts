import type { ReactNode } from "react";

/**
 * **Words that name something** (CTA-111) — a field's label, a dialog's
 * title, a button's text: anything React renders **but** nothing at all
 * (`null`, `undefined`, a boolean). A prop typed this way cannot be left
 * out or switched off, so the control it names always has an accessible
 * name. (An empty string still types; the gallery's axe check catches it.)
 */
export type VisibleLabel = Exclude<ReactNode, null | undefined | boolean>;

/**
 * **A native checkbox's mixed state** (CTA-111): MUI marks an indeterminate
 * `Checkbox` with `aria-checked="mixed"` alone, which WCAG's checks refuse on
 * a native `<input type="checkbox">` whose own state says otherwise. This ref
 * sets the input's DOM `indeterminate` too, so what a screen reader hears and
 * what the input reports agree. Pass it as the `Checkbox`'s `slotProps.input.ref`.
 */
export const nativeIndeterminate =
  (indeterminate: boolean) =>
  (input: HTMLInputElement | null): void => {
    if (input !== null) input.indeterminate = indeterminate;
  };
