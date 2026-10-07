import { describe, expect, it } from "vitest";

import i18n, { supportedLanguages } from "../../i18n";
import { appPageFiles, findBlogArticle } from "../blog/articles";
import { DEVELOPMENT_NOTICE_KEY } from "../../lib/developmentNotice";
import { ENGINE_STORAGE_KEY } from "../../lib/engineChoice";
import { LIBRARY_DB_NAME } from "../../lib/libraryDb";
import { THEME_STORAGE_KEY } from "../../theme/themeChoice";
import { LANGUAGE_STORAGE_KEY } from "../../i18n";
import { legalDocument, legalLanguages, LEGAL_PAGES } from "./legalDocuments";

// The documents' text, to hold what they say to the code (the module name is `?raw`, not compiled).
const sources = import.meta.glob("../blog/articles/app-pages/*.mdx", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const sourceOf = (page: string, language: string): string => sources[`../blog/articles/app-pages/${page}${language === "en" ? "" : `.${language}`}.mdx`];

/** Everything the app keeps in the browser — the legal pages must name each (CTA-159). */
const STORED = [
  THEME_STORAGE_KEY,
  ENGINE_STORAGE_KEY,
  LANGUAGE_STORAGE_KEY,
  "mui-mode",
  DEVELOPMENT_NOTICE_KEY,
  // The IndexedDB databases (`chessapp.engine` is also the engine choice's key).
  "chessapp.engine",
  "chessapp.analyses",
  "chessapp.repertoires",
  LIBRARY_DB_NAME,
];

describe("the legal pages' documents (CTA-159)", () => {
  it("are in the Blog's articles folder for the MDX editor, and not the Blog's", () => {
    for (const page of LEGAL_PAGES) {
      expect(findBlogArticle(`app-pages/${page}`), page).toBeUndefined();
      expect(appPageFiles().some((file) => file.path === `app-pages/${page}`), page).toBe(true);
    }
  });

  it("name and describe the page as the catalogs do — the frontmatter is what the editor edits", () => {
    for (const language of supportedLanguages) {
      for (const page of LEGAL_PAGES) {
        const file = appPageFiles().find((entry) => entry.path === `app-pages/${page}` && entry.language === language);
        expect(file?.title, `${page} (${language}) title`).toBe(i18n.getFixedT(language)(`pages.${page}`));
        expect(file?.summary, `${page} (${language}) summary`).toBe(i18n.getFixedT(language)(`pageDescriptions.${page}`));
      }
    }
  });

  it("has a document for every page in every language the app has", () => {
    for (const page of LEGAL_PAGES) {
      expect(legalLanguages(page).sort(), page).toEqual([...supportedLanguages].sort());
      for (const language of supportedLanguages) {
        expect(sourceOf(page, language), `${page} in ${language}`).toBeTruthy();
        expect(legalDocument(page, language).language).toBe(language);
      }
    }
  });

  it("names every key and database the app keeps, in both pages and both languages", () => {
    for (const page of LEGAL_PAGES) {
      for (const language of supportedLanguages) {
        const text = sourceOf(page, language);
        for (const name of STORED) expect(text, `${page} (${language}) names ${name}`).toContain(`\`${name}\``);
      }
    }
  });

  it("states that no cookies are set, and the Privacy Policy links the Cookies Notice and back", () => {
    expect(sourceOf("cookies", "en")).toContain("sets no cookies");
    expect(sourceOf("privacy", "en")).toContain("sets **no cookies**");
    expect(sourceOf("privacy", "en")).toContain("(/cookies)");
    expect(sourceOf("cookies", "en")).toContain("(/privacy)");
    expect(sourceOf("privacy", "he")).toContain("(/cookies)");
    expect(sourceOf("cookies", "he")).toContain("(/privacy)");
  });

  it("names the data controller, and leaves the contact email marked until the owner supplies it", () => {
    expect(sourceOf("privacy", "en")).toContain("Valentin Kantor, P.O.B. 465, Tel Aviv, Israel");
    expect(sourceOf("privacy", "he")).toContain('ת"ד 465');
    expect(sourceOf("privacy", "en")).toContain("TO BE SUPPLIED BY THE OWNER");
  });

  it("cites both regimes: the GDPR and Israel's Protection of Privacy Law, Amendment 13", () => {
    const text = sourceOf("privacy", "en");
    expect(text).toContain("GDPR");
    expect(text).toContain("Amendment 13");
    expect(sourceOf("privacy", "he")).toContain("תיקון 13");
  });
});
