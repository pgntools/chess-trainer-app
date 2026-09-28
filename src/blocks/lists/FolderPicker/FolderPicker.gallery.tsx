import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { GameFolder } from "../../../lib/savedGameFolders";
import type { BlockFamilyId } from "../../families";
import { FOLDERS, HEBREW_FOLDERS, manyFolders } from "./fixtures";
import FolderPicker from "./FolderPicker";

const MANY = manyFolders(60);

const demo = (folders: readonly GameFolder[], { exclude, maxHeight, noneLabel = "Unfiled" }: { exclude?: string[]; maxHeight?: number; noneLabel?: string } = {}) => (
  <WithState<string | null | undefined> initial={null}>
    {(value, setValue) => (
      <Box sx={{ width: 300 }}>
        <FolderPicker
          folders={folders}
          value={value}
          onChange={setValue}
          noneLabel={noneLabel}
          untitledLabel="Untitled folder"
          ariaLabel="Folder"
          exclude={exclude}
          maxHeight={maxHeight}
          testId="gallery-folder-picker"
        />
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "lists",
  title: "FolderPicker",
  demos: [
    { name: "Filing a record — Unfiled first, the tree indented, an untitled folder", render: () => demo(FOLDERS) },
    { name: "Moving Openings — its own subtree left out", render: () => demo(FOLDERS, { exclude: ["gopenings", "gsicilian", "gnajdorf"], noneLabel: "Top level" }) },
    { name: "No folders yet", render: () => demo([]) },
    { name: "Sixty folders in a scrolling frame", render: () => demo(MANY, { maxHeight: 220 }) },
    { name: "Hebrew names (switch to RTL — the indent mirrors)", render: () => demo(HEBREW_FOLDERS) },
  ],
};

export default gallery;
