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
 * PGNs by their names (the Add PGN dialog's preview); only those `names`
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

/**
 * The body with a PGN written into it (CTA-137) — `export const <name> =
 * \`<the PGN>\`` after its imports, a blank line either side — so it needs
 * no file. A backtick, a backslash or a `${` in the PGN is escaped, so the
 * text is the PGN's exactly.
 */
export const withInlinePgn = (body: string, name: string, pgn: string): string => {
  const escaped = pgn.trim().replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  const block = `export const ${name} = \`${escaped}\``;
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
