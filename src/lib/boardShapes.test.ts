import { describe, expect, it } from "vitest";

import { brushOfKeys, drawsShapes, shapesOf, toggleShape, withoutShapes } from "./boardShapes";
import { findNode, setComments, treeToPgn } from "./gameTree";
import { parsePgnTree } from "./pgn";

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

describe("toggleShape — a drawn shape written into the comments (CTA-143)", () => {
  const arrow = { brush: "green", from: "e2", to: "e4" } as const;
  const circle = { brush: "red", from: "d4", to: "d4" } as const;

  it("adds a shape as a comment of its own where the position has none", () => {
    expect(toggleShape([], arrow)).toEqual(["[%cal Ge2e4]"]);
    expect(toggleShape([], circle)).toEqual(["[%csl Rd4]"]);
  });

  it("adds into the command of its kind, else at the end of the comment, the prose and other commands kept", () => {
    expect(toggleShape(["Sharp. [%cal Rd7d5] [%eval 0.3]"], arrow)).toEqual(["Sharp. [%cal Rd7d5,Ge2e4] [%eval 0.3]"]);
    expect(toggleShape(["Sharp. prc:40 [%clk 0:05:00]"], arrow)).toEqual(["Sharp. prc:40 [%clk 0:05:00] [%cal Ge2e4]"]);
    // A circle goes beside the shapes already there, in the comment carrying them.
    expect(toggleShape(["Prose.", "[%cal Ge2e4]"], circle)).toEqual(["Prose.", "[%cal Ge2e4] [%csl Rd4]"]);
  });

  it("removes a shape drawn again in the same brush, the command and an emptied comment with it", () => {
    expect(toggleShape(["[%cal Ge2e4]"], arrow)).toEqual([""]);
    expect(toggleShape(["Sharp. [%cal Rd7d5,Ge2e4] more [%eval 0.3]"], arrow)).toEqual([
      "Sharp. [%cal Rd7d5] more [%eval 0.3]",
    ]);
    expect(toggleShape(["Before [%csl Rd4] after."], circle)).toEqual(["Before after."]);
    // Every entry drawing it, in every comment; an arrow to its own square is that circle.
    expect(toggleShape(["[%csl Rd4]", "[%cal Rd4d4,Ge2e4]"], circle)).toEqual(["", "[%cal Ge2e4]"]);
  });

  it("recolours a shape drawn in another brush, in place", () => {
    expect(toggleShape(["Here. [%cal Re2e4,Bd2d4]"], arrow)).toEqual(["Here. [%cal Ge2e4,Bd2d4]"]);
    expect(toggleShape(["[%csl Gd4]"], circle)).toEqual(["[%csl Rd4]"]);
  });

  it("leaves a malformed entry and the other shapes alone", () => {
    expect(toggleShape(["[%cal Xe2e4,Ge2e4,Gg1f3]"], arrow)).toEqual(["[%cal Xe2e4,Gg1f3]"]);
  });

  it("round-trips through a written PGN — the shape reads back as drawn, the prose as written", () => {
    const tree = parsePgnTree("1. e4 {Best by test. [%eval 0.3]} e5 *");
    const e4 = tree.moves[0];
    const drawn = setComments(tree, e4.id, "comments", toggleShape(e4.comments ?? [], { brush: "blue", from: "d2", to: "d4" }));
    const back = parsePgnTree(treeToPgn(drawn));
    const comments = findNode(back, back.moves[0].id)?.comments;
    expect(comments).toEqual(["Best by test. [%eval 0.3] [%cal Bd2d4]"]);
    expect(shapesOf(comments).arrows).toEqual([{ brush: "blue", from: "d2", to: "d4" }]);

    // Drawn again, it comes off and the comment is as it was.
    const undrawn = setComments(drawn, e4.id, "comments", toggleShape(comments ?? [], { brush: "blue", from: "d2", to: "d4" }));
    expect(treeToPgn(undrawn)).toBe(treeToPgn(tree));

    // The game's opening comment, at the start.
    const opened = setComments(tree, null, "comments", toggleShape(tree.comments ?? [], circle));
    expect(parsePgnTree(treeToPgn(opened)).comments).toEqual(["[%csl Rd4]"]);
  });
});

describe("brushOfKeys — lichess's modifier brushes (CTA-143)", () => {
  const keys = (shiftKey = false, altKey = false, ctrlKey = false, metaKey = false) => ({ shiftKey, altKey, ctrlKey, metaKey });

  it("is green plain, red with Shift, blue with Alt, yellow with both", () => {
    expect(brushOfKeys(keys())).toBe("green");
    expect(brushOfKeys(keys(true))).toBe("red");
    expect(brushOfKeys(keys(false, true))).toBe("blue");
    expect(brushOfKeys(keys(true, true))).toBe("yellow");
    // Ctrl stands for Shift and Meta for Alt, as on lichess.
    expect(brushOfKeys(keys(false, false, true, true))).toBe("yellow");
  });
});

describe("withoutShapes (CTA-143)", () => {
  it("takes the shapes out and leaves the rest", () => {
    expect(withoutShapes("[%csl Gd4][%cal Ge2e4]").trim()).toBe("");
    expect(withoutShapes("Sharp. [%cal Ge2e4] [%eval 0.3]")).toContain("[%eval 0.3]");
  });
});
