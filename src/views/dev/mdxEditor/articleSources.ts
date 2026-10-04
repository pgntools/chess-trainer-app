import { BLOG_ARTICLES } from "../../blog/articles";
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

/** One article file the editor can open: `tournaments/olympiad-2026` (or `….he` for a translation). */
export type ArticleSource = { file: string; label: string };

/** `../../blog/articles/a/b.he.mdx` → `a/b.he`. */
const fileOf = (key: string) => key.slice(ARTICLES_DIR.length).replace(/\.mdx$/, "");

/** Every article file, in the Blog's order (its translations after it), each labelled by its English title. */
export const articleSources = (): ArticleSource[] => {
  const files = Object.keys(mdxFiles).map(fileOf);
  const titled = BLOG_ARTICLES.flatMap((article) =>
    files
      .filter((file) => file === article.path || file.startsWith(`${article.path}.`))
      .map((file) => ({ file, label: file === article.path ? `${article.title.en} — ${file}` : `${article.title.en} (${file.slice(article.path.length + 1)}) — ${file}` })),
  );
  const listed = new Set(titled.map((source) => source.file));
  return [...titled, ...files.filter((file) => !listed.has(file)).map((file) => ({ file, label: file }))];
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

/** An article's imports, resolved from `folder` as the bundler would from an article there. Only a `.pgn?raw`. */
export const articleImportResolver = (folder: string): ImportResolver => ({
  keyOf: (specifier) => {
    if (!specifier.endsWith(".pgn?raw")) return undefined;
    const key = keyOf(folder, specifier);
    return key !== undefined && key in pgnFiles ? key : undefined;
  },
  load: (key) => pgnFiles[key](),
});
