import { describe, expect, it } from "vitest";

import { noPieces, sessionMaterialOf, type AchievementPieces } from "./material";
import { PIECE_VALUES } from "./pieces";

/* A session's material (CTA-249): per category, in all, and the count of each piece. */

const pieces = (order: AchievementPieces[number]["piece"], best: AchievementPieces[number]["piece"], line: AchievementPieces[number]["piece"] = null): AchievementPieces => [
  { category: "order", piece: order },
  { category: "best", piece: best },
  { category: "clean", piece: null },
  { category: "game", piece: null },
  { category: "line", piece: line },
];

describe("sessionMaterialOf", () => {
  it("values the pieces 1, 3, 3, 5, 9", () => {
    expect(PIECE_VALUES).toEqual({ pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9 });
  });

  it("sums each category's pieces, the whole, and counts each piece", () => {
    const material = sessionMaterialOf([pieces("queen", "rook", "pawn"), pieces("bishop", "rook"), noPieces()]);
    expect(material.categories.map((each) => [each.category, each.material])).toEqual([
      ["order", 12],
      ["best", 10],
      ["clean", 0],
      ["game", 0],
      ["line", 1],
    ]);
    expect(material.categories[1]?.counts).toEqual({ pawn: 0, knight: 0, bishop: 0, rook: 2, queen: 0 });
    expect(material.material).toBe(23);
    expect(material.counts).toEqual({ pawn: 1, knight: 0, bishop: 1, rook: 2, queen: 1 });
  });

  it("is nothing for no positions — never negative", () => {
    const material = sessionMaterialOf([]);
    expect(material.material).toBe(0);
    expect(material.categories.every((each) => each.material === 0)).toBe(true);
  });
});
