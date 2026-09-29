import DialogFrame from "../../../design-system/gallery/DialogFrame";
import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import { FOLDERS, MOVE_LABELS, SICILIAN_SUBTREE } from "./fixtures";
import FolderMoveDialog from "./FolderMoveDialog";

const noop = () => {};

const gallery: GalleryModule<BlockFamilyId> = {
  section: "dialogs",
  title: "FolderMoveDialog",
  demos: [
    {
      name: "Moving Sicilian — its own subtree left out, its parent marked",
      render: () => (
        <DialogFrame height={380}>
          {(dialogProps) => (
            <FolderMoveDialog open folders={FOLDERS} current="gopenings" exclude={SICILIAN_SUBTREE} onMove={noop} onClose={noop} labels={MOVE_LABELS} testId="gallery-move" dialogProps={dialogProps} />
          )}
        </DialogFrame>
      ),
    },
    {
      name: "Moving a record — every folder, Unfiled marked",
      render: () => (
        <DialogFrame height={420}>
          {(dialogProps) => (
            <FolderMoveDialog open folders={FOLDERS} current={null} onMove={noop} onClose={noop} labels={{ ...MOVE_LABELS, title: "Move collection", none: "Unfiled" }} testId="gallery-move-record" dialogProps={dialogProps} />
          )}
        </DialogFrame>
      ),
    },
  ],
};

export default gallery;
