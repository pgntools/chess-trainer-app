import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import type { Plugin } from "vite";

import { readArticleFiles, type ArticleSourceFile } from "../src/lib/articleFrontmatter.ts";

/**
 * **The Blog's manifest** (CTA-135) — a Vite plugin that reads every file
 * under `src/views/blog/articles/`, checks its frontmatter
 * (`src/lib/articleFrontmatter.ts`) and answers `virtual:blog-articles` with
 * the metadata of each, and a lazy loader for each one with a body:
 *
 * ```js
 * export const articles = [
 *   { file: "tournaments/olympiad-2026", path: "tournaments/olympiad-2026", language: "en", kind: "article",
 *     meta: { title: "46th Chess Olympiad 2026", … }, hasBody: true, draft: false,
 *     load: () => import("/src/views/blog/articles/tournaments/olympiad-2026.mdx") },
 *   …
 * ];
 * ```
 *
 * `src/views/blog/articles.ts` builds the Blog's registry from it.
 *
 * - **Only metadata is eager.** Each body stays an `import()` — its own chunk,
 *   with the PGNs it imports — so the entry chunk carries every article's
 *   title and none of its text. A frontmatter-only translation has no body,
 *   so no loader and no chunk.
 * - **A draft is left out of a production build** — no entry, so no title and
 *   no `import()`, so no chunk: nothing of it is in `dist/`
 *   (`scripts/check-dist-blog.js` greps for it, after every CI build). In `yarn dev` and under
 *   Vitest (`command === "serve"`) it is listed, marked `draft`. This is why
 *   the manifest is one virtual module rather than an `import.meta.glob`:
 *   a glob's keys name every file it matches, drafts too, in the entry chunk.
 * - **A file that does not pass fails the build**, naming the file — a
 *   missing title, an unknown key, a structural key in a translation, an
 *   unsupported language, a translation with no English file. In `yarn dev`
 *   it is the error overlay; a folder without an `index.mdx` is a warning.
 * - **In `yarn dev`** adding, removing or editing an article reloads the
 *   manifest.
 */

const MODULE_ID = "virtual:blog-articles";
const RESOLVED_ID = `\0${MODULE_ID}`;

/** Every `.mdx` under `dir`, as text, named relative to it with `/` separators. */
export const readArticlesDir = (dir: string): ArticleSourceFile[] =>
  readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((name) => name.endsWith(".mdx"))
    .map((name) => ({ name: name.split(sep).join("/"), text: readFileSync(join(dir, name), "utf8") }));

export function blogArticles({ dir }: { dir: string }): Plugin {
  const articlesDir = resolve(dir);
  let root = process.cwd();
  let includeDrafts = true;

  return {
    name: "blog-articles",
    configResolved(config) {
      root = config.root;
      includeDrafts = config.command === "serve";
    },
    resolveId(id) {
      return id === MODULE_ID ? RESOLVED_ID : undefined;
    },
    load(id) {
      if (id !== RESOLVED_ID) return undefined;
      const { entries, errors, warnings } = readArticleFiles(readArticlesDir(articlesDir));
      for (const warning of warnings) this.warn(warning);
      if (errors.length > 0) this.error(`The Blog's articles do not pass (src/views/blog/articles/):\n${errors.join("\n")}`);

      const lines = entries
        .filter((entry) => includeDrafts || !entry.draft)
        .map(({ file, path, language, kind, meta, hasBody, draft }) => {
          const source = `/${relative(root, join(articlesDir, `${file}.mdx`)).split(sep).join("/")}`;
          const load = hasBody ? `() => import(${JSON.stringify(source)})` : "undefined";
          return `  { file: ${JSON.stringify(file)}, path: ${JSON.stringify(path)}, language: ${JSON.stringify(language)}, kind: ${JSON.stringify(kind)}, meta: ${JSON.stringify(meta)}, hasBody: ${hasBody}, draft: ${draft}, load: ${load} },`;
        });
      return `export const articles = [\n${lines.join("\n")}\n];\n`;
    },
    configureServer(server) {
      const refresh = (file: string) => {
        if (!file.startsWith(articlesDir) || !file.endsWith(".mdx")) return;
        for (const environment of Object.values(server.environments)) {
          const module = environment.moduleGraph.getModuleById(RESOLVED_ID);
          if (module !== undefined) void environment.reloadModule(module);
        }
      };
      server.watcher.on("add", refresh);
      server.watcher.on("unlink", refresh);
      server.watcher.on("change", refresh);
    },
  };
}
