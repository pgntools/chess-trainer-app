import type { ThemeDefinition } from "./types";

/*
  **The theme generator** (CTA-115): a theme's data in, the TypeScript
  source of its file out — the one generator behind both theme-authoring
  tools, so the file `yarn theme:bootstrap` writes and the file the theme
  editor downloads have the same shape. Pure: no DOM and no Node API, so
  the editor runs it in the browser and the script through Vite's module
  runner.

  A theme is data (`types.ts`), so its file is one object literal: every
  token, the component knobs as values (`buildTheme` turns them into
  overrides through `overrides.ts`' helpers), and nothing that would need a
  function. Hand-written `overrides` — functions, not data — are not
  written; `hasHandOverrides` lets a caller say so.
*/

/** How a written line is wrapped: an object or array that fits in this many columns stays on one line. */
const PRINT_WIDTH = 120;

/** The top level's keys in the order the house style writes them; any other key follows. */
const TOP_LEVEL_ORDER = ["id", "labelKey", "light", "dark", "focusRingWidth", "typography", "shape", "components", "chess"];

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** A theme id: lower-case words joined by single dashes, starting with a letter (`high-contrast`). */
const THEME_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** Whether `id` can name a theme — its file, its export and its catalog key are all made of it. */
export const isValidThemeId = (id: string): boolean => THEME_ID_PATTERN.test(id);

/** An id's camel case — the theme's file name and export stem: `high-contrast` → `highContrast`. */
export const camelIdOf = (id: string): string => id.replace(/-([a-z0-9])/g, (_match, next: string) => next.toUpperCase());

/** The name a theme's file exports it under: `highContrastTheme`. */
export const exportNameOf = (id: string): string => `${camelIdOf(id)}Theme`;

/** Its file's name in `src/design-system/themes/`: `highContrast.ts`. */
export const themeFileNameOf = (id: string): string => `${camelIdOf(id)}.ts`;

/** Its name's catalog key, in both languages: `appearance.themes.high-contrast`. */
export const labelKeyOf = (id: string): string => `appearance.themes.${id}`;

/** Whether a theme carries hand-written overrides the generator cannot write. */
export const hasHandOverrides = (definition: ThemeDefinition): boolean =>
  definition.overrides !== undefined && Object.keys(definition.overrides).length > 0;

/** A string literal: double quotes unless it holds one and no single quote (`'"Segoe UI"'`, as the house style writes it). */
const stringLiteral = (text: string): string =>
  text.includes('"') && !text.includes("'") && !/[\\\n\r]/.test(text) ? `'${text}'` : JSON.stringify(text);

const keyLiteral = (key: string): string => (IDENTIFIER.test(key) ? key : JSON.stringify(key));

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const entriesOf = (value: Record<string, unknown>, depth: number): [string, unknown][] => {
  const entries = Object.entries(value).filter(([, entry]) => entry !== undefined);
  if (depth !== 0) return entries;
  const rank = (key: string) => (TOP_LEVEL_ORDER.includes(key) ? TOP_LEVEL_ORDER.indexOf(key) : TOP_LEVEL_ORDER.length);
  return [...entries].sort(([a], [b]) => rank(a) - rank(b));
};

/** A font stack, written as the house style writes one: `["Roboto", "sans-serif"].join(", ")`. */
const fontFamilyLiteral = (family: string): string | undefined => {
  const parts = family.split(", ");
  return parts.length > 1 ? `[${parts.map(stringLiteral).join(", ")}].join(", ")` : undefined;
};

/** `value` on one line. */
const inline = (value: unknown, key?: string): string => {
  if (typeof value === "string") return (key === "fontFamily" && fontFamilyLiteral(value)) || stringLiteral(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`A theme token must be a finite number, not ${value}`);
    return Object.is(value, -0) ? "0" : String(value);
  }
  if (typeof value === "boolean" || value === null) return String(value);
  if (Array.isArray(value)) return `[${value.map((item) => inline(item)).join(", ")}]`;
  if (isPlainObject(value)) {
    const entries = entriesOf(value, -1);
    return entries.length === 0 ? "{}" : `{ ${entries.map(([name, entry]) => `${keyLiteral(name)}: ${inline(entry, name)}`).join(", ")} }`;
  }
  throw new Error(`A theme token cannot be ${typeof value} — a theme is data`);
};

/**
 * `value` at `depth` levels of indentation, after `prefix` (its key) —
 * on one line when it fits, otherwise one entry a line.
 */
const literal = (value: unknown, depth: number, prefix: string, key?: string): string => {
  const flat = inline(value, key);
  const indent = "  ".repeat(depth);
  const fits = indent.length + prefix.length + flat.length + 1 <= PRINT_WIDTH;
  if (depth !== 0 && (fits || !(isPlainObject(value) || Array.isArray(value)))) return flat;
  const inner = "  ".repeat(depth + 1);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[\n${value.map((item) => `${inner}${literal(item, depth + 1, "")},`).join("\n")}\n${indent}]`;
  }
  const entries = entriesOf(value as Record<string, unknown>, depth);
  if (entries.length === 0) return "{}";
  const lines = entries.map(([name, entry]) => {
    const head = `${keyLiteral(name)}: `;
    return `${inner}${head}${literal(entry, depth + 1, head, name)},`;
  });
  return `{\n${lines.join("\n")}\n${indent}}`;
};

/** A doc comment of `text`, one ` * ` line per line of it. */
const docComment = (text: string): string => {
  const lines = text.replaceAll("*/", "*\\/").trim().split("\n");
  return ["/**", ...lines.map((line) => (line.trim() === "" ? " *" : ` * ${line.trimEnd()}`)), " */"].join("\n");
};

export type ThemeSourceOptions = {
  /** The name the file exports the theme under — {@link exportNameOf} of its id. */
  exportName: string;
  /** The theme's doc comment: what it is, where it came from, what to change. */
  comment: string;
};

/**
 * **A theme's file** — `import type { ThemeDefinition }`, the doc comment and
 * `export const <exportName>: ThemeDefinition = { … };` holding every token
 * of `definition` (in the house order at the top level, in the definition's
 * own order below it). Dropped into `src/design-system/themes/`, it loads
 * back as data deep-equal to `definition` — hand-written `overrides` aside,
 * which are never written.
 */
export const themeSource = (definition: ThemeDefinition, { exportName, comment }: ThemeSourceOptions): string => {
  if (!IDENTIFIER.test(exportName)) throw new Error(`${exportName} is not a name a file can export`);
  const data: Record<string, unknown> = { ...definition };
  delete data.overrides;
  return [
    'import type { ThemeDefinition } from "./types";',
    "",
    docComment(comment),
    `export const ${exportName}: ThemeDefinition = ${literal(data, 0, "")};`,
    "",
  ].join("\n");
};
