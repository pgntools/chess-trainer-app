import type { SavedAnalysisRow } from "../../../lib/savedAnalysisRows";
import type { GameFolder } from "../../../lib/savedGameFolders";
import type { AnalysesTreeLabels } from "./AnalysesTree";

/*
  The analyses tree's sample data (CTA-145), typed with `src/lib/`'s own
  folder and table row, so a change to either breaks the fixtures at compile
  time. Imported only by the block's gallery and its test.
*/

const AT = "2026-09-28T12:00:00.000Z";
const folder = (id: string, name: string, parentId: string | null = null): GameFolder => ({
  id,
  name,
  parentId,
  savedAt: AT,
  updatedAt: AT,
});

/** One analysis, newer the later its `day`. */
const row = (id: string, folderId: string | null, name: string, day: number): SavedAnalysisRow => ({
  id,
  folderId,
  name,
  description: "",
  moves: 10,
  updated: `2026-09-${String(day).padStart(2, "0")}T10:00:00.000Z`,
});

export const LABELS: AnalysesTreeLabels = {
  title: "Saved analyses",
  collapse: "Fold the panel away",
  expand: "Open Saved analyses",
  close: "Close — back to Saved analyses",
  hint: "Up and down arrows to move, right to open, left to close, Enter to go.",
  locked: "Save or discard your changes to open another analysis.",
  filter: "Filter analyses",
  filterClear: "Clear the words",
  noMatch: "No analysis matches the filter.",
  previous: "Previous analysis in the folder",
  next: "Next analysis in the folder",
  untitled: "Analysis board",
  untitledFolder: "Untitled folder",
  showMore: (remaining) => `Show ${remaining} more`,
};

/** A tutorial three levels deep, an openings folder, and one folder with nothing in it. */
export const FOLDERS: readonly GameFolder[] = [
  folder("gtutorial", "Chess basics"),
  folder("gendings", "Endings", "gtutorial"),
  folder("grook", "Rook endings", "gendings"),
  folder("gopenings", "Openings"),
  folder("gempty", "Not yet filled"),
];

export const ROWS: readonly SavedAnalysisRow[] = [
  row("a1", "gtutorial", "1. The opening principles — develop, castle, fight for the centre", 1),
  row("a2", "gtutorial", "2. Controlling the centre", 2),
  row("a3", "gendings", "Opposition and the square of the pawn", 3),
  row("a4", "grook", "Lucena position", 4),
  row("a5", "grook", "Philidor position", 5),
  row("a6", "gopenings", "Najdorf, 6.Bg5 — the poisoned pawn with every sideline noted", 6),
  row("a7", null, "מלכודת הפרש", 7),
  row("a8", null, "", 8),
];

/** The chain of folders above an analysis, to open it in view. */
export const OPEN_TO_A4: ReadonlySet<string> = new Set(["gtutorial", "gendings", "grook"]);

/** Three hundred analyses in one folder — more than a page. */
export const MANY_ROWS: readonly SavedAnalysisRow[] = Array.from({ length: 300 }, (_, index) =>
  row(`m${index}`, "gopenings", `Lesson ${index + 1}`, 1 + (index % 28)),
);

export const UPDATED_NEWEST_FIRST = { column: "updated", direction: "desc" } as const;
