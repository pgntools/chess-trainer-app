/**
 * **A PGN attached to an article, as an import** (CTA-137) — the line the
 * MDX editor adds when a `.pgn` goes into the article's folder:
 * `import olym26 from "./olym26.pgn?raw"`, the name the file's own, so a
 * component takes it as `pgn={olym26}`.
 */

/** What an article imports a PGN as: the file beside it, and the name it binds. */
export type PgnImport = { file: string; name: string };

const IMPORT_LINE = /^\s*import\s+([A-Za-z_$][\w$]*)\s+from\s+["']([^"']+)["']/;

/** Every name the body binds at its top level — its imports and exports — which a new import may not take. */
export const namesIn = (body: string): Set<string> =>
  new Set([...body.matchAll(/^\s*(?:import\s+([A-Za-z_$][\w$]*)\s+from|export\s+(?:const|let|var|function)\s+([A-Za-z_$][\w$]*))/gm)].map((match) => match[1] ?? match[2]));

/**
 * A file's import name: its stem in camelCase — `olym26.pgn` → `olym26`,
 * `20th-werner-obermeyer-swiss-5r.pgn` → `pgn20thWernerObermeyerSwiss5r` (a
 * name may not start with a digit) — numbered on when `taken` has it.
 */
export const pgnImportName = (file: string, taken: ReadonlySet<string>): string => {
  const words = file
    .replace(/\.pgn$/i, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  const camel = words.map((word, index) => (index === 0 ? word.charAt(0).toLowerCase() + word.slice(1) : word.charAt(0).toUpperCase() + word.slice(1))).join("");
  const base = camel === "" ? "games" : /^[0-9]/.test(camel) ? `pgn${camel.charAt(0).toUpperCase()}${camel.slice(1)}` : camel;
  let name = base;
  for (let count = 2; taken.has(name); count += 1) name = `${base}${count}`;
  return name;
};

/** A name an article can bind: a JavaScript identifier. */
export const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/**
 * The names the body binds to a PGN — an `import x from "./….pgn?raw"`, or
 * an `export const x = \`…\`` written in it — in the order they appear:
 * what a component's `pgn={…}` can take.
 */
export const pgnNamesIn = (body: string): string[] =>
  [...body.matchAll(/^\s*(?:import\s+([A-Za-z_$][\w$]*)\s+from\s+["'][^"']+\.pgn\?raw["']|export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*`)/gm)].map((match) => match[1] ?? match[2]);

/**
 * Every PGN the body binds, as the source that binds it — each
 * `import x from "./….pgn?raw"` line and each `export const x = \`…\``
 * literal, whole — so a piece of MDX put after them reads the article's
 * PGNs by their names (a component's preview in the Components section); only those `names`
 * bind, when given. `lines`: how many lines they take, with the blank line
 * after them.
 */
export const pgnDefinitionsIn = (body: string, names?: readonly string[]): { source: string; lines: number } => {
  const found = [...body.matchAll(/^[ \t]*(?:import\s+[A-Za-z_$][\w$]*\s+from\s+["'][^"'\n]+\.pgn\?raw["'];?|export\s+const\s+[A-Za-z_$][\w$]*\s*=\s*`(?:\\[\s\S]|[^`\\])*`)/gm)]
    .map((match) => match[0].trim())
    .filter((definition) => names === undefined || names.includes(/^(?:import|export\s+const)\s+([A-Za-z_$][\w$]*)/.exec(definition)?.[1] ?? ""));
  if (found.length === 0) return { source: "", lines: 0 };
  const source = `${found.join("\n")}\n\n`;
  return { source, lines: source.split("\n").length - 1 };
};

/** The number of lines the body starts with that are imports. */
const leadingImports = (lines: readonly string[]): number => {
  let leading = 0;
  while (leading < lines.length && IMPORT_LINE.test(lines[leading])) leading += 1;
  return leading;
};

/** A PGN as a template literal's text: a backtick, a backslash or a `${` escaped, so the text is the PGN's exactly. */
const escapedPgn = (pgn: string): string => pgn.trim().replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

/**
 * The body with a PGN written into it (CTA-137) — `export const <name> =
 * \`<the PGN>\`` after its imports, a blank line either side — so it needs
 * no file. A backtick, a backslash or a `${` in the PGN is escaped, so the
 * text is the PGN's exactly.
 */
export const withInlinePgn = (body: string, name: string, pgn: string): string => {
  const block = `export const ${name} = \`${escapedPgn(pgn)}\``;
  const lines = body.split("\n");
  const leading = leadingImports(lines);
  if (leading === 0) return body.trim() === "" ? `${block}\n` : `${block}\n\n${body}`;
  const rest = lines.slice(leading);
  return [...lines.slice(0, leading), "", block, ...(rest[0] === "" ? rest : ["", ...rest])].join("\n");
};

/**
 * The body importing each of `files` (PGNs beside the article): a file it
 * imports already keeps its line and name; the others get a line each,
 * after the imports the body starts with, or at its top — under the name
 * given with it, else one made from the file's.
 */
export const withPgnImports = (body: string, files: readonly (string | PgnImport)[]): { body: string; imports: PgnImport[] } => {
  const lines = body.split("\n");
  const existing = new Map<string, string>();
  for (const line of lines) {
    const match = IMPORT_LINE.exec(line);
    if (match !== null) existing.set(match[2].replace(/\?raw$/, ""), match[1]);
  }
  const taken = namesIn(body);
  const imports: PgnImport[] = [];
  const added: string[] = [];
  for (const entry of files) {
    const file = typeof entry === "string" ? entry : entry.file;
    const known = existing.get(`./${file}`);
    if (known !== undefined) {
      imports.push({ file, name: known });
      continue;
    }
    const name = typeof entry === "string" ? pgnImportName(file, taken) : entry.name;
    taken.add(name);
    existing.set(`./${file}`, name);
    imports.push({ file, name });
    added.push(`import ${name} from "./${file}?raw"`);
  }
  if (added.length === 0) return { body, imports };
  const leading = leadingImports(lines);
  if (leading > 0) return { body: [...lines.slice(0, leading), ...added, ...lines.slice(leading)].join("\n"), imports };
  return { body: body.trim() === "" ? `${added.join("\n")}\n` : `${added.join("\n")}\n\n${body}`, imports };
};

/** One of the article's PGNs — a file beside it, imported, or one written into the content — and where its definition is in the content. */
export type ArticlePgn = ({ name: string; kind: "file"; file: string } | { name: string; kind: "inline"; text: string }) & { start: number; end: number };

const DEFINITION = /^[ \t]*(?:import\s+([A-Za-z_$][\w$]*)\s+from\s+["']([^"'\n]+\.pgn)\?raw["'];?|export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*`((?:\\[\s\S]|[^`\\])*)`)[ \t]*$/gm;

/**
 * **The article's PGNs** (CTA-137) — read from the content itself, so the
 * list is never out of step with it: each `import x from "./….pgn?raw"`
 * (a file beside the article) and each `export const x = \`…\`` (a PGN
 * written in), in the order they appear. An inline one's text is the
 * literal's, its escapes undone.
 */
export const articlePgnsOf = (body: string): ArticlePgn[] =>
  [...body.matchAll(DEFINITION)].map((match) => {
    const span = { start: match.index, end: match.index + match[0].length };
    return match[1] !== undefined
      ? { name: match[1], kind: "file", file: match[2], ...span }
      : { name: match[3], kind: "inline", text: match[4].replace(/\\([`\\$])/g, "$1"), ...span };
  });

/** A name as a regular expression's text — `$` taken literally. */
const literal = (name: string) => name.replace(/\$/g, "\\$");

/**
 * How many times the content uses a name, its own definition aside — the
 * components reading a PGN, an image. The import lines and the PGNs written
 * in are no use of anything, so a file's path (`"./games.pgn?raw"`) or a
 * PGN's text is never counted.
 */
export const usesOf = (body: string, name: string): number => {
  const rest = body.replace(/^[ \t]*import\s[^\n]*$/gm, "").replace(DEFINITION, "");
  const found = (rest.match(new RegExp(`(?<![\\w$])${literal(name)}(?![\\w$])`, "g")) ?? []).length;
  // Its own `export const` that is not a PGN — a definition, not a use.
  return Math.max(0, found - (new RegExp(`^[ \\t]*export\\s+(?:const|let|var|function)\\s+${literal(name)}(?![\\w$])`, "m").test(rest) ? 1 : 0));
};

/** The content without a PGN's definition — its import line or its inline block, and the blank line after it. */
export const withoutPgn = (body: string, name: string): string => {
  for (const match of body.matchAll(DEFINITION)) {
    if ((match[1] ?? match[3]) !== name) continue;
    const start = match.index;
    let end = start + match[0].length;
    if (body[end] === "\n") end += 1;
    // A blank line left between two blocks goes too, so none doubles.
    if (body[end] === "\n" && (start === 0 || body[start - 1] === "\n")) end += 1;
    return body.slice(0, start) + body.slice(end);
  }
  return body;
};

/**
 * The content with a PGN bound under another name (CTA-139) — its
 * definition (the import line, or the `export const`) and every
 * `pgn={<from>}` that reads it; nothing else is touched. The caller checks
 * `to` is an `IDENTIFIER` the content does not bind already.
 */
export const withRenamedPgn = (body: string, from: string, to: string): string => {
  const match = [...body.matchAll(DEFINITION)].find((candidate) => (candidate[1] ?? candidate[3]) === from);
  const defined =
    match === undefined
      ? body
      : body.slice(0, match.index) + match[0].replace(new RegExp(`^([ \\t]*(?:import|export\\s+const)\\s+)${literal(from)}`), (_, head: string) => `${head}${to}`) + body.slice(match.index + match[0].length);
  return defined.replace(new RegExp(`(\\bpgn=\\{\\s*)${literal(from)}(\\s*\\})`, "g"), (_, open: string, close: string) => `${open}${to}${close}`);
};

/** The content with an inline PGN's text replaced (CTA-139) — escaped as `withInlinePgn` writes it; a name with no inline PGN leaves it as it was. */
export const withInlinePgnText = (body: string, name: string, pgn: string): string => {
  const match = [...body.matchAll(DEFINITION)].find((candidate) => candidate[3] === name);
  if (match === undefined) return body;
  const definition = match[0].replace(/`[\s\S]*`/, () => `\`${escapedPgn(pgn)}\``);
  return body.slice(0, match.index) + definition + body.slice(match.index + match[0].length);
};

/** A file the article imports beside it — a PGN or an image — by the name it binds and the file's path from the article. */
export type ArticleAsset = { name: string; file: string; kind: "pgn" | "image" };

/** Every PGN and image file the article imports — what deleting it may take too. */
export const articleAssetsOf = (body: string): ArticleAsset[] =>
  [...body.matchAll(/^[ \t]*import\s+([A-Za-z_$][\w$]*)\s+from\s+["']([^"'\n]+\.(pgn|png|jpe?g|webp|gif))(?:\?raw)?["']/gim)].map((match) => ({
    name: match[1],
    file: match[2],
    kind: match[3].toLowerCase() === "pgn" ? "pgn" : "image",
  }));

/**
 * The body importing an image beside the article — `import <name> from
 * "./<file>"`, after the imports it starts with, or at its top — unless it
 * imports that file already.
 */
export const withImageImport = (body: string, name: string, file: string): string => {
  if (articleAssetsOf(body).some((asset) => asset.file === `./${file}`)) return body;
  const line = `import ${name} from "./${file}"`;
  const lines = body.split("\n");
  const leading = leadingImports(lines);
  if (leading > 0) return [...lines.slice(0, leading), line, ...lines.slice(leading)].join("\n");
  return body.trim() === "" ? `${line}\n` : `${line}\n\n${body}`;
};
