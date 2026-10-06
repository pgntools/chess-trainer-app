import type { ImportResolver } from "./compileMdx";
import type { ArticlePgn } from "./pgnImports";

/**
 * **The Blog's files as text** — what the MDX editor opens an article from,
 * and what an article's `import games from "./x.pgn?raw"` reads. Both are
 * lazy globs over `src/views/blog/articles/`, so a file is read only when it
 * is opened; and the editor is dev-only, so neither ships.
 *
 * `?raw` on an `.mdx` is its text, not a component: `vite.config.ts` leaves
 * a `?raw` import to Vite rather than to the MDX compiler.
 */

const ARTICLES_DIR = "../../views/blog/articles/";

const mdxFiles = import.meta.glob<string>("../../views/blog/articles/**/*.mdx", { query: "?raw", import: "default" });
const pgnFiles = import.meta.glob<string>("../../views/blog/articles/**/*.pgn", { query: "?raw", import: "default" });
/** The images beside the articles, each as the URL Vite serves it at — what `import photo from "./photo.png"` gives. */
const imageFiles = import.meta.glob<string>("../../views/blog/articles/**/*.{png,jpg,jpeg,webp,gif}", { query: "?url", import: "default" });

/** An image an article may import. */
const IMAGE = /\.(?:png|jpe?g|webp|gif)$/i;

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
 * article there: a `.pgn?raw` (its text) or an image (its URL). `attached`
 * (a path under `articles/` → a PGN's text, an image's object URL) is a
 * file the editor has just written, read before the glob has caught up.
 */
export const articleImportResolver = (folder: string, attached: Readonly<Record<string, string>> = {}): ImportResolver => ({
  keyOf: (specifier) => {
    const image = IMAGE.test(specifier);
    if (!specifier.endsWith(".pgn?raw") && !image) return undefined;
    const key = keyOf(folder, specifier);
    return key !== undefined && (key in (image ? imageFiles : pgnFiles) || key.slice(ARTICLES_DIR.length) in attached) ? key : undefined;
  },
  load: (key) => {
    // Written this session: a PGN's text, or an image's object URL.
    const written = attached[key.slice(ARTICLES_DIR.length)];
    if (written !== undefined) return Promise.resolve(written);
    return IMAGE.test(key) ? imageFiles[key]() : pgnFiles[key]();
  },
});

/** A PGN of the article's — its text written in, or read from its file beside the article; `undefined` for a file not there. */
export const pgnTextOf = async (pgn: ArticlePgn, folder: string, attached: Readonly<Record<string, string>>): Promise<string | undefined> => {
  if (pgn.kind === "inline") return pgn.text;
  const resolver = articleImportResolver(folder, attached);
  const key = resolver.keyOf(`${pgn.file}?raw`);
  return key === undefined ? undefined : resolver.load(key);
};
