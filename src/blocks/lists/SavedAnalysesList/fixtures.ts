import { DEFAULT_ANALYSIS_SETTINGS } from "../../../lib/analysisSettings";
import type { OpeningEntry } from "../../../lib/openings";
import { savedAnalysisToTree, type SavedAnalysis } from "../../../lib/savedAnalyses";
import type { AnalysisFolder } from "../../../lib/savedAnalysisFolders";
import type { SavedAnalysisEntry, SavedAnalysisFolderEntry } from "./SavedAnalysesList";

/*
  The saved analyses list's sample data (CTA-113), typed with `src/lib/`'s
  own record, folder and opening, so a change to them breaks the fixtures at
  compile time. Imported only by the block's gallery and its test.
*/

const AT = "2026-09-03T12:00:00.000Z";

const analysis = (id: string, name: string, pgn: string, extra: Partial<SavedAnalysis> = {}): SavedAnalysis => ({
  id,
  pgn,
  settings: DEFAULT_ANALYSIS_SETTINGS,
  path: [],
  orientation: "white",
  description: "",
  showArrows: true,
  arrowWidthSource: "none",
  arrowPalette: "classic",
  name,
  folderId: null,
  savedAt: AT,
  updatedAt: AT,
  ...extra,
});

const entryOf = (saved: SavedAnalysis, opening?: OpeningEntry): SavedAnalysisEntry => ({
  saved,
  tree: savedAnalysisToTree(saved),
  opening,
});

const folder = (id: string, name: string): AnalysisFolder => ({ id, name, parentId: null, savedAt: AT, updatedAt: AT });

const NAJDORF: OpeningEntry = { eco: "B90", name: "Sicilian Defense: Najdorf Variation", moves: "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6" };

export const FOLDERS: readonly SavedAnalysisFolderEntry[] = [
  { folder: folder("gopenings", "Openings"), count: 12 },
  { folder: folder("gempty", "Nothing yet"), count: 0 },
];

export const ENTRIES: readonly SavedAnalysisEntry[] = [
  entryOf(
    analysis("a1", "Najdorf, the poisoned pawn", "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 (5... Nc6 6. Bg5) 6. Bg5 e6 *", {
      path: ["e4", "c5", "Nf3"],
      description: "Check 8. Qd2 Qxb2 again.",
    }),
    NAJDORF,
  ),
  entryOf(analysis("a2", "", "1. d4 d5 2. c4 *", { orientation: "black" })),
  entryOf(analysis("a3", "A record that will not read", "1. Zz9")),
];

export const LONG_ENTRIES: readonly SavedAnalysisEntry[] = [
  entryOf(
    analysis(
      "long",
      "A very long name for an analysis that runs well past the width of any card or row it is shown in",
      "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *",
      { description: "And a description that goes on at length about what was found, and what is left to look at next time." },
    ),
  ),
];

export const HEBREW_ENTRIES: readonly SavedAnalysisEntry[] = [
  entryOf(analysis("heb", "ההגנה הסיציליאנית", "1. e4 c5 *", { description: "לבדוק שוב" })),
];

export const HEBREW_FOLDERS: readonly SavedAnalysisFolderEntry[] = [{ folder: folder("gheb", "פתיחות"), count: 3 }];

/** A page's worth. */
export const manyEntries = (count: number): SavedAnalysisEntry[] =>
  Array.from({ length: count }, (_, index) => entryOf(analysis(`m${index}`, `Analysis ${index + 1}`, "1. e4 e5 *")));
