import { describe, expect, it } from "vitest";

import en from "../../locales/en";
import he from "../../locales/he";
import { defaultTheme } from "./default";
import { DEFAULT_THEME_ID, isThemeId, themeById, themes } from "./registry";

const read = (catalog: unknown, key: string): unknown =>
  key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], catalog);

describe("the theme registry", () => {
  it("holds the default theme, first", () => {
    expect(DEFAULT_THEME_ID).toBe("default");
    expect(themes[0]).toBe(defaultTheme);
  });

  it("gives every theme a unique id", () => {
    const ids = themes.map((theme) => theme.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("names every theme by a catalog key present in both languages", () => {
    for (const theme of themes) {
      expect(typeof read(en, theme.labelKey)).toBe("string");
      expect(typeof read(he, theme.labelKey)).toBe("string");
    }
  });

  it("gives every theme both schemes and every chess token group", () => {
    const groups = Object.keys(defaultTheme.chess).sort();
    for (const theme of themes) {
      expect(theme.light.background).toBeDefined();
      expect(theme.dark.background).toBeDefined();
      expect(Object.keys(theme.chess).sort()).toEqual(groups);
    }
  });

  it("finds a theme by id, and falls back to the default for any other id", () => {
    expect(themeById("default")).toBe(defaultTheme);
    expect(themeById("no-such-theme")).toBe(defaultTheme);
    expect(themeById(null)).toBe(defaultTheme);
    expect(themeById(undefined)).toBe(defaultTheme);
  });

  it("tells a registered id from anything else", () => {
    expect(isThemeId("default")).toBe(true);
    expect(isThemeId("no-such-theme")).toBe(false);
    expect(isThemeId(null)).toBe(false);
    expect(isThemeId(7)).toBe(false);
  });
});
