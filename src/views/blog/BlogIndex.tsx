import { Link as RouterLink, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";

import { CardGrid, FolderCard, IconCard } from "../../design-system/components/cards";
import { Breadcrumbs } from "../../design-system/components/navigation";
import { asAppLanguage } from "../../i18n";
import { localizedText } from "../../lib/localizedText";
import { useOwnPageHeading, usePageTitle } from "../main/pageTitle";
import { blogArticleCount, blogFolderChain, blogFolderContents, findBlogFolder } from "./articles";

/**
 * **The Blog's index** (CTA-126) — `/blog`, and a folder of it at
 * `/blog/<folder>`: the folders inside it as folder cards, each with how many
 * articles it holds, then its articles as cards with their one-line summary;
 * a trail back through the folders above. Read off `articles.ts`, so a folder
 * or an article added there shows here with no edit. An address that names
 * no folder says so.
 */
function BlogIndex() {
  const { t, i18n } = useTranslation();
  const language = asAppLanguage(i18n.language);
  const path = useLocation().pathname.replace(/^\/blog\/?/, "").replace(/\/+$/, "");
  const folder = path === "" ? undefined : findBlogFolder(path);
  const known = path === "" || folder !== undefined;
  const title = folder === undefined ? t("blog.title") : localizedText(folder.title, language);
  usePageTitle(folder === undefined ? undefined : title);
  useOwnPageHeading();

  const { folders, articles } = blogFolderContents(path);
  const crumbs =
    path === ""
      ? []
      : [
          { id: "root", label: t("blog.title"), link: { component: RouterLink, to: "/blog" } },
          ...blogFolderChain(`${path}/_`)
            .filter((above) => above.path !== path)
            .map((above) => ({
              id: above.path,
              label: localizedText(above.title, language),
              link: { component: RouterLink, to: `/blog/${above.path}` },
            })),
        ];

  return (
    <Box data-testid="blog-index" sx={{ p: 1 }}>
      {crumbs.length > 0 && (
        <Breadcrumbs ariaLabel={t("blog.breadcrumbs")} crumbs={crumbs} current={title} testId="blog-index-crumbs" />
      )}
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mt: 1, mb: 2 }}>
        {known ? title : t("blog.missingTitle")}
      </Typography>

      {!known ? (
        <Typography color="text.secondary" data-testid="blog-index-missing">
          {t("blog.missingFolder")}
        </Typography>
      ) : (
        <>
          {folders.length > 0 && (
            <Box component="section" aria-labelledby="blog-folders" sx={{ mb: 3 }}>
              <Typography id="blog-folders" variant="overline" component="h2" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                {t("blog.folders")}
              </Typography>
              <CardGrid size="medium" testId="blog-folders">
                {folders.map((inside) => {
                  const name = localizedText(inside.title, language);
                  return (
                    <FolderCard
                      key={inside.path}
                      name={name}
                      icon={<FolderRoundedIcon />}
                      count={t("blog.articles", { count: blogArticleCount(inside.path) })}
                      link={{ component: RouterLink, to: `/blog/${inside.path}` }}
                      openLabel={t("blog.openFolder", { name })}
                      testId={`blog-folder-${inside.path}`}
                    />
                  );
                })}
              </CardGrid>
            </Box>
          )}
          {articles.length > 0 && (
            <Box component="section" aria-labelledby="blog-articles">
              <Typography id="blog-articles" variant="overline" component="h2" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                {t("blog.articlesHeading")}
              </Typography>
              <CardGrid size="medium" testId="blog-articles">
                {articles.map((article) => (
                  <IconCard
                    key={article.path}
                    icon={<ArticleRoundedIcon />}
                    label={localizedText(article.title, language)}
                    description={localizedText(article.summary, language)}
                    link={{ component: RouterLink, to: `/blog/${article.path}` }}
                    testId={`blog-article-${article.path}`}
                  />
                ))}
              </CardGrid>
            </Box>
          )}
          {folders.length === 0 && articles.length === 0 && (
            <Typography color="text.secondary">{t("blog.noArticles")}</Typography>
          )}
        </>
      )}
    </Box>
  );
}

export default BlogIndex;
