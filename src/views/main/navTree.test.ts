import { describe, expect, it } from "vitest";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import { TreeManager } from "../../lib/treeManager";
import {
  buildNavTree,
  collapseLeafCategories,
  folderChain,
  folderPath,
  foldSingleEntryFolders,
  navLabelKeys,
  navTree,
  type NavTreeNode,
} from "./navTree";
import { navItems, navItemsInFolder } from "./navItems";
import { navFolders } from "./navFolders";

describe("the shipped nav tree", () => {
  it("mirrors the folder tree at the top, a single-entry folder as its screen", () => {
    const tree = navTree();
    const folders = navFolders();

    expect(tree).toHaveLength(folders.length);
    for (const [index, folder] of folders.entries()) {
      const node = tree[index];
      if (folder.singleEntry) {
        // One destination: the row is the folder's single screen, under the
        // folder's own name — not the screen's own label.
        const item = navItemsInFolder(folder.id)[0];
        expect(node.kind).toBe("screen");
        expect(node.to).toBe(item.to);
        expect(node.labelKey).toBe(folder.labelKey);
      } else {
        expect(node.kind).toBe("folder");
        expect(node.id).toBe(folder.id);
      }
    }

    // Every screen is still reachable — the folded one included.
    const screens = new TreeManager<NavTreeNode>(tree)
      .toArray()
      .filter((node) => node.kind === "screen");
    expect(screens.map((node) => node.to)).toEqual(navItems().map((i) => i.to));
  });

  it("files every screen under the folder it names", () => {
    const raw = buildNavTree(navFolders(), navItemsInFolder);

    for (const item of navItems()) {
      /*
        In the raw tree every screen still sits directly under the folder it
        names — that is the registration contract, unchanged.
      */
      const registered = folderPath(item.to, raw);
      expect(registered.length).toBeGreaterThan(0);
      expect(registered.at(-1)).toBe(item.folder);

      /*
        The rendered tree folds a redundant leaf-category folder away, so a
        screen that named one now hangs one level up. The breadcrumb is then a
        *prefix* of the registered chain — never empty, never a different
        branch. A screen filed under a single-entry folder is the one
        exception: folded to the top level, it has no breadcrumb at all — the
        row *is* the top level, and no chain has to open for it.
      */
      const rendered = folderPath(item.to);
      const singleEntryParent = navFolders().find(
        (folder) => folder.singleEntry && folder.id === item.folder,
      );
      if (singleEntryParent !== undefined) {
        expect(rendered).toEqual([]);
      } else {
        expect(rendered.length).toBeGreaterThan(0);
        expect(registered.slice(0, rendered.length)).toEqual(rendered);
      }
    }
  });

  it("files the Lobby and Masked Pieces in the Engine folder (CTA-79, CTA-82)", () => {
    expect(navItemsInFolder("engine").map((item) => item.to)).toEqual([
      "/engine/games",
      "/engine/masked",
    ]);
    expect(navItemsInFolder("engine")[0].labelKey).toBe("nav.lobby");
    // Play with Engine has no entry: the Lobby's Start button reaches it, and
    // its route is no screen of the tree, so it opens no chain of its own.
    expect(navItems().map((item) => item.to)).not.toContain("/engine/play");
    expect(folderPath("/engine/play")).toEqual([]);
    // Its old folder and route are gone, with no redirect.
    expect(navFolders().map((folder) => folder.id)).not.toContain("masked-pieces");
    expect(folderPath("/masked/play")).toEqual([]);
  });

  it("draws Analysis as one row to the Projects lobby, after the Library — shipped, not a dev-only spread (CTA-192, CTA-227)", () => {
    const ids = navFolders().map((folder) => folder.id);
    expect(ids.indexOf("analysis-v2")).toBe(ids.indexOf("library") + 1);
    const analysis = navFolders().find((folder) => folder.id === "analysis-v2");
    expect(analysis?.singleEntry).toBe(true);
    expect(analysis?.labelKey).toBe("nav.folders.analysisV2");
    expect(navItemsInFolder("analysis-v2").map((item) => [item.to, item.labelKey])).toEqual([["/analysis", "nav.analysisProjects"]]);
    // Folded to one top-level screen row, named by the folder, with its icon,
    // right after the Library — no folder to open, no nested "Projects".
    const tree = navTree();
    const library = tree.findIndex((node) => node.kind === "folder" && node.id === "library");
    expect(tree[library + 1]).toMatchObject({
      kind: "screen",
      to: "/analysis",
      labelKey: "nav.folders.analysisV2",
      icon: analysis?.icon,
    });
    expect(tree[library + 1].children).toBeUndefined();
    expect(folderPath("/analysis")).toEqual([]);
    // The legacy Analyses folder went with its screens.
    expect(ids).not.toContain("analysis");
  });

  it("draws Jobs as one row to every job, after Analysis — the Jobs settings off the sidebar (CTA-221, CTA-228)", () => {
    const ids = navFolders().map((folder) => folder.id);
    expect(ids.indexOf("jobs")).toBe(ids.indexOf("analysis-v2") + 1);
    const jobs = navFolders().find((folder) => folder.id === "jobs");
    expect(jobs?.singleEntry).toBe(true);
    expect(jobs?.labelKey).toBe("nav.folders.jobs");
    expect(navItemsInFolder("jobs").map((item) => [item.to, item.labelKey])).toEqual([["/jobs", "nav.jobs"]]);
    // Folded to one top-level screen row, named by the folder, with its icon,
    // right after Analysis's — no folder to open, no nested "Settings".
    const tree = navTree();
    const analysis = tree.findIndex((node) => node.to === "/analysis");
    expect(tree[analysis + 1]).toMatchObject({
      kind: "screen",
      to: "/jobs",
      labelKey: "nav.folders.jobs",
      icon: jobs?.icon,
    });
    expect(tree[analysis + 1].children).toBeUndefined();
    expect(folderPath("/jobs")).toEqual([]);
    // The Jobs settings are the Jobs screen's to reach, not a sidebar row's.
    expect(folderPath("/jobs/settings")).toEqual([]);
    expect(navItems().map((item) => item.to)).not.toContain("/jobs/settings");
    // Jobs V2's address is no screen's.
    expect(folderPath("/analysis/jobs")).toEqual([]);
  });

  it("files Export, Import, Storage, Appearance and Engine in a Settings folder, a folder rather than a single entry (CTA-86, CTA-89, CTA-94, CTA-107, CTA-153)", () => {
    const settings = navFolders().find((folder) => folder.id === "settings");
    expect(settings).toMatchObject({ labelKey: "nav.folders.settings" });
    expect(settings?.singleEntry).toBeFalsy();
    // Pinned to the sidebar's foot, and the flag reaches the rendered tree.
    expect(settings?.pinToBottom).toBe(true);
    expect(navTree().find((node) => node.id === "settings")?.pinToBottom).toBe(true);
    expect(navTree().filter((node) => node.pinToBottom).map((node) => node.id)).toEqual(["settings"]);
    expect(navItemsInFolder("settings").map((item) => [item.to, item.labelKey])).toEqual([
      ["/settings/export", "nav.settingsExport"],
      ["/settings/import", "nav.settingsImport"],
      ["/settings/storage", "nav.settingsStorage"],
      ["/settings/appearance", "nav.settingsAppearance"],
      ["/settings/engine", "nav.settingsEngine"],
      ["/settings/support", "nav.settingsSupport"],
    ]);
    expect(folderPath("/settings/export")).toEqual(["settings"]);
    expect(folderPath("/settings/import")).toEqual(["settings"]);
    expect(folderPath("/settings/storage")).toEqual(["settings"]);
    expect(folderPath("/settings/appearance")).toEqual(["settings"]);
    expect(folderPath("/settings/engine")).toEqual(["settings"]);
    expect(folderPath("/settings/support")).toEqual(["settings"]);
  });

  it("returns an empty breadcrumb for a path that is not a screen", () => {
    expect(folderPath("/nope")).toEqual([]);
    expect(folderPath("")).toEqual([]);
  });

  it("lists every label key the sidebar renders, folders and screens alike", () => {
    /*
      Only the nodes whose name *is* a catalog key. A node named by data has
      none — reporting a stand-in key for one would make `locales.test.ts`
      demand a catalog entry that must not exist.
    */
    const authoredKeys = [
      ...navFolders().map((f) => f.labelKey),
      /*
        A screen filed under a single-entry folder renders under the
        *folder's* name (`foldSingleEntryFolders`), so its own key is declared
        but never rendered — the one screen whose key the tree drops.
      */
      ...navItems()
        .filter(
          (item) =>
            !navFolders().some((f) => f.singleEntry && f.id === item.folder),
        )
        .map((i) => i.labelKey),
    ].filter((key) => key !== undefined);

    expect(navLabelKeys()).toEqual(expect.arrayContaining(authoredKeys));
    expect(navLabelKeys().every((key) => typeof key === "string")).toBe(true);
  });

  it("names every shipped node by a catalog key — but the Blog's, named by its registry in both languages", () => {
    // The Blog's folders and articles (CTA-126) are named by
    // `views/blog/articles.ts`, as data — so they must carry every language
    // themselves; every other node is a catalog key `locales.test.ts` covers.
    const dataNamed = new TreeManager<NavTreeNode>(navTree())
      .toArray()
      .filter((node) => node.labelKey === undefined);

    expect(dataNamed.length).toBeGreaterThan(0);
    for (const node of dataNamed) {
      const inBlog = node.kind === "screen" ? node.to?.startsWith("/blog/") : node.id.startsWith("blog/");
      expect(inBlog, `${node.id} is named by data`).toBe(true);
      expect(node.label?.en, `${node.id} in English`).toBeTruthy();
      // A draft (CTA-135, listed in yarn dev only) may wait for its translation — the fixture one does, on purpose.
      if (node.draft !== true) expect(node.label?.he, `${node.id} in Hebrew`).toBeTruthy();
    }
  });
});

describe("buildNavTree nests folders to any depth", () => {
  /*
    A folder holding a sub-folder *and* screens of its own, three levels deep —
    deeper than anything shipped. No cast anywhere: the builder is generic in
    the folder id, so a fixture nests ids of its own without pretending to be a
    `NavFolderId`. Nesting is a data edit; the builder is untouched.
  */
  const icon = GridViewRoundedIcon;
  const nested = [
    {
      id: "outer",
      labelKey: "outer",
      icon,
      children: [
        {
          id: "inner",
          labelKey: "inner",
          icon,
          children: [{ id: "deepest", labelKey: "deepest", icon }],
        },
      ],
    },
    { id: "sibling", labelKey: "sibling", icon },
  ] as const;

  const screensOf = (id: string) =>
    ({
      outer: [
        { to: "/a", labelKey: "a", icon },
        { to: "/b", labelKey: "b", icon },
      ],
      inner: [{ to: "/c", labelKey: "c", icon }],
      deepest: [{ to: "/d", labelKey: "d", icon }],
    })[id] ?? [];

  const tree = buildNavTree(nested, screensOf);

  it("puts sub-folders before the folder's own screens", () => {
    expect(tree[0].children?.map((n) => `${n.kind}:${n.id}`)).toEqual([
      "folder:inner",
      "screen:/a",
      "screen:/b",
    ]);
  });

  it("attaches each screen under the folder that names it, at every level", () => {
    const inner = tree[0].children?.[0] as NavTreeNode;
    expect(inner.children?.map((n) => n.to)).toEqual([undefined, "/c"]);

    const deepest = inner.children?.[0] as NavTreeNode;
    expect(deepest.children?.map((n) => n.to)).toEqual(["/d"]);
  });

  it("yields the full folder breadcrumb three levels down", () => {
    expect(folderPath("/d", tree)).toEqual(["outer", "inner", "deepest"]);
    expect(folderPath("/a", tree)).toEqual(["outer"]);
  });

  it("yields a folder's own ancestor chain, itself included", () => {
    // What the sidebar opens when a folder is clicked: the folders it lives in
    // come with it, or it would open inside a shut parent.
    expect(folderChain("deepest", tree)).toEqual(["outer", "inner", "deepest"]);
    expect(folderChain("outer", tree)).toEqual(["outer"]);
    expect(folderChain("sibling", tree)).toEqual(["sibling"]);
    // A screen is not a folder, and neither is an id that is not in the tree.
    expect(folderChain("/d", tree)).toEqual([]);
    expect(folderChain("nope", tree)).toEqual([]);
  });

  it("walks every level depth-first, parent before children", () => {
    expect(
      new TreeManager<NavTreeNode>(tree)
        .toArray()
        .map((node) => `${node.kind}:${node.id}`),
    ).toEqual([
      "folder:outer",
      "folder:inner",
      "folder:deepest",
      "screen:/d",
      "screen:/c",
      "screen:/a",
      "screen:/b",
      "folder:sibling",
    ]);
  });

  it("is pure — the same input builds an equal tree and mutates nothing", () => {
    const again = buildNavTree(nested, screensOf as never);
    expect(again).toEqual(tree);
    expect(again).not.toBe(tree);
    expect(nested[0].children?.[0].id).toBe("inner");
  });
});

describe("collapseLeafCategories folds a redundant category folder", () => {
  const icon = GridViewRoundedIcon;

  /*
    Every shape the fold has to tell apart, one level down from a section root:

    - `leaf`   — a folder with one screen and nothing else → becomes the screen
    - `group`  — a folder with several screens (a multi-file PGN group, once its
                 own leaf children have folded) → stays a folder
    - `parent` — a folder with a sub-folder *and* its own list screen → stays a
                 folder, and the sub-folder folds inside it
  */
  const section: NavTreeNode = {
    kind: "folder",
    id: "section",
    label: { en: "Section" },
    icon,
    children: [
      {
        kind: "folder",
        id: "section:leaf",
        label: { en: "Leaf" },
        icon,
        children: [
          { kind: "screen", id: "/s/leaf", label: { en: "Leaf" }, icon, to: "/s/leaf" },
        ],
      },
      {
        kind: "folder",
        id: "section:group",
        label: { en: "Group" },
        icon,
        children: [
          {
            kind: "folder",
            id: "section:group/a",
            label: { en: "A" },
            icon,
            children: [
              { kind: "screen", id: "/s/group/a", label: { en: "A" }, icon, to: "/s/group/a" },
            ],
          },
          { kind: "screen", id: "/s/group/b", label: { en: "B" }, icon, to: "/s/group/b" },
        ],
      },
      {
        kind: "folder",
        id: "section:parent",
        label: { en: "Parent" },
        icon,
        children: [
          {
            kind: "folder",
            id: "section:parent/child",
            label: { en: "Child" },
            icon,
            children: [
              { kind: "screen", id: "/s/parent/child", label: { en: "Child" }, icon, to: "/s/parent/child" },
            ],
          },
          { kind: "screen", id: "/s/parent", label: { en: "Parent" }, icon, to: "/s/parent" },
        ],
      },
    ],
  };

  const folded = collapseLeafCategories([section])[0];

  it("keeps the section root a folder and folds its leaf child to a screen", () => {
    expect(folded.kind).toBe("folder");
    const [leaf] = folded.children ?? [];
    expect(leaf).toMatchObject({ kind: "screen", to: "/s/leaf" });
  });

  it("keeps a folder that still holds more than one child", () => {
    const group = folded.children?.find((n) => n.id === "section:group");
    expect(group?.kind).toBe("folder");
    // Its own leaf child folded, so it now lists two screens.
    expect(group?.children?.map((n) => `${n.kind}:${n.to}`)).toEqual([
      "screen:/s/group/a",
      "screen:/s/group/b",
    ]);
  });

  it("keeps a parent that has a sub-folder alongside its own screen", () => {
    const parent = folded.children?.find((n) => n.id === "section:parent");
    expect(parent?.kind).toBe("folder");
    expect(parent?.children?.map((n) => `${n.kind}:${n.id}`)).toEqual([
      // the sub-folder folded to its screen, the parent's own screen stays
      "screen:/s/parent/child",
      "screen:/s/parent",
    ]);
  });

  it("never folds a top-level folder, even one holding a single screen", () => {
    const top: NavTreeNode = {
      kind: "folder",
      id: "top",
      labelKey: "top",
      icon,
      children: [
        { kind: "screen", id: "/only", labelKey: "only", icon, to: "/only" },
      ],
    };
    expect(collapseLeafCategories([top])[0]).toMatchObject({
      kind: "folder",
      id: "top",
    });
  });

  it("never folds a folder marked keepFolder — one screen in it or not", () => {
    const top: NavTreeNode = {
      kind: "folder",
      id: "top",
      labelKey: "top",
      icon,
      children: [
        {
          kind: "folder",
          id: "top/kept",
          label: { en: "Kept" },
          icon,
          keepFolder: true,
          children: [{ kind: "screen", id: "/kept/only", label: { en: "Only" }, icon, to: "/kept/only" }],
        },
      ],
    };
    expect(collapseLeafCategories([top])[0].children?.[0]).toMatchObject({
      kind: "folder",
      id: "top/kept",
      children: [{ kind: "screen", to: "/kept/only" }],
    });
  });

  it("keeps every Blog folder a folder — Guides among them", () => {
    // A folder of one stays one too (the test above); Guides is not always that small, drafts counted.
    const blog = navTree().find((node) => node.id === "blog");
    const guides = blog?.children?.find((node) => node.id === "blog/guides");
    expect(guides).toMatchObject({ kind: "folder", keepFolder: true });
    expect(guides?.children?.map((node) => node.to)).toContain("/blog/guides/local-engine");
  });
});

describe("foldSingleEntryFolders folds a folder marked as one destination", () => {
  const icon = GridViewRoundedIcon;

  it("renders the folder as its single screen, under the folder's own name", () => {
    const folder: NavTreeNode = {
      kind: "folder",
      id: "openings",
      labelKey: "nav.folders.openings",
      icon,
      singleEntry: true,
      children: [
        {
          kind: "screen",
          id: "/openings",
          labelKey: "nav.openings",
          icon,
          to: "/openings",
        },
      ],
    };

    const [folded] = foldSingleEntryFolders([folder]);

    // The row is the screen — the folder's name and icon, the screen's route.
    // A screen node's active state is an exact pathname match and it has no
    // folder ancestors, so it lights up with nothing opened.
    expect(folded).toEqual({
      kind: "screen",
      id: "/openings",
      labelKey: "nav.folders.openings",
      icon,
      to: "/openings",
    });
  });

  it("keeps a single-entry folder that does not hold exactly one screen", () => {
    // The flag says "one destination"; a folder that does not match stays a
    // folder with the flag inert — the same way a mis-shaped leaf category is.
    const twoScreens: NavTreeNode = {
      kind: "folder",
      id: "two",
      labelKey: "two",
      icon,
      singleEntry: true,
      children: [
        { kind: "screen", id: "/a", labelKey: "a", icon, to: "/a" },
        { kind: "screen", id: "/b", labelKey: "b", icon, to: "/b" },
      ],
    };
    const withSubFolder: NavTreeNode = {
      kind: "folder",
      id: "with-sub",
      labelKey: "with-sub",
      icon,
      singleEntry: true,
      children: [
        {
          kind: "folder",
          id: "with-sub/inner",
          labelKey: "inner",
          icon,
          children: [{ kind: "screen", id: "/c", labelKey: "c", icon, to: "/c" }],
        },
      ],
    };

    const folded = foldSingleEntryFolders([twoScreens, withSubFolder]);
    expect(folded[0]).toEqual(twoScreens);
    expect(folded[1]).toEqual(withSubFolder);
  });

  it("never folds below the top level — the leaf fold's rule is the other one", () => {
    const nested: NavTreeNode = {
      kind: "folder",
      id: "outer",
      labelKey: "outer",
      icon,
      children: [
        {
          kind: "folder",
          id: "outer/inner",
          labelKey: "inner",
          icon,
          singleEntry: true,
          children: [{ kind: "screen", id: "/d", labelKey: "d", icon, to: "/d" }],
        },
      ],
    };

    // The inner folder carries the flag, but the fold does not reach it.
    expect(foldSingleEntryFolders([nested])[0]).toEqual(nested);
  });
});

describe("the Accuracy Trainer folder (CTA-238)", () => {
  it("is a dev-only folder of its own, after the Engine, holding Find Best Move v1 and v2 — each marked experimental", () => {
    // A dev-only spread (`import.meta.env.DEV`): the tests run as dev.
    const ids = navFolders().map((folder) => folder.id);
    expect(ids.indexOf("accuracy-trainer")).toBe(ids.indexOf("engine") + 1);
    expect(navFolders().find((folder) => folder.id === "accuracy-trainer")?.labelKey).toBe("nav.folders.accuracyTrainer");
    expect(navItemsInFolder("accuracy-trainer")).toEqual([
      expect.objectContaining({ to: "/accuracy-trainer/find-best-move-v1", labelKey: "nav.findBestMoveV1", experimental: true }),
      expect.objectContaining({ to: "/accuracy-trainer/find-best-move-v2", labelKey: "nav.findBestMoveV2", experimental: true }),
    ]);
    const folder = navTree().find((node) => node.id === "accuracy-trainer");
    expect(folder?.kind).toBe("folder");
    expect(folder?.children?.map((child) => child.to)).toEqual([
      "/accuracy-trainer/find-best-move-v1",
      "/accuracy-trainer/find-best-move-v2",
    ]);
    expect(folderPath("/accuracy-trainer/find-best-move-v1")).toEqual(["accuracy-trainer"]);
  });
});
