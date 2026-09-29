import DialogFrame from "../../../design-system/gallery/DialogFrame";
import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import { COUNTS, DOOMED, MESSAGE } from "./fixtures";
import FolderDeleteDialog from "./FolderDeleteDialog";

const noop = () => {};

const gallery: GalleryModule<BlockFamilyId> = {
  section: "dialogs",
  title: "FolderDeleteDialog",
  demos: [
    {
      name: "A nested folder — its counts under the message",
      render: () => (
        <DialogFrame height={300}>
          {(dialogProps) => (
            <FolderDeleteDialog open title={`Delete folder: ${DOOMED.name}`} message={MESSAGE} counts={COUNTS} confirmLabel="Delete folder" cancelLabel="Cancel" onConfirm={noop} onClose={noop} testId="gallery-folder" dialogProps={dialogProps} />
          )}
        </DialogFrame>
      ),
    },
    {
      name: "A one-level folder — the message alone",
      render: () => (
        <DialogFrame height={260}>
          {(dialogProps) => (
            <FolderDeleteDialog open title={`Delete folder: ${DOOMED.name}`} message="Its 4 repertoires go back to Unfiled." confirmLabel="Delete folder" cancelLabel="Cancel" onConfirm={noop} onClose={noop} testId="gallery-folder-flat" dialogProps={dialogProps} />
          )}
        </DialogFrame>
      ),
    },
  ],
};

export default gallery;
