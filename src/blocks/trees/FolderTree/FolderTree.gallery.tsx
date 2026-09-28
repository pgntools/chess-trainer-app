import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import { ancestorsOf } from "../../../design-system/patterns/trees";
import type { GameFolder } from "../../../lib/savedGameFolders";
import type { BlockFamilyId } from "../../families";
import FolderTree, { type FolderTreeLabels } from "./FolderTree";
import { BROKEN, COUNTS, FOLDER_LABELS, FOLDERS, HEBREW_FOLDERS, LONG_FOLDERS, manyFolders } from "./fixtures";
import { folderTreeNodes } from "./folderTreeNodes";

type State = { open: Set<string>; selected: string | null };

const MANY = manyFolders(100);
const NO_ROOT: FolderTreeLabels = { ...FOLDER_LABELS, root: undefined };

/** The block over `folders`, its selection and open folders held by the demo as a screen would hold them. */
const demo = (
  folders: readonly GameFolder[],
  { selected = null, counts, labels = FOLDER_LABELS, width = 280 }: { selected?: string | null; counts?: Record<string, number>; labels?: FolderTreeLabels; width?: number } = {},
) => (
  <WithState<State>
    initial={{ open: new Set(selected === null ? [] : ancestorsOf(folderTreeNodes(folders), selected)), selected }}
  >
    {(state, set) => (
      <Box sx={{ width, display: "grid", gap: 1 }}>
        <Box sx={{ maxHeight: 360, overflowY: "auto", border: 1, borderColor: "divider", borderRadius: 1, py: 0.5 }}>
          <FolderTree
            folders={folders}
            counts={counts}
            selectedId={state.selected}
            onSelect={(selected) => set((before) => ({ ...before, selected }))}
            open={state.open}
            onToggle={(id) =>
              set((before) => {
                const open = new Set(before.open);
                if (open.has(id)) open.delete(id);
                else open.add(id);
                return { ...before, open };
              })
            }
            labels={labels}
            testId="gallery-folder-tree"
          />
        </Box>
        <Typography variant="caption" color="text.secondary">
          selected: {state.selected ?? "null (all)"}
        </Typography>
      </Box>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "trees",
  title: "FolderTree",
  demos: [
    { name: "Folders with counts, opened on the one selected (Najdorf)", render: () => demo(FOLDERS, { selected: "gnajdorf", counts: COUNTS }) },
    { name: "The top-level row selected, nothing open, no counts", render: () => demo(FOLDERS) },
    { name: "No top-level row", render: () => demo(FOLDERS, { labels: NO_ROOT, selected: "gendgames" }) },
    { name: "No folders — only the top-level row", render: () => demo([], { counts: { all: 0 } }) },
    { name: "One folder", render: () => demo(FOLDERS.slice(4, 5)) },
    { name: "A half-broken store — a missing parent, a cycle — still shows each folder once", render: () => demo(BROKEN) },
    { name: "Long names — cut with an ellipsis", render: () => demo(LONG_FOLDERS, { selected: "glong-child", width: 220 }) },
    { name: "Hebrew names (switch the direction to RTL)", render: () => demo(HEBREW_FOLDERS, { selected: "gh2" }) },
    { name: "1,100 folders — a closed folder mounts nothing", render: () => demo(MANY) },
  ],
};

export default gallery;
