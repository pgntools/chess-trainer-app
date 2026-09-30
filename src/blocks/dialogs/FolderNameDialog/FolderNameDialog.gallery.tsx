import DialogFrame from "../../../design-system/gallery/DialogFrame";
import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import { HEBREW, NAME_LABELS, RENAMED } from "./fixtures";
import FolderNameDialog from "./FolderNameDialog";

const noop = () => {};

const framed = (title: string, initial: string, testId: string) => (
  <DialogFrame height={260}>
    {(dialogProps) => (
      <FolderNameDialog open title={title} initial={initial} onSave={noop} onClose={noop} labels={NAME_LABELS} testId={testId} dialogProps={dialogProps} />
    )}
  </DialogFrame>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "dialogs",
  title: "FolderNameDialog",
  demos: [
    { name: "A new folder — Save off until there is a name", render: () => framed("New folder", "", "gallery-new-folder") },
    { name: "Renaming Openings", render: () => framed("Rename folder", RENAMED.name, "gallery-rename-folder") },
    { name: "A Hebrew name (switch to RTL)", render: () => framed("Rename folder", HEBREW.name, "gallery-rename-folder-he") },
  ],
};

export default gallery;
