import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import SwitchField, { type SwitchFieldProps } from "./SwitchField";

const live = (props: Partial<SwitchFieldProps>, initial = true) => (
  <WithState initial={initial}>
    {(checked, setChecked) => (
      <SwitchField label="Next-move arrows" checked={checked} onChange={setChecked} testId="gallery-switch" {...props} />
    )}
  </WithState>
);

const gallery: GalleryModule = {
  section: "forms",
  title: "SwitchField",
  demos: [
    { name: "Medium, plain", render: () => live({ label: "Eval bar" }) },
    { name: "Small, plain (a panel or a board header)", render: () => live({ size: "small", label: "Engine" }) },
    {
      name: "Medium, with a help caption",
      render: () =>
        live({ label: "Show engine lines", help: "The engine's best lines above the tabs. Off keeps the pieces' identities to yourself." }, false),
    },
    {
      name: "Small, with a help caption",
      render: () => live({ size: "small", label: "Required moves", help: "Mark the moves you must play here." }),
    },
    {
      name: "Its test id on the switch around the input (testIdOn: control) — looks the same",
      render: () => live({ size: "small", label: "Engine", testIdOn: "control" }),
    },
    { name: "Disabled", render: () => live({ disabled: true, label: "Threads", help: "Fixed at 1 in this build." }) },
  ],
};

export default gallery;
