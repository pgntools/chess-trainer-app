import { describe, expect, it } from "vitest";

import { pgnImportName, pgnNamesIn, withInlinePgn, withPgnImports } from "./pgnImports";

/*
  The import line the MDX editor adds for a PGN attached to an article
  (CTA-137): a name from the file, never one the body has bound, after the
  imports the body starts with.
*/

describe("pgnImportName", () => {
  it("names a file by its stem, in camelCase, never starting with a digit", () => {
    expect(pgnImportName("olym26.pgn", new Set())).toBe("olym26");
    expect(pgnImportName("club-nights_round.1.pgn", new Set())).toBe("clubNightsRound1");
    expect(pgnImportName("20th-werner-obermeyer-swiss-5r.pgn", new Set())).toBe("pgn20thWernerObermeyerSwiss5r");
    expect(pgnImportName("---.pgn", new Set())).toBe("games");
  });

  it("numbers on past a name already taken", () => {
    expect(pgnImportName("games.pgn", new Set(["games", "games2"]))).toBe("games3");
  });
});

describe("withPgnImports", () => {
  it("puts the lines after the body's own imports", () => {
    const body = 'import games from "./cup.pgn?raw"\n\n## Title';
    expect(withPgnImports(body, ["olym26.pgn"])).toEqual({
      body: 'import games from "./cup.pgn?raw"\nimport olym26 from "./olym26.pgn?raw"\n\n## Title',
      imports: [{ file: "olym26.pgn", name: "olym26" }],
    });
  });

  it("starts a body with no imports with them, a blank line after", () => {
    expect(withPgnImports("## Title", ["a.pgn", "b.pgn"]).body).toBe('import a from "./a.pgn?raw"\nimport b from "./b.pgn?raw"\n\n## Title');
    expect(withPgnImports("", ["a.pgn"]).body).toBe('import a from "./a.pgn?raw"\n');
  });

  it("keeps a file already imported as it is, under its own name, and takes no name the body binds", () => {
    const body = "import games from \"./cup.pgn?raw\"\nexport const olym26 = 1\n\n## Title";
    const result = withPgnImports(body, ["cup.pgn", "olym26.pgn"]);
    expect(result.imports).toEqual([
      { file: "cup.pgn", name: "games" },
      { file: "olym26.pgn", name: "olym262" },
    ]);
    expect(result.body).toBe('import games from "./cup.pgn?raw"\nimport olym262 from "./olym26.pgn?raw"\nexport const olym26 = 1\n\n## Title');
    expect(withPgnImports(body, ["cup.pgn"]).body).toBe(body);
  });
});

describe("withInlinePgn", () => {
  it("writes the PGN into the body after its imports, escaped so the text is the PGN's own", () => {
    const pgn = '[Event "A `quoted` ${x} \\\\ cup"]\n\n1. e4 *\n';
    const body = withInlinePgn('import games from "./cup.pgn?raw"\n## Title', "club", pgn);
    expect(body).toBe('import games from "./cup.pgn?raw"\n\nexport const club = `[Event "A \\`quoted\\` \\${x} \\\\\\\\ cup"]\n\n1. e4 *`\n\n## Title');
    // The template literal reads back to the PGN exactly.
    const literal = /export const club = (`[\s\S]*`)\n\n## Title/.exec(body)?.[1] ?? "";
    expect(new Function(`return ${literal}`)()).toBe(pgn.trim());
    expect(withInlinePgn("", "g", "1. d4 *")).toBe("export const g = `1. d4 *`\n");
    expect(withInlinePgn("## T", "g", "1. d4 *")).toBe("export const g = `1. d4 *`\n\n## T");
  });

  it("lists the names a component can take as its PGN, imported or written in", () => {
    expect(pgnNamesIn('import games from "./cup.pgn?raw"\nimport x from "./y.js"\n\nexport const club = `1. e4 *`\nexport const n = 3')).toEqual(["games", "club"]);
  });
});
