import { Link as RouterLink, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";

import { CardGrid, FolderCard, IconCard } from "../../design-system/components/cards";
import { Breadcrumbs } from "../../design-system/components/navigation";
import { LabelChip } from "../../design-system/components/tables";
import { asAppLanguage } from "../../i18n";
import { localizedText, localizedTextOf, type LocalizedText } from "../../lib/localizedText";
import { InLanguage } from "../../theme/InLanguage";
import { useOwnPageHeading } from "../main/pageTitle";
import ArticleBody from "./ArticleBody";
import { blogArticleCount, blogFolderChain, blogFolderContents, blogPathOf, findBlogFolder } from "./articles";

/**
 * **The Blog's index** (CTA-126) — `/blog`, and a folder of it at
 * `/blog/<folder>`: the folders inside it as folder cards, each with how many
 * articles it holds, then its articles as cards with their one-line summary;
 * a trail back through the folders above. Read off `articles.ts`, so a folder
 * or an article added there shows here with no edit; a folder's `index.mdx`
 * names it, and its body, if any, introduces it above the cards (CTA-135).
 * An address that names no folder says so.
 *
 * Its page title comes from the Blog route's `handle.meta` (`blogPageMeta.ts`).
 * A name shown in English under another language is marked `lang="en"`
 * (`InLanguage`), and a draft's card carries its chip.
 */
function BlogIndex() {
  const { t, i18n } = useTranslation();
  const language = asAppLanguage(i18n.language);
  const path = blogPathOf(useLocation().pathname);
  const folder = path === "" ? undefined : findBlogFolder(path);
  const known = path === "" || folder !== undefined;
  const title = folder === undefined ? { text: t("blog.title"), language } : localizedTextOf(folder.title, language);
  const marked = (text: LocalizedText) => {
    const shown = localizedTextOf(text, language);
    return <InLanguage language={shown.language}>{shown.text}</InLanguage>;
  };
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
              label: marked(above.title),
              link: { component: RouterLink, to: `/blog/${above.path}` },
            })),
        ];
  const heading = <InLanguage language={title.language}>{title.text}</InLanguage>;

  return (
    <Box data-testid="blog-index" sx={{ p: 1 }}>
      {crumbs.length > 0 && (
        <Breadcrumbs ariaLabel={t("blog.breadcrumbs")} crumbs={crumbs} current={heading} testId="blog-index-crumbs" />
      )}
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mt: 1, mb: 2 }}>
        {known ? heading : t("blog.missingTitle")}
      </Typography>

      {!known ? (
        <Typography color="text.secondary" data-testid="blog-index-missing">
          {t("blog.missingFolder")}
        </Typography>
      ) : (
        <>
          <ArticleBody path={path} language={language} folder />
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
                      name={marked(inside.title)}
                      icon={<FolderRoundedIcon />}
                      count={t("blog.articles", { count: blogArticleCount(inside.path) })}
                      detail={inside.summary === undefined ? undefined : marked(inside.summary)}
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
                    label={
                      article.draft ? (
                        <>
                          {marked(article.title)} <LabelChip label={t("blog.draft")} tone="warning" testId={`blog-draft-${article.path}`} />
                        </>
                      ) : (
                        marked(article.title)
                      )
                    }
                    description={marked(article.summary)}
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
