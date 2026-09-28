import * as React from "react";
import { CacheProvider } from "@emotion/react";
import { ThemeProvider } from "@mui/material/styles";
import { enUS, heIL } from "@mui/material/locale";
import { useTranslation } from "react-i18next";
import { asAppLanguage, rtlLanguages, type AppLanguage } from "../i18n";
import { buildTheme, ltrCache, rtlCache, usePrefersReducedMotion } from "../design-system/theme";
import { isThemeId, themeById } from "../design-system/themes";
import {
  readStoredThemeId,
  storeThemeId,
  ThemeChoiceContext,
  type ThemeChoice,
} from "./themeChoice";

const getLocale = (language: AppLanguage) => (language === "he" ? heIL : enUS);

/**
 * The single owner of every axis of the look: the theme (the reader's choice
 * from the registry, CTA-107), the color scheme (light/dark, via
 * `colorSchemes` + CSS variables) and the text direction, which is derived
 * from the active i18n language rather than stored separately. Changing the
 * language therefore swaps the emotion cache, the theme `direction` and the
 * MUI locale bundle together, which is why they cannot live in separate
 * providers. The reader's system's reduced-motion setting reaches the theme
 * here too (CTA-111): no transitions and no ripple while it asks for less.
 */
export default function AppThemeWithLang({
  children,
}: {
  children: React.ReactNode;
}) {
  const { i18n } = useTranslation();
  const language = asAppLanguage(i18n.language);

  const direction = rtlLanguages.includes(language) ? "rtl" : "ltr";
  const cache = direction === "rtl" ? rtlCache : ltrCache;
  const locale = getLocale(language);

  const [themeId, setThemeIdState] = React.useState(readStoredThemeId);
  const choice = React.useMemo<ThemeChoice>(
    () => ({
      themeId,
      setThemeId: (id) => {
        if (!isThemeId(id)) return;
        storeThemeId(id);
        setThemeIdState(id);
      },
    }),
    [themeId],
  );

  React.useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
    document.body.dir = direction;
  }, [direction, language]);

  const reducedMotion = usePrefersReducedMotion();
  const theme = React.useMemo(
    () => buildTheme(themeById(themeId), "both", direction, { reducedMotion, localization: [locale] }),
    [themeId, direction, locale, reducedMotion],
  );

  return (
    <ThemeChoiceContext.Provider value={choice}>
      <CacheProvider value={cache}>
        <ThemeProvider theme={theme} disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </CacheProvider>
    </ThemeChoiceContext.Provider>
  );
}
