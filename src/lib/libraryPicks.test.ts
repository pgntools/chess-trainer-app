import { describe, expect, it } from "vitest";

import { folderTreeRows } from "./folderTreeRows";
import {
  libraryPicksDeletion,
  libraryPicksOf,
  libraryPickStateOf,
  libraryPickTargetOf,
  librarySelectAllStateOf,
  librarySelectAllTargets,
  setLibraryPicks,
  toggleLibraryPick,
  type LibraryPickCollection,
  type LibraryPickModel,
} from "./libraryPicks";
import type { GameFolder } from "./savedGameFolders";

const BUILT_IN = "builtin";

const folder = (id: string, parentId: string | null = null): GameFolder => ({
  id,
  name: id,
  parentId,
  savedAt: "2026-10-01",
  updatedAt: "2026-10-01",
});

const upload = (id: string, folderId: string | null, count = 10): LibraryPickCollection => ({ id, name: id, source: "uploaded", count, folderId });
const shipped = (id: string, count = 100): LibraryPickCollection => ({ id, name: id, source: "shipped", count, folderId: BUILT_IN });

/*
  open ─┬─ sic ── unaj, uscheve
        ├─ empty
        └─ ucaro
  end ─── (nothing)
  uloose at the top level; tal and fischer in Built-in (not a folder here)
*/
const MODEL: LibraryPickModel = {
  folders: [folder("open"), folder("sic", "open"), folder("empty", "open"), folder("end")],
  collections: [shipped("tal"), shipped("fischer"), upload("unaj", "sic", 5), upload("uscheve", "sic", 7), upload("ucaro", "open", 3), upload("uloose", null, 1)],
};

const ids = (picked: Iterable<string>) => [...picked];

describe("libraryPicks (CTA-235)", () => {
  it("reads a folder's box from what is under it: checked, partly, or not", () => {
    const picks = libraryPicksOf(MODEL, new Set(["unaj"]));
    expect(libraryPickStateOf(picks, { kind: "folder", id: "sic" })).toEqual({ checked: false, indeterminate: true });
    expect(libraryPickStateOf(picks, { kind: "folder", id: "open" })).toEqual({ checked: false, indeterminate: true });
    expect(libraryPickStateOf(picks, { kind: "folder", id: "end" })).toEqual({ checked: false, indeterminate: false });

    const both = libraryPicksOf(MODEL, new Set(["unaj", "uscheve"]));
    expect(libraryPickStateOf(both, { kind: "folder", id: "sic" })).toEqual({ checked: true, indeterminate: false });
    expect(libraryPickStateOf(both, { kind: "folder", id: "open" })).toEqual({ checked: false, indeterminate: true });
  });

  it("ticks a folder with everything under it — its sub-folders and their collections", () => {
    const picked = toggleLibraryPick(new Set(), MODEL, { kind: "folder", id: "open" });
    expect(ids(picked)).toEqual(["open", "sic", "empty", "unaj", "uscheve", "ucaro"]);
    const picks = libraryPicksOf(MODEL, picked);
    for (const id of ["open", "sic", "empty"]) expect(libraryPickStateOf(picks, { kind: "folder", id }).checked).toBe(true);
    expect(ids(picks.collections)).toEqual(["unaj", "uscheve", "ucaro"]);
  });

  it("a folder's id stands for a collection filed under it later", () => {
    const picks = libraryPicksOf({ ...MODEL, collections: [...MODEL.collections, upload("unew", "sic")] }, new Set(["open"]));
    expect(picks.collections.has("unew")).toBe(true);
    expect(libraryPickStateOf(picks, { kind: "folder", id: "sic" }).checked).toBe(true);
  });

  it("an empty folder is checked only by its own box or one above it", () => {
    expect(libraryPickStateOf(libraryPicksOf(MODEL, new Set()), { kind: "folder", id: "empty" }).checked).toBe(false);
    expect(libraryPickStateOf(libraryPicksOf(MODEL, new Set(["empty"])), { kind: "folder", id: "empty" }).checked).toBe(true);
    // A folder whose only collections are picked is checked; its empty sibling is not.
    const picks = libraryPicksOf(MODEL, new Set(["unaj", "uscheve", "ucaro"]));
    expect(libraryPickStateOf(picks, { kind: "folder", id: "open" }).checked).toBe(true);
    expect(libraryPickStateOf(picks, { kind: "folder", id: "empty" }).checked).toBe(false);
  });

  it("unticking takes the thing and every folder above out, the rest still picked by id", () => {
    const all = toggleLibraryPick(new Set(), MODEL, { kind: "folder", id: "open" });
    const next = toggleLibraryPick(all, MODEL, { kind: "collection", id: "unaj" });
    const picks = libraryPicksOf(MODEL, next);
    expect(ids(picks.collections)).toEqual(["uscheve", "ucaro"]);
    expect(libraryPickStateOf(picks, { kind: "folder", id: "open" })).toEqual({ checked: false, indeterminate: true });
    expect(libraryPickStateOf(picks, { kind: "folder", id: "sic" })).toEqual({ checked: false, indeterminate: true });
    // The empty folder stays ticked, written out by its id.
    expect(libraryPickStateOf(picks, { kind: "folder", id: "empty" }).checked).toBe(true);
    // Unticking a folder takes everything under it.
    expect(ids(libraryPicksOf(MODEL, toggleLibraryPick(all, MODEL, { kind: "folder", id: "open" })).collections)).toEqual([]);
  });

  it("keeps the collections in the order they were ticked — the merge's", () => {
    let picked = toggleLibraryPick(new Set(), MODEL, { kind: "collection", id: "uloose" });
    picked = toggleLibraryPick(picked, MODEL, { kind: "collection", id: "tal" });
    picked = toggleLibraryPick(picked, MODEL, { kind: "folder", id: "sic" });
    expect(ids(libraryPicksOf(MODEL, picked).collections)).toEqual(["uloose", "tal", "unaj", "uscheve"]);
    // Unticking one writes the rest out in the same order.
    picked = toggleLibraryPick(picked, MODEL, { kind: "collection", id: "tal" });
    expect(ids(libraryPicksOf(MODEL, picked).collections)).toEqual(["uloose", "unaj", "uscheve"]);
  });

  it("deletes the checked folders whole and every picked upload, never a built-in collection", () => {
    const picked = new Set(["tal", "uloose", ...toggleLibraryPick(new Set(), MODEL, { kind: "folder", id: "sic" })]);
    const deletion = libraryPicksDeletion(MODEL, libraryPicksOf(MODEL, picked));
    expect(deletion.folderIds).toEqual(["sic"]);
    expect([...deletion.goneFolders]).toEqual(["sic"]);
    expect(deletion.uploads.map((each) => each.id)).toEqual(["uloose", "unaj", "uscheve"]);
    expect(deletion.builtInKept).toBe(1);
    expect(deletion.counts).toEqual({ folders: 1, collections: 3, games: 13 });

    // A checked folder under a checked one is the outer one's.
    const whole = libraryPicksDeletion(MODEL, libraryPicksOf(MODEL, new Set(["open"])));
    expect(whole.folderIds).toEqual(["open"]);
    expect([...whole.goneFolders].sort()).toEqual(["empty", "open", "sic"]);
    expect(whole.counts).toEqual({ folders: 3, collections: 3, games: 15 });
  });

  it("gives Built-in no box, and select-all the tree's leaves", () => {
    const rows = folderTreeRows({
      folders: [folder(BUILT_IN), ...MODEL.folders],
      items: MODEL.collections,
      isOpen: () => true,
      compareFolders: (a, b) => a.id.localeCompare(b.id),
      compareItems: (a, b) => a.id.localeCompare(b.id),
      sizeOf: (each) => each.count,
      pinned: [BUILT_IN],
    }).rows;
    const builtIn = rows.find((row) => row.kind === "folder" && row.folder.id === BUILT_IN);
    expect(builtIn === undefined ? "missing" : libraryPickTargetOf(builtIn, BUILT_IN)).toBeUndefined();
    const targets = librarySelectAllTargets(rows, BUILT_IN);
    expect(targets.map((target) => target.id).sort()).toEqual(["empty", "end", "fischer", "tal", "ucaro", "uloose", "unaj", "uscheve"]);

    const none = libraryPicksOf(MODEL, new Set());
    expect(librarySelectAllStateOf(none, targets)).toEqual({ checked: false, indeterminate: false });
    const every = setLibraryPicks(new Set(), MODEL, targets, true);
    expect(librarySelectAllStateOf(libraryPicksOf(MODEL, every), targets)).toEqual({ checked: true, indeterminate: false });
    expect(librarySelectAllStateOf(libraryPicksOf(MODEL, new Set(["tal"])), targets)).toEqual({ checked: false, indeterminate: true });
    expect(ids(libraryPicksOf(MODEL, setLibraryPicks(every, MODEL, targets, false)).collections)).toEqual([]);
  });
});
