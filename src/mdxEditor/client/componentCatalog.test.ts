import { describe, expect, it } from "vitest";

import { mdxComponents } from "../../views/home/frontPage";
import { CATALOG, catalogFor, componentOf, insertBlock, insertedBlock, type ExampleSource } from "./componentCatalog";

/*
  The Components section's examples (CTA-137): each a component an article can
  name, written for a PGN or a Library game, and inserted as a block of its
  own where the caret is.
*/

describe("the component examples", () => {
  const pgn: ExampleSource = { kind: "pgn", name: "club", moves: { line: "1. d4 d5", start: "1..." } };
  const library: ExampleSource = { kind: "library", game: { collection: "cup", number: 7 } };

  it("give each entry its own id, and name only components an article embeds — but a mock's", () => {
    const ids = CATALOG.flatMap((folder) => folder.entries.map((entry) => entry.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of CATALOG.flatMap((folder) => folder.entries)) {
      for (const source of [pgn, library]) {
        const code = entry.code(source);
        if (code === undefined) continue;
        const component = componentOf(code);
        expect(component).toBeDefined();
        if (entry.mock !== true) expect(Object.keys(mdxComponents)).toContain(component);
      }
    }
  });

  it("write each for the game it is given: a PGN by its name, a Library game by its address, a position by its moves", () => {
    const codeOf = (source: ExampleSource, id: string) => catalogFor(source).flatMap((folder) => folder.entries).find((entry) => entry.id === id)?.code(source);
    expect(codeOf(pgn, "tournament-swiss")).toContain("pgn={club}");
    expect(codeOf(library, "tournament-swiss")).toBe('<SwissStandingsTable src="/library/cup" density="dense" rowsPerPage="25" />');
    expect(codeOf(library, "set-row")).toBe('<BoardRow>\n  <InlinePgnGame2colV src="/library/cup/7" />\n  <InlinePgnGame2colV src="/library/cup/8" />\n  <InlinePgnGame2colV src="/library/cup/9" />\n</BoardRow>');
    expect(codeOf(pgn, "single-inline-2col-h")).toContain("<InlinePgnGame2colH pgn={");
    expect(codeOf(library, "single-inline-2col-h")).toBe('<InlinePgnGame2colH src="/library/cup/7" caption="…" />');
    expect(codeOf(pgn, "single-inline-2col-v")).toContain("<InlinePgnGame2colV pgn={");
    expect(codeOf(library, "single-inline-2col-v")).toBe('<InlinePgnGame2colV src="/library/cup/7" caption="…" />');
    expect(codeOf(pgn, "position-moves")).toBe('<InlinePgnGame pgn="1. d4 d5" start="1..." caption="…" />');
    // Every folder, for either kind of game.
    expect(catalogFor(library).map((folder) => folder.title)).toEqual(["Single game", "Specific player", "Games set", "Repertoire", "Tournament", "Position", "Puzzle"]);
  });
});

describe("insertBlock", () => {
  it("puts the block after the caret's line, a blank line either side", () => {
    const body = "## One\n\nWords here\n\n## Two";
    expect(insertBlock(body, body.indexOf("here"), "<X />")).toBe("## One\n\nWords here\n\n<X />\n\n## Two");
    expect(insertBlock(body, body.length, "<X />")).toBe(`${body}\n\n<X />\n`);
    expect(insertBlock(body, 0, "<X />")).toBe("## One\n\n<X />\n\nWords here\n\n## Two");
    expect(insertBlock("", 0, "<X />")).toBe("<X />\n");
  });
});

describe("insertedBlock (CTA-139)", () => {
  it("says where the code starts in what it gives", () => {
    for (const [body, at] of [["## A\n\nWords", 4], ["", 0], ["Words", 0]] as const) {
      const { body: next, start } = insertedBlock(body, at, "<MatchTable pgn={x} />");
      expect(next).toBe(insertBlock(body, at, "<MatchTable pgn={x} />"));
      expect(next.slice(start).startsWith("<MatchTable pgn={x} />")).toBe(true);
    }
  });
});
