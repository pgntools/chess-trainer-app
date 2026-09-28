import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import CheckboxField, { type CheckboxFieldProps } from "./CheckboxField";

const live = (props: Partial<CheckboxFieldProps>, initial = true) => (
  <WithState initial={initial}>
    {(checked, setChecked) => (
      <CheckboxField label="games" checked={checked} onChange={setChecked} testId="gallery-checkbox" {...props} />
    )}
  </WithState>
);

const gallery: GalleryModule = {
  section: "forms",
  title: "CheckboxField",
  demos: [
    { name: "Small (the default)", render: () => live({ label: "Include the shipped collections" }) },
    { name: "Medium", render: () => live({ size: "medium", label: "Variations" }, false) },
    { name: "With a help caption", render: () => live({ label: "prc", help: "Each move's share of the games, as a play chance." }) },
    { name: "Indeterminate (a parent over its children)", render: () => live({ label: "All categories", indeterminate: true }, false) },
    {
      name: "Its test id on the checkbox around the input (testIdOn: control) — looks the same",
      render: () => live({ size: "medium", label: "Variations", testIdOn: "control" }),
    },
    { name: "Disabled", render: () => live({ label: "games", disabled: true }) },
  ],
};

export default gallery;
