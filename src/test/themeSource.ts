import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

import type { ThemeDefinition } from "../design-system/themes/types";

/*
  **Loading a generated theme file** (CTA-115) — how the generator's tests
  ask the question a contributor's machine answers: does the file the
  script writes, or the editor downloads, load back as the theme it was
  made from, and does it compile?
*/

const ROOT = process.cwd();
const THEMES_DIR = join(ROOT, "src/design-system/themes");
const SCRATCH = join(ROOT, "node_modules/.tmp");

/**
 * **Loads a theme file's source** as a module — transpiled by TypeScript and
 * imported from a temporary folder, exactly as a file on disk would be (its
 * one import is `import type`, which the transpile erases) — and hands back
 * its `exportName`.
 */
export const loadThemeSource = async (source: string, exportName: string): Promise<ThemeDefinition> => {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, verbatimModuleSyntax: true },
  });
  // Inside the repository, where the test runner's module loader reaches.
  mkdirSync(SCRATCH, { recursive: true });
  const dir = mkdtempSync(join(SCRATCH, "theme-source-"));
  try {
    const file = join(dir, "theme.mjs");
    writeFileSync(file, outputText);
    const module = (await import(/* @vite-ignore */ file)) as Record<string, ThemeDefinition>;
    return module[exportName];
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

/**
 * **Type-checks a theme file's source** as if it were
 * `src/design-system/themes/<fileName>`, under the app's own compiler
 * options (`tsconfig.app.json`) — held in memory, never written into the
 * tree. The diagnostics of that one file, as text; none is `[]`.
 */
export const typecheckThemeSource = (source: string, fileName: string): string[] => {
  const path = join(THEMES_DIR, fileName);
  const config = ts.getParsedCommandLineOfConfigFile(join(ROOT, "tsconfig.app.json"), {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
      throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
    },
  });
  if (config === undefined) throw new Error("tsconfig.app.json did not parse");
  const options = { ...config.options, noEmit: true, incremental: false, tsBuildInfoFile: undefined };
  const host = ts.createCompilerHost(options);
  const { fileExists, readFile, getSourceFile } = host;
  host.fileExists = (name) => name === path || fileExists(name);
  host.readFile = (name) => (name === path ? source : readFile(name));
  host.getSourceFile = (name, language, ...rest) =>
    name === path ? ts.createSourceFile(name, source, language, true) : getSourceFile(name, language, ...rest);
  const program = ts.createProgram([path], options, host);
  return ts
    .getPreEmitDiagnostics(program, program.getSourceFile(path))
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
};
