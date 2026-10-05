import { describe, expect, it } from "vitest";

import { mdxComponents } from "../../home/frontPage";
import { COMPONENT_EXAMPLES, insertBlock } from "./componentCatalog";

/*
  The Add PGN dialog's examples (CTA-137): each a component an article can
  name, written for a PGN or a Library game, and inserted as a block of its
  own where the caret is.
*/

describe("the component examples", () => {
  it("name only components an article embeds, each once, each written for its game", () => {
    const names = COMPONENT_EXAMPLES.map((example) => example.name);
    expect(new Set(names).size).toBe(names.length);
    for (const example of COMPONENT_EXAMPLES) {
      expect(Object.keys(mdxComponents)).toContain(example.name);
      const code = example.takes === "pgn" ? example.code("club") : example.code({ collection: "cup", number: 7 });
      expect(code.startsWith(`<${example.name}`)).toBe(true);
      if (example.takes === "pgn") expect(code).toContain("pgn={club}");
      else expect(code).toContain(example.shows === "game" ? "cup/7" : "/library/cup");
    }
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
