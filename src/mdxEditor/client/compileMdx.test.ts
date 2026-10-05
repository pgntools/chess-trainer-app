import { describe, expect, it, vi } from "vitest";

import { compileMdx, resolveImports, type ImportResolver } from "./compileMdx";

/*
  The MDX editor's compiler step: an article's imports of a PGN beside it
  resolved before the browser compiles it — line for line, and never inside
  a fenced code block, where an article shows its markup.
*/

const FILES: Record<string, string> = { "tournaments/games.pgn": '[Event "Club"]\n\n1. e4 e5 *' };

const resolver: ImportResolver = {
  keyOf: (specifier) => (specifier === "./games.pgn?raw" ? "tournaments/games.pgn" : undefined),
  load: async (key) => FILES[key],
};

describe("resolveImports", () => {
  it("turns an import line into the file's text, on the same line", async () => {
    const result = await resolveImports('import games from "./games.pgn?raw"\n\n## Title', resolver);
    expect(result).toEqual({ ok: true, source: `export const games = ${JSON.stringify(FILES["tournaments/games.pgn"])}\n\n## Title` });
  });

  it("turns a lazy import() into a call to the installed loader, the file unread", async () => {
    const load = vi.fn(resolver.load);
    const result = await resolveImports('<TeamStandingsTable load={() => import("./games.pgn?raw")} />', { ...resolver, load });
    expect(result).toEqual({ ok: true, source: '<TeamStandingsTable load={() => globalThis.__mdxEditorImport("tournaments/games.pgn")} />' });
    expect(load).not.toHaveBeenCalled();
  });

  it("leaves a lazy import() it cannot resolve as written", async () => {
    const text = 'A large file goes in as `load={() => import("./event.pgn?raw")}`.';
    expect(await resolveImports(text, resolver)).toEqual({ ok: true, source: text });
  });

  it("leaves imports inside a fenced code block alone", async () => {
    const text = ["```mdx", 'import games from "./nowhere.pgn?raw"', "import { x } from 'y'", "```", "", "~~~~", 'import("./games.pgn?raw")', "~~~~"].join("\n");
    expect(await resolveImports(text, resolver)).toEqual({ ok: true, source: text });
  });

  it("refuses an import it cannot resolve, and any other import, naming the line", async () => {
    expect(await resolveImports('## A\n\nimport games from "./nowhere.pgn?raw"', resolver)).toMatchObject({ ok: false, line: 3, message: expect.stringContaining('"./nowhere.pgn?raw"') });
    expect(await resolveImports("import { Chessboard } from 'react-chessboard'", resolver)).toMatchObject({ ok: false, line: 1 });
  });
});

describe("compileMdx", () => {
  it("compiles a document with its exports into a component", async () => {
    expect(await compileMdx('export const x = 1\n\n## Title {x}', resolver)).toMatchObject({ ok: true, Content: expect.any(Function) });
  });

  it("reports a document that will not compile, never throwing", async () => {
    const result = await compileMdx("<BoardRow>\n", resolver);
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ message: expect.stringContaining("Expected a closing tag for `<BoardRow>`") });
  });

  it("installs the loader a lazy import() calls, which reads the file then", async () => {
    await compileMdx("## Title", resolver);
    const importer = (globalThis as unknown as { __mdxEditorImport: (key: string) => Promise<{ default: string }> }).__mdxEditorImport;
    expect(await importer("tournaments/games.pgn")).toEqual({ default: FILES["tournaments/games.pgn"] });
  });
});
