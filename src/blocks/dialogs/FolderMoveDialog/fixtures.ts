import type { GameFolder } from "../../../lib/savedGameFolders";
import type { FolderMoveDialogLabels } from "./FolderMoveDialog";

/*
  The move dialog's sample data (CTA-113), typed with `src/lib/`'s folder.
  Imported only by the block's gallery and its test.
*/

const AT = "2026-09-28T12:00:00.000Z";
const folder = (id: string, name: string, parentId: string | null = null): GameFolder => ({ id, name, parentId, savedAt: AT, updatedAt: AT });

export const MOVE_LABELS: FolderMoveDialogLabels = {
  title: "Move folder",
  cancel: "Cancel",
  none: "Top level",
  untitled: "Untitled folder",
  picker: "Folder",
};

export const FOLDERS: readonly GameFolder[] = [
  folder("gopenings", "Openings"),
  folder("gsicilian", "Sicilian", "gopenings"),
  folder("gnajdorf", "Najdorf", "gsicilian"),
  folder("gendgames", "Endgames"),
];

/** Sicilian and what is under it — what a move of Sicilian leaves out. */
export const SICILIAN_SUBTREE = ["gsicilian", "gnajdorf"];
