import type { GameFolder } from "../../../lib/savedGameFolders";

/*
  The folder picker's sample data (CTA-113), typed with `src/lib/`'s folder.
  Imported only by the block's gallery and its test.
*/

const AT = "2026-09-28T12:00:00.000Z";
const folder = (id: string, name: string, parentId: string | null = null): GameFolder => ({
  id,
  name,
  parentId,
  savedAt: AT,
  updatedAt: AT,
});

/** Three levels, out of order — the picker sorts them by name under their parents. */
export const FOLDERS: readonly GameFolder[] = [
  folder("gsicilian", "Sicilian", "gopenings"),
  folder("gopenings", "Openings"),
  folder("gnajdorf", "Najdorf", "gsicilian"),
  folder("gendgames", "Endgames"),
  folder("gunnamed", ""),
];

export const HEBREW_FOLDERS: readonly GameFolder[] = [folder("gheb", "פתיחות"), folder("gheb-2", "סיציליאנית", "gheb")];

export const manyFolders = (count: number): GameFolder[] =>
  Array.from({ length: count }, (_, index) => folder(`g${index}`, `Folder ${String(index + 1).padStart(3, "0")}`));
