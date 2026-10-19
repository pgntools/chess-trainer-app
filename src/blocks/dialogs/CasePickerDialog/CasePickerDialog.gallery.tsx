import DialogFrame from "../../../design-system/gallery/DialogFrame";
import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import CasePickerDialog, { type CasePickerDialogProps } from "./CasePickerDialog";
import { CASES, PROJECTS } from "./fixtures";

const noop = () => {};

const framed = (extra: Partial<CasePickerDialogProps> = {}) => (
  <DialogFrame height={520}>
    {(dialogProps) => (
      <CasePickerDialog
        open
        projects={PROJECTS}
        cases={CASES}
        initialProjectId="p-najdorf"
        onSubmit={noop}
        onClose={noop}
        testId="gallery-case-picker"
        dialogProps={dialogProps}
        {...extra}
      />
    )}
  </DialogFrame>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "dialogs",
  title: "CasePickerDialog",
  demos: [
    { name: "The Case's own Project first", render: () => framed() },
    { name: "Nothing to link to", render: () => framed({ cases: [] }) },
    { name: "Refused — the browser would not write it", render: () => framed({ problem: "The link could not be made — the browser refused the write." }) },
    { name: "Another screen's words — a case to load (CTA-238)", render: () => framed({ title: "Pick a case", submitLabel: "Load" }) },
  ],
};

export default gallery;
