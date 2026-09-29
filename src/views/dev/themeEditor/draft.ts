import { defaultTheme, isValidThemeId, labelKeyOf, type ThemeDefinition } from "../../../design-system/themes";

/*
  **The theme editor's draft** (CTA-115) — the theme being edited, and the
  words that are not in its file (its names, the catalogs' business, and the
  theme it started from). Held in memory only; it leaves as the theme's
  source file (`themeSource`) or as a draft file (`encodeDraft`) that
  `decodeDraft` reads back in a later session. Pure.
*/

export type ThemeDraft = {
  /** The theme — data only: its hand-written overrides, being functions, never enter a draft. */
  theme: ThemeDefinition;
  /** Its English name — `appearance.themes.<id>` in `en.ts`. */
  name: string;
  /** Its Hebrew name — in `he.ts`; empty until given. */
  nameHe: string;
  /** The registered theme it started as a copy of. */
  from: string;
};

/** A draft file's format and version — what `decodeDraft` insists on. */
export const DRAFT_FORMAT = "chessapp.themeDraft";
const DRAFT_VERSION = 1;

/** A theme's data: everything but its hand-written overrides, copied deep. */
export const themeDataOf = (definition: ThemeDefinition): ThemeDefinition => {
  const data: Partial<ThemeDefinition> = { ...definition };
  delete data.overrides;
  return structuredClone(data) as ThemeDefinition;
};

/** A draft of a registered theme, under its names. */
export const draftOf = (definition: ThemeDefinition, name: string, nameHe: string): ThemeDraft => ({
  theme: themeDataOf(definition),
  name,
  nameHe,
  from: definition.id,
});

/** The draft with its theme's id changed — its name key follows it. */
export const withId = (draft: ThemeDraft, id: string): ThemeDraft => ({
  ...draft,
  theme: { ...draft.theme, id, labelKey: labelKeyOf(id) },
});

/* --- tokens by path ----------------------------------------------- */

type Tree = Record<string, unknown>;

const isTree = (value: unknown): value is Tree => typeof value === "object" && value !== null && !Array.isArray(value);

/** The token at `path` (`light.primary.main`, `chess.nag.good.dark`) — `undefined` when the theme leaves it out. */
export const tokenAt = (theme: ThemeDefinition, path: string): unknown =>
  path.split(".").reduce<unknown>((node, key) => (isTree(node) ? node[key] : undefined), theme);

/**
 * The theme with the token at `path` set to `value` — a new theme, the path
 * to the edit copied, the rest shared. `undefined` leaves the token out (a
 * palette colour back to MUI's default), and a group it empties goes with it
 * (`primary: {}` would fail MUI's palette). Setting a token to what it is
 * gives the same theme back.
 */
export const withToken = (theme: ThemeDefinition, path: string, value: unknown): ThemeDefinition => {
  if (Object.is(tokenAt(theme, path), value)) return theme;
  const set = (node: Tree, keys: string[]): Tree => {
    const [key, ...rest] = keys;
    const next = { ...node };
    if (rest.length === 0) {
      if (value === undefined) delete next[key];
      else next[key] = value;
      return next;
    }
    const child = set(isTree(node[key]) ? node[key] : {}, rest);
    if (Object.keys(child).length === 0) delete next[key];
    else next[key] = child;
    return next;
  };
  return set(theme as unknown as Tree, path.split(".")) as unknown as ThemeDefinition;
};

/* --- the draft file ------------------------------------------------ */

/** The draft as a file's text — pretty JSON, its format and version first. */
export const encodeDraft = (draft: ThemeDraft): string =>
  `${JSON.stringify({ format: DRAFT_FORMAT, version: DRAFT_VERSION, name: draft.name, nameHe: draft.nameHe, from: draft.from, theme: draft.theme }, null, 2)}\n`;

/** The paths of `template`'s leaves that `value` lacks, or holds as another kind of thing. */
const mismatches = (template: unknown, value: unknown, path: string): string[] => {
  if (isTree(template)) {
    if (!isTree(value)) return [path];
    return Object.entries(template).flatMap(([key, child]) => mismatches(child, value[key], `${path}.${key}`));
  }
  if (template === null) return value === null || typeof value === "number" || isTree(value) || typeof value === "string" ? [] : [path];
  return typeof value === typeof template ? [] : [path];
};

/** What every scheme's palette must hold — the rest (the status colours, `text.disabled`) may be MUI's. */
const PALETTE_TEMPLATE = {
  contrastThreshold: 0,
  background: { default: "", paper: "", translucent: "", sunken: "" },
  text: { primary: "", secondary: "" },
  divider: "",
  focusRing: "",
  controlBorder: "",
};

/**
 * **Reads a draft file** — or says why it will not: not JSON, not a theme
 * draft, a version it does not know, an id it cannot take, or a theme
 * missing a token every theme has.
 */
export const decodeDraft = (text: string): { draft: ThemeDraft } | { problem: string } => {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { problem: "The file is not JSON." };
  }
  if (!isTree(data) || data.format !== DRAFT_FORMAT) return { problem: "The file is not a theme draft." };
  if (data.version !== DRAFT_VERSION) return { problem: `The draft is version ${String(data.version)}; this editor reads version ${DRAFT_VERSION}.` };
  const theme = data.theme;
  if (!isTree(theme) || typeof theme.id !== "string" || !isValidThemeId(theme.id)) return { problem: "The draft's theme has no valid id." };
  const missing = [
    ...mismatches(PALETTE_TEMPLATE, theme.light, "light"),
    ...mismatches(PALETTE_TEMPLATE, theme.dark, "dark"),
    ...mismatches(defaultTheme.focusRingWidth, theme.focusRingWidth, "focusRingWidth"),
    ...mismatches({}, theme.typography, "typography"),
    ...mismatches({}, theme.shape, "shape"),
    ...mismatches(defaultTheme.components, theme.components, "components"),
    ...mismatches(defaultTheme.chess, theme.chess, "chess"),
  ];
  if (missing.length > 0) return { problem: `The draft's theme lacks ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? ` and ${missing.length - 3} more` : ""}.` };
  const string = (value: unknown) => (typeof value === "string" ? value : "");
  const definition = { ...theme, labelKey: labelKeyOf(theme.id) } as ThemeDefinition;
  return { draft: { theme: themeDataOf(definition), name: string(data.name), nameHe: string(data.nameHe), from: string(data.from) } };
};
