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

/**
 * **One shape a reader draws** (CTA-143) — an arrow from `from` to `to`, or,
 * where the two are the same square, a circle round it.
 */
export type DrawnShape = { brush: ShapeBrush; from: Square; to: Square };

const LETTERS: Record<ShapeBrush, string> = { green: "G", red: "R", yellow: "Y", blue: "B" };

/**
 * **The brush a drawing gesture's modifier keys pick** — lichess's: none is
 * green, Shift (or Ctrl) red, Alt (or Meta) blue, both yellow.
 */
export const brushOfKeys = (keys: {
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}): ShapeBrush => {
  const first = keys.shiftKey || keys.ctrlKey;
  const second = keys.altKey || keys.metaKey;
  return first && second ? "yellow" : first ? "red" : second ? "blue" : "green";
};

/** A shape command with the horizontal space around it — so taking one out leaves the prose as it was. */
const SPACED_COMMAND = /([ \t]*)\[%(cal|csl)\s+([^\]]*)\]([ \t]*)/gi;

/** The squares an entry of a `kind` command draws on — `e4` for a circle, `e2e4` for an arrow — or `undefined` for a malformed one. */
const entrySquares = (kind: string, entry: string): { letter: string; squares: string } | undefined => {
  if (kind.toLowerCase() === "csl") {
    const match = CIRCLE.exec(entry);
    return match === null ? undefined : { letter: match[1], squares: match[2].toLowerCase() };
  }
  const match = ARROW.exec(entry);
  if (match === null) return undefined;
  const [, letter, from, to] = match;
  // An arrow to its own square is a circle (`shapesOf`).
  return { letter, squares: from.toLowerCase() === to.toLowerCase() ? from.toLowerCase() : `${from}${to}`.toLowerCase() };
};

/**
 * **A drawn shape, written into the comments** (CTA-143) — what a lichess
 * study does when the reader draws on the board, as a pure edit of the
 * position's comment list (`setComments` takes the result):
 *
 * - a shape **not there** is added — into the first comment already carrying
 *   a `[%cal]` / `[%csl]` of its kind, else at the end of the first comment
 *   that carries any shape, else of the first comment, else as a comment of
 *   its own;
 * - drawn **again in the same brush**, it is removed (every entry drawing it);
 * - drawn on the same squares **in another brush**, it is recoloured in place.
 *
 * Everything else in the comments — the prose, the other commands
 * (`[%eval]`, `[%clk]`, `prc:` …), a malformed entry — is left as it was; a
 * command left with no entry goes, and a comment left empty is dropped by
 * `setComments`. Pure.
 */
export const toggleShape = (comments: readonly string[], shape: DrawnShape): string[] => {
  const circle = shape.from === shape.to;
  const kind = circle ? "csl" : "cal";
  const squares = circle ? shape.from : `${shape.from}${shape.to}`;
  const letter = LETTERS[shape.brush];

  // Which brushes already draw these squares.
  const brushes = new Set<ShapeBrush>();
  for (const text of comments) {
    for (const [, , commandKind, body] of text.matchAll(SPACED_COMMAND)) {
      for (const entry of body.split(",")) {
        const read = entrySquares(commandKind, entry.trim());
        if (read !== undefined && read.squares === squares) brushes.add(brushOf(read.letter));
      }
    }
  }

  if (brushes.size === 0) {
    const entry = `${letter}${squares}`;
    const ofKind = comments.findIndex((text) => new RegExp(String.raw`\[%${kind}\s`, "i").test(text));
    if (ofKind !== -1) {
      // Into that comment's first command of the kind (not global: the first only).
      return comments.map((text, index) =>
        index !== ofKind
          ? text
          : text.replace(new RegExp(String.raw`\[%(${kind})\s+([^\]]*)\]`, "i"), (_, name: string, body: string) =>
              body.trim() === "" ? `[%${name} ${entry}]` : `[%${name} ${body.trim()},${entry}]`,
            ),
      );
    }
    const command = `[%${kind} ${entry}]`;
    if (comments.length === 0) return [command];
    const withShapes = comments.findIndex((text) => /\[%(cal|csl)\s/i.test(text));
    const into = withShapes === -1 ? 0 : withShapes;
    return comments.map((text, index) => (index === into ? `${text.trimEnd()} ${command}` : text));
  }

  // Already drawn: the same brush takes it off, another recolours the first and drops the rest.
  const remove = brushes.has(shape.brush);
  let recoloured = false;
  return comments.map((text) =>
    text.replace(SPACED_COMMAND, (whole, before: string, name: string, body: string, after: string) => {
      const entries = body.split(",").map((entry) => entry.trim()).filter((entry) => entry !== "");
      const kept: string[] = [];
      for (const entry of entries) {
        const read = entrySquares(name, entry);
        if (read === undefined || read.squares !== squares) {
          kept.push(entry);
          continue;
        }
        if (remove || recoloured) continue;
        recoloured = true;
        kept.push(`${letter}${entry.slice(1)}`);
      }
      if (kept.length === entries.length && kept.every((entry, index) => entry === entries[index])) return whole;
      if (kept.length > 0) return `${before}[%${name} ${kept.join(",")}]${after}`;
      // The command goes, and with it one side's space — so the prose's words keep one between them.
      return before !== "" && after !== "" ? " " : "";
    }),
  );
};

/** A comment with its `[%cal]` / `[%csl]` commands taken out — what is left to read. */
export const withoutShapes = (text: string): string => text.replace(SPACED_COMMAND, " ");
