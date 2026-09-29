import { brownTheme } from "./brown";
import { consoleTheme } from "./console";
import { defaultTheme } from "./default";
import { greenTheme } from "./green";
import { highContrastTheme } from "./highContrast";
import type { ThemeDefinition } from "./types";

/** The theme every reader starts on, and where an unknown choice lands. */
export const DEFAULT_THEME_ID = defaultTheme.id;

/**
 * **Every registered theme**, in the order the Appearance tab lists them.
 * Adding a theme is a file beside `default.ts` and one entry here — the
 * pickers, the gallery and `buildTheme` read this list and nothing else.
 */
export const themes: readonly ThemeDefinition[] = [
  defaultTheme,
  brownTheme,
  greenTheme,
  highContrastTheme,
  consoleTheme,
];

/** Whether `id` names a registered theme. */
export const isThemeId = (id: unknown): id is string =>
  typeof id === "string" && themes.some((theme) => theme.id === id);

/**
 * The theme `id` names, or the default one — a stored id from an older build,
 * a hand-edited one or none at all never leaves the app without a theme.
 */
export const themeById = (id: string | null | undefined): ThemeDefinition =>
  themes.find((theme) => theme.id === id) ?? defaultTheme;
