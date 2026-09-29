import { useMemo } from "react";
import FolderOffRoundedIcon from "@mui/icons-material/FolderOffRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";

import { PickerList, type PickerItem } from "../../../design-system/components/lists";
import { flattenGameFolders, type GameFolder } from "../../../lib/savedGameFolders";

export type FolderPickerProps = {
  /** Every folder in the reader's tree, as the store holds them. */
  folders: readonly GameFolder[];
  /** The chosen folder — `null` for the "none" row, `undefined` for nothing chosen yet. */
  value: string | null | undefined;
  onChange: (folderId: string | null) => void;
  /** The "none" row's words — "Unfiled" when filing a record, "Top level" when moving a folder. */
  noneLabel: string;
  /** What a folder with no name reads as. */
  untitledLabel: string;
  /** The list's accessible name ("Folder"). */
  ariaLabel: string;
  /** Folders not offered — a moved folder's own subtree. */
  exclude?: readonly string[];
  /** Box it in a bordered frame of this height that scrolls — in a form. */
  maxHeight?: number;
  /** The list; each folder's row is `<testId>-<folder id>`. */
  testId: string;
  /** The "none" row's test id. Absent, `<testId>-none`. */
  noneTestId?: string;
};

/**
 * **Pick a folder** (CTA-113) — the reader's folder tree as one list of
 * choices (`PickerList`): every folder, parents before children, indented by
 * depth from the inline start, a "none" row first. Flat rather than
 * collapsible: a closed branch would hide a folder the reader means to pick,
 * and the indent says where each one nests. Filing a record (the save
 * dialog, a record's settings, the Library's upload) and moving a folder
 * (which leaves out its own subtree) pick through it.
 */
function FolderPicker({
  folders,
  value,
  onChange,
  noneLabel,
  untitledLabel,
  ariaLabel,
  exclude,
  maxHeight,
  testId,
  noneTestId,
}: FolderPickerProps) {
  const items = useMemo<PickerItem[]>(() => {
    const hidden = new Set(exclude ?? []);
    return [
      { id: null, label: noneLabel, icon: <FolderOffRoundedIcon fontSize="small" /> },
      ...flattenGameFolders(folders)
        .filter(({ folder }) => !hidden.has(folder.id))
        .map(({ folder, depth }) => ({
          id: folder.id,
          label: folder.name === "" ? untitledLabel : folder.name,
          depth,
          icon: <FolderRoundedIcon fontSize="small" />,
        })),
    ];
  }, [folders, exclude, noneLabel, untitledLabel]);

  return (
    <PickerList
      items={items}
      value={value}
      onChange={onChange}
      ariaLabel={ariaLabel}
      maxHeight={maxHeight}
      testId={testId}
      noneTestId={noneTestId}
    />
  );
}

export default FolderPicker;
