import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { loadThemeSource } from "../../test/themeSource";
import { bootstrapTheme, CATALOG_PATHS, REGISTRY_PATH, THEMES_PATH, type BootstrapRequest, type BootstrapSources } from "./bootstrap";
import { brownTheme } from "./brown";
import { contrastReport, contrastSummary } from "./contrast";
import { defaultTheme } from "./default";
import { themes } from "./registry";

/*
  What `yarn theme:bootstrap` writes (CTA-115), worked out over the real
  files' text: the new theme's file, its registration and both catalog
  names — or every reason it will not, with nothing to write.
*/

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const SOURCES: BootstrapSources = {
  registry: read(REGISTRY_PATH),
  en: read(CATALOG_PATHS.en),
  he: read(CATALOG_PATHS.he),
  themeFiles: readdirSync(join(process.cwd(), THEMES_PATH)),
  themes,
};

const OCEAN: BootstrapRequest = { id: "ocean", name: "Ocean", from: "brown" };

const files = (request: BootstrapRequest, sources = SOURCES) => {
  const result = bootstrapTheme(request, sources);
  if (!result.ok) throw new Error(result.problems.join("\n"));
  return { ...result, byPath: Object.fromEntries(result.files.map((file) => [file.path, file])) };
};

const problems = (request: BootstrapRequest, sources = SOURCES) => {
  const result = bootstrapTheme(request, sources);
  return result.ok ? [] : result.problems;
};

describe("bootstrapTheme", () => {
  it("writes the new theme's file: a copy of --from's tokens under its own id and name key", async () => {
    const { theme, byPath } = files(OCEAN);
    const file = byPath[`${THEMES_PATH}/ocean.ts`];
    expect(file.created).toBe(true);
    expect(file.content).toContain("export const oceanTheme: ThemeDefinition = {");
    expect(file.content).toContain('scaffolded by `yarn theme:bootstrap` as a copy of the "brown" theme');
    expect(file.content).toContain("`/dev/theme-editor?theme=ocean`");
    const loaded = await loadThemeSource(file.content, "oceanTheme");
    expect(loaded).toEqual(theme);
    expect(loaded).toEqual({ ...brownTheme, id: "ocean", labelKey: "appearance.themes.ocean" });
  });

  it("measures as its --from theme does", () => {
    const { theme } = files(OCEAN);
    expect(contrastSummary(contrastReport(theme))).toEqual(contrastSummary(contrastReport(brownTheme)));
  });

  it("registers it: the import in file order, the entry at the end of the list", () => {
    const registry = files(OCEAN).byPath[REGISTRY_PATH].content;
    expect(registry).toContain('import { highContrastTheme } from "./highContrast";\nimport { oceanTheme } from "./ocean";\nimport type');
    expect(registry).toContain("[defaultTheme, brownTheme, greenTheme, highContrastTheme, oceanTheme];");
    // An id earlier in the alphabet goes before the themes after it.
    const amber = files({ id: "amber", name: "Amber", from: "default" }).byPath[REGISTRY_PATH].content;
    expect(amber).toContain('import { amberTheme } from "./amber";\nimport { brownTheme } from "./brown";');
    expect(amber).toContain("highContrastTheme, amberTheme];");
  });

  it("names it in both catalogs — the Hebrew name, or the English one marked for translation", () => {
    const { byPath } = files({ ...OCEAN, id: "deep-sea", nameHe: "ים עמוק" });
    expect(byPath[CATALOG_PATHS.en].content).toContain('      "high-contrast": "High contrast",\n      "deep-sea": "Ocean",\n    },');
    expect(byPath[CATALOG_PATHS.he].content).toContain('      "deep-sea": "ים עמוק",\n    },');
    expect(byPath[`${THEMES_PATH}/deepSea.ts`].content).toContain("export const deepSeaTheme");

    const untranslated = files(OCEAN).byPath[CATALOG_PATHS.he].content;
    expect(untranslated).toContain('      // TODO: translate "Ocean" — the English name until a Hebrew one is given.\n      ocean: "Ocean",\n    },');
  });

  it("changes nothing else in the files it edits", () => {
    const { byPath } = files(OCEAN);
    const without = (text: string, ...lines: string[]) => lines.reduce((rest, line) => rest.replace(line, ""), text);
    expect(without(byPath[CATALOG_PATHS.en].content, '\n      ocean: "Ocean",')).toBe(SOURCES.en);
    expect(
      without(byPath[REGISTRY_PATH].content, 'import { oceanTheme } from "./ocean";\n', ", oceanTheme"),
    ).toBe(SOURCES.registry);
  });

  it("starts from the default theme when asked", () => {
    expect(files({ id: "plain", name: "Plain", from: "default" }).theme).toEqual({ ...defaultTheme, id: "plain", labelKey: "appearance.themes.plain" });
  });

  it.each([
    ["an invalid id", { ...OCEAN, id: "Ocean Blue" }, /not a theme id/],
    ["an id with a double dash", { ...OCEAN, id: "deep--sea" }, /not a theme id/],
    ["a registered id", { ...OCEAN, id: "green" }, /"green" is already registered/],
    ["an empty name", { ...OCEAN, name: "  " }, /--name is empty/],
    ["an empty Hebrew name", { ...OCEAN, nameHe: "" }, /--name-he is empty/],
    ["a name of two lines", { ...OCEAN, name: "Ocean\nBlue" }, /one line/],
    ["an unknown --from", { ...OCEAN, from: "sepia" }, /--from "sepia" is not a registered theme \(default, brown, green, high-contrast\)/],
  ])("refuses %s", (_case, request, problem) => {
    expect(problems(request).join("\n")).toMatch(problem);
  });

  it("refuses a file, an export or a catalog name that already exists", () => {
    expect(problems(OCEAN, { ...SOURCES, themeFiles: [...SOURCES.themeFiles, "ocean.ts"] })).toEqual([`${THEMES_PATH}/ocean.ts already exists`]);
    expect(problems(OCEAN, { ...SOURCES, registry: `${SOURCES.registry}\n// oceanTheme\n` })).toEqual([`${REGISTRY_PATH} already names oceanTheme`]);
    const named = SOURCES.he.replace('"high-contrast": "ניגודיות גבוהה",', '"high-contrast": "ניגודיות גבוהה",\n      ocean: "אוקיינוס",');
    expect(problems(OCEAN, { ...SOURCES, he: named })).toEqual([`${CATALOG_PATHS.he} already names appearance.themes.ocean`]);
  });

  it("refuses files whose shape it does not recognise, rather than guess", () => {
    expect(problems(OCEAN, { ...SOURCES, registry: "export const themes = [];" }).join("\n")).toMatch(/register the theme by hand/);
    expect(problems(OCEAN, { ...SOURCES, en: "export default {};" })).toEqual([`${CATALOG_PATHS.en} has no appearance.themes block this script recognises`]);
  });

  it("reports every problem at once", () => {
    expect(problems({ id: "Bad id", name: "", from: "sepia" })).toHaveLength(3);
    // A taken id is taken everywhere it shows: the registry, its file, its export and both catalogs.
    expect(problems({ ...OCEAN, id: "green" })).toHaveLength(5);
  });

  it("warns that a --from theme's hand-written overrides are not copied", () => {
    const handWritten = { ...brownTheme, overrides: { MuiChip: { defaultProps: { size: "small" as const } } } };
    const result = files(OCEAN, { ...SOURCES, themes: themes.map((theme) => (theme.id === "brown" ? handWritten : theme)) });
    expect(result.warnings.join("\n")).toMatch(/hand-written overrides are not copied/);
    expect(result.theme.overrides).toBeUndefined();
  });
});
