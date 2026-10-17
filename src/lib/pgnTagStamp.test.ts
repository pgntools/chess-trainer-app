import { describe, expect, it } from "vitest";

import { readPgnTags } from "./pgn";
import { pgnTagLine, readTagLines, stampPgnTags } from "./pgnTagStamp";

describe("readTagLines", () => {
  it("reads one tag pair per non-blank line", () => {
    expect(readTagLines('[Site "Warwick ENG"]\n\n  [Date "2026.08.01"]  \n[Annotator "Stockfish19"]\n')).toEqual({
      tags: [
        { name: "Site", value: "Warwick ENG" },
        { name: "Date", value: "2026.08.01" },
        { name: "Annotator", value: "Stockfish19" },
      ],
      problems: [],
    });
  });

  it("reads nothing from a blank field", () => {
    expect(readTagLines("")).toEqual({ tags: [], problems: [] });
    expect(readTagLines("  \n\t\n")).toEqual({ tags: [], problems: [] });
  });

  it("unescapes \\\" and \\\\ in a value", () => {
    expect(readTagLines('[Event "The \\"Open\\" \\\\ 2026"]').tags).toEqual([{ name: "Event", value: 'The "Open" \\ 2026' }]);
    expect(readTagLines('[Event ""]').tags).toEqual([{ name: "Event", value: "" }]);
  });

  it("reports each malformed line by its number and why", () => {
    const { tags, problems } = readTagLines(
      ['[Site "Warwick"]', "Site Warwick", '[Site "Warwick"', '[Site-x "a"]', '[Event "a "b" c"]', '[Event "a \\n"]', '[Round "1"]'].join("\n"),
    );
    expect(problems).toEqual([
      { line: 2, reason: "syntax" },
      { line: 3, reason: "syntax" },
      { line: 4, reason: "name" },
      { line: 5, reason: "escape" },
      { line: 6, reason: "escape" },
    ]);
    expect(tags).toEqual([
      { name: "Site", value: "Warwick" },
      { name: "Round", value: "1" },
    ]);
  });

  it("lets the last of a name typed twice win, in the first one's place", () => {
    expect(readTagLines('[Site "A"]\n[Date "2026"]\n[Site "B"]').tags).toEqual([
      { name: "Site", value: "B" },
      { name: "Date", value: "2026" },
    ]);
  });
});

describe("pgnTagLine", () => {
  it("escapes the value", () => {
    expect(pgnTagLine({ name: "Event", value: 'The "Open" \\' })).toBe('[Event "The \\"Open\\" \\\\"]');
  });
});

const GAME = '[Event "Club"]\n[Site "?"]\n[Date "2023.04.02"]\n[White "Amy"]\n[Black "Bob"]\n[Result "1-0"]\n[WhiteElo "1500"]\n\n1. e4 e5 2. Nf3 {[Site "x"]} Nc6 1-0';

describe("stampPgnTags", () => {
  it("is the same text back with no tags", () => {
    expect(stampPgnTags(GAME, [])).toBe(GAME);
  });

  it("overrides a tag the game carries, in its place", () => {
    const stamped = stampPgnTags(GAME, [{ name: "Site", value: "Warwick ENG" }]);
    expect(stamped).toBe(GAME.replace('[Site "?"]', '[Site "Warwick ENG"]'));
  });

  it("leaves no second tag of a name the game carried twice", () => {
    const stamped = stampPgnTags('[Event "A"]\n[Site "x"]\n[Site "y"]\n\n1. e4 *', [{ name: "Site", value: "z" }]);
    expect(stamped).toBe('[Event "A"]\n[Site "z"]\n\n1. e4 *');
  });

  it("adds a tag the game lacks at the end of its tag section", () => {
    const stamped = stampPgnTags(GAME, [{ name: "Annotator", value: "Stockfish19" }]);
    expect(stamped).toBe(GAME.replace('[WhiteElo "1500"]\n', '[WhiteElo "1500"]\n[Annotator "Stockfish19"]\n'));
    expect(readPgnTags(stamped).Annotator).toBe("Stockfish19");
  });

  it("puts a Seven Tag Roster tag the game lacks in its roster place", () => {
    const game = '[Event "Club"]\n[Date "2023"]\n[White "Amy"]\n[Black "Bob"]\n[Result "*"]\n[ECO "C20"]\n\n1. e4 *';
    expect(
      stampPgnTags(game, [
        { name: "Annotator", value: "me" },
        { name: "Round", value: "3" },
        { name: "Site", value: "Warwick" },
      ]),
    ).toBe('[Event "Club"]\n[Site "Warwick"]\n[Date "2023"]\n[Round "3"]\n[White "Amy"]\n[Black "Bob"]\n[Result "*"]\n[ECO "C20"]\n[Annotator "me"]\n\n1. e4 *');
    // No roster tag before it: first.
    expect(stampPgnTags('[White "Amy"]\n\n1. e4 *', [{ name: "Event", value: "E" }])).toBe('[Event "E"]\n[White "Amy"]\n\n1. e4 *');
  });

  it("gives a game with no tag section one", () => {
    expect(
      stampPgnTags("1. d4 d5 2. c4 *", [
        { name: "Annotator", value: "me" },
        { name: "Date", value: "2026.08.01" },
        { name: "Site", value: "Warwick" },
      ]),
    ).toBe('[Site "Warwick"]\n[Date "2026.08.01"]\n[Annotator "me"]\n\n1. d4 d5 2. c4 *');
  });

  it("writes the value escaped, and reads back the same", () => {
    const { tags } = readTagLines('[Event "The \\"Open\\" \\\\ 2026"]');
    const stamped = stampPgnTags(GAME, tags);
    expect(stamped).toContain('[Event "The \\"Open\\" \\\\ 2026"]');
    expect(readPgnTags(stamped).Event).toBe('The "Open" \\ 2026');
  });

  it("touches neither the other tags nor the movetext", () => {
    const stamped = stampPgnTags(GAME, [{ name: "Site", value: "W" }, { name: "Annotator", value: "A" }]);
    expect(stamped.endsWith('\n\n1. e4 e5 2. Nf3 {[Site "x"]} Nc6 1-0')).toBe(true);
    const tags = readPgnTags(stamped);
    expect(tags).toMatchObject({ Event: "Club", Date: "2023.04.02", White: "Amy", Black: "Bob", Result: "1-0", WhiteElo: "1500" });
  });
});
