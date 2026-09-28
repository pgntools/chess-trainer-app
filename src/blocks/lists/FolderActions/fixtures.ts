import type { GameFolder } from "../../../lib/savedGameFolders";
import type { FolderAction } from "./folderActions";

/*
  The folder actions' sample data (CTA-113), typed with `src/lib/`'s folder.
  Imported only by the block's gallery and its test.
*/

const AT = "2026-09-28T12:00:00.000Z";

export const FOLDER: GameFolder = { id: "gopenings", name: "Openings", parentId: null, savedAt: AT, updatedAt: AT };

export const HEBREW_FOLDER: GameFolder = { id: "ghebrew", name: "פתיחות", parentId: null, savedAt: AT, updatedAt: AT };

/** Each action's name, for one folder. */
export const labelsFor = (name: string): Record<FolderAction, string> => ({
  new: `New folder in ${name}`,
  upload: `Upload a collection into ${name}`,
  download: `Download ${name}`,
  rename: `Rename ${name}`,
  move: `Move ${name}`,
  delete: `Delete ${name}`,
});
