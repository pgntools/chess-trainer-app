import {
  folderTreeRows,
  type FolderTreeRow,
} from "../../../lib/folderTreeRows";
import type { GameFolder } from "../../../lib/savedGameFolders";
import type { LibraryEntry } from "./CollectionsTreeTable";

/*
  The Library tree table's sample tree (CTA-113), walked by `src/lib/`'s own
  `folderTreeRows` over its own folder and summary types. Imported only by
  the block's gallery and its test.
*/

export const BUILT_IN = "builtin";

const AT = "2026-09-01T12:00:00.000Z";
const folder = (
  id: string,
  name: string,
  parentId: string | null = null,
  savedAt = AT,
): GameFolder => ({
  id,
  name,
  parentId,
  savedAt,
  updatedAt: savedAt,
});

const shipped = (id: string, name: string, count: number): LibraryEntry => ({
  id,
  name,
  count,
  source: "shipped",
  folderId: BUILT_IN,
});
const upload = (
  id: string,
  name: string,
  count: number,
  folderId: string | null,
  addedAt = AT,
): LibraryEntry => ({
  id,
  name,
  count,
  source: "uploaded",
  addedAt,
  folderId,
});

export const FOLDERS: readonly GameFolder[] = [
  folder(BUILT_IN, "Built-in", null, ""),
  folder("gopenings", "Openings"),
  folder("gsicilian", "Sicilian", "gopenings", "2026-09-10T12:00:00.000Z"),
  folder("gempty", "Nothing yet"),
];

export const ENTRIES: readonly LibraryEntry[] = [
  shipped("tal", "Tal", 2636),
  shipped("capablanca", "Capablanca", 1035),
  upload("uclub", "Club games", 120, null, "2026-09-20T12:00:00.000Z"),
  upload("unajdorf", "Najdorf lines", 42, "gsicilian"),
  upload("ublitz", "בליץ", 7, "gopenings"),
];

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name);

/** The tree walked with these folders open. */
export const rowsOpen = (
  open: ReadonlySet<string>,
): FolderTreeRow<LibraryEntry>[] =>
  folderTreeRows<LibraryEntry>({
    folders: FOLDERS,
    items: ENTRIES,
    isOpen: (id) => open.has(id),
    compareFolders: byName,
    compareItems: byName,
    sizeOf: (entry) => entry.count,
    pinned: [BUILT_IN],
  }).rows;
