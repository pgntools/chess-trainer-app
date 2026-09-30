import { createContext, useContext } from "react";

import { DEFAULT_THEME_ID, isThemeId } from "../design-system/themes";

/**
 * **The reader's theme choice** (CTA-107) — a preference, so it lives in
 * `localStorage` beside the colour mode and the language (`database.md`: only
 * preferences are `localStorage`). `AppThemeWithLang` owns it; the Appearance
 * tab changes it through {@link useThemeChoice}.
 */
export const THEME_STORAGE_KEY = "chessapp.theme";

/**
 * The stored choice, or the default theme's id — for a stored id that names
 * no registered theme (an older build's, a hand-edited one), for none at all,
 * and where storage cannot be read.
 */
export const readStoredThemeId = (): string => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeId(stored) ? stored : DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
};

/** Keeps the choice for the next visit; a storage that refuses it only forgets it. */
export const storeThemeId = (id: string): void => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // Private mode or a full quota: the choice still applies to this visit.
  }
};

export type ThemeChoice = {
  /** The registered theme in use. */
  themeId: string;
  /** Switches the theme at once and keeps the choice; an unknown id is ignored. */
  setThemeId: (id: string) => void;
};

export const ThemeChoiceContext = createContext<ThemeChoice>({
  themeId: DEFAULT_THEME_ID,
  setThemeId: () => {},
});

/** The theme in use and how to change it. */
export const useThemeChoice = (): ThemeChoice => useContext(ThemeChoiceContext);
