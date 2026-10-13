import { describe, expect, it } from "vitest";

import {
  projectPickStateOf,
  projectPicksDeletion,
  projectPicksOf,
  setProjectPicks,
  toggleProjectPick,
  type ProjectPickModel,
  type ProjectPickTarget,
} from "./analysisProjectPicks";
import type { ProjectFolder } from "./analysisProjects";

const folder = (id: string, parentId: string | null = null): ProjectFolder => ({
  id,
  name: id,
  parentId,
  savedAt: "2026-10-01",
  updatedAt: "2026-10-01",
});

/*
  open ─┬─ sic ── pnaj (c1, c2)
        ├─ empty
        └─ pcaro (c3)
  end ─── pbare (no Cases)
  ploose (c4) at the top level
*/
const MODEL: ProjectPickModel = {
  folders: [folder("open"), folder("sic", "open"), folder("empty", "open"), folder("end")],
  projects: [
    { id: "pnaj", folderId: "sic" },
    { id: "pcaro", folderId: "open" },
    { id: "pbare", folderId: "end" },
    { id: "ploose", folderId: null },
  ],
  cases: [
    { id: "c1", projectId: "pnaj" },
    { id: "c2", projectId: "pnaj" },
    { id: "c3", projectId: "pcaro" },
    { id: "c4", projectId: "ploose" },
  ],
};

const f = (id: string): ProjectPickTarget => ({ kind: "folder", id });
const p = (id: string): ProjectPickTarget => ({ kind: "project", id });
const c = (id: string): ProjectPickTarget => ({ kind: "case", id });

/** Every box as one word: `x` checked, `-` partly ticked, `.` neither. */
const boxes = (picked: ReadonlySet<string>) => {
  const picks = projectPicksOf(MODEL, picked);
  const mark = (target: ProjectPickTarget) => {
    const state = projectPickStateOf(picks, target);
    return state.checked ? "x" : state.indeterminate ? "-" : ".";
  };
  return {
    folders: ["open", "sic", "empty", "end"].map((id) => mark(f(id))).join(""),
    projects: ["pnaj", "pcaro", "pbare", "ploose"].map((id) => mark(p(id))).join(""),
    cases: ["c1", "c2", "c3", "c4"].map((id) => mark(c(id))).join(""),
  };
};

const tick = (picked: ReadonlySet<string>, target: ProjectPickTarget) => toggleProjectPick(picked, MODEL, target);

describe("Analysis V2's picks over folders, Projects and Cases (CTA-191)", () => {
  it("ticks a folder with its whole subtree — sub-folders, Projects and their Cases", () => {
    const picked = tick(new Set(), f("open"));
    expect(boxes(picked)).toEqual({ folders: "xxx.", projects: "xx..", cases: "xxx." });
  });

  it("ticks a Project with its Cases — its folders partly ticked, or checked once all under them is", () => {
    let picked = tick(new Set(), p("pnaj"));
    expect(boxes(picked)).toEqual({ folders: "-x..", projects: "x...", cases: "xx.." });
    // Caro-Kann's one Case too: everything under Openings but the empty folder — it counts no leaf.
    picked = tick(picked, c("c3"));
    expect(boxes(picked)).toEqual({ folders: "xx..", projects: "xx..", cases: "xxx." });
  });

  it("checks a Project whose Cases are all ticked one by one; an empty one only by its own box", () => {
    let picked = tick(new Set(), c("c1"));
    expect(boxes(picked).projects).toBe("-...");
    picked = tick(picked, c("c2"));
    expect(boxes(picked).projects).toBe("x...");
    picked = tick(new Set(), p("pbare"));
    expect(boxes(picked)).toEqual({ folders: "...x", projects: "..x.", cases: "...." });
  });

  it("unticks an item and every container above it — the rest stays ticked", () => {
    let picked = tick(new Set(), f("open"));
    picked = tick(picked, c("c1"));
    expect(boxes(picked)).toEqual({ folders: "--x.", projects: "-x..", cases: ".xx." });
    // Its Project ticked again: Sicilian whole, and with it Openings.
    picked = tick(picked, p("pnaj"));
    expect(boxes(picked)).toEqual({ folders: "xxx.", projects: "xx..", cases: "xxx." });
  });

  it("unticks a folder with all under it, leaving what is beside it", () => {
    let picked = tick(new Set(), f("open"));
    picked = tick(picked, f("sic"));
    expect(boxes(picked)).toEqual({ folders: "-.x.", projects: ".x..", cases: "..x." });
  });

  it("ticks and unticks many at once — select-all", () => {
    const every = [c("c1"), c("c2"), c("c3"), p("pbare"), c("c4"), f("empty")];
    const all = setProjectPicks(new Set(), MODEL, every, true);
    expect(boxes(all)).toEqual({ folders: "xxxx", projects: "xxxx", cases: "xxxx" });
    expect(boxes(setProjectPicks(all, MODEL, every, false))).toEqual({ folders: "....", projects: "....", cases: "...." });
    // A part of them: the words' Cases alone.
    expect(boxes(setProjectPicks(all, MODEL, [c("c1")], false)).cases).toBe(".xxx");
  });

  it("reads a pick of a record gone as nothing", () => {
    expect(boxes(new Set(["gone", "pgone"]))).toEqual({ folders: "....", projects: "....", cases: "...." });
  });

  it("deletes the fewest — a folder whole, a Project with its Cases, the Cases left — counting all that goes", () => {
    let picked = tick(new Set(), f("sic"));
    picked = tick(picked, c("c3"));
    picked = tick(picked, p("pbare"));
    const deletion = projectPicksDeletion(MODEL, projectPicksOf(MODEL, picked));
    // Openings is checked too now (everything under it with a leaf is picked): it goes whole, the empty folder with it.
    expect(deletion.folderIds).toEqual(["open", "end"]);
    expect(deletion.projectIds).toEqual([]);
    expect(deletion.caseIds).toEqual([]);
    expect(deletion.counts).toEqual({ folders: 4, projects: 3, cases: 3 });
    expect([...deletion.goneFolders].sort()).toEqual(["empty", "end", "open", "sic"]);

    const some = projectPicksDeletion(MODEL, projectPicksOf(MODEL, tick(tick(new Set(), c("c1")), p("ploose"))));
    expect(some).toMatchObject({ folderIds: [], projectIds: ["ploose"], caseIds: ["c1"], counts: { folders: 0, projects: 1, cases: 2 } });
  });
});
