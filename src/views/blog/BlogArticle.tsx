import { Link as RouterLink, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { Breadcrumbs } from "../../design-system/components/navigation";
import { asAppLanguage } from "../../i18n";
import { localizedText } from "../../lib/localizedText";
import { useOwnPageHeading, usePageTitle } from "../main/pageTitle";
import ArticleBody from "./ArticleBody";
import { ArticleEditLink } from "./ArticleEditLink";
import { blogFolderChain, findBlogArticle } from "./articles";

/**
 * **A Blog article** (CTA-126) at `/blog/<path>` — the article the address
 * names (`articles.ts`), under a trail back through its folders: its title
 * the page's `h1` and its page title's first part, then its MDX document
 * (`ArticleBody`, which the front page shows its article with too). An
 * address that names no article says so.
 */
function BlogArticle() {
  const { t, i18n } = useTranslation();
  const language = asAppLanguage(i18n.language);
  const path = useLocation().pathname.replace(/^\/blog\/?/, "").replace(/\/+$/, "");
  const article = findBlogArticle(path);
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

  return (
    <Box data-testid="blog-article" sx={{ p: 1 }}>
      <Breadcrumbs
        ariaLabel={t("blog.breadcrumbs")}
        crumbs={crumbs}
        current={title ?? t("blog.missingTitle")}
        testId="blog-article-crumbs"
      />
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1, mb: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          {title ?? t("blog.missingTitle")}
        </Typography>
        {article !== undefined && <ArticleEditLink path={article.path} language={language} />}
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
