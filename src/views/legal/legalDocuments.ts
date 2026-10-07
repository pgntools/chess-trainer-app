import { lazy, type LazyExoticComponent } from "react";
import type { MDXContent } from "mdx/types";

import type { AppLanguage } from "../../i18n";

/**
 * **The legal pages' documents** (CTA-159) — the Privacy Policy and the
 * Cookies Notice, MDX in `documents/<page>.mdx` with `<page>.he.mdx` beside
 * it. Unlike a Blog article they carry no frontmatter and are in no registry:
 * not listed in the Blog or the sidebar, reached from the footer. Each is its
 * own lazy chunk, loaded when its page renders (the pre-render waits for it).
 *
 * Both languages are written — a language with no file would show the English
 * one (`legalDocument`), but `legalDocuments.test.ts` holds every page to a
 * document in every language the app has.
 */

export type LegalPageId = "privacy" | "cookies";

export const LEGAL_PAGES: readonly LegalPageId[] = ["privacy", "cookies"];

type LazyDocument = LazyExoticComponent<MDXContent>;

const documents: Record<LegalPageId, Partial<Record<AppLanguage, LazyDocument>> & { en: LazyDocument }> = {
  privacy: {
    en: lazy(() => import("./documents/privacy.mdx")),
    he: lazy(() => import("./documents/privacy.he.mdx")),
  },
  cookies: {
    en: lazy(() => import("./documents/cookies.mdx")),
    he: lazy(() => import("./documents/cookies.he.mdx")),
  },
};

/** The page's document in `language` — or its English one, with `language` saying which it is. */
export const legalDocument = (page: LegalPageId, language: AppLanguage): { Content: LazyDocument; language: AppLanguage } => {
  const own = documents[page][language];
  return own === undefined ? { Content: documents[page].en, language: "en" } : { Content: own, language };
};

/** The languages a page has a document in. */
export const legalLanguages = (page: LegalPageId): AppLanguage[] =>
  (Object.keys(documents[page]) as AppLanguage[]).filter((language) => documents[page][language] !== undefined);
