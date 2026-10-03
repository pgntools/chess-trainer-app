import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import type { AppLanguage } from "../../i18n";
import { ForceLTR } from "../../theme/ForceLTR";
import { mdxComponents } from "../home/frontPage";
import { articleDocument } from "./articles";

/**
 * **An article's document, rendered** (CTA-126) — what a Blog article's page
 * and the front page (`views/home/Home.tsx`) both show below their title: the
 * article's MDX (`articles/<path>.mdx`), its own lazy chunk, with the
 * components of `views/home/frontPage/index.ts`. In a language it has no
 * document for, the English one is shown pinned left to right (`ForceLTR`,
 * `lang="en"`), so English prose reads as English under a mirrored page.
 * An article with no document says so.
 */

type ArticleBodyProps = {
  /** The article's path — `components/game-boards-3col`. */
  path: string;
  language: AppLanguage;
};

function ArticleBody({ path, language }: ArticleBodyProps) {
  const { t } = useTranslation();
  const document = articleDocument(path, language);
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
  return document.language === language ? (
    body
  ) : (
    <ForceLTR>
      <Box lang={document.language}>{body}</Box>
    </ForceLTR>
  );
}

export default ArticleBody;
