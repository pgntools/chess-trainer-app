/**
 * The Blog's manifest (CTA-135) — written by the build's plugin,
 * `plugins/blogArticles.ts`, from every file under `src/views/blog/articles/`.
 * `src/views/blog/articles.ts` is its one reader.
 */
declare module "virtual:blog-articles" {
  import type { MDXContent } from "mdx/types";
  import type { ArticleManifestEntry } from "./lib/articleFrontmatter";

  export const articles: readonly (ArticleManifestEntry & {
    /** The body's chunk — absent for a file with no body (a frontmatter-only translation, a folder's bare index). */
    load?: () => Promise<{ default: MDXContent }>;
  })[];
}
