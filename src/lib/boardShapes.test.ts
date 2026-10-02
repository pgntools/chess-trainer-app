import { describe, expect, it } from "vitest";

import { drawsShapes, shapesOf } from "./boardShapes";

describe("shapesOf — a PGN's [%cal] arrows and [%csl] circles (CTA-126)", () => {
  it("reads lichess's arrows and circles, by brush, from one comment or several", () => {
    const shapes = shapesOf([
      "Prose first. [%csl Ya4,Rg4][%cal Ge3e4,Bf3f4]",
      "[%cal Rb3b4,Yh3h4]",
    ]);
    expect(shapes.circles).toEqual([
      { brush: "yellow", square: "a4" },
      { brush: "red", square: "g4" },
    ]);
    expect(shapes.arrows).toEqual([
      { brush: "green", from: "e3", to: "e4" },
      { brush: "blue", from: "f3", to: "f4" },
      { brush: "red", from: "b3", to: "b4" },
      { brush: "yellow", from: "h3", to: "h4" },
    ]);
    expect(drawsShapes(shapes)).toBe(true);
  });

  it("skips what is not a brush and squares, draws each shape once, and reads an arrow to its own square as a circle", () => {
    const shapes = shapesOf(["[%cal Xe2e4, Ge2e9, Ge2e4, Ge2e4, ge7e5, Rd4d4] [%csl Gz9,Bf5,Bf5]"]);
    expect(shapes.arrows).toEqual([
      { brush: "green", from: "e2", to: "e4" },
      { brush: "green", from: "e7", to: "e5" },
    ]);
    expect(shapes.circles).toEqual([
      { brush: "red", square: "d4" },
      { brush: "blue", square: "f5" },
    ]);
  });

  it("draws nothing for comments without the commands, or none at all", () => {
    expect(drawsShapes(shapesOf(["[%eval 0.3] [%clk 0:01:00] A plain note."]))).toBe(false);
    expect(drawsShapes(shapesOf(undefined))).toBe(false);
  });
});
