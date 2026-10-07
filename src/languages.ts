/**
 * **The languages the app ships** — the list alone, with nothing of i18next,
 * so code that runs outside the browser can read it: the build's Blog plugin
 * (`plugins/blogArticles.ts`), which rejects an article file in a language
 * the app has not got, and the browser pass's route list. `src/i18n.ts`
 * re-exports all of it; the app imports it from there.
 */
export const supportedLanguages = ["en", "he"] as const;

export type AppLanguage = (typeof supportedLanguages)[number];

/** Languages whose layout mirrors. `AppThemeWithLang` derives direction from this. */
export const rtlLanguages: readonly AppLanguage[] = ["he"];

export const defaultLanguage: AppLanguage = "en";
