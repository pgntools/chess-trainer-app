import { Link as RouterLink, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { Breadcrumbs } from "../../design-system/components/navigation";
import { asAppLanguage } from "../../i18n";
import { localizedTextOf } from "../../lib/localizedText";
import { InLanguage } from "../../theme/InLanguage";
import { useOwnPageHeading } from "../main/pageTitle";
import ArticleBody from "./ArticleBody";
import { ArticleEditLink } from "../../mdxEditor/ArticleEditLink";
import { ArticleHeader } from "./ArticleHeader";
import { blogFolderChain, blogPathOf, findBlogArticle } from "./articles";

/**
 * **A Blog article** (CTA-126) at `/blog/<path>` — the article the address
 * names (`articles.ts`), under a trail back through its folders: its header
 * (`ArticleHeader` — its title as the page's `h1`, a draft's chip, its dates),
 * then its MDX document (`ArticleBody`, which the front page shows its
 * article with too). An address that names no article says so.
 *
 * Its page title comes from the Blog route's `handle.meta`
 * (`blogPageMeta.ts`, CTA-135), so the screen reports none. A title shown in
 * English under another language — an article with no translation — is
 * marked `lang="en"` in the `h1` and the trail (`InLanguage`).
 */
function BlogArticle() {
  const { t, i18n } = useTranslation();
  const language = asAppLanguage(i18n.language);
  const path = blogPathOf(useLocation().pathname);
  const article = findBlogArticle(path);
  const title = article === undefined ? undefined : localizedTextOf(article.title, language);
  useOwnPageHeading();

  const crumbs = [
    { id: "root", label: t("blog.title"), link: { component: RouterLink, to: "/blog" } },
    ...blogFolderChain(path).map((folder) => {
      const name = localizedTextOf(folder.title, language);
      return {
        id: folder.path,
        label: <InLanguage language={name.language}>{name.text}</InLanguage>,
        link: { component: RouterLink, to: `/blog/${folder.path}` },
      };
    }),
  ];

  return (
    <Box data-testid="blog-article" sx={{ p: 1 }}>
      <Breadcrumbs
        ariaLabel={t("blog.breadcrumbs")}
        crumbs={crumbs}
        current={title === undefined ? t("blog.missingTitle") : <InLanguage language={title.language}>{title.text}</InLanguage>}
        testId="blog-article-crumbs"
      />
      <Box sx={{ mt: 1, mb: 2 }}>
        {article === undefined || title === undefined ? (
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            {t("blog.missingTitle")}
          </Typography>
        ) : (
          <ArticleHeader
            title={title.text}
            titleLanguage={title.language}
            draft={article.draft}
            date={article.date}
            updated={article.updated}
            action={<ArticleEditLink path={article.path} language={language} />}
          />
        )}
      </Box>
      {article === undefined ? (
        <Typography color="text.secondary" data-testid="blog-article-missing">
          {t("blog.missingArticle")}
        </Typography>
      ) : (
        <ArticleBody path={article.path} language={language} />
      )}
    </Box>
  );
}

export default BlogArticle;
