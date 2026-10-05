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
const namesIn = (body: string): Set<string> =>
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

/**
 * The body importing each of `files` (PGNs beside the article): a file it
 * imports already keeps its line and name; the others get a line each,
 * after the imports the body starts with, or at its top.
 */
export const withPgnImports = (body: string, files: readonly string[]): { body: string; imports: PgnImport[] } => {
  const lines = body.split("\n");
  const existing = new Map<string, string>();
  for (const line of lines) {
    const match = IMPORT_LINE.exec(line);
    if (match !== null) existing.set(match[2].replace(/\?raw$/, ""), match[1]);
  }
  const taken = namesIn(body);
  const imports: PgnImport[] = [];
  const added: string[] = [];
  for (const file of files) {
    const known = existing.get(`./${file}`);
    if (known !== undefined) {
      imports.push({ file, name: known });
      continue;
    }
    const name = pgnImportName(file, taken);
    taken.add(name);
    existing.set(`./${file}`, name);
    imports.push({ file, name });
    added.push(`import ${name} from "./${file}?raw"`);
  }
  if (added.length === 0) return { body, imports };
  let leading = 0;
  while (leading < lines.length && IMPORT_LINE.test(lines[leading])) leading += 1;
  if (leading > 0) return { body: [...lines.slice(0, leading), ...added, ...lines.slice(leading)].join("\n"), imports };
  return { body: body.trim() === "" ? `${added.join("\n")}\n` : `${added.join("\n")}\n\n${body}`, imports };
};
