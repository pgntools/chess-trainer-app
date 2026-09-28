import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import { FOLDER, HEBREW_FOLDER, labelsFor } from "./fixtures";
import FolderActions from "./FolderActions";

const noop = () => {};

const gallery: GalleryModule<BlockFamilyId> = {
  section: "lists",
  title: "FolderActions",
  demos: [
    {
      name: "A saved analyses folder — download, rename, move, delete",
      render: () => (
        <FolderActions
          folderId={FOLDER.id}
          on={{ download: noop, rename: noop, move: noop, delete: noop }}
          labels={labelsFor(FOLDER.name)}
          testId="gallery-folder-actions"
        />
      ),
    },
    {
      name: "An empty repertoires folder — its download off, no move",
      render: () => (
        <FolderActions
          folderId={FOLDER.id}
          on={{ download: noop, rename: noop, delete: noop }}
          labels={labelsFor(FOLDER.name)}
          disabled={{ download: true }}
          testId="gallery-folder-actions-empty"
        />
      ),
    },
    {
      name: "A Library folder — all six",
      render: () => (
        <FolderActions
          folderId={HEBREW_FOLDER.id}
          on={{ new: noop, upload: noop, download: noop, rename: noop, move: noop, delete: noop }}
          labels={labelsFor(HEBREW_FOLDER.name)}
          testId="gallery-folder-actions-all"
        />
      ),
    },
  ],
};

export default gallery;
