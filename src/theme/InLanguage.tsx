import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { asAppLanguage, rtlLanguages, type AppLanguage } from "../i18n";

type InLanguageProps = {
  /** The language the words are in — `localizedTextOf`'s. Absent, or the page's own: nothing is marked. */
  language: AppLanguage | undefined;
  children: ReactNode;
};

/**
 * **Words in another language than the page's** (CTA-135, WCAG 3.1.2
 * *Language of Parts*) — an English title shown under Hebrew, where it has no
 * translation: an inline `span` with `lang`, so a screen reader switches
 * voice, and `dir`, so its punctuation stays where it was written inside a
 * mirrored row. The `dir` attribute, not CSS: the RTL stylis plugin would
 * flip a `direction` declaration (`ForceLTR`'s note). In the page's own
 * language it renders the words alone.
 */
export function InLanguage({ language, children }: InLanguageProps) {
  const { i18n } = useTranslation();
  if (language === undefined || language === asAppLanguage(i18n.language)) return <>{children}</>;
  return (
    <span lang={language} dir={rtlLanguages.includes(language) ? "rtl" : "ltr"}>
      {children}
    </span>
  );
}
