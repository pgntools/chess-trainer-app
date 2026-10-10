import { describe, expect, it } from "vitest";

import { supportedLanguages } from "../../i18n";
import routesSource from "../../routes.tsx?raw";
import {
  articleDocument,
  articleFileOf,
  articleFiles,
  BLOG_ARTICLES,
  BLOG_FOLDERS,
  blogArticleCount,
  blogFolderChain,
  blogFolderContents,
  blogPageOf,
  blogParentOf,
  compareBlogArticles,
  folderDocument,
  type BlogArticleEntry,
} from "./articles";

/*
  The Blog's registry (CTA-126), built from the articles' own frontmatter
  (CTA-135) — `plugins/blogArticles.ts` reads and checks every file, and
  `articles.ts` assembles the folders and articles from what it read. Run
  under Vitest, which serves like `yarn dev`: the fixture draft is listed.
*/

const articlePaths = BLOG_ARTICLES.map((article) => article.path);
const folderPaths = BLOG_FOLDERS.map((folder) => folder.path);
const pathsIn = (folder: string) => blogFolderContents(folder).articles.map((article) => article.path);

describe("the Blog's registry (CTA-126, CTA-135)", () => {
  it("names each article and each folder once", () => {
    expect(new Set(articlePaths).size).toBe(articlePaths.length);
    expect(new Set(folderPaths).size).toBe(folderPaths.length);
    expect(articlePaths.filter((path) => folderPaths.includes(path))).toEqual([]);
  });

  it("files every article in a folder — or at the root — and nests every folder in one", () => {
    for (const path of [...articlePaths, ...folderPaths]) {
      const parent = blogParentOf(path);
      expect(parent === "" || folderPaths.includes(parent), `${path}'s folder ${parent}`).toBe(true);
    }
  });

  it("has an English document for every article, and no file without an article", () => {
    const files = articleFiles();
    const english = files.filter((file) => file.language === "en");
    expect(english.map((file) => file.path).sort()).toEqual([...articlePaths].sort());
    expect(english.every((file) => file.hasBody)).toBe(true);
    for (const file of files) expect(articlePaths, `articles/${file.path}.${file.language}.mdx`).toContain(file.path);
  });

  it("reads every article's title and summary from its frontmatter, in every language the app ships", () => {
    for (const article of BLOG_ARTICLES) {
      expect(article.title.en, article.path).not.toBe("");
      expect(article.summary.en, article.path).not.toBe("");
      // Every published article came over with a Hebrew title and summary (its
      // frontmatter-only `.he.mdx`); the fixture draft has none, on purpose.
      if (article.draft) continue;
      for (const language of supportedLanguages) {
        expect(article.title[language], `${article.path} in ${language}`).toBeTruthy();
        expect(article.summary[language], `${article.path} in ${language}`).toBeTruthy();
      }
      if (article.order !== undefined) expect(Number.isFinite(article.order)).toBe(true);
    }
    expect(BLOG_ARTICLES.find((article) => article.path === "tournaments/olympiad-2026")?.title).toEqual({
      en: "46th Chess Olympiad 2026",
      he: "האולימפיאדה ה-46 בשחמט 2026",
    });
  });

  it("names a folder from its index.mdx, in each language", () => {
    expect(BLOG_FOLDERS.find((folder) => folder.path === "writing-an-article/components")).toMatchObject({
      title: { en: "Components", he: "רכיבים" },
      summary: { en: expect.any(String), he: expect.any(String) },
    });
  });

  it("is served by one route, with no line per article", () => {
    const blogRoutes = [...routesSource.matchAll(/path:\s*"(\/blog[^"]*)"/g)].map((match) => match[1]);
    expect(blogRoutes).toEqual(["/blog/*"]);
  });
});

describe("the Blog's tree", () => {
  it("lists a folder's own folders and articles, one level down", () => {
    expect(blogFolderContents("").folders.map((folder) => folder.path)).toEqual(["tournaments", "writing-an-article", "guides"]);
    expect(pathsIn("")).toEqual(["get-started"]);
    // The guide, the fixture draft (listed here, as in yarn dev), and the demos of everything an article may embed (CTA-128).
    expect(pathsIn("writing-an-article")).toEqual(["writing-an-article/guide", "writing-an-article/a-draft"]);
    expect(blogFolderContents("writing-an-article").folders.map((folder) => folder.path)).toEqual([
      "writing-an-article/components",
      "writing-an-article/inline-pgn",
      "writing-an-article/demo-tables",
    ]);
    expect(blogArticleCount("writing-an-article/components")).toBe(7);
    expect(blogArticleCount("writing-an-article/demo-tables")).toBe(11);
    expect(blogArticleCount("writing-an-article")).toBe(26);
    expect(blogFolderContents("tournaments").folders).toEqual([]);
    expect(blogArticleCount("tournaments")).toBe(4);
  });

  it("keeps Writing an article's sequence through its pins (order)", () => {
    expect(pathsIn("writing-an-article/components")).toEqual([
      "writing-an-article/components/game-boards-3col",
      "writing-an-article/components/start-move",
      "writing-an-article/components/repertoires-2col",
      "writing-an-article/components/collection-wide-view-1",
      "writing-an-article/components/collection-wide-view-2",
      "writing-an-article/components/stored-game-embed",
      "writing-an-article/components/nav-cards",
    ]);
    expect(pathsIn("writing-an-article/inline-pgn")).toEqual([
      "writing-an-article/inline-pgn/the-component",
      "writing-an-article/inline-pgn/windows",
      "writing-an-article/inline-pgn/variations",
      "writing-an-article/inline-pgn/arrows-and-circles",
      "writing-an-article/inline-pgn/columns",
      "writing-an-article/inline-pgn/rubinstein-capablanca-1911",
    ]);
    expect(pathsIn("writing-an-article/demo-tables")).toEqual([
      "writing-an-article/demo-tables/swiss",
      "writing-an-article/demo-tables/single-round-robin",
      "writing-an-article/demo-tables/double-round-robin",
      "writing-an-article/demo-tables/knockout",
      "writing-an-article/demo-tables/double-elimination",
      "writing-an-article/demo-tables/match",
      "writing-an-article/demo-tables/team",
      "writing-an-article/demo-tables/from-a-collection",
      "writing-an-article/demo-tables/knockout-from-a-collection",
      "writing-an-article/demo-tables/double-elimination-from-a-collection",
      "writing-an-article/demo-tables/team-from-a-collection",
    ]);
  });

  it("sorts Tournaments by date, newest first — reordered deliberately (CTA-135)", () => {
    // Before the frontmatter it was the registry's order: the Olympiad, the Candidates, the Werner-Obermeyer, Green Hills.
    expect(pathsIn("tournaments")).toEqual([
      "tournaments/olympiad-2026",
      "tournaments/werner-obermeyer-swiss-2026",
      "tournaments/green-hills-masters-rapid-2026",
      "tournaments/fide-candidates-2026",
    ]);
  });

  it("puts pinned articles first, then the dated ones newest first, then the rest by title", () => {
    const entry = (path: string, more: Partial<BlogArticleEntry> = {}): BlogArticleEntry => ({
      path,
      title: { en: path },
      summary: { en: "" },
      draft: false,
      languages: ["en"],
      ...more,
    });
    const sorted = [
      entry("b-undated"),
      entry("old", { date: "2025-01-01" }),
      entry("pinned-2", { order: 2, date: "2026-12-31" }),
      entry("a-undated"),
      entry("new", { date: "2026-06-01" }),
      entry("pinned-1", { order: 1 }),
    ].sort(compareBlogArticles);
    expect(sorted.map((article) => article.path)).toEqual(["pinned-1", "pinned-2", "new", "old", "a-undated", "b-undated"]);
  });

  it("walks the folders above an article, for its breadcrumbs", () => {
    expect(blogFolderChain("writing-an-article/components/nav-cards").map((folder) => folder.path)).toEqual(["writing-an-article", "writing-an-article/components"]);
    expect(blogFolderChain("top-level")).toEqual([]);
  });

  it("falls back to the English document where a translation is a title alone", () => {
    expect(articleFiles().find((file) => file.path === "writing-an-article/components/nav-cards" && file.language === "he")?.hasBody).toBe(false);
    expect(articleDocument("writing-an-article/components/nav-cards", "he")?.language).toBe("en");
    expect(articleDocument("writing-an-article/components/nav-cards", "en")?.language).toBe("en");
    expect(articleFileOf("writing-an-article/components/nav-cards", "he")).toBe("writing-an-article/components/nav-cards");
    expect(articleDocument("nowhere", "en")).toBeUndefined();
    // No folder introduces itself today: its index.mdx is frontmatter alone.
    expect(folderDocument("tournaments", "en")).toBeUndefined();
  });

  it("tells what each address under /blog/ is", () => {
    expect(blogPageOf("")).toEqual({ kind: "folder", folder: undefined });
    expect(blogPageOf("tournaments")).toMatchObject({ kind: "folder", folder: { path: "tournaments" } });
    expect(blogPageOf("tournaments/olympiad-2026")).toMatchObject({ kind: "article", article: { path: "tournaments/olympiad-2026" } });
    expect(blogPageOf("tournaments/nowhere")).toEqual({ kind: "missing" });
    // The fixture draft's old address.
    expect(blogPageOf("writing-an-article/draft")).toMatchObject({ kind: "redirect", to: { path: "writing-an-article/a-draft" } });
  });

  it("lists a draft, marked, under Vitest as in yarn dev", () => {
    expect(BLOG_ARTICLES.find((article) => article.path === "writing-an-article/a-draft")?.draft).toBe(true);
    // The computer analysis guide (CTA-172) waits, a draft, for its screens (CTA-173, CTA-174).
    expect(BLOG_ARTICLES.filter((article) => article.draft).map((article) => article.path)).toEqual([
      "writing-an-article/a-draft",
      "guides/computer-analysis",
    ]);
  });
});
