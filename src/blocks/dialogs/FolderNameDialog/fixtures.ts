import type { GameFolder } from "../../../lib/savedGameFolders";
import type { FolderNameDialogLabels } from "./FolderNameDialog";

/*
  The folder name dialog's sample data (CTA-113). Imported only by the
  block's gallery and its test.
*/

export const NAME_LABELS: FolderNameDialogLabels = { name: "Folder name", cancel: "Cancel", save: "Save" };

const AT = "2026-09-28T12:00:00.000Z";

export const RENAMED: GameFolder = { id: "gopenings", name: "Openings", parentId: null, savedAt: AT, updatedAt: AT };

export const HEBREW: GameFolder = { id: "gheb", name: "פתיחות", parentId: null, savedAt: AT, updatedAt: AT };
