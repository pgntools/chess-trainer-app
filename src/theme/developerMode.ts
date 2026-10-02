import { createContext, useContext } from "react";

/**
 * **The reader's developer mode preference** — a preference, so it lives in
 * `localStorage` beside the theme choice and the colour mode (`database.md`: only
 * preferences are `localStorage`). `AppThemeWithLang` owns it; the System tab
 * changes it through {@link useDeveloperMode}.
 */
export const DEVELOPER_MODE_STORAGE_KEY = "chessapp.developerMode";

/**
 * The stored preference, or `false` as the default — for none at all,
 * and where storage cannot be read.
 */
export const readStoredDeveloperMode = (): boolean => {
  try {
    const stored = localStorage.getItem(DEVELOPER_MODE_STORAGE_KEY);
    return stored === "true";
  } catch {
    return false;
  }
};

/** Keeps the choice for the next visit; a storage that refuses it only forgets it. */
export const storeDeveloperMode = (enabled: boolean): void => {
  try {
    localStorage.setItem(DEVELOPER_MODE_STORAGE_KEY, String(enabled));
  } catch {
    // Private mode or a full quota: the choice still applies to this visit.
  }
};

export type DeveloperMode = {
  /** Whether developer mode is enabled. */
  enabled: boolean;
  /** Switches the developer mode at once and keeps the choice. */
  setEnabled: (enabled: boolean) => void;
};

export const DeveloperModeContext = createContext<DeveloperMode>({
  enabled: false,
  setEnabled: () => {},
});

/** The developer mode state and how to change it. */
export const useDeveloperMode = (): DeveloperMode => useContext(DeveloperModeContext);