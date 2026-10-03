import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { asAppLanguage } from "../../i18n";
import { localizedText } from "../../lib/localizedText";
import ArticleBody from "../blog/ArticleBody";
import { findBlogArticle } from "../blog/articles";
import { useOwnPageHeading } from "../main/pageTitle";
import { FRONT_PAGE_ARTICLE } from "./frontPageArticle";

/**
 * **The front page** at `/` (CTA-126) — one of the Blog's MDX articles, the
 * one `frontPageArticle.ts` names: its title as the page's `h1`, then its
 * document (`ArticleBody`, as on its own Blog page), compiled at build time by
 * `@mdx-js/rollup`. Changing the page is pointing that line at another
 * article, or editing the article; `views/home/frontPage/README.md` lists what
 * an article can embed.
 *
 * The page keeps its shell duties (CTA-112): its route names it
 * (`pages.home`), and its visible title is the page's `h1`, so the screen
 * declares it its own.
 */
const Home = () => {
  const { t, i18n } = useTranslation();
  const language = asAppLanguage(i18n.language);
  const article = findBlogArticle(FRONT_PAGE_ARTICLE);
  useOwnPageHeading();

  return (
    <Box data-testid="home-page" sx={{ height: "100%", overflowY: "auto", p: 1 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
        {article === undefined ? t("blog.missingTitle") : localizedText(article.title, language)}
      </Typography>
      <ArticleBody path={FRONT_PAGE_ARTICLE} language={language} />
    </Box>
  );
};

export default Home;
