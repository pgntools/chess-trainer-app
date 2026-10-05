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
