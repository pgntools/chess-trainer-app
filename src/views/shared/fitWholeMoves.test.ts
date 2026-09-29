import { afterEach, describe, expect, it, vi } from "vitest";

import { fitWholeMoves } from "./fitWholeMoves";

/*
  jsdom lays nothing out, so a row is given its geometry: the box is `edge` px
  wide from 0, each move `MOVE_PX` wide with a `SPACE_PX` gap after it, the
  ellipsis `MORE_PX`. That is what `getBoundingClientRect` answers; the rest is
  the function's own logic.
*/
const MOVE_PX = 55;
const SPACE_PX = 5;
const MORE_PX = 10;

const rect = (left: number, right: number) => ({ left, right, width: right - left, top: 0, bottom: 24, height: 24, x: left, y: 0, toJSON: () => ({}) }) as DOMRect;

const build = (moves: number, edge: number, expanded = false) => {
  const box = document.createElement("span");
  box.dataset.expanded = String(expanded);
  const cells: HTMLElement[] = [];
  for (let index = 0; index < moves; index += 1) {
    const move = document.createElement("span");
    move.dataset.move = "";
    move.getBoundingClientRect = () => rect(index * (MOVE_PX + SPACE_PX), index * (MOVE_PX + SPACE_PX) + MOVE_PX);
    box.append(move);
    cells.push(move);
  }
  const more = document.createElement("span");
  more.dataset.more = "";
  more.style.display = "none";
  more.getBoundingClientRect = () => rect(moves * (MOVE_PX + SPACE_PX), moves * (MOVE_PX + SPACE_PX) + MORE_PX);
  box.append(more);
  box.getBoundingClientRect = () => rect(0, edge);
  return { box, cells, more };
};

const shown = (cells: HTMLElement[]) => cells.filter((cell) => cell.style.display !== "none").length;

afterEach(() => vi.restoreAllMocks());

describe("fitWholeMoves", () => {
  it("shows every move, and no ellipsis, where they all fit", () => {
    const { box, cells, more } = build(3, 200);
    fitWholeMoves(box);
    expect(shown(cells)).toBe(3);
    expect(more.style.display).toBe("none");
  });

  it("stops at the last whole move, an ellipsis after it", () => {
    // Moves end at 55, 115, 175, 235: three fit in 200, and 175 + 8 + 10 = 193 leaves room for the ellipsis.
    const { box, cells, more } = build(5, 200);
    fitWholeMoves(box);
    expect(shown(cells)).toBe(3);
    expect(cells.slice(3).every((cell) => cell.style.display === "none")).toBe(true);
    expect(more.style.display).toBe("");
  });

  it("gives up one more move when the ellipsis would not fit after the last", () => {
    // Three fit in 185 (175), but 175 + 18 = 193 > 185: two moves and the ellipsis.
    const { box, cells, more } = build(5, 185);
    fitWholeMoves(box);
    expect(shown(cells)).toBe(2);
    expect(more.style.display).toBe("");
  });

  it("keeps a move whose edge is within a sub-pixel of the row's", () => {
    const { box, cells } = build(2, 115 - 0.4);
    fitWholeMoves(box);
    expect(shown(cells)).toBe(2);
  });

  it("shows everything of an expanded row, and undoes an earlier cut", () => {
    const { box, cells, more } = build(5, 200);
    fitWholeMoves(box);
    expect(shown(cells)).toBe(3);
    box.dataset.expanded = "true";
    fitWholeMoves(box);
    expect(shown(cells)).toBe(5);
    expect(more.style.display).toBe("none");
  });

  it("refits from scratch when the row widens", () => {
    const { box, cells, more } = build(5, 200);
    fitWholeMoves(box);
    expect(shown(cells)).toBe(3);
    box.getBoundingClientRect = () => rect(0, 400);
    fitWholeMoves(box);
    expect(shown(cells)).toBe(5);
    expect(more.style.display).toBe("none");
  });

  it("leaves a row laid out nowhere alone — every move shows", () => {
    const { box, cells, more } = build(5, 0);
    fitWholeMoves(box);
    expect(shown(cells)).toBe(5);
    expect(more.style.display).toBe("none");
  });

  it("can cut down to the ellipsis alone when not even one move fits", () => {
    const { box, cells, more } = build(3, 40);
    fitWholeMoves(box);
    expect(shown(cells)).toBe(0);
    expect(more.style.display).toBe("");
  });
});
