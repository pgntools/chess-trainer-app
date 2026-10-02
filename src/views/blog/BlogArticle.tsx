import { Suspense } from "react";
import { Link as RouterLink, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { Breadcrumbs } from "../../design-system/components/navigation";
import { asAppLanguage } from "../../i18n";
import { localizedText } from "../../lib/localizedText";
import { ForceLTR } from "../../theme/ForceLTR";
import { frontPageComponents } from "../home/frontPage";
import { useOwnPageHeading, usePageTitle } from "../main/pageTitle";
import { articleDocument, blogFolderChain, findBlogArticle } from "./articles";

/**
 * **A Blog article** (CTA-126) at `/blog/<path>` — the article the address
 * names (`articles.ts`), under a trail back through its folders: its title
 * the page's `h1` and its page title's first part, then its MDX document,
 * rendered with the front page's components (`views/home/frontPage/index.ts`).
 *
 * Each article's document is its own chunk, loaded when the page opens. In a
 * language it has no document for, the English one is shown pinned left to
 * right (`ForceLTR`, `lang="en"`), so English prose reads as English under a
 * mirrored page. An address that names no article says so.
 */
function BlogArticle() {
  const { t, i18n } = useTranslation();
  const language = asAppLanguage(i18n.language);
  const path = useLocation().pathname.replace(/^\/blog\/?/, "").replace(/\/+$/, "");
  const article = findBlogArticle(path);
  const document = article === undefined ? undefined : articleDocument(article.path, language);
  const title = article === undefined ? undefined : localizedText(article.title, language);
  usePageTitle(title);
  useOwnPageHeading();

  const crumbs = [
    { id: "root", label: t("blog.title"), link: { component: RouterLink, to: "/blog" } },
    ...blogFolderChain(path).map((folder) => ({
      id: folder.path,
      label: localizedText(folder.title, language),
      link: { component: RouterLink, to: `/blog/${folder.path}` },
    })),
  ];

  const body =
    document === undefined ? null : (
      <Suspense
        fallback={
          <Typography role="status" color="text.secondary">
            {t("blog.loading")}
          </Typography>
        }
      >
        <document.Content components={frontPageComponents} />
      </Suspense>
    );

  return (
    <Box data-testid="blog-article" sx={{ height: "100%", overflowY: "auto", p: 1 }}>
      <Breadcrumbs
        ariaLabel={t("blog.breadcrumbs")}
        crumbs={crumbs}
        current={title ?? t("blog.missingTitle")}
        testId="blog-article-crumbs"
      />
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mt: 1, mb: 2 }}>
        {title ?? t("blog.missingTitle")}
      </Typography>
      {article === undefined || document === undefined ? (
        <Typography color="text.secondary" data-testid="blog-article-missing">
          {t("blog.missingArticle")}
        </Typography>
      ) : document.language === language ? (
        body
      ) : (
        <ForceLTR>
          <Box lang={document.language}>{body}</Box>
        </ForceLTR>
      )}
    </Box>
  );
}

export default BlogArticle;
