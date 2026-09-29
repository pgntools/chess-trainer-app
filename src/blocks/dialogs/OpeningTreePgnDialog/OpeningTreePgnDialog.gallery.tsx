import DialogFrame from "../../../design-system/gallery/DialogFrame";
import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import OpeningTreePgnDialog from "./OpeningTreePgnDialog";

const noop = () => {};

const gallery: GalleryModule<BlockFamilyId> = {
  section: "dialogs",
  title: "OpeningTreePgnDialog",
  demos: [
    {
      name: "Save tree as PGN — Add tags with games ticked; No turns the boxes off, neither ticked turns Save off",
      render: () => (
        <DialogFrame height={380}>
          {(dialogProps) => (
            <OpeningTreePgnDialog open onClose={noop} onSave={noop} testId="gallery-tree-pgn" dialogProps={dialogProps} />
          )}
        </DialogFrame>
      ),
    },
  ],
};

export default gallery;
