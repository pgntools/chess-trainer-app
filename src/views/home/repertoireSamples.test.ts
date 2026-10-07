import { describe, expect, it } from "vitest";

import { demoNodeAt } from "../../lib/demoTree";
import { isRepertoireSampleId, REPERTOIRE_SAMPLE_IDS, repertoireSample } from "./repertoireSamples";

/*
  The sample repertoires a front-page repertoire board falls back on (CTA-126,
  `src/data/frontPage/repertoires/`) read, and branch where the page's
  `startMove`s open them — so a swapped file that will not parse fails here.
*/
describe("the front page's sample repertoires", () => {
  it("are known by id, each a tree from the standard start", () => {
    expect(REPERTOIRE_SAMPLE_IDS).toEqual(["e4-white", "caro-kann-black"]);
    expect(isRepertoireSampleId("e4-white")).toBe(true);
    expect(isRepertoireSampleId("nope")).toBe(false);
    expect(isRepertoireSampleId(undefined)).toBe(false);
  });

  it("1. e4 for White branches at Black's first reply, by its play chances", () => {
    const { root, color } = repertoireSample("e4-white");
    expect(color).toBe("white");
    expect(demoNodeAt(root, ["e4"]).node.children.map((child) => [child.san, child.chance])).toEqual([
      ["e5", 0.5],
      ["c5", 0.3],
      ["e6", 0.15],
      ["c6", 0.05],
    ]);
  });

  it("the Caro-Kann for Black branches at White's second move", () => {
    const { root, color } = repertoireSample("caro-kann-black");
    expect(color).toBe("black");
    const { line, node } = demoNodeAt(root, ["e4", "c6"]);
    expect(line).toEqual(["e4", "c6"]);
    expect(node.children.map((child) => child.san)).toEqual(["d4", "Nc3", "c4"]);
  });
});
