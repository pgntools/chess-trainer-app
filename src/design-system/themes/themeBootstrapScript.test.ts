import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadThemeSource, typecheckThemeSource } from "../../test/themeSource";
import { brownTheme } from "./brown";
import { contrastReport } from "./contrast";
import { defaultTheme } from "./default";

/*
  `yarn theme:bootstrap` (CTA-115) run for real against a temporary copy of
  the files it reads and writes (`--root`): the themes folder, the one file
  its types import, and both catalogs. It writes the theme, registers it and
  names it — or, refusing, writes nothing.
*/

const ROOT = process.cwd();
const SCRIPT = join(ROOT, "scripts/theme-bootstrap.js");
const COPIED = ["src/design-system/themes", "src/design-system/theme/augment.ts", "src/locales/en.ts", "src/locales/he.ts"];

let work: string;

const run = (...args: string[]) => {
  const result = spawnSync(process.execPath, [SCRIPT, ...args, "--root", work], { encoding: "utf8" });
  return { code: result.status, out: `${result.stdout}${result.stderr}` };
};
const read = (path: string) => readFileSync(join(work, path), "utf8");

/** Every file of the copy and its text — what a refusal must leave exactly as it was. */
const snapshot = () => {
  const files: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const entry of readdirSync(join(work, dir), { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else files[path] = read(path);
    }
  };
  walk("src");
  return files;
};

beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), "theme-bootstrap-"));
  for (const path of COPIED) {
    mkdirSync(dirname(join(work, path)), { recursive: true });
    cpSync(join(ROOT, path), join(work, path), { recursive: true, filter: (source) => !source.endsWith(".test.ts") });
  }
});

afterEach(() => rmSync(work, { recursive: true, force: true }));

describe("yarn theme:bootstrap", () => {
  it("creates a theme from --from's tokens, registers it and names it in both catalogs", async () => {
    const { code, out } = run("--id", "ocean", "--name", "Ocean", "--from", "brown");
    expect(code, out).toBe(0);
    expect(out).toContain("wrote      src/design-system/themes/ocean.ts");
    expect(out).toContain("/dev/theme-editor?theme=ocean");
    expect(out).toMatch(/Contrast \(WCAG 2\.2 AA\): \d+ pass, \d+ fail — 0 of the failures required/);

    const source = read("src/design-system/themes/ocean.ts");
    const ocean = await loadThemeSource(source, "oceanTheme");
    expect(ocean).toEqual({ ...brownTheme, id: "ocean", labelKey: "appearance.themes.ocean" });
    expect(read("src/design-system/themes/registry.ts")).toContain('import { oceanTheme } from "./ocean";');
    expect(read("src/design-system/themes/registry.ts")).toContain("highContrastTheme, oceanTheme];");
    expect(read("src/locales/en.ts")).toContain('      ocean: "Ocean",\n    },');
    expect(read("src/locales/he.ts")).toContain('// TODO: translate "Ocean"');

    // It compiles as a theme, and passes the contrast test as brown does.
    expect(typecheckThemeSource(source, "ocean.ts")).toEqual([]);
    expect(contrastReport(ocean).filter((check) => check.level === "required" && !check.pass)).toEqual([]);
  }, 90_000);

  it("takes a Hebrew name, and starts from the default theme unless told", async () => {
    const { code, out } = run("--id", "deep-sea", "--name", "Deep sea", "--name-he", "ים עמוק");
    expect(code, out).toBe(0);
    expect(out).not.toContain("Translate the name");
    expect(read("src/locales/he.ts")).toContain('      "deep-sea": "ים עמוק",\n    },');
    const deepSea = await loadThemeSource(read("src/design-system/themes/deepSea.ts"), "deepSeaTheme");
    expect(deepSea).toEqual({ ...defaultTheme, id: "deep-sea", labelKey: "appearance.themes.deep-sea" });
  }, 60_000);

  it.each([
    ["an invalid id", ["--id", "Ocean", "--name", "Ocean"], /is not a theme id/],
    ["a registered id", ["--id", "green", "--name", "Green again"], /"green" is already registered/],
    ["an unknown --from", ["--id", "ocean", "--name", "Ocean", "--from", "sepia"], /--from "sepia" is not a registered theme/],
    ["an empty name", ["--id", "ocean", "--name", ""], /--name is empty/],
  ])("refuses %s, and writes nothing", (_case, args, problem) => {
    const before = snapshot();
    const { code, out } = run(...args);
    expect(code).toBe(1);
    expect(out).toMatch(problem);
    expect(out).toContain("Nothing was written.");
    expect(snapshot()).toEqual(before);
  }, 60_000);

  it("refuses a file that already exists, and writes nothing", () => {
    cpSync(join(work, "src/design-system/themes/brown.ts"), join(work, "src/design-system/themes/ocean.ts"));
    const before = snapshot();
    const { code, out } = run("--id", "ocean", "--name", "Ocean");
    expect(code).toBe(1);
    expect(out).toContain("src/design-system/themes/ocean.ts already exists");
    expect(snapshot()).toEqual(before);
  }, 60_000);

  it("prints the files on --dry-run, and writes nothing", () => {
    const before = snapshot();
    const { code, out } = run("--id", "ocean", "--name", "Ocean", "--dry-run");
    expect(code, out).toBe(0);
    expect(out).toContain("Dry run — nothing is written.");
    expect(out).toContain("=== src/design-system/themes/ocean.ts (new)\nimport type { ThemeDefinition }");
    expect(out).toContain('=== src/locales/en.ts\n+       ocean: "Ocean",');
    expect(snapshot()).toEqual(before);
    expect(existsSync(join(work, "src/design-system/themes/ocean.ts"))).toBe(false);
  }, 60_000);

  it("explains itself on --help, and asks for what is missing", () => {
    const help = run("--help");
    expect(help.code).toBe(0);
    expect(help.out).toContain("yarn theme:bootstrap --id <kebab-id>");
    const bare = run();
    expect(bare.code).toBe(1);
    expect(bare.out).toContain("--id and --name are required");
    expect(run("--id", "ocean", "--name", "Ocean", "--colour", "blue").out).toContain("unknown argument --colour");
  }, 60_000);
});
