import type { Square } from "chess.js";

/**
 * **The shapes a PGN draws on the board** (CTA-126) — lichess's study
 * commands, written in a move's comment (or the game's opening one):
 *
 * - `[%cal Ge2e4,Rd7d5]` — **arrows**: a brush letter, then the from and to
 *   squares;
 * - `[%csl Gd4,Re5]` — **circles** round squares: a brush letter, then the
 *   square.
 *
 * The brushes are lichess's four: `G` green, `R` red, `Y` yellow (lichess's
 * orange), `B` blue — drawn in the theme's `chess.drawing` colours. A comment
 * may carry several commands and a move several comments; every one counts,
 * in order, each shape once. An entry that is not a brush and squares is
 * skipped, as lichess skips it. An arrow from a square to itself is a circle.
 *
 * The comment text stays the storage (`pgn-annotations.md` §1): this only
 * reads it. Pure.
 */

export type ShapeBrush = "green" | "red" | "yellow" | "blue";

export type BoardShapes = {
  arrows: { brush: ShapeBrush; from: Square; to: Square }[];
  circles: { brush: ShapeBrush; square: Square }[];
};

const BRUSHES: Record<string, ShapeBrush> = { G: "green", R: "red", Y: "yellow", B: "blue" };

const COMMAND = /\[%(cal|csl)\s+([^\]]*)\]/gi;
const ARROW = /^([GRYB])([a-h][1-8])([a-h][1-8])$/i;
const CIRCLE = /^([GRYB])([a-h][1-8])$/i;

const brushOf = (letter: string): ShapeBrush => BRUSHES[letter.toUpperCase()];

/** Every shape the `comments` draw, in order, each once. */
export const shapesOf = (comments: readonly string[] | undefined): BoardShapes => {
  const shapes: BoardShapes = { arrows: [], circles: [] };
  const seen = new Set<string>();
  const circle = (brush: ShapeBrush, square: string) => {
    const key = `${brush}:${square}`;
    if (seen.has(key)) return;
    seen.add(key);
    shapes.circles.push({ brush, square: square as Square });
  };
  for (const text of comments ?? []) {
    for (const [, kind, body] of text.matchAll(COMMAND)) {
      for (const entry of body.split(",").map((part) => part.trim())) {
        if (kind.toLowerCase() === "csl") {
          const match = CIRCLE.exec(entry);
          if (match !== null) circle(brushOf(match[1]), match[2].toLowerCase());
          continue;
        }
        const match = ARROW.exec(entry);
        if (match === null) continue;
        const [, letter, from, to] = match;
        const brush = brushOf(letter);
        if (from.toLowerCase() === to.toLowerCase()) {
          circle(brush, from.toLowerCase());
          continue;
        }
        const key = `${brush}:${from}${to}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        shapes.arrows.push({ brush, from: from.toLowerCase() as Square, to: to.toLowerCase() as Square });
      }
    }
  }
  return shapes;
};

/** Whether the comments draw anything. */
export const drawsShapes = (shapes: BoardShapes): boolean => shapes.arrows.length > 0 || shapes.circles.length > 0;
