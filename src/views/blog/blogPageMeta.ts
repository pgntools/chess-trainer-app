import type { UIMatch } from "react-router";

import type { AppLanguage } from "../../i18n";
import { localizedText } from "../../lib/localizedText";
import type { PageMeta } from "../main/routeHandle";
import { blogPageOf, blogPathOf } from "./articles";

/**
 * **The page a Blog address names** (CTA-135), for the route's `handle.meta`:
 * an article's title — first in the page title, "Every screen as cards — Blog
 * — Chess Trainer App" — and its description (its `description`, else its
 * summary); a folder's name; the Blog's own index and an address that names
 * nothing, the route's own title alone. From the address and the registry
 * only, so a page rendered ahead of time has it too.
 */
export const blogPageMeta = (match: UIMatch, language: AppLanguage): PageMeta => {
  const page = blogPageOf(blogPathOf(match.pathname));
  switch (page.kind) {
    case "article":
      return {
        title: localizedText(page.article.title, language),
        description: localizedText(page.article.description ?? page.article.summary, language),
      };
    case "redirect":
      return { title: localizedText(page.to.title, language) };
    case "folder":
      return page.folder === undefined ? {} : { title: localizedText(page.folder.title, language) };
    case "missing":
      return {};
  }
};
