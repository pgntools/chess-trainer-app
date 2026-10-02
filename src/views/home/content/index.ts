import type { MDXContent } from "mdx/types";

import type { AppLanguage } from "../../../i18n";
import FrontPageEn from "./front-page.en.mdx";
import FrontPageHe from "./front-page.he.mdx";

/**
 * **The front page's documents, one per language** (CTA-126) — MDX compiled
 * at build time. Typed by `AppLanguage`, so a language added to
 * `supportedLanguages` without its document is a compile error, as a missing
 * catalog key is. `content/README.md` says how to edit one.
 */
export const frontPages: Record<AppLanguage, MDXContent> = {
  en: FrontPageEn,
  he: FrontPageHe,
};
