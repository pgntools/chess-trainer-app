import { articleFileName } from "../../../lib/articleFrontmatter";
import { BLOG_ARTICLES, BLOG_FOLDERS, findBlogFolder } from "../../blog/articles";
import type { ImportResolver } from "./compileMdx";

/**
 * **The Blog's files as text** — what the MDX editor opens an article from,
 * and what an article's `import games from "./x.pgn?raw"` reads. Both are
 * lazy globs over `src/views/blog/articles/`, so a file is read only when it
 * is opened; and the editor is dev-only, so neither ships.
 *
 * `?raw` on an `.mdx` is its text, not a component: `vite.config.ts` leaves
 * a `?raw` import to Vite rather than to the MDX compiler.
 */

const ARTICLES_DIR = "../../blog/articles/";

const mdxFiles = import.meta.glob<string>("../../blog/articles/**/*.mdx", { query: "?raw", import: "default" });
const pgnFiles = import.meta.glob<string>("../../blog/articles/**/*.pgn", { query: "?raw", import: "default" });

/** `../../blog/articles/a/b.he.mdx` → `a/b.he`. */
const fileOf = (key: string) => key.slice(ARTICLES_DIR.length).replace(/\.mdx$/, "");

/** One node of the article tree: a folder of articles, or a file to open. */
export type ArticleTreeNode = {
  /** The folder's path (`tournaments`) or the file's (`tournaments/olympiad-2026`). */
  id: string;
  /** A folder: its name ("Tournaments"), else its own segment. A file: its article's English title (a translation marked beside it), a folder's index so called, else its own name. */
  label: string;
  /** The file a click opens — absent on a folder. */
  file?: string;
  /** A folder's sub-folders and articles. */
  children?: ArticleTreeNode[];
};

/** A file's label: its article's English title, or "<folder> — its index" (a translation's language beside it), else the file's own name. */
const labelOf = (file: string): string => {
  const { path, language, kind } = articleFileName(`${file}.mdx`);
  const translation = language === "en" ? "" : ` (${language})`;
  if (kind === "folder") return `${path === "" ? "The Blog" : folderLabel(path)} — its index${translation}`;
  const article = BLOG_ARTICLES.find((candidate) => candidate.path === path);
  return article === undefined ? (file.split("/").at(-1) ?? file) : `${article.title.en}${translation}`;
};

/** A folder's label: its registered name, else its own path segment. */
const folderLabel = (folder: string): string => findBlogFolder(folder)?.title.en ?? folder.split("/").at(-1) ?? folder;

/**
 * Every article file as the Blog's tree — the folders the articles sit in,
 * a folder's sub-folders above its own articles (as the sidebar draws them),
 * the registered ones in the Blog's order, each article's translations right
 * after it, and a file or folder the registry does not name at its end: the
 * editor opens what sits on disk, not only what is registered.
 */
export const articleTree = (): ArticleTreeNode[] => {
  const files = Object.keys(mdxFiles).map(fileOf);
  // A folder's index first, then the registry's order, then any file it does not name, as the glob lists them.
  const indexes = files.filter((file) => articleFileName(`${file}.mdx`).kind === "folder");
  const listed = BLOG_ARTICLES.flatMap((article) =>
    files.filter((file) => file === article.path || file.startsWith(`${article.path}.`)),
  );
  const listedSet = new Set([...indexes, ...listed]);
  const ordered = [...indexes, ...listed, ...files.filter((file) => !listedSet.has(file))];

  // Every folder path with a file somewhere under it, at every depth.
  const foldersUnder = new Set<string>();
  for (const file of ordered) {
    const parts = folderOf(file).split("/").filter(Boolean);
    for (let depth = 1; depth <= parts.length; depth += 1) foldersUnder.add(parts.slice(0, depth).join("/"));
  }

  const nodesUnder = (folder: string): ArticleTreeNode[] => {
    const registered = BLOG_FOLDERS.filter((entry) => foldersUnder.has(entry.path) && folderOf(entry.path) === folder).map(
      (entry) => entry.path,
    );
    const registeredSet = new Set(registered);
    const unregistered = [...foldersUnder].filter((path) => folderOf(path) === folder && !registeredSet.has(path));
    return [
      ...[...registered, ...unregistered].map((path) => ({ id: path, label: folderLabel(path), children: nodesUnder(path) })),
      ...ordered.filter((file) => folderOf(file) === folder).map((file) => ({ id: file, label: labelOf(file), file })),
    ];
  };
  return nodesUnder("");
};

/** One choice of the autocomplete picker: an article file, its title, and the folder it sits in. */
export type ArticleOption = { value: string; label: string; group: string };

/**
 * Every article file as one flat list to type to find — the tree above
 * flattened in its own order, each article filed under its folders' names
 * joined by " / " (a root article under "(root)"), so the picker's groups
 * are the Blog's folders.
 */
export const articleOptions = (): ArticleOption[] => {
  const options: ArticleOption[] = [];
  const walk = (nodes: readonly ArticleTreeNode[], folder: string) => {
    for (const node of nodes) {
      if (node.children === undefined) options.push({ value: node.id, label: node.label, group: folder === "" ? "(root)" : folder });
      else walk(node.children, folder === "" ? node.label : `${folder} / ${node.label}`);
    }
  };
  walk(articleTree(), "");
  return options;
};

/** An article file's MDX source, or `undefined` for no such file. */
export const loadArticleSource = async (file: string): Promise<string | undefined> => mdxFiles[`${ARTICLES_DIR}${file}.mdx`]?.();

/** The folder an article file sits in, under `articles/` — `tournaments`, or `""` at the root. */
export const folderOf = (file: string): string => file.split("/").slice(0, -1).join("/");

/** `./x.pgn?raw` from `folder` → the file's key in the glob, or `undefined` when it leaves `articles/`. */
const keyOf = (folder: string, specifier: string): string | undefined => {
  const path = specifier.replace(/\?raw$/, "");
  if (!path.startsWith("./") && !path.startsWith("../")) return undefined;
  const parts = folder === "" ? [] : folder.split("/");
  for (const part of path.split("/")) {
    if (part === "." || part === "") continue;
    if (part === "..") {
      if (parts.length === 0) return undefined;
      parts.pop();
    } else parts.push(part);
  }
  return `${ARTICLES_DIR}${parts.join("/")}`;
};

/**
 * An article's imports, resolved from `folder` as the bundler would from an
 * article there. Only a `.pgn?raw`. `attached` (a path under `articles/` →
 * its text) is a PGN the editor has just written, read before the glob has
 * caught up with the file.
 */
export const articleImportResolver = (folder: string, attached: Readonly<Record<string, string>> = {}): ImportResolver => ({
  keyOf: (specifier) => {
    if (!specifier.endsWith(".pgn?raw")) return undefined;
    const key = keyOf(folder, specifier);
    return key !== undefined && (key in pgnFiles || key.slice(ARTICLES_DIR.length) in attached) ? key : undefined;
  },
  load: (key) => {
    const text = attached[key.slice(ARTICLES_DIR.length)];
    return text !== undefined ? Promise.resolve(text) : pgnFiles[key]();
  },
});
