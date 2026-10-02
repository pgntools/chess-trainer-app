import { describe, expect, it } from "vitest";

import { demoNodeAt } from "../../lib/demoTree";
import { demoSamples, SAMPLE_IDS } from "./samples";

/*
  The front page's shipped samples (CTA-126, `src/data/frontPage/`) read, and
  say what the page's captions say they do — so a swapped file that will not
  parse, or a slice gone missing, fails here rather than on the page.
*/
describe("the front page's samples", () => {
  it("are three, each a tree with a move to play from the standard start", () => {
    expect(SAMPLE_IDS).toEqual(["game", "repertoire", "collection"]);
    for (const id of SAMPLE_IDS) {
      const { root, startFen } = demoSamples()[id];
      expect(startFen, id).toBeUndefined();
      expect(root.children.length, id).toBeGreaterThan(0);
    }
  });

  it("the game is the Opera Game, one line to Morphy's mate", () => {
    let node = demoSamples().game.root;
    const line: string[] = [];
    while (node.children.length > 0) {
      expect(node.children).toHaveLength(1);
      node = node.children[0];
      line.push(node.san);
    }
    expect(line).toHaveLength(33);
    expect(line.at(-1)).toBe("Rd8#");
  });

  it("the repertoire branches at Black's first reply, by its play chances", () => {
    const { node } = demoNodeAt(demoSamples().repertoire.root, ["e4"]);
    expect(node.children.map((child) => [child.san, child.chance])).toEqual([
      ["e5", 0.5],
      ["c5", 0.3],
      ["e6", 0.15],
      ["c6", 0.05],
    ]);
  });

  it("the collection is a slice of the Library's Capablanca games, with their counts and results", () => {
    const { root } = demoSamples().collection;
    expect(root.count).toBe(24);
    expect(root.children.map((child) => child.san)).toEqual(["e4", "d4"]);
    expect(root.children[0].results).toBeDefined();
  });
});
