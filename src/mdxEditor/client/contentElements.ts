import { elementOf, elementsIn, SETTINGS, type Attribute } from "./componentSettings";
import { usesOf } from "./pgnImports";

/**
 * **What the content shows, as a list** (CTA-139) — the MDX editor's
 * Components and Images sections: the elements in the content, each by
 * where it is and its words for the list, and the content without one of
 * them.
 */

/** An element in the content: its component, where it starts and ends, and its markup. */
export type ContentElement = { component: string; start: number; end: number; code: string };

/**
 * The chess components in the content — every self-closing element whose
 * name the settings describe (`SETTINGS`, the catalog's components), but
 * `<ArticleImage>` — in the order they appear.
 */
export const componentsIn = (body: string): ContentElement[] =>
  Object.keys(SETTINGS)
    .filter((component) => component !== "ArticleImage")
    .flatMap((component) => elementsIn(body, component).map((element) => ({ component, ...element })))
    .sort((one, other) => one.start - other.start);

/** A prop's value as words — its quoted text, a string expression's string, else the expression as written; `undefined` for none or a bare prop. */
const textOf = (attributes: readonly Attribute[], prop: string): string | undefined => {
  const value = attributes.find((attribute) => attribute.prop === prop)?.value;
  if (value === undefined || "bare" in value) return undefined;
  if ("string" in value) return value.string;
  try {
    const parsed: unknown = JSON.parse(value.expression);
    return typeof parsed === "string" ? parsed : value.expression;
  } catch {
    return value.expression;
  }
};

/** Moves written into a prop, cut for a list. */
const cut = (text: string, length = 28) => (text.length > length ? `${text.slice(0, length - 1)}…` : text);

/**
 * A component's words, for the list: its name, and what it reads — the PGN
 * it is given by name (`pgn={games}` → `games`), moves written in (cut
 * short), or what it reads by address (`src`, CTA-140; the older `_id`,
 * `game`, `reference`).
 */
export const componentLabelOf = (code: string): { component: string; reads?: string } => {
  const element = elementOf(code);
  if (element === undefined) return { component: /^\s*<([A-Z]\w*)/.exec(code)?.[1] ?? "?" };
  const pgn = element.attributes.find((attribute) => attribute.prop === "pgn")?.value;
  const reads =
    pgn !== undefined && "expression" in pgn && /^[A-Za-z_$][\w$]*$/.test(pgn.expression)
      ? pgn.expression
      : pgn !== undefined && !("bare" in pgn)
        ? cut(textOf(element.attributes, "pgn") ?? "")
        : (textOf(element.attributes, "src") ?? textOf(element.attributes, "_id") ?? textOf(element.attributes, "game") ?? textOf(element.attributes, "reference"));
  return { component: element.component, reads };
};

/** The PGN a component reads by name — `pgn={games}` → `games`; `undefined` for anything else. */
export const pgnNameOf = (code: string): string | undefined => {
  const pgn = elementOf(code)?.attributes.find((attribute) => attribute.prop === "pgn")?.value;
  return pgn !== undefined && "expression" in pgn && /^[A-Za-z_$][\w$]*$/.test(pgn.expression) ? pgn.expression : undefined;
};

/**
 * An `<ArticleImage>`'s words, for the list — its alt text (`Decorative`
 * for none), the file its `src` names, through the article's imports
 * (`files`: a name → its file), and that name.
 */
export const imageLabelOf = (code: string, files: ReadonlyMap<string, string>): { alt: string; file: string; src?: string } => {
  const attributes = elementOf(code)?.attributes ?? [];
  const src = textOf(attributes, "src");
  const alt = textOf(attributes, "alt");
  return { alt: alt === undefined || alt === "" ? "Decorative" : alt, file: (src === undefined ? undefined : files.get(src)) ?? src ?? "?", src };
};

/** The content without one import line — `import <name> from "…"` — and the blank line it leaves. */
export const withoutImport = (body: string, name: string): string => {
  const match = new RegExp(`^[ \\t]*import\\s+${name.replace(/\$/g, "\\$")}\\s+from\\s+["'][^"'\\n]+["'];?[ \\t]*$`, "m").exec(body);
  if (match === null) return body;
  return cutOut(body, match.index, match.index + match[0].length);
};

/**
 * `body` without `body.slice(start, end)`: a block alone on its lines takes
 * its lines and the blank line after it, so none doubles; one inside a line
 * is cut out of it alone.
 */
const cutOut = (body: string, start: number, end: number): string => {
  const lineStart = body.lastIndexOf("\n", start - 1) + 1;
  const newline = body.indexOf("\n", end);
  const lineEnd = newline === -1 ? body.length : newline;
  if (body.slice(lineStart, start).trim() !== "" || body.slice(end, lineEnd).trim() !== "") return body.slice(0, start) + body.slice(end);
  let to = lineEnd === body.length ? lineEnd : lineEnd + 1;
  // A blank line left between two blocks goes too.
  if (body[to] === "\n" && (lineStart === 0 || body.slice(0, lineStart).endsWith("\n\n"))) to += 1;
  const rest = body.slice(0, lineStart) + body.slice(to);
  // Taken off the end: the content ends on one newline, as it did.
  return to >= body.length ? rest.replace(/\s+$/, rest.trim() === "" ? "" : "\n") : rest;
};

/**
 * The content without an element (CTA-139) — `body.slice(start, end)` and
 * the blank line it leaves — and, given the name its `src` (or anything)
 * reads, that name's import too once nothing else in the content reads it.
 * A file the import named stays on disk.
 */
export const withoutElement = (body: string, start: number, end: number, importName?: string): string => {
  const rest = cutOut(body, start, end);
  return importName !== undefined && usesOf(rest, importName) === 0 ? withoutImport(rest, importName) : rest;
};

/**
 * The element a section opens on, by where it starts: the one `caret` sits
 * in, else the first — `null` (the Add entry) for none.
 */
export const startAtCaret = (elements: readonly { start: number; end: number }[], caret: number): number | null =>
  (elements.find((element) => caret >= element.start && caret <= element.end) ?? elements[0])?.start ?? null;

/**
 * The element a selection names, by where it started: that one, else the
 * next after it (the one chosen was removed), else the last — `undefined`
 * for the Add entry or an empty list.
 */
export const elementAt = <T extends { start: number }>(elements: readonly T[], selected: number | null): T | undefined =>
  selected === null ? undefined : (elements.find((element) => element.start === selected) ?? elements.find((element) => element.start > selected) ?? elements.at(-1));
