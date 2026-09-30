import { describe, expect, it } from "vitest";

import { contrastReport, themes, type ThemeDefinition } from "../../../design-system/themes";
import { themeDataOf } from "./draft";
import { FIELDS, SECTIONS, fieldIdOf, sectionOfToken } from "./sections";

/*
  The theme editor's sections (CTA-115) cover a theme: every token of every
  registered theme has one field, and every contrast check has a field to
  jump to.
*/

/** The paths of a theme's leaves — its tokens — but its id and name key, which the Theme section edits. */
const tokenPaths = (value: unknown, path = ""): string[] => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([key, child]) => tokenPaths(child, path === "" ? key : `${path}.${key}`));
  }
  return [path];
};
const tokensOf = (theme: ThemeDefinition) => tokenPaths(themeDataOf(theme)).filter((path) => path !== "id" && path !== "labelKey");

describe("the theme editor's sections", () => {
  it("give every token of every registered theme a field", () => {
    const edited = new Set(FIELDS.map((field) => field.path));
    for (const theme of themes) {
      const missing = tokensOf(theme).filter((path) => !edited.has(path));
      expect(missing, theme.id).toEqual([]);
    }
  });

  it("give each token one field, in one section", () => {
    const paths = FIELDS.map((field) => field.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(new Set(SECTIONS.map((section) => section.id)).size).toBe(SECTIONS.length);
  });

  it("have a field for every token a contrast check measures", () => {
    for (const theme of themes) {
      for (const check of contrastReport(theme)) expect(sectionOfToken(check.token), check.token).toBeDefined();
    }
  });

  it("are the sections the Story names, in its order", () => {
    expect(SECTIONS.map((section) => section.title)).toEqual([
      "Theme",
      "Palette — light",
      "Palette — dark",
      "Typography",
      "Shape & components",
      "Accessibility",
      "Board",
      "Arrows",
      "Annotations",
      "Map & Library",
    ]);
  });

  it("give each field an input id of its path", () => {
    expect(fieldIdOf("light.primary.main")).toBe("theme-editor-field-light-primary-main");
  });
});
