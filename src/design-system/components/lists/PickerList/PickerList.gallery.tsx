import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";

import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import PickerList, { type PickerItem } from "./PickerList";

const folder = <FolderOutlinedIcon fontSize="small" />;

const TREE: PickerItem[] = [
  { id: null, label: "Unfiled", icon: <InboxOutlinedIcon fontSize="small" /> },
  { id: "openings", label: "Openings", icon: folder },
  { id: "sicilian", label: "Sicilian", depth: 1, icon: folder },
  { id: "najdorf", label: "Najdorf", depth: 2, icon: folder },
  { id: "endgames", label: "Endgames", icon: folder },
  { id: "rooks", label: "צריחים", depth: 1, icon: folder },
];

const gallery: GalleryModule = {
  section: "lists",
  title: "PickerList",
  demos: [
    {
      name: "A folder tree, indented by depth",
      render: () => (
        <WithState initial={"sicilian" as string | null | undefined}>
          {(value, setValue) => <PickerList items={TREE} value={value} onChange={setValue} ariaLabel="Folder" testId="gallery-picker" />}
        </WithState>
      ),
    },
    {
      name: "Framed and scrolling, one row disabled (a move's own subtree)",
      render: () => (
        <WithState initial={undefined as string | null | undefined}>
          {(value, setValue) => (
            <PickerList
              items={TREE.map((item) => (item.id === "najdorf" ? { ...item, disabled: true } : item))}
              value={value}
              onChange={setValue}
              ariaLabel="Move to"
              maxHeight={140}
              testId="gallery-picker-framed"
            />
          )}
        </WithState>
      ),
    },
  ],
};

export default gallery;
