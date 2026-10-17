import { isAbsolute, relative, resolve, sep } from "node:path";
import { loadEnv, type Plugin } from "vite";

import { APP_PAGES_FOLDER, articleFileName } from "../src/lib/articleFrontmatter.ts";
import { fillOperatorPlaceholders, SITE_ENV_PREFIX, type SiteEnv } from "../src/lib/siteOperator.ts";

/**
 * **The site's operator, put into the legal pages** (CTA-182) — a Vite
 * plugin that fills `%OPERATOR_NAME%`, `%OPERATOR_ADDRESS%` and
 * `%PRIVACY_EMAIL%` in every `.mdx` under `articles/app-pages/` with the
 * build's values (`src/lib/siteOperator.ts`), each file in its own language,
 * **before the MDX compiler reads it** (`enforce: "pre"`, listed ahead of
 * it). So `yarn dev`, the browser bundle, the server bundle and the
 * pre-render all compile the same text, and only the build has the values.
 *
 * - **`?raw` is left as written**: the MDX editor opens a file's source that
 *   way, so it shows — and saves — the placeholders.
 * - **Off when the operator is not configured**: the pages are left out of
 *   the build (`blogArticles`' `appPages`), so nothing compiles them.
 * - A placeholder it does not know, or one with no value, fails the build
 *   naming the file.
 */
export function siteOperator({ dir, env, enabled }: { dir: string; env: SiteEnv; enabled: boolean }): Plugin {
  const pagesDir = resolve(dir, APP_PAGES_FOLDER);
  return {
    name: "site-operator",
    enforce: "pre",
    transform(code, id) {
      if (!enabled || id.includes("?") || !id.endsWith(".mdx")) return undefined;
      const name = relative(pagesDir, resolve(id));
      if (name.startsWith("..") || isAbsolute(name)) return undefined;
      const { language } = articleFileName(name.split(sep).join("/"));
      try {
        return { code: fillOperatorPlaceholders(code, env, language), map: null };
      } catch (error) {
        this.error(`${APP_PAGES_FOLDER}/${name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  };
}

/**
 * The `SITE_*` variables of the environment and of `.env` / `.env.local` in
 * `root` — the environment first, as Vite reads its own.
 */
export const loadSiteEnv = (root: string): SiteEnv => loadEnv("", root, SITE_ENV_PREFIX);
