import { describe, expect, it } from "vitest";

import type { TreeNode } from "../../../design-system/patterns/trees";
import { ancestorsOf } from "../../../design-system/patterns/trees";
import { ANALYSES_TREE_MORE, ANALYSES_TREE_PAGE, analysesTreeNodes, type AnalysesTreeNodesInput } from "./analysesTreeNodes";
import { FOLDERS, LABELS, MANY_ROWS, ROWS, UPDATED_NEWEST_FIRST } from "./fixtures";

const nodes = (patch: Partial<AnalysesTreeNodesInput> = {}) =>
  analysesTreeNodes({
    folders: FOLDERS,
    rootId: null,
    rows: ROWS,
    text: "",
    sort: UPDATED_NEWEST_FIRST,
    currentId: "a4",
    locked: false,
    linkOf: (row) => ({ href: `#${row.id}` }),
    labels: LABELS,
    ...patch,
  });

const ids = (list: readonly TreeNode[] | undefined) => (list ?? []).map((node) => node.id);

describe("analysesTreeNodes", () => {
  it("nests the folders, the analyses after the sub-folders, the Unfiled ones after the top-level folders", () => {
    const tree = nodes();
    // Folders by name (the table's Name rule under an Updated sort too): Chess basics, Not yet filled, Openings — then Unfiled, newest first.
    expect(ids(tree)).toEqual(["gtutorial", "gempty", "gopenings", "a8", "a7"]);
    const tutorial = tree[0];
    expect(ids(tutorial.children)).toEqual(["gendings", "a2", "a1"]);
    const endings = tutorial.children?.[0];
    expect(ids(endings?.children)).toEqual(["grook", "a3"]);
    expect(ids(endings?.children?.[0].children)).toEqual(["a5", "a4"]);
  });

  it("counts everything under a folder", () => {
    const tree = nodes();
    expect(tree[0].secondary).toBe(5);
    expect(tree[0].children?.[0].secondary).toBe(3);
    expect(tree[1].secondary).toBe(0);
  });

  it("links each analysis, names an unnamed one by the generic and leaves branches no link", () => {
    const tree = nodes();
    const unnamed = tree.find((node) => node.id === "a8");
    expect(unnamed).toMatchObject({ label: LABELS.untitled, link: { href: "#a8" }, dir: "auto" });
    expect(tree[0].link).toBeUndefined();
  });

  it("follows the table's sort for the analyses", () => {
    const tree = nodes({ sort: { column: "updated", direction: "asc" } });
    expect(ids(tree[0].children)).toEqual(["gendings", "a1", "a2"]);
    expect(ids(tree)).toEqual(["gtutorial", "gempty", "gopenings", "a7", "a8"]);
  });

  it("is rooted at a folder: its contents are the top rows, nothing outside it, no Unfiled", () => {
    const tree = nodes({ rootId: "gendings" });
    expect(ids(tree)).toEqual(["grook", "a3"]);
    expect(ids(nodes({ rootId: "gempty" }))).toEqual([]);
  });

  it("disables every analysis but the current one, and links them nowhere, while locked", () => {
    const tree = nodes({ locked: true, rootId: "gendings" });
    const rook = tree[0].children ?? [];
    const lucena = rook.find((node) => node.id === "a4");
    const philidor = rook.find((node) => node.id === "a5");
    expect(lucena?.disabled).toBeUndefined();
    expect(lucena?.link).toEqual({ href: "#a4" });
    expect(philidor).toMatchObject({ disabled: true });
    expect(philidor?.link).toBeUndefined();
    // A folder still opens.
    expect(tree[0].disabled).toBeUndefined();
  });

  it("lists a page of a long folder and a show-more row for the rest", () => {
    // m27 is the newest of the 300: the first row.
    const tree = nodes({ rows: MANY_ROWS, currentId: "m27" });
    const openings = tree.find((node) => node.id === "gopenings");
    expect(openings?.children).toHaveLength(ANALYSES_TREE_PAGE + 1);
    expect(openings?.children?.at(-1)).toMatchObject({ id: `${ANALYSES_TREE_MORE}gopenings`, label: "Show 200 more" });
    expect(openings?.secondary).toBe(300);
  });

  it("lists more once asked", () => {
    const more = nodes({ rows: MANY_ROWS, currentId: "m27", shown: new Map([["gopenings", 250]]) });
    const openings = more.find((node) => node.id === "gopenings");
    expect(openings?.children).toHaveLength(251);
    expect(openings?.children?.at(-1)).toMatchObject({ label: "Show 50 more" });
  });

  it("always lists up to the current analysis, wherever the page ends", () => {
    // m0 is far down the folder's order: everything above it is listed so it is in the tree.
    const deep = nodes({ rows: MANY_ROWS, currentId: "m0" });
    const listed = ids(deep.find((node) => node.id === "gopenings")?.children);
    expect(listed).toContain("m0");
    expect(listed.length).toBeGreaterThan(ANALYSES_TREE_PAGE);
  });

  describe("narrowed by words", () => {
    it("keeps the analyses holding every word, and only the folders above them", () => {
      const tree = nodes({ text: "lucena" });
      expect(ids(tree)).toEqual(["gtutorial"]);
      expect(ids(tree[0].children)).toEqual(["gendings"]);
      expect(ids(tree[0].children?.[0].children)).toEqual(["grook"]);
      expect(ids(tree[0].children?.[0].children?.[0].children)).toEqual(["a4"]);
      // Counts are the matches.
      expect(tree[0].secondary).toBe(1);
    });

    it("keeps every word of a search together on one analysis — case aside", () => {
      expect(ids(nodes({ text: "NAJDORF poisoned" }).flatMap((node) => node.children ?? []))).toEqual(["a6"]);
      expect(nodes({ text: "najdorf lucena" })).toEqual([]);
    });

    it("keeps a folder whose name matches with everything in it", () => {
      const tree = nodes({ text: "rook" });
      expect(ids(tree)).toEqual(["gtutorial"]);
      const rook = tree[0].children?.[0].children?.[0];
      expect(rook?.id).toBe("grook");
      expect(ids(rook?.children)).toEqual(["a5", "a4"]);
      // …and the analyses whose own name matches stay, in their folder.
      expect(ids(nodes({ text: "centre" }).flatMap((node) => node.children ?? []))).toEqual(["a2", "a1"]);
    });

    it("lists the Unfiled analyses that match, and none when rooted at a folder", () => {
      expect(ids(nodes({ text: "מלכודת" }))).toEqual(["a7"]);
      expect(nodes({ text: "מלכודת", rootId: "gendings" })).toEqual([]);
    });

    it("is nothing when nothing matches, and everything for blank words", () => {
      expect(nodes({ text: "zugzwang" })).toEqual([]);
      expect(ids(nodes({ text: "   " }))).toEqual(ids(nodes()));
    });
  });

  it("reads a folder naming a missing parent as top level, and does not hang on a cycle", () => {
    const at = "2026-09-28T12:00:00.000Z";
    const folder = (id: string, parentId: string | null) => ({ id, name: id, parentId, savedAt: at, updatedAt: at });
    const tree = nodes({
      folders: [folder("lost", "gone"), folder("self", "self"), folder("loop-a", "loop-b"), folder("loop-b", "loop-a")],
      rows: [],
    });
    // The model never reaches a folder only a cycle holds; the orphan and the self-parented one are top level.
    expect(ids(tree)).toEqual(["lost", "self"]);
  });

  it("puts the analysis on the board under the branches ancestorsOf opens", () => {
    expect(ancestorsOf(nodes(), "a4")).toEqual(["gtutorial", "gendings", "grook"]);
  });
});
