import { describe, expect, it, vi } from "vitest";

import {
  addAnalysisCases,
  analysisCasesSnapshot,
  duplicateAnalysisCase,
  importAnalysisCases,
  loadAnalysisCases,
  moveAnalysisCase,
  moveAnalysisCaseInOrder,
  removeAnalysisCases,
  renameAnalysisCase,
  resetAnalysisCaseStore,
  saveCaseState,
  settledAnalysisCases,
} from "./analysisCaseStore";
import {
  addProjectFolders,
  createProjectFolder,
  loadProjectFolders,
  moveProjectFolder,
  projectFoldersSnapshot,
  removeProjectFolder,
  removeProjectFolderDeep,
  removeProjectFoldersDeep,
  renameProjectFolder,
  resetProjectFolderStore,
} from "./analysisProjectFolderStore";
import {
  analysisProjectsSnapshot,
  createAnalysisProject,
  duplicateAnalysisProject,
  importAnalysisProjects,
  loadAnalysisProjects,
  moveAnalysisProject,
  removeAnalysisProject,
  removeAnalysisProjects,
  renameAnalysisProject,
  resetAnalysisProjectStore,
} from "./analysisProjectStore";
import {
  addCaseLinks,
  caseLinksSnapshot,
  importCaseLinks,
  linkAnalysisCases,
  loadCaseLinks,
  removeLinksOfCases,
  resetCaseLinkStore,
  unlinkAnalysisCases,
} from "./analysisCaseLinkStore";
import { ANALYSIS_PROJECTS_DB_NAME, CASES_STORE, deleteAnalysisProjectsDb, openAnalysisProjectsDb } from "./analysisProjectsDb";
import {
  casesInOrder,
  caseStateOf,
  MAX_ANALYSIS_CASES,
  positionCaseOfFen,
  caseLinksOf,
  type AnalysisCase,
} from "./analysisProjects";
import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS } from "./computerAnalysis";
import { emptyTree } from "./gameTree";
import { committed, done } from "./idb";
import { jobV2Of } from "./jobsV2";
import { addJobV2, jobsV2Snapshot, loadJobsV2, resetJobV2Store } from "./jobV2Store";

const FEN = "8/8/4k3/8/8/4K3/4P3/8 w - - 0 1";

const aCase = (id: string, projectId: string, name = ""): AnalysisCase =>
  positionCaseOfFen({ id, projectId, name, now: new Date("2026-10-12T10:00:00.000Z") }, FEN);

/** A reload: forget what was read, then read again from IndexedDB. */
const reload = async () => {
  await settledAnalysisCases();
  resetProjectFolderStore();
  resetAnalysisProjectStore();
  resetAnalysisCaseStore();
  return {
    folders: await loadProjectFolders(),
    projects: await loadAnalysisProjects(),
    cases: await loadAnalysisCases(),
  };
};

describe("Analysis V2's stores (CTA-186)", () => {
  describe("folders", () => {
    it("are created, renamed and kept across a reload", async () => {
      const top = await createProjectFolder("  Openings ", null);
      const sub = await createProjectFolder("Sicilian", top!.id);
      expect(await createProjectFolder("   ", null)).toBeUndefined();
      expect(await createProjectFolder("Orphan", "no-such-folder")).toBeUndefined();
      await renameProjectFolder(sub!.id, "Najdorf");

      const { folders } = await reload();
      expect(folders.map(({ name, parentId }) => ({ name, parentId }))).toEqual([
        { name: "Openings", parentId: null },
        { name: "Najdorf", parentId: top!.id },
      ]);
    });

    it("move anywhere but into their own subtree", async () => {
      const a = (await createProjectFolder("A", null))!;
      const b = (await createProjectFolder("B", a.id))!;
      const c = (await createProjectFolder("C", null))!;
      await moveProjectFolder(a.id, b.id);
      expect(projectFoldersSnapshot()!.find((folder) => folder.id === a.id)!.parentId).toBeNull();
      await moveProjectFolder(b.id, c.id);
      expect(projectFoldersSnapshot()!.find((folder) => folder.id === b.id)!.parentId).toBe(c.id);
      const before = projectFoldersSnapshot();
      await moveProjectFolder(b.id, c.id);
      expect(projectFoldersSnapshot()).toBe(before);
    });

    it("deleted keep what they held one level up — sub-folders and Projects", async () => {
      const a = (await createProjectFolder("A", null))!;
      const b = (await createProjectFolder("B", a.id))!;
      const c = (await createProjectFolder("C", b.id))!;
      const inB = (await createAnalysisProject("In B", b.id))!;
      await addAnalysisCases([aCase("c1", inB.id)]);

      await removeProjectFolder(b.id);
      const { folders, projects, cases } = await reload();
      expect(folders.map((folder) => folder.id)).toEqual([a.id, c.id]);
      expect(folders.find((folder) => folder.id === c.id)!.parentId).toBe(a.id);
      expect(projects.find((project) => project.id === inB.id)!.folderId).toBe(a.id);
      expect(cases.map((record) => record.id)).toEqual(["c1"]);
    });

    it("deleted deep take their subtree, its Projects and their Cases", async () => {
      const a = (await createProjectFolder("A", null))!;
      const b = (await createProjectFolder("B", a.id))!;
      const other = (await createProjectFolder("Other", null))!;
      const inA = (await createAnalysisProject("In A", a.id))!;
      const inB = (await createAnalysisProject("In B", b.id))!;
      const kept = (await createAnalysisProject("Kept", other.id))!;
      await addAnalysisCases([aCase("c1", inA.id), aCase("c2", inB.id), aCase("c3", kept.id)]);

      await removeProjectFolderDeep(a.id);
      const { folders, projects, cases } = await reload();
      expect(folders.map((folder) => folder.id)).toEqual([other.id]);
      expect(projects.map((project) => project.id)).toEqual([kept.id]);
      expect(cases.map((record) => record.id)).toEqual(["c3"]);
    });

    it("deleted deep together — the browser's picks (CTA-191) — take every subtree, unknown ids left alone", async () => {
      const a = (await createProjectFolder("A", null))!;
      const b = (await createProjectFolder("B", a.id))!;
      const c = (await createProjectFolder("C", null))!;
      const other = (await createProjectFolder("Other", null))!;
      const inB = (await createAnalysisProject("In B", b.id))!;
      const inC = (await createAnalysisProject("In C", c.id))!;
      const loose = (await createAnalysisProject("Loose", null))!;
      const kept = (await createAnalysisProject("Kept", null))!;
      await addAnalysisCases([aCase("c1", inB.id), aCase("c2", inC.id), aCase("c3", loose.id), aCase("c4", kept.id)]);

      expect(await removeProjectFoldersDeep([a.id, b.id, c.id, "gone"])).toBeUndefined();
      expect(await removeAnalysisProjects([loose.id, "gone"])).toBeUndefined();
      const { folders, projects, cases } = await reload();
      expect(folders.map((folder) => folder.id)).toEqual([other.id]);
      expect(projects.map((project) => project.id)).toEqual([kept.id]);
      expect(cases.map((record) => record.id)).toEqual(["c4"]);
    });

    it("from an import are all or nothing under the cap", async () => {
      const many = Array.from({ length: 101 }, (_, index) => ({
        id: `f${index}`,
        name: `F${index}`,
        parentId: null,
        savedAt: "",
        updatedAt: "",
      }));
      expect(await addProjectFolders(many)).toBe("too-many");
      expect(await loadProjectFolders()).toEqual([]);
      expect(await addProjectFolders(many.slice(0, 2))).toBeUndefined();
      expect(projectFoldersSnapshot()!.map((folder) => folder.id)).toEqual(["f0", "f1"]);
    });
  });

  describe("Projects", () => {
    it("need a name, and are renamed and moved in place", async () => {
      expect(await createAnalysisProject("  ", null)).toBeUndefined();
      const first = (await createAnalysisProject("First", null))!;
      const second = (await createAnalysisProject("Second", null))!;
      expect(analysisProjectsSnapshot()!.map((project) => project.id)).toEqual([second.id, first.id]);

      await renameAnalysisProject(first.id, "Renamed");
      await moveAnalysisProject(first.id, "f1");
      const before = analysisProjectsSnapshot();
      await renameAnalysisProject(first.id, "Renamed");
      await renameAnalysisProject(first.id, "   ");
      expect(analysisProjectsSnapshot()).toBe(before);

      const { projects } = await reload();
      expect(projects.map(({ id, name, folderId }) => ({ id, name, folderId }))).toEqual([
        { id: second.id, name: "Second", folderId: null },
        { id: first.id, name: "Renamed", folderId: "f1" },
      ]);
    });

    it("are duplicated with their Cases, beside the original", async () => {
      const original = (await createAnalysisProject("Original", "f1"))!;
      await addAnalysisCases([aCase("c1", original.id, "One"), aCase("c2", original.id, "Two")]);

      const copy = (await duplicateAnalysisProject(original.id, "Original (copy)"))!;
      expect(copy).toMatchObject({ name: "Original (copy)", folderId: "f1" });
      expect(copy.id).not.toBe(original.id);

      const { projects, cases } = await reload();
      expect(projects.map((project) => project.id)).toEqual([copy.id, original.id]);
      const copied = cases.filter((record) => record.projectId === copy.id);
      expect(copied.map((record) => record.name)).toEqual(["One", "Two"]);
      expect(copied.every((record) => record.id !== "c1" && record.id !== "c2")).toBe(true);
      expect(cases.filter((record) => record.projectId === original.id)).toHaveLength(2);
    });

    it("deleted take their Cases with them", async () => {
      const gone = (await createAnalysisProject("Gone", null))!;
      const kept = (await createAnalysisProject("Kept", null))!;
      await addAnalysisCases([aCase("c1", gone.id), aCase("c2", kept.id)]);

      await removeAnalysisProject(gone.id);
      const { projects, cases } = await reload();
      expect(projects.map((project) => project.id)).toEqual([kept.id]);
      expect(cases.map((record) => record.id)).toEqual(["c2"]);
    });

    it("from an import replace the ids they bring", async () => {
      const kept = (await createAnalysisProject("Kept", null))!;
      const incoming = { id: kept.id, name: "Imported", folderId: null, createdAt: "", updatedAt: "" };
      expect(await importAnalysisProjects({ add: [incoming], remove: [] })).toBeUndefined();
      expect(analysisProjectsSnapshot()).toEqual([incoming]);
      const before = analysisProjectsSnapshot();
      expect(await importAnalysisProjects({ add: [], remove: ["nothing"] })).toBeUndefined();
      expect(analysisProjectsSnapshot()).toBe(before);
    });
  });

  describe("Cases", () => {
    it("are renamed, moved and duplicated", async () => {
      await addAnalysisCases([aCase("c1", "p1", "Endgame")]);
      await renameAnalysisCase("c1", "  Lucena  ");
      await moveAnalysisCase("c1", "p2");
      const copy = (await duplicateAnalysisCase("c1", "p1", "Lucena (copy)"))!;
      expect(copy).toMatchObject({ projectId: "p1", name: "Lucena (copy)", pgn: aCase("c1", "p1").pgn });

      const { cases } = await reload();
      expect(cases.map(({ id, name, projectId }) => ({ id, name, projectId }))).toEqual([
        { id: copy.id, name: "Lucena (copy)", projectId: "p1" },
        { id: "c1", name: "Lucena", projectId: "p2" },
      ]);
    });

    it("autosave their analysis in place, and the same state again writes nothing", async () => {
      await addAnalysisCases([aCase("c1", "p1"), aCase("c2", "p1")]);
      const state = caseStateOf(emptyTree(FEN), null, "black");
      await saveCaseState("c1", state);
      const before = analysisCasesSnapshot();
      await saveCaseState("c1", state);
      expect(analysisCasesSnapshot()).toBe(before);
      await saveCaseState("gone", state);
      expect(analysisCasesSnapshot()).toBe(before);

      const { cases } = await reload();
      expect(cases.map((record) => record.id)).toEqual(["c1", "c2"]);
      expect(cases[0].orientation).toBe("black");
    });

    it("are deleted by id", async () => {
      await addAnalysisCases([aCase("c1", "p1"), aCase("c2", "p1")]);
      await removeAnalysisCases(["c1", "unknown"]);
      expect(analysisCasesSnapshot()!.map((record) => record.id)).toEqual(["c2"]);
    });

    it("stop at the cap, all or nothing", async () => {
      const many = Array.from({ length: MAX_ANALYSIS_CASES + 1 }, (_, index) => aCase(`c${index}`, "p1"));
      expect(await addAnalysisCases(many)).toBe("too-many");
      expect(await importAnalysisCases({ add: many, remove: [] })).toBe("too-many");
      expect(await loadAnalysisCases()).toEqual([]);
    });

    it("say a refused write, and keep the list as it was", async () => {
      await addAnalysisCases([aCase("c1", "p1")]);
      const before = analysisCasesSnapshot();
      const put = vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
        throw new DOMException("full", "QuotaExceededError");
      });
      try {
        expect(await renameAnalysisCase("c1", "New")).toBe("storage");
      } finally {
        put.mockRestore();
      }
      expect(analysisCasesSnapshot()).toBe(before);
    });
  });

  describe("links between Cases (CTA-188)", () => {
    it("links one Case to another — directed, across Projects, never to itself, never the same pair twice — and unlinks", async () => {
      const p1 = (await createAnalysisProject("One", null))!;
      const p2 = (await createAnalysisProject("Two", null))!;
      await addAnalysisCases([aCase("a", p1.id, "A"), aCase("b", p2.id, "B"), aCase("c", p1.id, "C")]);
      await linkAnalysisCases("a", "b");
      await linkAnalysisCases("c", "a");
      // A cycle is allowed.
      await linkAnalysisCases("b", "a");
      const before = caseLinksSnapshot();
      await linkAnalysisCases("a", "b");
      await linkAnalysisCases("a", "a");
      await addCaseLinks([]);
      expect(caseLinksSnapshot()).toBe(before);

      const ends = caseLinksOf(caseLinksSnapshot()!, analysisCasesSnapshot()!, "a");
      expect(ends.to.map(({ record }) => record.name)).toEqual(["B"]);
      expect(ends.from.map(({ record }) => record.name)).toEqual(["C", "B"]);

      await unlinkAnalysisCases(ends.to[0].link.id);
      resetCaseLinkStore();
      expect((await loadCaseLinks()).map((link) => [link.fromId, link.toId])).toEqual([
        ["c", "a"],
        ["b", "a"],
      ]);
    });

    it("go with either Case — a Case deleted, or its Project — as its jobs do", async () => {
      const p1 = (await createAnalysisProject("One", null))!;
      const p2 = (await createAnalysisProject("Two", null))!;
      await addAnalysisCases([aCase("c1", p1.id), aCase("c2", p2.id), aCase("c3", p2.id)]);
      await addCaseLinks([
        { fromId: "c1", toId: "c2" },
        { fromId: "c3", toId: "c1" },
        { fromId: "c2", toId: "c3" },
      ]);
      const job = jobV2Of("j1", {
        source: { projectId: p1.id, caseId: "c1", name: "x", pgn: "1. e4 e5 *" },
        options: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, outputs: ["light"] },
        preset: { id: "default", name: "Default", values: {} },
        target: { kind: "project", projectId: p1.id },
      })!;
      await addJobV2(job);
      await removeAnalysisCases(["c1"]);
      expect(jobsV2Snapshot()).toEqual([]);
      expect(caseLinksSnapshot()?.map(({ fromId, toId }) => [fromId, toId])).toEqual([["c2", "c3"]]);
      await removeAnalysisProject(p2.id);
      expect(caseLinksSnapshot()).toEqual([]);
      await removeLinksOfCases([]);
    });

    it("imports links: the old ones of the Cases replaced go, a pair already linked or a self-link is skipped", async () => {
      await importCaseLinks({
        add: [
          { id: "l1", fromId: "c1", toId: "c2", createdAt: "" },
          { id: "l2", fromId: "c1", toId: "c2", createdAt: "" },
          { id: "l3", fromId: "c3", toId: "c3", createdAt: "" },
          { id: "l4", fromId: "c2", toId: "c3", createdAt: "" },
        ],
        removeOf: [],
      });
      expect(caseLinksSnapshot()?.map((link) => link.id)).toEqual(["l1", "l4"]);
      await importCaseLinks({ add: [{ id: "l5", fromId: "c3", toId: "c1", createdAt: "" }], removeOf: ["c2"] });
      expect(caseLinksSnapshot()?.map((link) => link.id)).toEqual(["l5"]);
    });
  });

  describe("a Project's order (CTA-203)", () => {
    /** The Project's Cases in its order, each `id:order`. */
    const line = (projectId: string, cases = analysisCasesSnapshot()!) =>
      casesInOrder(cases, projectId).map((record) => `${record.id}:${record.order}`);

    it("puts every new Case last — added, moved in, duplicated — and closes the gap one leaves", async () => {
      const p1 = (await createAnalysisProject("One", null))!;
      const p2 = (await createAnalysisProject("Two", null))!;
      await addAnalysisCases([aCase("a", p1.id), aCase("b", p1.id)]);
      await addAnalysisCases([aCase("c", p1.id), aCase("x", p2.id)]);
      expect(line(p1.id)).toEqual(["a:1", "b:2", "c:3"]);

      await moveAnalysisCase("a", p2.id);
      expect(line(p1.id)).toEqual(["b:1", "c:2"]);
      expect(line(p2.id)).toEqual(["x:1", "a:2"]);

      const copy = (await duplicateAnalysisCase("b", p1.id, "B (copy)"))!;
      expect(line(p1.id)).toEqual(["b:1", "c:2", `${copy.id}:3`]);

      await removeAnalysisCases(["b"]);
      expect(line(p1.id)).toEqual(["c:1", `${copy.id}:2`]);
      const { cases } = await reload();
      expect(line(p1.id, cases)).toEqual(["c:1", `${copy.id}:2`]);
    });

    it("moves a Case up, down, to the top and to the bottom — across pages, kept across a reload, no date touched", async () => {
      const p1 = (await createAnalysisProject("Tutorial", null))!;
      await addAnalysisCases(Array.from({ length: 30 }, (_, index) => aCase(`c${index + 1}`, p1.id)));
      const dates = analysisCasesSnapshot()!.map((record) => record.updatedAt);

      // c26 is on the second page of 25; its top is the first page's first row.
      await moveAnalysisCaseInOrder("c26", "top");
      expect(line(p1.id).slice(0, 2)).toEqual(["c26:1", "c1:2"]);
      await moveAnalysisCaseInOrder("c1", "bottom");
      expect(line(p1.id).slice(-2)).toEqual(["c30:29", "c1:30"]);
      await moveAnalysisCaseInOrder("c2", "up");
      expect(line(p1.id).slice(0, 3)).toEqual(["c2:1", "c26:2", "c3:3"]);
      await moveAnalysisCaseInOrder("c2", "down");
      expect(line(p1.id).slice(0, 3)).toEqual(["c26:1", "c2:2", "c3:3"]);

      // Past an end, or an unknown Case: nothing written.
      const before = analysisCasesSnapshot();
      await moveAnalysisCaseInOrder("c26", "up");
      await moveAnalysisCaseInOrder("c26", "top");
      await moveAnalysisCaseInOrder("c1", "down");
      await moveAnalysisCaseInOrder("c1", "bottom");
      await moveAnalysisCaseInOrder("gone", "up");
      expect(analysisCasesSnapshot()).toBe(before);

      expect(analysisCasesSnapshot()!.map((record) => record.updatedAt)).toEqual(dates);
      const { cases } = await reload();
      expect(line(p1.id, cases)).toEqual(line(p1.id, before));
    });

    it("gives the Cases stored before their place by date as it reads them, and writes it back", async () => {
      const db = await openAnalysisProjectsDb();
      const put = db.transaction(CASES_STORE, "readwrite");
      // A record from before the order: no `order` at all.
      const old = (id: string, projectId: string, day: number): Partial<AnalysisCase> => {
        const record: Partial<AnalysisCase> = { ...aCase(id, projectId), createdAt: `2026-01-0${day}T10:00:00.000Z` };
        delete record.order;
        return record;
      };
      put.objectStore(CASES_STORE).put({ id: "b", seq: 3, value: old("b", "p1", 2) });
      put.objectStore(CASES_STORE).put({ id: "c", seq: 2, value: old("c", "p1", 3) });
      put.objectStore(CASES_STORE).put({ id: "a", seq: 1, value: old("a", "p1", 1) });
      put.objectStore(CASES_STORE).put({ id: "x", seq: 4, value: old("x", "p2", 1) });
      await committed(put);
      resetAnalysisCaseStore();

      expect(line("p1", await loadAnalysisCases())).toEqual(["a:1", "b:2", "c:3"]);
      expect(line("p2")).toEqual(["x:1"]);
      // Written back: the stored rows hold it, and a new Case goes after them.
      const stored = await done(db.transaction(CASES_STORE).objectStore(CASES_STORE).get("c"));
      expect((stored as { value: { order: number } }).value.order).toBe(3);
      await addAnalysisCases([aCase("d", "p1")]);
      const { cases } = await reload();
      expect(line("p1", cases)).toEqual(["a:1", "b:2", "c:3", "d:4"]);
    });

    it("imports the zip's order into a Project it fills, puts it last in one that keeps Cases, and dates an older zip's", async () => {
      await addAnalysisCases([aCase("kept1", "merge"), aCase("kept2", "merge")]);
      const placed = (id: string, projectId: string, order: number): AnalysisCase => ({ ...aCase(id, projectId), order });
      await importAnalysisCases({
        add: [
          placed("z2", "fresh", 2),
          placed("z1", "fresh", 1),
          placed("m2", "merge", 2),
          placed("m1", "merge", 1),
          { ...aCase("o2", "older"), createdAt: "2026-01-02T00:00:00.000Z" },
          { ...aCase("o1", "older"), createdAt: "2026-01-01T00:00:00.000Z" },
        ],
        remove: [],
      });
      expect(line("fresh")).toEqual(["z1:1", "z2:2"]);
      expect(line("merge")).toEqual(["kept1:1", "kept2:2", "m1:3", "m2:4"]);
      expect(line("older")).toEqual(["o1:1", "o2:2"]);
    });

    it("duplicates a Project with its Cases in their order", async () => {
      const p1 = (await createAnalysisProject("One", null))!;
      await addAnalysisCases([aCase("a", p1.id, "A"), aCase("b", p1.id, "B"), aCase("c", p1.id, "C")]);
      await moveAnalysisCaseInOrder("c", "top");
      const copy = (await duplicateAnalysisProject(p1.id, "Copy"))!;
      const names = casesInOrder(analysisCasesSnapshot()!, copy.id).map((record) => `${record.name}:${record.order}`);
      expect(names).toEqual(["C:1", "A:2", "B:3"]);
    });
  });

  describe("the database's version 3 (CTA-188)", () => {
    /** Forget every store's read and the database, then open it raw at `version` with `stores`, a row in each of the first three. */
    const seedRaw = async (version: number, stores: readonly string[]) => {
      await deleteAnalysisProjectsDb();
      resetProjectFolderStore();
      resetAnalysisProjectStore();
      resetAnalysisCaseStore();
      resetJobV2Store();
      resetCaseLinkStore();
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open(ANALYSIS_PROJECTS_DB_NAME, version);
        open.onupgradeneeded = () => {
          for (const store of stores) open.result.createObjectStore(store, { keyPath: "id" });
        };
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      const tx = db.transaction(["folders", "projects", "cases"], "readwrite");
      tx.objectStore("folders").put({ id: "f", seq: 1, value: { id: "f", name: "Folder", parentId: null, savedAt: "", updatedAt: "" } });
      tx.objectStore("projects").put({ id: "p", seq: 1, value: { id: "p", name: "Project", folderId: "f", createdAt: "", updatedAt: "" } });
      tx.objectStore("cases").put({ id: "c", seq: 1, value: { ...aCase("c", "p"), merges: undefined } });
      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve();
      });
      db.close();
    };

    const expectKept = async () => {
      expect((await loadProjectFolders()).map((folder) => folder.id)).toEqual(["f"]);
      expect((await loadAnalysisProjects()).map((project) => project.id)).toEqual(["p"]);
      const cases = await loadAnalysisCases();
      expect(cases.map((record) => record.id)).toEqual(["c"]);
      // A Case from before reads as holding no merge.
      expect(cases[0].merges).toEqual([]);
      expect(await loadJobsV2()).toEqual([]);
      expect(await loadCaseLinks()).toEqual([]);
      expect(await linkAnalysisCases("c", "d")).toBeUndefined();
    };

    it("upgrades version 1 — as CTA-186 shipped it — keeping every folder, Project and Case, and adds the jobs and the Case links", async () => {
      await seedRaw(1, ["folders", "projects", "cases"]);
      await expectKept();
    });

    it("upgrades version 2 — CTA-188's branch, its Project links' store left unread — the same way", async () => {
      await seedRaw(2, ["folders", "projects", "cases", "jobs", "projectLinks"]);
      await expectKept();
    });
  });
});
