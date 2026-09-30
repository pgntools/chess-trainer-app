import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import RadioGroupField, { type RadioGroupFieldProps } from "./RadioGroupField";

const CHOICES = [
  { value: "merge", label: "Merge" },
  { value: "override", label: "Override" },
  { value: "skip", label: "Skip" },
];

const HELP: Record<string, string> = {
  merge: "The file's records join the folder; a record already here is kept as it is.",
  override: "The folder's records go, and the file's come in.",
  skip: "Nothing of the file's goes into the folder.",
};

const live = (props: Partial<RadioGroupFieldProps>, initial = "merge") => (
  <WithState initial={initial}>
    {(value, setValue) => (
      <RadioGroupField label="2 folders are here already" options={CHOICES} value={value} onChange={setValue} testId="gallery-radio-group" {...props} />
    )}
  </WithState>
);

const gallery: GalleryModule = {
  section: "forms",
  title: "RadioGroupField",
  demos: [
    { name: "In a row, small (the default size) — the arrow keys move the choice", render: () => live({ row: true }) },
    {
      name: "With a help caption that follows the choice",
      render: () => (
        <WithState initial="merge">
          {(value, setValue) => (
            <RadioGroupField
              label="What a clash does"
              options={CHOICES}
              value={value}
              onChange={setValue}
              help={HELP[value]}
              row
              testId="gallery-radio-group-help"
            />
          )}
        </WithState>
      ),
    },
    { name: "One under another, medium", render: () => live({ size: "medium", label: "Theme" }) },
    {
      name: "A choice off, and the whole group off",
      render: () => (
        <>
          {live({ options: [...CHOICES.slice(0, 2), { value: "skip", label: "Skip", disabled: true }], row: true, testId: "gallery-radio-group-one-off" })}
          {live({ disabled: true, row: true, label: "Locked while importing", testId: "gallery-radio-group-off" })}
        </>
      ),
    },
  ],
};

export default gallery;
