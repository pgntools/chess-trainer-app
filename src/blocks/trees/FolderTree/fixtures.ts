import type { GameFolder } from "../../../lib/savedGameFolders";
import type { FolderTreeLabels } from "./FolderTree";

/*
  The folder tree's sample data (CTA-110), typed with `src/lib/`'s own
  folder, so a change to the model breaks the fixtures at compile time.
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

export const FOLDER_LABELS: FolderTreeLabels = {
  tree: "Folders",
  hint: "Up and down arrows to move, right to open, left to close, Enter to go.",
  root: "All analyses",
  toggle: (name, open) => `${open ? "Close" : "Open"} ${name}`,
};

/** A few folders, three levels deep, out of order — the tree sorts them by name. */
export const FOLDERS: readonly GameFolder[] = [
  folder("gsicilian", "Sicilian", "gopenings"),
  folder("gopenings", "Openings"),
  folder("gnajdorf", "Najdorf", "gsicilian"),
  folder("gdragon", "Dragon", "gsicilian"),
  folder("gendgames", "Endgames"),
  folder("gfrench", "French", "gopenings"),
  folder("gempty", "An empty folder"),
];

/** What is filed in each, and in all of them. */
export const COUNTS: Readonly<Record<string, number>> = {
  all: 57,
  gopenings: 3,
  gsicilian: 12,
  gnajdorf: 20,
  gdragon: 8,
  gfrench: 6,
  gendgames: 8,
  gempty: 0,
};

/** A half-broken store: a parent that is not there, and a two-folder cycle. */
export const BROKEN: readonly GameFolder[] = [
  folder("gorphan", "Orphan", "gmissing"),
  folder("gloop-a", "Loop A", "gloop-b"),
  folder("gloop-b", "Loop B", "gloop-a"),
];

export const LONG_FOLDERS: readonly GameFolder[] = [
  folder("glong", "A folder whose name is far too long to fit on one line of a narrow panel"),
  folder("glong-child", "And one inside it with an equally long and unwieldy name", "glong"),
];

export const HEBREW_FOLDERS: readonly GameFolder[] = [
  folder("gh1", "פתיחות"),
  folder("gh2", "הגנה סיציליאנית", "gh1"),
  folder("gh3", "סיומים"),
];

/** `count` top-level folders of ten sub-folders each. */
export const manyFolders = (count: number): GameFolder[] =>
  Array.from({ length: count }, (_, index) => [
    folder(`gm${index}`, `Folder ${String(index + 1).padStart(3, "0")}`),
    ...Array.from({ length: 10 }, (_, sub) => folder(`gm${index}-${sub}`, `Sub-folder ${sub + 1}`, `gm${index}`)),
  ]).flat();
