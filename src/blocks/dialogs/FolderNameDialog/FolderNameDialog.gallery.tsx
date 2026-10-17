import DialogFrame from "../../../design-system/gallery/DialogFrame";
import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import { HEBREW, NAME_LABELS, PARENTS, RENAMED } from "./fixtures";
import FolderNameDialog from "./FolderNameDialog";

const noop = () => {};

const framed = (title: string, initial: string, testId: string, parents?: typeof PARENTS) => (
  <DialogFrame height={parents === undefined ? 260 : 520}>
    {(dialogProps) => (
      <FolderNameDialog open title={title} initial={initial} onSave={noop} onClose={noop} labels={NAME_LABELS} parents={parents} testId={testId} dialogProps={dialogProps} />
    )}
  </DialogFrame>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "dialogs",
  title: "FolderNameDialog",
  demos: [
    { name: "A new folder — Save off until there is a name", render: () => framed("New folder", "", "gallery-new-folder") },
    {
      name: "A new folder with its parent — the top level by default (CTA-231)",
      render: () => framed("New folder", "", "gallery-new-folder-parent", PARENTS),
    },
    { name: "Renaming Openings", render: () => framed("Rename folder", RENAMED.name, "gallery-rename-folder") },
    { name: "A Hebrew name (switch to RTL)", render: () => framed("Rename folder", HEBREW.name, "gallery-rename-folder-he") },
  ],
};

export default gallery;
