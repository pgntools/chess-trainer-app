import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import type { AppLanguage } from "../../i18n";
import { ForceLTR } from "../../theme/ForceLTR";
import { mdxComponents } from "../home/frontPage";
import { articleDocument, folderDocument } from "./articles";

/**
 * **An article's document, rendered** (CTA-126) — what a Blog article's page
 * and the front page (`views/home/Home.tsx`) both show below their title: the
 * article's MDX (`articles/<path>.mdx`), its own lazy chunk, with the
 * components of `views/home/frontPage/index.ts`. In a language it has no
 * document for, the English one is shown pinned left to right (`ForceLTR`,
 * `lang="en"`), so English prose reads as English under a mirrored page.
 * An article with no document says so.
 *
 * With `folder`, it is a **folder's introduction** instead (CTA-135): the body
 * of its `index.mdx`, above its index page's cards — and nothing at all for
 * a folder whose index has none.
 */

type ArticleBodyProps = {
  /** The article's path — `components/game-boards-3col` — or, with `folder`, the folder's (`""` the Blog's own index). */
  path: string;
  language: AppLanguage;
  /** Render the folder's `index.mdx` body, if it has one — absent, the article's document. */
  folder?: boolean;
};

function ArticleBody({ path, language, folder = false }: ArticleBodyProps) {
  const { t } = useTranslation();
  const document = folder ? folderDocument(path, language) : articleDocument(path, language);
  if (document === undefined && folder) return null;
  if (document === undefined) {
    return (
      <Typography color="text.secondary" data-testid="article-missing">
        {t("blog.missingArticle")}
      </Typography>
    );
  }

  const body = (
    <Suspense
      fallback={
        <Typography role="status" color="text.secondary">
          {t("blog.loading")}
        </Typography>
      }
    >
      <document.Content components={mdxComponents} />
    </Suspense>
  );
  const shown =
    document.language === language ? (
      body
    ) : (
      <ForceLTR>
        <Box lang={document.language}>{body}</Box>
      </ForceLTR>
    );
  return folder ? <Box data-testid="blog-folder-intro" sx={{ mb: 3 }}>{shown}</Box> : shown;
}

export default ArticleBody;
