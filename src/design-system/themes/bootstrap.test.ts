import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { loadThemeSource } from "../../test/themeSource";
import { bootstrapTheme, CATALOG_PATHS, REGISTRY_PATH, THEMES_PATH, type BootstrapRequest, type BootstrapSources } from "./bootstrap";
import { brownTheme } from "./brown";
import { camelIdOf, exportNameOf } from "./codegen";
import { contrastReport, contrastSummary } from "./contrast";
import { defaultTheme } from "./default";
import { themes } from "./registry";

/*
  What `yarn theme:bootstrap` writes (CTA-115), worked out over the real
  files' text: the new theme's file, its registration and both catalog
  names — or every reason it will not, with nothing to write.

  The ids here are probes no theme would take, and every assertion about
  the registry is made against the registry as it is — so a theme a
  contributor adds (with this very script) never breaks these tests.
*/

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const SOURCES: BootstrapSources = {
  registry: read(REGISTRY_PATH),
  en: read(CATALOG_PATHS.en),
  he: read(CATALOG_PATHS.he),
  themeFiles: readdirSync(join(process.cwd(), THEMES_PATH)),
  themes,
};

const PROBE: BootstrapRequest = { id: "scaffold-probe", name: "Scaffold probe", from: "brown" };
const PROBE_FILE = `${THEMES_PATH}/scaffoldProbe.ts`;

const files = (request: BootstrapRequest, sources = SOURCES) => {
  const result = bootstrapTheme(request, sources);
  if (!result.ok) throw new Error(result.problems.join("\n"));
  return { ...result, byPath: Object.fromEntries(result.files.map((file) => [file.path, file])) };
};

const problems = (request: BootstrapRequest, sources = SOURCES) => {
  const result = bootstrapTheme(request, sources);
  return result.ok ? [] : result.problems;
};

const THEMES_LIST = /export const themes: readonly ThemeDefinition\[\] = \[([^\]]*)\];/;
/** The names in a registry's `themes` list, in order. */
const listed = (registry: string) =>
  (THEMES_LIST.exec(registry)?.[1] ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
/** A registry's theme imports, `[export, module]`, in file order. */
const imported = (registry: string) =>
  registry.split("\n").flatMap((line) => {
    const match = /^import \{ (\w+) \} from "\.\/(\w+)";$/.exec(line);
    return match === null ? [] : [[match[1], match[2]] as const];
  });

describe("bootstrapTheme", () => {
  it("writes the new theme's file: a copy of --from's tokens under its own id and name key", async () => {
    const { theme, byPath } = files(PROBE);
    const file = byPath[PROBE_FILE];
    expect(file.created).toBe(true);
    expect(file.content).toContain("export const scaffoldProbeTheme: ThemeDefinition = {");
    expect(file.content).toContain('scaffolded by `yarn theme:bootstrap` as a copy of the "brown" theme');
    expect(file.content).toContain("`/dev/theme-editor?theme=scaffold-probe`");
    const loaded = await loadThemeSource(file.content, "scaffoldProbeTheme");
    expect(loaded).toEqual(theme);
    expect(loaded).toEqual({ ...brownTheme, id: "scaffold-probe", labelKey: "appearance.themes.scaffold-probe" });
  });

  it("measures as its --from theme does", () => {
    const { theme } = files(PROBE);
    expect(contrastSummary(contrastReport(theme))).toEqual(contrastSummary(contrastReport(brownTheme)));
  });

  it("registers it: the import in file order among the themes', the entry at the end of the list", () => {
    for (const id of ["scaffold-probe", "aaa-probe", "zzz-probe"]) {
      const [exportName, module] = [exportNameOf(id), camelIdOf(id)];
      const registry = files({ ...PROBE, id }).byPath[REGISTRY_PATH].content;
      expect(listed(registry)).toEqual([...listed(SOURCES.registry), exportName]);
      const after = imported(registry);
      const at = after.findIndex(([name]) => name === exportName);
      expect(at, id).toBeGreaterThanOrEqual(0);
      // Every theme import before it sorts before it, every one after it sorts after it.
      expect(after.slice(0, at).every(([, other]) => other.localeCompare(module) < 0), id).toBe(true);
      expect(after.slice(at + 1).every(([, other]) => other.localeCompare(module) > 0), id).toBe(true);
    }
  });

  it("keeps the list on one line while it fits, and breaks it one entry a line when it does not", () => {
    const short = "export const themes: readonly ThemeDefinition[] = [defaultTheme];";
    const long = `export const themes: readonly ThemeDefinition[] = [${Array.from({ length: 6 }, (_, index) => `someLongThemeName${index}Theme`).join(", ")}];`;
    const broken = "export const themes: readonly ThemeDefinition[] = [\n  defaultTheme,\n  brownTheme,\n];";
    const registryWith = (list: string) => `import { defaultTheme } from "./default";\nimport type { ThemeDefinition } from "./types";\n\n${list}\n`;
    const registered = (list: string) => files(PROBE, { ...SOURCES, registry: registryWith(list) }).byPath[REGISTRY_PATH].content;
    expect(registered(short)).toContain("[defaultTheme, scaffoldProbeTheme];");
    expect(registered(long)).toContain("[\n  someLongThemeName0Theme,\n");
    expect(registered(long)).toContain("  someLongThemeName5Theme,\n  scaffoldProbeTheme,\n];");
    expect(registered(broken)).toContain("[\n  defaultTheme,\n  brownTheme,\n  scaffoldProbeTheme,\n];");
  });

  it("names it in both catalogs — the Hebrew name, or the English one marked for translation", () => {
    const { byPath } = files({ ...PROBE, nameHe: "בדיקה" });
    expect(byPath[CATALOG_PATHS.en].content).toContain('      "scaffold-probe": "Scaffold probe",\n    },');
    expect(byPath[CATALOG_PATHS.he].content).toContain('      "scaffold-probe": "בדיקה",\n    },');

    const untranslated = files(PROBE).byPath[CATALOG_PATHS.he].content;
    expect(untranslated).toContain(
      '      // TODO: translate "Scaffold probe" — the English name until a Hebrew one is given.\n      "scaffold-probe": "Scaffold probe",\n    },',
    );
    // An id that is a plain name is written unquoted, as the catalogs write one.
    expect(files({ ...PROBE, id: "probe" }).byPath[CATALOG_PATHS.en].content).toContain('      probe: "Scaffold probe",\n    },');
  });

  it("changes nothing else in the files it edits", () => {
    const { byPath } = files(PROBE);
    expect(byPath[CATALOG_PATHS.en].content.replace('\n      "scaffold-probe": "Scaffold probe",', "")).toBe(SOURCES.en);
    const without = (registry: string) =>
      registry
        .replace('import { scaffoldProbeTheme } from "./scaffoldProbe";\n', "")
        .replace(THEMES_LIST, "")
        .trim();
    expect(without(byPath[REGISTRY_PATH].content)).toBe(without(SOURCES.registry));
  });

  it("starts from the default theme when asked", () => {
    expect(files({ ...PROBE, from: "default" }).theme).toEqual({ ...defaultTheme, id: "scaffold-probe", labelKey: "appearance.themes.scaffold-probe" });
  });

  it.each([
    ["an invalid id", { ...PROBE, id: "Scaffold Probe" }, /not a theme id/],
    ["an id with a double dash", { ...PROBE, id: "scaffold--probe" }, /not a theme id/],
    ["a registered id", { ...PROBE, id: "green" }, /"green" is already registered/],
    ["an empty name", { ...PROBE, name: "  " }, /--name is empty/],
    ["an empty Hebrew name", { ...PROBE, nameHe: "" }, /--name-he is empty/],
    ["a name of two lines", { ...PROBE, name: "Scaffold\nprobe" }, /one line/],
    ["an unknown --from", { ...PROBE, from: "sepia-probe" }, /--from "sepia-probe" is not a registered theme \(default, brown, green, high-contrast/],
  ])("refuses %s", (_case, request, problem) => {
    expect(problems(request).join("\n")).toMatch(problem);
  });

  it("refuses a file, an export or a catalog name that already exists", () => {
    expect(problems(PROBE, { ...SOURCES, themeFiles: [...SOURCES.themeFiles, "scaffoldProbe.ts"] })).toEqual([`${PROBE_FILE} already exists`]);
    expect(problems(PROBE, { ...SOURCES, registry: `${SOURCES.registry}\n// scaffoldProbeTheme\n` })).toEqual([`${REGISTRY_PATH} already names scaffoldProbeTheme`]);
    const named = SOURCES.he.replace('"high-contrast": "ניגודיות גבוהה",', '"high-contrast": "ניגודיות גבוהה",\n      "scaffold-probe": "בדיקה",');
    expect(problems(PROBE, { ...SOURCES, he: named })).toEqual([`${CATALOG_PATHS.he} already names appearance.themes.scaffold-probe`]);
  });

  it("refuses files whose shape it does not recognise, rather than guess", () => {
    expect(problems(PROBE, { ...SOURCES, registry: "export const themes = [];" }).join("\n")).toMatch(/register the theme by hand/);
    expect(problems(PROBE, { ...SOURCES, en: "export default {};" })).toEqual([`${CATALOG_PATHS.en} has no appearance.themes block this script recognises`]);
  });

  it("reports every problem at once", () => {
    expect(problems({ id: "Bad id", name: "", from: "sepia-probe" })).toHaveLength(3);
    // A taken id is taken everywhere it shows: the registry, its file, its export and both catalogs.
    expect(problems({ ...PROBE, id: "green" })).toHaveLength(5);
  });

  it("warns that a --from theme's hand-written overrides are not copied", () => {
    const handWritten = { ...brownTheme, overrides: { MuiChip: { defaultProps: { size: "small" as const } } } };
    const result = files(PROBE, { ...SOURCES, themes: themes.map((theme) => (theme.id === "brown" ? handWritten : theme)) });
    expect(result.warnings.join("\n")).toMatch(/hand-written overrides are not copied/);
    expect(result.theme.overrides).toBeUndefined();
  });
});
