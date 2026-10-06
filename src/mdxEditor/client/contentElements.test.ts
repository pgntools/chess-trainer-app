import { describe, expect, it } from "vitest";

import { componentLabelOf, componentsIn, elementAt, imageLabelOf, pgnNameOf, startAtCaret, withoutElement, withoutImport } from "./contentElements";

/*
  The MDX editor's Components and Images sections (CTA-139): the content's
  elements listed, labelled and chosen by where they start, and the content
  without one of them — and the import only it read.
*/

const BODY = [
  'import games from "./cup.pgn?raw"',
  'import photo from "./photo.png"',
  "",
  "## Standings",
  "",
  "<SwissStandingsTable pgn={games} density=\"dense\" />",
  "",
  '<ArticleImage src={photo} alt="The hall" />',
  "",
  'Inline <InlinePgnGame pgn="1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4" /> here.',
  "",
  '<CollectionTournamentTable _id="/library/candidates2026" />',
  "",
].join("\n");

describe("componentsIn", () => {
  it("lists the catalog's components in the order they appear, but no image", () => {
    expect(componentsIn(BODY).map((element) => element.component)).toEqual(["SwissStandingsTable", "InlinePgnGame", "CollectionTournamentTable"]);
    const [table] = componentsIn(BODY);
    expect(BODY.slice(table.start, table.end)).toBe(table.code);
  });
});

describe("the list's words", () => {
  it("name a component and what it reads — a PGN by name, moves cut short, a Library address", () => {
    expect(componentsIn(BODY).map((element) => componentLabelOf(element.code))).toEqual([
      { component: "SwissStandingsTable", reads: "games" },
      { component: "InlinePgnGame", reads: "1. e4 e5 2. Nf3 Nc6 3. Bb5 …" },
      { component: "CollectionTournamentTable", reads: "/library/candidates2026" },
    ]);
    expect(pgnNameOf("<MatchTable pgn={club} />")).toBe("club");
    expect(pgnNameOf('<MatchTable pgn="1. e4" />')).toBeUndefined();
  });

  it("name an image by its alt text and its file, a decorative one as such", () => {
    const files = new Map([["photo", "./photo.png"]]);
    expect(imageLabelOf('<ArticleImage src={photo} alt="The hall" />', files)).toEqual({ alt: "The hall", file: "./photo.png", src: "photo" });
    expect(imageLabelOf('<ArticleImage src={photo} alt="" />', files).alt).toBe("Decorative");
  });
});

describe("choosing an element by where it starts", () => {
  const elements = [
    { start: 10, end: 20 },
    { start: 40, end: 50 },
  ];

  it("opens on the one the caret is in, else the first, else Add", () => {
    expect(startAtCaret(elements, 45)).toBe(40);
    expect(startAtCaret(elements, 30)).toBe(10);
    expect(startAtCaret([], 3)).toBeNull();
  });

  it("keeps a removed one's place: the next after it, else the last", () => {
    expect(elementAt(elements, 40)).toBe(elements[1]);
    expect(elementAt(elements, 25)).toBe(elements[1]);
    expect(elementAt(elements, 60)).toBe(elements[1]);
    expect(elementAt(elements, null)).toBeUndefined();
    expect(elementAt([], 10)).toBeUndefined();
  });
});

describe("withoutElement", () => {
  it("takes a block and its blank line, so none doubles", () => {
    const [table] = componentsIn(BODY);
    expect(withoutElement(BODY, table.start, table.end)).toBe(BODY.replace('<SwissStandingsTable pgn={games} density="dense" />\n\n', ""));
  });

  it("cuts an element inside a line out of it alone", () => {
    const inline = componentsIn(BODY)[1];
    expect(withoutElement(BODY, inline.start, inline.end)).toContain("\nInline  here.\n");
  });

  it("takes the last block off the end, the content ending on one newline", () => {
    const last = componentsIn(BODY)[2];
    expect(withoutElement(BODY, last.start, last.end).endsWith("a6 4. Ba4\" /> here.\n")).toBe(true);
    expect(withoutElement("<MatchTable pgn={x} />\n", 0, 22)).toBe("");
  });

  it("takes the import only it read, and keeps one something else reads", () => {
    const body = 'import photo from "./photo.png"\n\n<ArticleImage src={photo} alt="A" />\n\n<ArticleImage src={photo} alt="B" />\n';
    const first = body.indexOf("<ArticleImage");
    const firstEnd = body.indexOf("/>", first) + 2;
    const once = withoutElement(body, first, firstEnd, "photo");
    expect(once).toBe('import photo from "./photo.png"\n\n<ArticleImage src={photo} alt="B" />\n');
    const second = once.indexOf("<ArticleImage");
    expect(withoutElement(once, second, once.indexOf("/>", second) + 2, "photo")).toBe("");
  });
});

describe("withoutImport", () => {
  it("takes one import line, keeping the others and one blank line", () => {
    expect(withoutImport(BODY, "photo").startsWith('import games from "./cup.pgn?raw"\n\n## Standings')).toBe(true);
    expect(withoutImport('import photo from "./photo.png"\n\n## T', "photo")).toBe("## T");
    expect(withoutImport("## T", "photo")).toBe("## T");
  });
});
