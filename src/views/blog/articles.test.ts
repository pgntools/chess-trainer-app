import { describe, expect, it } from "vitest";

import e2eRoutesSource from "../../../e2e/a11y/routes.ts?raw";
import routesSource from "../../routes.tsx?raw";
import {
  articleDocument,
  articleFiles,
  BLOG_ARTICLES,
  BLOG_FOLDERS,
  blogArticleCount,
  blogFolderChain,
  blogFolderContents,
  blogParentOf,
} from "./articles";

/*
  The Blog's four lists (CTA-126) — the article files, the registry, the
  route table and the browser pass's routes — held to each other, so an
  article added to one and not the others fails here, not on a 404.
*/

const articlePaths = BLOG_ARTICLES.map((article) => article.path);
const folderPaths = BLOG_FOLDERS.map((folder) => folder.path);

/** `path: "/blog/…"` in a source file, the index and the folder splat left out. */
const blogPathsIn = (source: string, key: "path" | "pattern"): string[] =>
  [...source.matchAll(new RegExp(`${key}:\\s*"/blog/([^"*]+)"`, "g"))].map((match) => match[1]);

describe("the Blog's registry (CTA-126)", () => {
  it("names each article and each folder once", () => {
    expect(new Set(articlePaths).size).toBe(articlePaths.length);
    expect(new Set(folderPaths).size).toBe(folderPaths.length);
    expect(articlePaths.filter((path) => folderPaths.includes(path))).toEqual([]);
  });

  it("files every article in a registered folder — or at the root — and nests every folder in one", () => {
    for (const path of [...articlePaths, ...folderPaths]) {
      const parent = blogParentOf(path);
      expect(parent === "" || folderPaths.includes(parent), `${path}'s folder ${parent}`).toBe(true);
    }
  });

  it("has an English document for every article, and no document without an article", () => {
    const files = articleFiles();
    const english = files.filter((file) => file.language === "en").map((file) => file.path);
    expect([...english].sort()).toEqual([...articlePaths].sort());
    for (const file of files) expect(articlePaths, `articles/${file.path}.${file.language}.mdx`).toContain(file.path);
  });

  it("gives every article its line in the route table, and no route an article it does not have", () => {
    expect(blogPathsIn(routesSource, "path").sort()).toEqual([...articlePaths].sort());
  });

  it("has the browser pass visit every article", () => {
    expect(blogPathsIn(e2eRoutesSource, "pattern").sort()).toEqual([...articlePaths].sort());
  });
});

describe("the Blog's tree", () => {
  it("lists a folder's own folders and articles, one level down", () => {
    expect(blogFolderContents("").folders.map((folder) => folder.path)).toEqual(["tournaments", "writing-an-article"]);
    expect(blogFolderContents("").articles.map((article) => article.path)).toEqual(["get-started"]);
    // The guide, and the demos of everything an article may embed (CTA-128).
    expect(blogFolderContents("writing-an-article").articles.map((article) => article.path)).toEqual(["writing-an-article/guide"]);
    expect(blogFolderContents("writing-an-article").folders.map((folder) => folder.path)).toEqual([
      "writing-an-article/components",
      "writing-an-article/inline-pgn",
      "writing-an-article/demo-tables",
    ]);
    expect(blogArticleCount("writing-an-article/components")).toBe(7);
    expect(blogArticleCount("writing-an-article/demo-tables")).toBe(7);
    expect(blogArticleCount("writing-an-article")).toBe(20);
    expect(blogFolderContents("tournaments").folders).toEqual([]);
    expect(blogArticleCount("tournaments")).toBe(4);
  });

  it("walks the folders above an article, for its breadcrumbs", () => {
    expect(blogFolderChain("writing-an-article/components/nav-cards").map((folder) => folder.path)).toEqual(["writing-an-article", "writing-an-article/components"]);
    expect(blogFolderChain("top-level")).toEqual([]);
  });

  it("falls back to the English document in a language an article has none in", () => {
    expect(articleDocument("writing-an-article/components/nav-cards", "he")?.language).toBe("en");
    expect(articleDocument("writing-an-article/components/nav-cards", "en")?.language).toBe("en");
    expect(articleDocument("nowhere", "en")).toBeUndefined();
  });
});
