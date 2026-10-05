import { lazy, type LazyExoticComponent } from "react";
import type { MDXContent } from "mdx/types";
import { articles as manifest } from "virtual:blog-articles";

import type { AppLanguage } from "../../i18n";
import type { ArticleFrontmatter } from "../../lib/articleFrontmatter";
import type { LocalizedText } from "../../lib/localizedText";
import { articleImageFile } from "../../lib/shareImage";

/**
 * **The Blog** (CTA-126) — articles written as MDX, in folders that nest, each
 * at a fixed address under `/blog/`. This file is the Blog's one registry: the
 * sidebar's Blog folder, the index pages (`/blog`, `/blog/<folder>`), each
 * article's title, breadcrumbs and page title, the front page and the MDX
 * editor's picker are read off it.
 *
 * **Nothing here is written by hand** (CTA-135): the registry is built from
 * the files' own frontmatter, which the build reads and checks
 * (`plugins/blogArticles.ts`, `virtual:blog-articles`;
 * `src/lib/articleFrontmatter.ts` the schema).
 *
 * - **An article** is `articles/<path>.mdx` — its frontmatter (`title`,
 *   `summary`, and optionally `order`, `date`, `updated`, `tags`, `draft`,
 *   `description`, `image`, `redirectFrom`) and its document. Its address is
 *   `/blog/<path>`, served by the Blog's one route (`routes.tsx`).
 * - **A translation** is `articles/<path>.<xx>.mdx`, with its own `title`
 *   and `summary`; one with frontmatter alone translates the title and shows
 *   it over the English document.
 * - **A folder** is a directory; its `index.mdx` names it (`title`,
 *   `summary`, `order`) and its body, if any, introduces it on its index page.
 * - **Order**, in a folder: the articles with an `order` first, ascending;
 *   then the rest by `date`, newest first; then by title. Folders by `order`,
 *   then title.
 * - **A draft** is listed in `yarn dev`, marked, and is not in a production
 *   build at all.
 *
 * The article's title is its page's `h1` (the screen renders it), so the
 * document itself starts below it, at `##`. The how-to is itself an article:
 * `articles/writing-an-article/guide.mdx`.
 */

export type BlogFolder = {
  /** `components`, `guides/front-page` — the address under `/blog/`. */
  path: string;
  title: LocalizedText;
  /** A line about it, from its `index.mdx`. */
  summary?: LocalizedText;
  order?: number;
  /** The share image of every page under it with none nearer (CTA-136) — each language's file, repository-relative. */
  image?: LocalizedText;
  imageAlt?: LocalizedText;
};

export type BlogArticleEntry = {
  /** `components/game-boards-3col` — the address under `/blog/`, and the file under `articles/`. */
  path: string;
  title: LocalizedText;
  /** One line under its title on the index pages. */
  summary: LocalizedText;
  /** The page's `<meta name="description">`. */
  description?: LocalizedText;
  /** Pinned to the top of its folder, ascending. */
  order?: number;
  /** `YYYY-MM-DD` — published. */
  date?: string;
  /** `YYYY-MM-DD` — last changed in substance. */
  updated?: string;
  tags?: readonly string[];
  /** Listed only in `yarn dev`, marked. */
  draft: boolean;
  /**
   * Its share image (CTA-136): each language's file — a translation's own,
   * else the English one — repository-relative, as the build reads it.
   */
  image?: LocalizedText;
  imageAlt?: LocalizedText;
  /** The languages it has a body in — a page of its own in each; another language shows the English body. */
  languages: readonly AppLanguage[];
  /** Old paths that lead here. */
  redirectFrom?: readonly string[];
};

/* --- the manifest -------------------------------------------------- */

type Entry = (typeof manifest)[number];

/** The manifest's files, grouped: `article:<path>` or `folder:<path>` → language → file. */
const grouped = new Map<string, Map<AppLanguage, Entry>>();
for (const entry of manifest) {
  const key = `${entry.kind}:${entry.path}`;
  if (!grouped.has(key)) grouped.set(key, new Map());
  grouped.get(key)!.set(entry.language, entry);
}

/** Where the Blog's files are, repository-relative — a share image is named relative to its file. */
export const BLOG_ARTICLES_DIR = "src/views/blog/articles";

/** One text key across a page's files — English required, as every language falls back to it. */
const localized = (files: Map<AppLanguage, Entry>, key: "title" | "summary" | "description" | "imageAlt"): LocalizedText | undefined => {
  const english = files.get("en")?.meta[key];
  if (english === undefined) return undefined;
  const text: LocalizedText = { en: english };
  for (const [language, file] of files) {
    const value = file.meta[key];
    if (language !== "en" && value !== undefined) text[language] = value;
  }
  return text;
};

const englishOf = (files: Map<AppLanguage, Entry>): ArticleFrontmatter => files.get("en")!.meta;
const parentOf = (path: string): string => path.split("/").slice(0, -1).join("/");

/** A page's share image per language, resolved against the folder its files sit in — a translation's own, else the English file's. */
const imagesOf = (files: Map<AppLanguage, Entry>, dir: string): LocalizedText | undefined => {
  const english = files.get("en")?.meta.image;
  if (english === undefined) return undefined;
  const text: LocalizedText = { en: articleImageFile(BLOG_ARTICLES_DIR, dir, english) };
  for (const [language, file] of files) {
    if (language !== "en" && file.meta.image !== undefined) text[language] = articleImageFile(BLOG_ARTICLES_DIR, dir, file.meta.image);
  }
  return text;
};
const byEnglishTitle = (a: { title: LocalizedText }, b: { title: LocalizedText }) => a.title.en.localeCompare(b.title.en);

/**
 * **The order inside a folder** (CTA-135): pinned articles (`order`) first,
 * ascending; then dated ones, newest first; then the rest, by title.
 */
export const compareBlogArticles = (a: BlogArticleEntry, b: BlogArticleEntry): number => {
  if ((a.order === undefined) !== (b.order === undefined)) return a.order === undefined ? 1 : -1;
  if (a.order !== undefined && b.order !== undefined && a.order !== b.order) return a.order - b.order;
  if ((a.date === undefined) !== (b.date === undefined)) return a.date === undefined ? 1 : -1;
  if (a.date !== undefined && b.date !== undefined && a.date !== b.date) return a.date < b.date ? 1 : -1;
  return byEnglishTitle(a, b);
};

/** Folders by `order` (an unordered one after), then by title. */
const compareBlogFolders = (a: BlogFolder, b: BlogFolder): number =>
  (a.order ?? Number.POSITIVE_INFINITY) - (b.order ?? Number.POSITIVE_INFINITY) || byEnglishTitle(a, b);

export const BLOG_ARTICLES: readonly BlogArticleEntry[] = [...grouped]
  .filter(([key]) => key.startsWith("article:"))
  .map(([, files]): BlogArticleEntry => {
    const english = englishOf(files);
    return {
      path: files.get("en")!.path,
      title: localized(files, "title")!,
      summary: localized(files, "summary")!,
      description: localized(files, "description"),
      order: english.order,
      date: english.date,
      updated: english.updated,
      tags: english.tags,
      draft: files.get("en")!.draft,
      image: imagesOf(files, parentOf(files.get("en")!.path)),
      imageAlt: localized(files, "imageAlt"),
      languages: [...files].filter(([, file]) => file.hasBody).map(([language]) => language),
      redirectFrom: english.redirectFrom,
    };
  })
  .sort(compareBlogArticles);

/** Every folder an article sits in, at every depth — named by its `index.mdx`, else by its path's last segment. */
export const BLOG_FOLDERS: readonly BlogFolder[] = (() => {
  const paths = new Set<string>();
  for (const article of BLOG_ARTICLES) {
    const parts = parentOf(article.path).split("/").filter(Boolean);
    for (let depth = 1; depth <= parts.length; depth += 1) paths.add(parts.slice(0, depth).join("/"));
  }
  for (const entry of manifest) if (entry.kind === "folder" && entry.path !== "") paths.add(entry.path);
  return [...paths]
    .map((path): BlogFolder => {
      const files = grouped.get(`folder:${path}`);
      if (files === undefined) return { path, title: { en: path.split("/").at(-1) ?? path } };
      return {
        path,
        title: localized(files, "title")!,
        summary: localized(files, "summary"),
        order: englishOf(files).order,
        image: imagesOf(files, path),
        imageAlt: localized(files, "imageAlt"),
      };
    })
    .sort(compareBlogFolders);
})();

/** The Blog's own folder — `articles/index.mdx`, its share image the top of every Blog page's walk up (CTA-136) — or `undefined` without one. */
export const BLOG_ROOT: BlogFolder | undefined = (() => {
  const files = grouped.get("folder:");
  if (files === undefined || !files.has("en")) return undefined;
  return {
    path: "",
    title: localized(files, "title")!,
    summary: localized(files, "summary"),
    image: imagesOf(files, ""),
    imageAlt: localized(files, "imageAlt"),
  };
})();

/* --- the files ----------------------------------------------------- */

type LazyDocument = LazyExoticComponent<MDXContent>;

/** Every body, as `<kind>:<path>` → language → its lazy document. Each is its own chunk; a file with no body has none. */
const documents = new Map<string, Map<AppLanguage, LazyDocument>>();
for (const entry of manifest) {
  if (entry.load === undefined) continue;
  const key = `${entry.kind}:${entry.path}`;
  if (!documents.has(key)) documents.set(key, new Map());
  documents.get(key)!.set(entry.language, lazy(entry.load));
}

/** The article files' paths and languages, translations with no body included — for the registry's test. */
export const articleFiles = (): { path: string; language: AppLanguage; hasBody: boolean }[] =>
  manifest.filter((entry) => entry.kind === "article").map(({ path, language, hasBody }) => ({ path, language, hasBody }));

const documentOf = (
  key: string,
  language: AppLanguage,
): { Content: LazyDocument; language: AppLanguage } | undefined => {
  const byLanguage = documents.get(key);
  const own = byLanguage?.get(language);
  if (own !== undefined) return { Content: own, language };
  const english = byLanguage?.get("en");
  return english === undefined ? undefined : { Content: english, language: "en" };
};

/**
 * An article's document in `language` — or its English one, where that
 * language has no file or a file with frontmatter alone: `language` says
 * which it is, so the screen can pin an English fallback left to right.
 */
export const articleDocument = (path: string, language: AppLanguage) => documentOf(`article:${path}`, language);

/** A folder's introduction — its `index.mdx`'s body (`""`, the Blog's own index) — or `undefined` for none. */
export const folderDocument = (path: string, language: AppLanguage) => documentOf(`folder:${path}`, language);

/** The file the page shows a document from — `tournaments/olympiad-2026`, `get-started.he` — for the MDX editor's link. */
export const articleFileOf = (path: string, language: AppLanguage): string | undefined => {
  const document = articleDocument(path, language);
  if (document === undefined) return undefined;
  return document.language === "en" ? path : `${path}.${document.language}`;
};

/* --- the tree ------------------------------------------------------ */

export const findBlogArticle = (path: string): BlogArticleEntry | undefined =>
  BLOG_ARTICLES.find((article) => article.path === path);

export const findBlogFolder = (path: string): BlogFolder | undefined =>
  BLOG_FOLDERS.find((folder) => folder.path === path);

/** The article an old address leads to (its `redirectFrom`), or `undefined`. */
export const findBlogRedirect = (path: string): BlogArticleEntry | undefined =>
  BLOG_ARTICLES.find((article) => article.redirectFrom?.includes(path) === true);

/** What a path under `/blog/` is — `""` the Blog's own index. The Blog's one route dispatches on it. */
export type BlogPage =
  | { kind: "article"; article: BlogArticleEntry }
  | { kind: "folder"; folder: BlogFolder | undefined }
  | { kind: "redirect"; to: BlogArticleEntry }
  | { kind: "missing" };

export const blogPageOf = (path: string): BlogPage => {
  const article = findBlogArticle(path);
  if (article !== undefined) return { kind: "article", article };
  if (path === "") return { kind: "folder", folder: undefined };
  const folder = findBlogFolder(path);
  if (folder !== undefined) return { kind: "folder", folder };
  const to = findBlogRedirect(path);
  return to === undefined ? { kind: "missing" } : { kind: "redirect", to };
};

/** `/blog/a/b/` → `a/b`: the path under `/blog/` a pathname names. */
export const blogPathOf = (pathname: string): string => pathname.replace(/^\/blog\/?/, "").replace(/\/+$/, "");

/** The folders from the Blog's root down to `path`'s parent — a breadcrumb trail. Unregistered ones are left out. */
export const blogFolderChain = (path: string): BlogFolder[] => {
  const parts = path.split("/").slice(0, -1);
  return parts
    .map((_, index) => findBlogFolder(parts.slice(0, index + 1).join("/")))
    .filter((folder): folder is BlogFolder => folder !== undefined);
};

/** What a folder holds, one level down — `""` is the Blog's root. Folders by `order`, articles pinned first, then newest first. */
export const blogFolderContents = (
  path: string,
): { folders: BlogFolder[]; articles: BlogArticleEntry[] } => ({
  folders: BLOG_FOLDERS.filter((folder) => parentOf(folder.path) === path),
  articles: BLOG_ARTICLES.filter((article) => parentOf(article.path) === path),
});

/**
 * Every article in the order the sidebar draws them: in each folder, its
 * sub-folders' articles first (in `BLOG_FOLDERS`' order, depth first), then
 * its own — a folder's sub-folders render above its own screens (`navTree.ts`).
 */
export const blogArticlesInTreeOrder = (folder = ""): BlogArticleEntry[] => [
  ...BLOG_FOLDERS.filter((child) => parentOf(child.path) === folder).flatMap((child) => blogArticlesInTreeOrder(child.path)),
  ...BLOG_ARTICLES.filter((article) => parentOf(article.path) === folder),
];

/** How many articles sit anywhere under a folder. */
export const blogArticleCount = (path: string): number =>
  BLOG_ARTICLES.filter((article) => article.path.startsWith(`${path}/`)).length;

/** The sidebar's id for a Blog folder — `blog` for the root. */
export const blogNavFolderId = (path: string): string => (path === "" ? "blog" : `blog/${path}`);

/** The parent folder's path of an article or a folder. */
export const blogParentOf = parentOf;
