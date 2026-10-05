import type { AppLanguage } from "../i18n";

/**
 * A per-language string carried by **data** rather than by the locale
 * catalogs — a sidebar entry whose name is not chrome the app ships. `en` is
 * required and is what every other language falls back to, so a
 * half-translated entry renders in English rather than blank.
 */
export type LocalizedText = { en: string } & Partial<Record<AppLanguage, string>>;

/** The active language's text, falling back to English. */
export const localizedText = (
  text: LocalizedText | undefined,
  language: AppLanguage,
): string => (text === undefined ? "" : (text[language] ?? text.en));

/**
 * The active language's text **and the language it is in** — English when it
 * fell back (CTA-135), so the place that shows it can mark it `lang="en"`
 * (WCAG 3.1.2): a screen reader then reads it in English, and it runs left
 * to right inside a mirrored page.
 */
export const localizedTextOf = (
  text: LocalizedText | undefined,
  language: AppLanguage,
): { text: string; language: AppLanguage } => {
  const own = text?.[language];
  return own === undefined ? { text: text?.en ?? "", language: "en" } : { text: own, language };
};
