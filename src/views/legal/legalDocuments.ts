import type { AppLanguage } from "../../i18n";
import { APP_PAGES_FOLDER } from "../../lib/articleFrontmatter";
import { appPageDocument, appPageFiles } from "../blog/articles";

/**
 * **The legal pages' documents** (CTA-159) — the Privacy Policy and the
 * Cookies Notice are MDX files in the Blog's articles folder, under
 * `articles/app-pages/<page>.mdx` with `<page>.he.mdx` beside it, so the MDX
 * editor opens and saves them like any article. They are **not the Blog's**
 * (`isAppPagePath`): not listed, not at `/blog/…`; `/privacy` and `/cookies`
 * show them (`LegalPage`). Each is its own lazy chunk, loaded when its page
 * renders (the pre-render waits for it).
 *
 * Their frontmatter's `title` and `summary` are the page's name and
 * description in the catalogs (`pages.*`, `pageDescriptions.*` — the footer,
 * the tab title and the share preview read those); `legalDocuments.test.ts`
 * holds the two to each other. A language with no file shows the English one.
 */

export type LegalPageId = "privacy" | "cookies";

export const LEGAL_PAGES: readonly LegalPageId[] = ["privacy", "cookies"];

/** The page's document in `language` — or its English one, with `language` saying which it is. */
export const legalDocument = (page: LegalPageId, language: AppLanguage) => {
  const document = appPageDocument(page, language);
  if (document === undefined) throw new Error(`${APP_PAGES_FOLDER}/${page}.mdx is missing`);
  return document;
};

/** The languages a page has a body in. */
export const legalLanguages = (page: LegalPageId): AppLanguage[] =>
  appPageFiles()
    .filter((file) => file.path === `${APP_PAGES_FOLDER}/${page}` && file.hasBody)
    .map((file) => file.language);
