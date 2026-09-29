#!/usr/bin/env node
/**
 * **Scaffold a new theme** (CTA-115) — `yarn theme:bootstrap`, the first step
 * of creating a theme (CONTRIBUTING.md, "Create a theme").
 *
 *   yarn theme:bootstrap --id ocean --name "Ocean" [--name-he "אוקיינוס"] [--from brown]
 *   yarn theme:bootstrap --id ocean --name "Ocean" --dry-run
 *
 * 1. writes `src/design-system/themes/<camelId>.ts` (`export <camelId>Theme`):
 *    a copy of the `--from` theme's tokens (default: `default`) under the new
 *    id and name key, its doc comment saying what to change and pointing at
 *    the theme editor;
 * 2. registers it — its import and its entry in `themes/registry.ts`;
 * 3. names it — `appearance.themes.<id>` in `src/locales/en.ts` and `he.ts`
 *    (the Hebrew name from `--name-he`, or the English one marked for
 *    translation).
 *
 * It refuses an invalid id, an id, file or name that already exists and an
 * unknown `--from` — reporting every problem at once — and then writes
 * nothing: every file is worked out first (`themes/bootstrap.ts`, pure), and
 * written only when all of them are. `--dry-run` prints them instead.
 *
 * The file comes from the **same generator** as the theme editor's download
 * (`themes/codegen.ts`), loaded through Vite's module runner as `wirepgn.js`
 * loads `src/lib`, and it is measured by the contrast test's own module
 * (`themes/contrast.ts`) before the next steps are printed.
 *
 * `--root <path>` points it at another checkout (the tests' temporary copy).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runnerImport } from "vite";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const USAGE = `Usage:
  yarn theme:bootstrap --id <kebab-id> --name "<English name>" [--name-he "<Hebrew name>"] [--from <theme id>]
Options:
  --id <id>          the new theme's id: lower-case words joined by dashes (ocean, deep-sea)
  --name <name>      its English name (src/locales/en.ts)
  --name-he <name>   its Hebrew name (src/locales/he.ts) — absent, the English one, marked for translation
  --from <id>        the registered theme it starts as a copy of (default: default)
  --dry-run          print what would be written, and write nothing
  --root <path>      the checkout to write into (default: this one)
  --help             this text`;

const fail = (message) => {
  console.error(`theme:bootstrap: ${message}`);
  process.exit(1);
};

/* --- arguments ---------------------------------------------------- */

const parseArgs = (argv) => {
  const args = { from: "default" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => {
      const next = argv[index + 1];
      if (next === undefined || next.startsWith("--")) fail(`${arg} needs a value\n\n${USAGE}`);
      index += 1;
      return next;
    };
    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--id") args.id = value();
    else if (arg === "--name") args.name = value();
    else if (arg === "--name-he") args.nameHe = value();
    else if (arg === "--from") args.from = value();
    else if (arg === "--root") args.root = value();
    else fail(`unknown argument ${arg}\n\n${USAGE}`);
  }
  return args;
};

/* --- the app's code, through Vite's module runner ----------------- */

const load = async (path) =>
  (await runnerImport(path, { configFile: false, root: ROOT, logLevel: "silent" })).module;

/* --- a dry run's view of an edited file --------------------------- */

/**
 * The lines `after` removes from (`- `) and adds to (`+ `) `before`: the
 * common head and tail trimmed, a longest common subsequence over what is
 * left — a handful of lines, since the script's edits are small.
 */
const changedLines = (before, after) => {
  const old = before.split("\n");
  const next = after.split("\n");
  let head = 0;
  while (head < old.length && head < next.length && old[head] === next[head]) head += 1;
  let tail = 0;
  while (tail < old.length - head && tail < next.length - head && old[old.length - 1 - tail] === next[next.length - 1 - tail]) tail += 1;
  const a = old.slice(head, old.length - tail);
  const b = next.slice(head, next.length - tail);
  // lcs[i][j]: the longest common subsequence of a[i..] and b[j..].
  const lcs = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      i += 1;
      j += 1;
    } else if (j < b.length && (i === a.length || lcs[i][j + 1] >= lcs[i + 1][j])) {
      out.push(`+ ${b[j]}`);
      j += 1;
    } else {
      out.push(`- ${a[i]}`);
      i += 1;
    }
  }
  return out;
};

/* --- main ---------------------------------------------------------- */

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(USAGE);
  process.exit(0);
}
if (args.id === undefined || args.name === undefined) fail(`--id and --name are required\n\n${USAGE}`);

const target = resolve(args.root ?? ROOT);
const { bootstrapTheme, THEMES_PATH, REGISTRY_PATH, CATALOG_PATHS } = await load(join(ROOT, "src/design-system/themes/bootstrap.ts"));
const { contrastReport, contrastSummary, formatRatio } = await load(join(ROOT, "src/design-system/themes/contrast.ts"));

const readTarget = (path) => {
  const full = join(target, path);
  if (!existsSync(full)) fail(`${full} is missing — is ${target} this app's checkout?`);
  return readFileSync(full, "utf8");
};

const sources = {
  registry: readTarget(REGISTRY_PATH),
  en: readTarget(CATALOG_PATHS.en),
  he: readTarget(CATALOG_PATHS.he),
  themeFiles: readdirSync(join(target, THEMES_PATH)),
  // The themes as the target's own registry holds them — `--from` names one of those.
  themes: (await load(join(target, REGISTRY_PATH))).themes,
};

const result = bootstrapTheme({ id: args.id, name: args.name, nameHe: args.nameHe, from: args.from }, sources);
if (!result.ok) {
  for (const problem of result.problems) console.error(`theme:bootstrap: ${problem}`);
  console.error("Nothing was written.");
  process.exit(1);
}

const { theme, files, warnings } = result;
const before = { [REGISTRY_PATH]: sources.registry, [CATALOG_PATHS.en]: sources.en, [CATALOG_PATHS.he]: sources.he };

if (args.dryRun) {
  console.log(`Dry run — nothing is written. For "${args.name}" (${theme.id}), from the "${args.from}" theme:\n`);
  for (const file of files) {
    if (file.created) console.log(`=== ${file.path} (new)\n${file.content}`);
    else console.log(`=== ${file.path}\n${changedLines(before[file.path], file.content).join("\n")}\n`);
  }
} else {
  for (const file of files) writeFileSync(join(target, file.path), file.content);
  const [created, ...edited] = files;
  console.log(`Created "${args.name}" (${theme.id}) from the "${args.from}" theme:`);
  console.log(`  wrote      ${created.path}`);
  for (const file of edited) console.log(`  updated    ${file.path}`);
}
for (const warning of warnings) console.warn(`theme:bootstrap: warning: ${warning}`);

const report = contrastReport(theme);
const summary = contrastSummary(report);
console.log(
  `\nContrast (WCAG 2.2 AA): ${summary.pass} pass, ${summary.fail} fail — ${summary.requiredFail} of the failures required by the contrast test.`,
);
for (const check of report.filter((candidate) => !candidate.pass && candidate.level === "required")) {
  console.log(`  ${check.scheme} · ${check.label}: ${formatRatio(check.ratio)} (needs ${check.minimum}:1)`);
}

console.log(`
Next:
  1. yarn dev, and open /dev/theme-editor?theme=${theme.id} — tune the tokens against the live preview and contrast report.
  2. Download ${files[0].path.split("/").at(-1)} from the editor and replace ${files[0].path} with it.
  3. npx vitest run src/design-system/themes/contrast.test.ts, then yarn test:run.${
    args.nameHe === undefined ? `\n  4. Translate the name in ${CATALOG_PATHS.he} (the TODO above appearance.themes.${theme.id}).` : ""
  }`);
