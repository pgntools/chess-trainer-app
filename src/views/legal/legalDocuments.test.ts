import { describe, expect, it } from "vitest";

import i18n, { supportedLanguages } from "../../i18n";
import { appPageFiles, findBlogArticle } from "../blog/articles";
import { DEVELOPMENT_NOTICE_KEY } from "../../lib/developmentNotice";
import { ENGINE_STORAGE_KEY } from "../../lib/engineChoice";
import { ENGINE_SERVER_STORAGE_KEY } from "../../lib/engineServer";
import { ENGINE_SEARCH_SETTINGS_STORAGE_KEY } from "../../lib/engineSearchSettings";
import { JOBS_SETTINGS_STORAGE_KEY } from "../../lib/jobsSettings";
import { EVAL_SOURCES } from "../../lib/evalSources";
import { ENGINE_PRESETS_DB_NAME } from "../../lib/enginePresetStore";
import { LIBRARY_DB_NAME } from "../../lib/libraryDb";
import { ANALYSIS_PROJECTS_DB_NAME } from "../../lib/analysisProjectsDb";
import { RETIRED_DATABASES } from "../../lib/retiredDatabases";
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
  ENGINE_SERVER_STORAGE_KEY,
  // The engine's search settings, every board's (CTA-181).
  ENGINE_SEARCH_SETTINGS_STORAGE_KEY,
  // The Jobs settings — the default engine and preset (CTA-193).
  JOBS_SETTINGS_STORAGE_KEY,
  // What each eval source keeps — the lichess evaluation API's settings (CTA-196).
  ...EVAL_SOURCES.flatMap((source) => source.storageKeys),
  LANGUAGE_STORAGE_KEY,
  "mui-mode",
  DEVELOPMENT_NOTICE_KEY,
  // The IndexedDB databases (`chessapp.engine` is also the engine choice's key).
  "chessapp.engine",
  "chessapp.repertoires",
  LIBRARY_DB_NAME,
  // The engine option presets (CTA-179).
  ENGINE_PRESETS_DB_NAME,
  // Analysis V2 — its Projects, Cases, jobs and links (CTA-186, shipped in CTA-192).
  ANALYSIS_PROJECTS_DB_NAME,
];

/** The pages that disclose what the app stores — another in-app page (a Terms page, an About) need not. */
const DISCLOSURE_PAGES = ["privacy", "cookies"] as const;

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
    for (const page of DISCLOSURE_PAGES) {
      for (const language of supportedLanguages) {
        const text = sourceOf(page, language);
        for (const name of STORED) expect(text, `${page} (${language}) names ${name}`).toContain(`\`${name}\``);
      }
    }
  });

  it("name no database the app no longer keeps — each load deletes them (CTA-192)", () => {
    for (const page of DISCLOSURE_PAGES) {
      for (const language of supportedLanguages) {
        const text = sourceOf(page, language);
        for (const name of RETIRED_DATABASES) expect(text, `${page} (${language}) leaves out ${name}`).not.toContain(`\`${name}\``);
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

  it("ends the Privacy Policy with the data controller, and gives the privacy address on both pages", () => {
    for (const language of supportedLanguages) {
      const headings = [...sourceOf("privacy", language).matchAll(/^## (.+)$/gm)].map((match) => match[1]);
      expect(headings.at(-1), `privacy (${language})`).toBe(language === "en" ? "Data controller" : "בעל השליטה במידע");
      for (const page of DISCLOSURE_PAGES) {
        const text = sourceOf(page, language);
        // The operator is the build's (CTA-182): the source names them by placeholder alone.
        for (const placeholder of ["%OPERATOR_NAME%", "%OPERATOR_ADDRESS%", "%PRIVACY_EMAIL%"]) {
          expect(text, `${page} (${language}) has ${placeholder}`).toContain(placeholder);
        }
        expect(text, `${page} (${language}) writes no email address of its own`).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
        expect(text, `${page} (${language}) has no draft's gap left`).not.toMatch(/TO BE SUPPLIED|ימסור בעל המוצר/);
      }
    }
  });

  it("cites both regimes: the GDPR and Israel's Protection of Privacy Law, Amendment 13", () => {
    const text = sourceOf("privacy", "en");
    expect(text).toContain("GDPR");
    expect(text).toContain("Amendment 13");
    expect(sourceOf("privacy", "he")).toContain("תיקון 13");
  });
});
