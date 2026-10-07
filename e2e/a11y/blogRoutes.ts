import { join } from "node:path";

import { readArticlesDir } from "../../plugins/blogArticles.ts";
import { readArticleFiles, splitFrontmatter } from "../../src/lib/articleFrontmatter.ts";

/*
  **The Blog's articles, as the browser pass visits them** (CTA-135) — read
  from the files, with the same reader the build uses
  (`src/lib/articleFrontmatter.ts`), so an article added is an article
  checked with no line written anywhere. A draft is not in the production
  build the pass runs against, so it is not here either.
*/

/** The embeds that draw a chessboard (`views/home/frontPage/`): `DemoBoard`'s four and `ExcerptBoard`'s two. */
const BOARD_EMBEDS = /<(CollectionGameBoard|RepertoireBoard|CollectionCard|StoredGameEmbed|InlinePgnGame|InlinePgnGameColumns)\b/;

/** A body with its fenced blocks and inline code taken out — where an article shows markup rather than using it. */
const drawnPart = (body: string): string =>
  body.replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1[^\n]*$/gm, "").replace(/`[^`\n]*`/g, "");

export type BlogArticleRoute = {
  /** `writing-an-article/components/nav-cards` — the address under `/blog/`. */
  path: string;
  /** It embeds a chessboard. */
  board: boolean;
};

/** Every published article, in path order. */
export const blogArticleRoutes = (): BlogArticleRoute[] => {
  const files = readArticlesDir(join(process.cwd(), "src/views/blog/articles"));
  const textOf = new Map(files.map((file) => [file.name.replace(/\.mdx$/, ""), file.text]));
  return readArticleFiles(files)
    .entries.filter((entry) => entry.kind === "article" && entry.language === "en" && !entry.draft)
    .map((entry) => ({ path: entry.path, board: BOARD_EMBEDS.test(drawnPart(splitFrontmatter(textOf.get(entry.file) ?? "").body)) }))
    .sort((a, b) => a.path.localeCompare(b.path));
};
