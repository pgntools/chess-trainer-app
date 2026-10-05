import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en";
import he from "./locales/he";
import { defaultLanguage, supportedLanguages, type AppLanguage } from "./languages";
import { appPathOf, languagePrefixOf, switchedLanguageUrl } from "./lib/languagePath";

// The list lives in `languages.ts`, which the build reads too (it carries no i18next).
export { defaultLanguage, rtlLanguages, supportedLanguages, type AppLanguage } from "./languages";

/** Narrows whatever i18next reports to a language this app actually ships. */
export const asAppLanguage = (language: string | undefined): AppLanguage => {
  const base = (language ?? "").split("-")[0];
  return supportedLanguages.includes(base as AppLanguage)
    ? (base as AppLanguage)
    : defaultLanguage;
};

/**
 * Where the reader's language preference is kept — the key the browser
 * language detector wrote before CTA-136, so a preference made then still
 * counts.
 */
export const LANGUAGE_STORAGE_KEY = "i18nextLng";

/** The stored preference, or `undefined` for none (or one the app does not ship, or a storage that cannot be read). */
export const readStoredLanguage = (): AppLanguage | undefined => {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === null) return undefined;
    const language = asAppLanguage(stored);
    return language === stored.split("-")[0] ? language : undefined;
  } catch {
    return undefined;
  }
};

/** Keeps the reader's choice for the next unprefixed address; a storage that refuses it only forgets it. */
export const storeLanguage = (language: AppLanguage): void => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Private mode or a full quota: the choice still applies to this visit.
  }
};

/**
 * **The language the app starts in** (CTA-136): the address's. A prefix
 * (`/he/…`, `lib/languagePath.ts`) names it; no prefix is the default
 * language — unless the reader has chosen another, in which case the address
 * is replaced by the same page under that language's prefix **before
 * anything renders**, so the router starts there. A crawler keeps no
 * preference, so it always finds the default language at the unprefixed
 * address. Outside a browser (the pre-render) it is the default; the
 * pre-render sets each page's itself.
 */
const initialLanguage = (): AppLanguage => {
  if (typeof window === "undefined") return defaultLanguage;
  const base = import.meta.env.BASE_URL;
  const prefixed = languagePrefixOf(appPathOf(window.location.pathname, base));
  if (prefixed !== undefined) return prefixed;
  const stored = readStoredLanguage();
  if (stored === undefined || stored === defaultLanguage) return defaultLanguage;
  window.history.replaceState(window.history.state, "", switchedLanguageUrl(window.location, base, stored));
  return stored;
};

/**
 * Catalogs are inlined rather than fetched through i18next-http-backend: this
 * app ships a handful of shell strings, so a request per language would only
 * add a loading state. The language is the address's (above), not a guess
 * from the browser: the same URL shows every reader the same page.
 */
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      he: { translation: he },
    },
    lng: initialLanguage(),
    fallbackLng: defaultLanguage,
    supportedLngs: [...supportedLanguages],
    load: "languageOnly",
    interpolation: { escapeValue: false },
    // Resources are inline, so there is nothing to wait for — suspending here
    // would only add a blank first paint.
    react: { useSuspense: false },
  });

export default i18n;
