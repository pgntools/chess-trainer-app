import { describe, expect, it } from "vitest";
import type { SavedAnalysis } from "./savedAnalyses";
import {
  analysisPicksOf,
  analysesHere,
  analysesInFolder,
  toggleAnalysisFolderPick,
  toggleAnalysisPick,
  type AnalysisFolder,
} from "./savedAnalysisFolders";
import {
  gameFolderFrom,
  gameFolderSubtree,
  type GameFolder,
} from "./savedGameFolders";

/*
  The picks model (CTA-147) — pure reads and toggles over hand-built trees, no
  storage, no React. A folder's pick is its whole subtree; every test names
  its shape inline.
*/

const AT = new Date("2026-10-07T10:00:00.000Z");

/** One folder with the id/name/parent the test asks for. */
const folder = (id: string, name: string, parentId: string | null): GameFolder => ({
  id,
  name,
  parentId,
  savedAt: AT.toISOString(),
  updatedAt: AT.toISOString(),
});

/**
 * One analysis filed into `folderId` — only what the picks read: its id and
 * where it is filed. (The real record's other fields are irrelevant here.)
 */
const analysis = (id: string, folderId: string | null) => ({ id, folderId }) as unknown as SavedAnalysis;

/*
  The tree every test shares:

  open ─ sic ─ a1, a2
       ─ a3
  end ─ a4
  lone (empty)
*/
const FOLDERS: readonly AnalysisFolder[] = [
  folder("open", "Openings", null),
  folder("sic", "Sicilian", "open"),
  folder("end", "Endgames", null),
  folder("lone", "Nothing yet", null),
];
const ANALYSES: readonly SavedAnalysis[] = [
  analysis("a1", "sic"),
  analysis("a2", "sic"),
  analysis("a3", "open"),
  analysis("a4", "end"),
];

const picked = (...ids: string[]) => new Set(ids);

describe("analysisPicksOf — what the picks stand for", () => {
  it("counts only what is picked when no folder is — and the folders above a pick are indeterminate", () => {
    const picks = analysisPicksOf(ANALYSES, FOLDERS, picked("a1"));
    expect([...picks.analyses]).toEqual(["a1"]);
    expect(picks.folders.get("sic")).toEqual({ checked: false, indeterminate: true });
    expect(picks.folders.get("open")).toEqual({ checked: false, indeterminate: true });
    expect(picks.folders.get("end")).toEqual({ checked: false, indeterminate: false });
    expect(picks.folders.get("lone")).toEqual({ checked: false, indeterminate: false });
  });

  it("picks a folder's whole subtree with it — the chip, the download and the delete all read the same set", () => {
    const picks = analysisPicksOf(ANALYSES, FOLDERS, picked("open", "a1", "a2", "a3"));
    expect([...picks.analyses]).toEqual(["a1", "a2", "a3"]);
    expect(picks.folders.get("open")).toEqual({ checked: true, indeterminate: false });
    // The sub-folder's contents are picked with the parent: it is checked too.
    expect(picks.folders.get("sic")).toEqual({ checked: true, indeterminate: false });
    expect(picks.folders.get("end")).toEqual({ checked: false, indeterminate: false });
  });

  it("shows a folder checked when its contents are all picked — picked as a folder or one by one", () => {
    // a1 and a2 are sic's whole contents; the folder id itself is not in the set.
    const byHand = analysisPicksOf(ANALYSES, FOLDERS, picked("a1", "a2"));
    expect(byHand.folders.get("sic")).toEqual({ checked: true, indeterminate: false });
    // Its parent, holding a3 unpicked besides, is indeterminate.
    expect(byHand.folders.get("open")).toEqual({ checked: false, indeterminate: true });
  });

  it("is indeterminate while some of what is under a folder is picked, and never on nothing", () => {
    const picks = analysisPicksOf(ANALYSES, FOLDERS, picked("a1"));
    expect(picks.folders.get("sic")).toEqual({ checked: false, indeterminate: true });
    expect(picks.folders.get("open")).toEqual({ checked: false, indeterminate: true });
    // An empty folder is checked only by its own box, never by its (absent) contents.
    expect(picks.folders.get("lone")).toEqual({ checked: false, indeterminate: false });
  });

  it("reads a record whose folder is gone as out of every folder, as the list does", () => {
    const dangling = analysis("a5", "gone");
    const picks = analysisPicksOf([dangling], FOLDERS, picked("a5"));
    expect([...picks.analyses]).toEqual(["a5"]);
    for (const folder of FOLDERS) {
      expect(picks.folders.get(folder.id)).toEqual({ checked: false, indeterminate: false });
    }
  });
});

describe("toggleAnalysisFolderPick — a folder's box", () => {
  it("ticking a folder picks it and every analysis under it, deep", () => {
    const next = toggleAnalysisFolderPick(picked(), FOLDERS[0], ANALYSES, FOLDERS, false);
    expect([...next].sort()).toEqual(["a1", "a2", "a3", "open"]);
  });

  it("ticking an empty folder picks it alone — there is nothing else to take", () => {
    const next = toggleAnalysisFolderPick(picked(), FOLDERS[3], ANALYSES, FOLDERS, false);
    expect([...next]).toEqual(["lone"]);
  });

  it("unticking a folder takes it, its sub-folders and everything under it", () => {
    const before = picked("open", "sic", "a1", "a2", "a3", "a4");
    const next = toggleAnalysisFolderPick(before, FOLDERS[0], ANALYSES, FOLDERS, true);
    expect([...next].sort()).toEqual(["a4"]);
  });

  it("unticking a folder keeps the picks it does not cover, and demotes the folders above it", () => {
    const before = picked("open", "sic", "a1", "a2", "a3", "end", "a4");
    const next = toggleAnalysisFolderPick(before, FOLDERS[1], ANALYSES, FOLDERS, true);
    // sic's box unticks sic and its own analyses; open keeps its other analysis but loses its own pick — it covers sic no more.
    expect([...next].sort()).toEqual(["a3", "a4", "end"]);
  });
});

describe("toggleAnalysisPick — an analysis' box", () => {
  it("ticks and unticks an analysis like any set member", () => {
    expect([...toggleAnalysisPick(picked(), analysis("a1", "sic"), FOLDERS)]).toEqual(["a1"]);
    expect([...toggleAnalysisPick(picked("a1"), analysis("a1", "sic"), FOLDERS)]).toEqual([]);
  });

  it("unticking one under picked folders demotes them — none stays checked with its contents partly picked", () => {
    const before = picked("open", "sic", "a1", "a2");
    const next = toggleAnalysisPick(before, analysis("a1", "sic"), FOLDERS);
    expect([...next].sort()).toEqual(["a2"]);
  });

  it("demotes only the folders above — an analysis beside them keeps theirs", () => {
    const before = picked("open", "sic", "a1", "a2", "end", "a4");
    const next = toggleAnalysisPick(before, analysis("a1", "sic"), FOLDERS);
    expect([...next].sort()).toEqual(["a2", "a4", "end"]);
  });

  it("unticking an Unfiled analysis demotes nothing", () => {
    const top = analysis("top", null);
    const before = picked("open", "sic", "a1", "a2", "top");
    const next = toggleAnalysisPick(before, top, FOLDERS);
    expect([...next].sort()).toEqual(["a1", "a2", "open", "sic"]);
  });
});

describe("the reads around the picks — unchanged by CTA-147", () => {
  it("still lists what is filed where, deep and directly", () => {
    expect(analysesInFolder(ANALYSES, FOLDERS, "open").map((row) => row.id)).toEqual(["a1", "a2", "a3"]);
    expect(analysesHere(ANALYSES, FOLDERS, "open").map((row) => row.id)).toEqual(["a3"]);
    expect(gameFolderSubtree(FOLDERS, "open")).toEqual(new Set(["open", "sic"]));
  });

  it("still normalises a stored row", () => {
    expect(gameFolderFrom({ id: "x", name: "X", parentId: null, savedAt: AT.toISOString(), updatedAt: AT.toISOString() })).toBeDefined();
  });
});
