import { camelIdOf, exportNameOf, hasHandOverrides, isValidThemeId, labelKeyOf, themeFileNameOf, themeSource } from "./codegen";
import type { ThemeDefinition } from "./types";

/*
  **What `yarn theme:bootstrap` writes** (CTA-115), worked out as a pure
  function over the files' text: the new theme's file, the registry with it
  registered, and both catalogs with its name. `scripts/theme-bootstrap.js`
  reads the files, calls this, and writes what it answers — only when it
  answers no problem at all, so a refusal changes nothing.
*/

/** Where the files are, from the repository's root. */
export const THEMES_PATH = "src/design-system/themes";
export const REGISTRY_PATH = `${THEMES_PATH}/registry.ts`;
export const CATALOG_PATHS = { en: "src/locales/en.ts", he: "src/locales/he.ts" } as const;

/** What the contributor asked for. */
export type BootstrapRequest = {
  /** The new theme's id — lower-case words and dashes (`ocean`, `deep-sea`). */
  id: string;
  /** Its English name, for `en.ts`. */
  name: string;
  /** Its Hebrew name, for `he.ts` — absent, the English one, marked for translation. */
  nameHe?: string;
  /** The registered theme it starts as a copy of. */
  from: string;
};

/** The files as they are now, and the themes the registry holds. */
export type BootstrapSources = {
  registry: string;
  en: string;
  he: string;
  /** The file names in `src/design-system/themes/`. */
  themeFiles: readonly string[];
  themes: readonly ThemeDefinition[];
};

/** A file to write: its path from the repository's root, all of its text, and whether it is new. */
type BootstrapFile = { path: string; content: string; created: boolean };

export type BootstrapResult =
  | { ok: true; theme: ThemeDefinition; files: BootstrapFile[]; warnings: string[] }
  | { ok: false; problems: string[] };

const THEMES_ARRAY = /(export const themes: readonly ThemeDefinition\[\] = \[)([^\]]*)(\];)/;
const THEME_IMPORT = /^import \{ (\w+) \} from "\.\/(\w+)";$/;
/** The `themes: { … }` block inside `appearance: { … }`: its opening line, its entries and its closing brace. */
const CATALOG_THEMES = /(\n\s*appearance: \{[^]*?\n(\s*)themes: \{\n)([^]*?)(\n\2\},)/;
const CATALOG_KEY = /^\s*(?:"([^"]+)"|([A-Za-z_$][\w$]*)):/;

const keyLiteral = (key: string) => (/^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key));

/** The theme ids a catalog names under `appearance.themes`, or `undefined` if it has no such block. */
const catalogIds = (catalog: string): string[] | undefined => {
  const block = CATALOG_THEMES.exec(catalog);
  if (block === null) return undefined;
  return block[3]
    .split("\n")
    .map((line) => CATALOG_KEY.exec(line))
    .flatMap((match) => (match === null ? [] : [match[1] ?? match[2]]));
};

/** `catalog` with `id: name` added at the end of its `appearance.themes` block (a comment above it, if given). */
const withCatalogName = (catalog: string, id: string, name: string, comment?: string): string =>
  catalog.replace(CATALOG_THEMES, (_all, head: string, indent: string, entries: string, tail: string) => {
    const inner = `${indent}  `;
    const lines = [...(comment === undefined ? [] : [`${inner}// ${comment}`]), `${inner}${keyLiteral(id)}: ${JSON.stringify(name)},`];
    return `${head}${entries}\n${lines.join("\n")}${tail}`;
  });

/** `registry` with the theme's import (in file order among the themes') and its entry at the end of `themes`. */
const withRegistered = (registry: string, exportName: string, module: string): string => {
  const lines = registry.split("\n");
  const imports = lines.flatMap((line, index) => {
    const match = THEME_IMPORT.exec(line);
    return match === null ? [] : [{ index, module: match[2] }];
  });
  const after = imports.find((line) => line.module.localeCompare(module) > 0);
  const at = after?.index ?? (imports.at(-1)?.index ?? -1) + 1;
  lines.splice(at, 0, `import { ${exportName} } from "./${module}";`);
  return lines.join("\n").replace(THEMES_ARRAY, (_all, head: string, entries: string, tail: string) => {
    if (entries.includes("\n")) return `${head}${entries.replace(/\s*$/, "")}\n  ${exportName},\n${tail}`;
    const inline = `${head}${entries}, ${exportName}${tail}`;
    if (inline.length <= 120) return inline;
    const names = [...entries.split(",").map((entry) => entry.trim()).filter(Boolean), exportName];
    return `${head}\n${names.map((entry) => `  ${entry},`).join("\n")}\n${tail}`;
  });
};

/** A deep copy of a theme's data — its hand-written overrides, being functions, left behind. */
const dataOf = (definition: ThemeDefinition): ThemeDefinition => {
  const data: Partial<ThemeDefinition> = { ...definition };
  delete data.overrides;
  return structuredClone(data) as ThemeDefinition;
};

/** The new file's doc comment: where it came from, and how to make it its own. */
const commentOf = (request: BootstrapRequest, name: string): string =>
  [
    `**${name}** — scaffolded by \`yarn theme:bootstrap\` as a copy of the "${request.from}" theme`,
    `(\`${themeFileNameOf(request.from)}\`): every token below is that theme's until you change it.`,
    "",
    "Make it its own in the theme editor: run `yarn dev`, open",
    `\`/dev/theme-editor?theme=${request.id}\`, tune the tokens against the live preview and`,
    `the contrast report, then download \`${themeFileNameOf(request.id)}\` and replace this file with it.`,
    "Run the contrast test (`npx vitest run src/design-system/themes/contrast.test.ts`)",
    "and `yarn test:run` before opening the pull request (CONTRIBUTING.md).",
  ].join("\n");

/**
 * **Works out a new theme's files** — or every reason it cannot: an id that
 * is not lower-case words and dashes, an empty name, an unknown `from`, an id,
 * file, export or catalog name that already exists, or a registry or catalog
 * whose shape it does not recognise.
 */
export const bootstrapTheme = (request: BootstrapRequest, sources: BootstrapSources): BootstrapResult => {
  const problems: string[] = [];
  const id = request.id.trim();
  const name = request.name.trim();
  const nameHe = request.nameHe?.trim();
  const fileName = isValidThemeId(id) ? themeFileNameOf(id) : "";
  const exportName = isValidThemeId(id) ? exportNameOf(id) : "";
  const from = sources.themes.find((theme) => theme.id === request.from);

  if (!isValidThemeId(id)) {
    problems.push(`--id "${request.id}" is not a theme id: lower-case letters and digits, words joined by single dashes, starting with a letter (ocean, deep-sea)`);
  } else {
    if (sources.themes.some((theme) => theme.id === id)) problems.push(`a theme "${id}" is already registered`);
    if (sources.themeFiles.includes(fileName)) problems.push(`${THEMES_PATH}/${fileName} already exists`);
    if (new RegExp(`\\b${exportName}\\b`).test(sources.registry)) problems.push(`${REGISTRY_PATH} already names ${exportName}`);
  }
  if (name === "") problems.push("--name is empty: the theme needs an English name");
  if (/[\n\r]/.test(request.name) || /[\n\r]/.test(request.nameHe ?? "")) problems.push("a name is one line");
  if (nameHe === "") problems.push("--name-he is empty: leave it out to use the English name until a translation");
  if (from === undefined) {
    problems.push(`--from "${request.from}" is not a registered theme (${sources.themes.map((theme) => theme.id).join(", ")})`);
  }
  if (!THEMES_ARRAY.test(sources.registry) || !sources.registry.split("\n").some((line) => THEME_IMPORT.test(line))) {
    problems.push(`${REGISTRY_PATH} has no \`themes\` list or theme import this script recognises — register the theme by hand`);
  }
  for (const [language, catalog] of [
    ["en", sources.en],
    ["he", sources.he],
  ] as const) {
    const ids = catalogIds(catalog);
    if (ids === undefined) problems.push(`${CATALOG_PATHS[language]} has no appearance.themes block this script recognises`);
    else if (isValidThemeId(id) && ids.includes(id)) problems.push(`${CATALOG_PATHS[language]} already names appearance.themes.${id}`);
  }
  if (problems.length > 0 || from === undefined) return { ok: false, problems };

  const theme: ThemeDefinition = { ...dataOf(from), id, labelKey: labelKeyOf(id) };
  const warnings = hasHandOverrides(from)
    ? [`the "${from.id}" theme's hand-written overrides are not copied — take them from ${themeFileNameOf(from.id)} if ${name} wants them`]
    : [];
  return {
    ok: true,
    theme,
    warnings,
    files: [
      {
        path: `${THEMES_PATH}/${fileName}`,
        content: themeSource(theme, { exportName, comment: commentOf({ ...request, id }, name) }),
        created: true,
      },
      { path: REGISTRY_PATH, content: withRegistered(sources.registry, exportName, camelIdOf(id)), created: false },
      { path: CATALOG_PATHS.en, content: withCatalogName(sources.en, id, name), created: false },
      {
        path: CATALOG_PATHS.he,
        content:
          nameHe === undefined
            ? withCatalogName(sources.he, id, name, `TODO: translate "${name}" — the English name until a Hebrew one is given.`)
            : withCatalogName(sources.he, id, nameHe),
        created: false,
      },
    ],
  };
};
