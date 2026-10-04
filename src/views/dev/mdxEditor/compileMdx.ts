import { evaluate } from "@mdx-js/mdx";
import type { MDXContent } from "mdx/types";
import * as runtime from "react/jsx-runtime";

/**
 * **MDX compiled in the browser** — the dev-only MDX editor's one use of a
 * compiler the shipped app never carries (articles are compiled at build time
 * by `@mdx-js/rollup`, `vite.config.ts`). The source is compiled and run as
 * it is typed; the components it names are not imported but handed to the
 * result, exactly as `ArticleBody` hands them to a built article.
 *
 * **Imports.** A built article may `import games from "./x.pgn?raw"` — a
 * PGN beside it — or load one lazily, `load={() => import("./x.pgn?raw")}`.
 * Here there is no bundler to read the file, so before compiling:
 *
 * - an import line is replaced, on the same line (an error's line number
 *   stays the editor's), by `export const games = "<the file's text>"`;
 * - an `import("…")` the resolver knows becomes a call to a loader this
 *   module installs on `globalThis` (`IMPORTER`) — the compiled document
 *   runs in no module of its own, so it has no other way to reach one — and
 *   is still read only when the embed asks for it.
 *
 * Any other import line is an error. Neither is touched inside a fenced code
 * block, where an article shows its markup.
 */

/** The compiled document, or why it would not compile. */
export type CompileResult =
  | { ok: true; Content: MDXContent }
  | { ok: false; message: string; line?: number; column?: number };

/** How an article's imports are read. */
export type ImportResolver = {
  /** The file a specifier names, as a key `load` takes — `undefined` for no such file. */
  keyOf: (specifier: string) => string | undefined;
  /** A file's text, by its key. */
  load: (key: string) => Promise<string>;
};

/** The global the rewritten `import("…")`s call. */
const IMPORTER = "__mdxEditorImport";

/** `import name from "spec"` on a line of its own — the only import an article uses. */
const IMPORT_LINE = /^import\s+([A-Za-z_$][\w$]*)\s+from\s+(["'])([^"']+)\2\s*;?\s*$/;
/** Any other line starting an import — reported rather than left to fail inside the compiler. */
const OTHER_IMPORT = /^import[\s{*]/;
/** `import("spec")` — a lazy load inside an expression. */
const DYNAMIC_IMPORT = /\bimport\(\s*(["'])([^"']+)\1\s*\)/g;
/** A fence opening or closing a code block — its marker, three or more backticks or tildes. */
const FENCE = /^\s{0,3}(`{3,}|~{3,})/;

/** Imports resolved, line for line — or the first import line that would not resolve. */
export const resolveImports = async (
  source: string,
  resolver: ImportResolver,
): Promise<{ ok: true; source: string } | { ok: false; message: string; line: number }> => {
  const lines = source.split("\n");
  let fence: string | undefined;
  for (const [index, text] of lines.entries()) {
    const marker = FENCE.exec(text)?.[1];
    if (marker !== undefined && (fence === undefined || (marker[0] === fence[0] && marker.length >= fence.length))) {
      fence = fence === undefined ? marker : undefined;
      continue;
    }
    if (fence !== undefined) continue;

    const match = IMPORT_LINE.exec(text);
    if (match !== null) {
      const [, name, , specifier] = match;
      const key = resolver.keyOf(specifier);
      if (key === undefined) return { ok: false, line: index + 1, message: `Cannot resolve "${specifier}" — only a .pgn beside an article can be imported.` };
      lines[index] = `export const ${name} = ${JSON.stringify(await resolver.load(key))}`;
    } else if (OTHER_IMPORT.test(text)) {
      return { ok: false, line: index + 1, message: 'Only a default import of a file is supported: import games from "./file.pgn?raw"' };
    } else {
      lines[index] = text.replace(DYNAMIC_IMPORT, (call, _quote: string, specifier: string) => {
        const key = resolver.keyOf(specifier);
        return key === undefined ? call : `globalThis.${IMPORTER}(${JSON.stringify(key)})`;
      });
    }
  }
  return { ok: true, source: lines.join("\n") };
};

/** What a compiler error says, and where. */
const describeError = (error: unknown): Extract<CompileResult, { ok: false }> => {
  if (error !== null && typeof error === "object") {
    const { reason, message, line, column } = error as { reason?: unknown; message?: unknown; line?: unknown; column?: unknown };
    const text = typeof reason === "string" ? reason : typeof message === "string" ? message : String(error);
    return {
      ok: false,
      message: text,
      line: typeof line === "number" ? line : undefined,
      column: typeof column === "number" ? column : undefined,
    };
  }
  return { ok: false, message: String(error) };
};

/** Compile and run an MDX document. Never throws: a document that will not compile is a result. */
export const compileMdx = async (source: string, resolver: ImportResolver): Promise<CompileResult> => {
  const resolved = await resolveImports(source, resolver);
  (globalThis as Record<string, unknown>)[IMPORTER] = async (key: string) => ({ default: await resolver.load(key) });
  if (!resolved.ok) return { ok: false, message: resolved.message, line: resolved.line };
  try {
    const { default: Content } = await evaluate(resolved.source, { ...runtime, development: false });
    return { ok: true, Content };
  } catch (error) {
    return describeError(error);
  }
};
