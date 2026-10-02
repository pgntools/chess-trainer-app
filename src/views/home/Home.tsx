import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";

import { asAppLanguage } from "../../i18n";
import { useOwnPageHeading } from "../main/pageTitle";
import { frontPages } from "./content";
import { frontPageComponents } from "./frontPage";

/**
 * **The front page** at `/` (CTA-126) — an MDX document in the repo,
 * `content/front-page.<language>.mdx`, compiled at build time by
 * `@mdx-js/rollup` (`vite.config.ts`). Customising the page is editing that
 * file and rebuilding; `content/README.md` is the guide.
 *
 * The document is rendered in the reader's language, with the components of
 * `frontPage/index.ts`: its Markdown in the theme's typography, and the app's
 * components it embeds — the nav cards (every screen, from `navTree()`, so a
 * screen added to `navItems` still appears), the demo boards over the shipped
 * samples, and a stored game.
 *
 * The page keeps its shell duties (CTA-112): its route names it
 * (`pages.home`), and the document's one `#` heading is the page's visible
 * `h1`, so the screen declares it its own.
 */
const Home = () => {
  const { i18n } = useTranslation();
  const FrontPage = frontPages[asAppLanguage(i18n.language)];
  useOwnPageHeading();

  return (
    <Box data-testid="home-page" sx={{ height: "100%", overflowY: "auto", p: 1 }}>
      <FrontPage components={frontPageComponents} />
    </Box>
  );
};

export default Home;
