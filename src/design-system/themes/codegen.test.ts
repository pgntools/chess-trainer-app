import { describe, expect, it } from "vitest";

import { loadThemeSource, typecheckThemeSource } from "../../test/themeSource";
import {
  camelIdOf,
  exportNameOf,
  hasHandOverrides,
  isValidThemeId,
  labelKeyOf,
  themeFileNameOf,
  themeSource,
} from "./codegen";
import { brownTheme } from "./brown";
import { defaultTheme } from "./default";
import { highContrastTheme } from "./highContrast";
import { themes } from "./registry";
import type { ThemeDefinition } from "./types";

/*
  The generator both theme-authoring tools share (CTA-115): a theme's data
  in, its file out — and the file loads back as the same data.
*/

const sourceOf = (definition: ThemeDefinition) =>
  themeSource(definition, { exportName: exportNameOf(definition.id), comment: `**${definition.id}**, generated.` });

describe("themeSource", () => {
  it.each(themes.map((definition) => [definition.id, definition] as const))(
    "round-trips the %s theme: its file loads back deep-equal to its data",
    async (_id, definition) => {
      const loaded = await loadThemeSource(sourceOf(definition), exportNameOf(definition.id));
      expect(loaded).toEqual(definition);
      // And writing the loaded theme again gives the same file.
      expect(sourceOf(loaded)).toBe(sourceOf(definition));
    },
  );

  it("writes the house style: the type import, the doc comment, one exported object", () => {
    const source = themeSource(brownTheme, { exportName: "brownTheme", comment: "**Brown**, again.\n\nA second paragraph." });
    expect(source.startsWith('import type { ThemeDefinition } from "./types";\n\n/**\n * **Brown**, again.\n *\n * A second paragraph.\n */\n')).toBe(true);
    expect(source).toContain("export const brownTheme: ThemeDefinition = {\n");
    expect(source).toContain('  id: "brown",\n  labelKey: "appearance.themes.brown",\n  light: {\n');
    // Short groups stay on one line; a font stack is written as the house style writes one.
    expect(source).toContain('    primary: { main: "#186cbc" },\n');
    expect(source).toContain(`    fontFamily: ['"Noto Sans"', "Roboto", "ui-sans-serif", "system-ui", "-apple-system", '"Segoe UI"', "sans-serif"].join(", "),`);
    expect(source).toContain("    selectedRow: { radius: 4, rest: 0.16, hover: 0.24, accent: 0 },\n");
    expect(source.endsWith("};\n")).toBe(true);
    expect(source).not.toMatch(/=>|function/);
  });

  it("quotes a key that is not a name", () => {
    expect(sourceOf({ ...defaultTheme, id: "high-contrast" })).toContain('id: "high-contrast"');
    const withQuotedKey = { ...defaultTheme, light: { ...defaultTheme.light, "odd-key": "#fff" } } as ThemeDefinition;
    expect(sourceOf(withQuotedKey)).toContain('"odd-key": "#fff"');
  });

  it("writes the top level in the house order, whatever order the data came in", async () => {
    const { chess, id, ...rest } = highContrastTheme;
    const shuffled = { chess, ...rest, id } as ThemeDefinition;
    const source = sourceOf(shuffled);
    expect(source.indexOf("  id:")).toBeLessThan(source.indexOf("  light:"));
    expect(source.indexOf("  components:")).toBeLessThan(source.indexOf("  chess:"));
    expect(await loadThemeSource(source, "highContrastTheme")).toEqual(highContrastTheme);
  });

  it("never writes hand-written overrides, and says a theme has them", () => {
    const handWritten: ThemeDefinition = { ...defaultTheme, overrides: { MuiChip: { defaultProps: { size: "small" } } } };
    expect(hasHandOverrides(handWritten)).toBe(true);
    expect(hasHandOverrides(defaultTheme)).toBe(false);
    expect(sourceOf(handWritten)).toBe(sourceOf(defaultTheme));
  });

  it("refuses what is not data, and a name no file can export", () => {
    expect(() => sourceOf({ ...defaultTheme, focusRingWidth: Number.NaN })).toThrow(/finite/);
    expect(() => themeSource(defaultTheme, { exportName: "not a name", comment: "" })).toThrow(/export/);
  });

  it("writes a file that compiles as a theme under the app's compiler options", () => {
    const diagnostics = typecheckThemeSource(
      themeSource({ ...brownTheme, id: "ocean", labelKey: labelKeyOf("ocean") }, { exportName: "oceanTheme", comment: "Ocean." }),
      "ocean.ts",
    );
    expect(diagnostics).toEqual([]);
    // And the check can fail: a token of the wrong type is reported.
    const broken = sourceOf(defaultTheme).replace("focusRingWidth: 2,", 'focusRingWidth: "2",');
    expect(typecheckThemeSource(broken, "ocean.ts").join("\n")).toMatch(/not assignable/);
  }, 60_000);
});

describe("a theme's names", () => {
  it("are all made of its id", () => {
    expect(camelIdOf("high-contrast")).toBe("highContrast");
    expect(camelIdOf("ocean")).toBe("ocean");
    expect(camelIdOf("deep-sea-2")).toBe("deepSea2");
    expect(exportNameOf("high-contrast")).toBe("highContrastTheme");
    expect(themeFileNameOf("high-contrast")).toBe("highContrast.ts");
    expect(labelKeyOf("ocean")).toBe("appearance.themes.ocean");
  });

  it("take an id of lower-case words joined by single dashes", () => {
    for (const id of ["ocean", "high-contrast", "deep-sea-2", "a1"]) expect(isValidThemeId(id), id).toBe(true);
    for (const id of ["", "Ocean", "2sea", "deep--sea", "sea-", "-sea", "deep_sea", "sea!", "deep sea"]) expect(isValidThemeId(id), id).toBe(false);
  });
});
