import { plyOfMoveNumber, sansOfLine } from "./demoTree";
import { mainline, nodeAtSanPath, pathTo, plyLabel, type GameTree, type VariationNode } from "./gameTree";

/**
 * **An excerpt of a game** (CTA-126) — what an article's
 * `<InlinePgnGame>` shows of a PGN: a **window** of its mainline, from one
 * position to another, opened at a third, with the side lines that branch
 * inside it. One game can be shown many times in one article, each time a
 * different window. Pure.
 *
 * ## The window
 *
 * Positions are counted in **plies** from the game's start: ply 0 is the
 * start, ply 21 the position after White's 11th move (from the standard
 * start). `fromPly` and `toPly` are the first and last mainline positions the
 * reader can reach; `startPly` (or `start`, a line of SAN) is where the board
 * opens. Each can be written as a **move number** instead (`from="5"`,
 * `to="15..."`, `start="11"` — {@link plyOfMoveNumber}); a ply given as a
 * number wins over a move number. `start` can also be a **line of SAN** —
 * into a side line, from the mainline position its first move number names
 * ({@link sanPathOfLine}). Out of range is clamped — `fromPly` to the
 * game, `toPly` to `fromPly` and the game, the start into the window.
 *
 * ## The side lines
 *
 * A side line belongs to the window when it branches **inside** it: an
 * alternative to one of the window's mainline moves (ply `fromPly + 1` to
 * `toPly`), followed to its end, with its own side lines. With `variations`
 * off, the window is the mainline alone.
 */

type ExcerptOptions = {
  fromPly?: number;
  toPly?: number;
  startPly?: number;
  /** A move number — `"5"`, `"5..."`. `fromPly` wins. */
  from?: string;
  /** A move number. `toPly` wins. */
  to?: string;
  /** A move number, or a line of SAN from the start, into a side line if it likes. `startPly` wins. */
  start?: string;
  /** Show the side lines that branch inside the window. Default on. */
  variations?: boolean;
};

export type ExcerptWindow = {
  fromPly: number;
  toPly: number;
  /** The node the window opens on (`null`: the game's start). */
  startId: string | null;
  /** The window's first and last mainline positions. */
  fromId: string | null;
  toId: string | null;
  variations: boolean;
};

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, Math.round(value)));

/** The mainline node at `ply` — `null` for ply 0, the start. */
const mainlineIdAt = (line: readonly VariationNode[], ply: number): string | null =>
  ply === 0 ? null : line[ply - 1].id;

/** Whether node `id` is a position the window lets the reader reach. */
export const isInExcerpt = (tree: GameTree, window: ExcerptWindow, id: string | null): boolean => {
  const line = mainline(tree);
  const path = pathTo(tree, id);
  const leaves = path.findIndex((node, index) => line[index] !== node);
  if (leaves === -1) return path.length >= window.fromPly && path.length <= window.toPly;
  // In a side line: it must branch at one of the window's own moves.
  const branchPly = leaves + 1;
  return window.variations && branchPly > window.fromPly && branchPly <= window.toPly;
};

/** A line's leading move number — `16.` (White's 16th), `16...` (Black's). */
const LEADING_NUMBER = /^(\d+)\s*(\.\.\.|…|\.)/;

/**
 * **A line of SAN as a path from the game's start.** A line that opens with
 * a move number past the first — `"16. Bg2 Ne5 17. Nf4"`, `"22... Nc2"` —
 * starts from the **mainline** position before that move, the way a reviewer
 * writes a side line; one opening at `1.` (or bare SAN) is from the start.
 */
export const sanPathOfLine = (tree: GameTree, text: string): string[] => {
  const lead = LEADING_NUMBER.exec(text.trim());
  if (lead === null) return sansOfLine(text);
  const [, digits, dots] = lead;
  const before = dots === "." ? `${Number(digits) - 1}...` : digits;
  const basePly = Math.min(plyOfMoveNumber(before, tree.startFen) ?? 0, mainline(tree).length);
  return [...mainline(tree).slice(0, basePly).map((node) => node.san), ...sansOfLine(text)];
};

/** Read an `<InlinePgnGame>`'s window off its props, clamped to the game. Never throws. */
export const resolveExcerpt = (tree: GameTree, options: ExcerptOptions = {}): ExcerptWindow => {
  const line = mainline(tree);
  const length = line.length;
  const fromPly = clamp(options.fromPly ?? plyOfMoveNumber(options.from, tree.startFen) ?? 0, 0, length);
  const toPly = clamp(options.toPly ?? plyOfMoveNumber(options.to, tree.startFen) ?? length, fromPly, length);
  const variations = options.variations ?? true;
  const base = {
    fromPly,
    toPly,
    fromId: mainlineIdAt(line, fromPly),
    toId: mainlineIdAt(line, toPly),
    variations,
  };

  let startId = base.fromId;
  const numbered = options.startPly ?? plyOfMoveNumber(options.start, tree.startFen);
  if (numbered !== undefined) {
    startId = mainlineIdAt(line, clamp(numbered, fromPly, toPly));
  } else if (options.start !== undefined && options.start.trim() !== "") {
    const id = nodeAtSanPath(tree, sanPathOfLine(tree, options.start));
    if (isInExcerpt(tree, { ...base, startId: null }, id)) startId = id;
  }
  return { ...base, startId };
};

/* --- what the move list draws ------------------------------------- */

export type ExcerptToken =
  | {
      kind: "move";
      node: VariationNode;
      /** `"11."` before White's move, `"11..."` before Black's where a line starts or resumes, else `""`. */
      label: string;
    }
  | { kind: "variation"; tokens: ExcerptToken[] };

/**
 * A line from `first` on, as PGN writes it: each move numbered where it
 * must be, and after a move, its alternatives as nested variations.
 * `siblings` are `first`'s own alternatives with it (its parent's children);
 * `untilPly` stops the line there.
 */
const lineTokens = (
  startFen: string,
  first: VariationNode,
  siblings: readonly VariationNode[],
  variations: boolean,
  untilPly?: number,
): ExcerptToken[] => {
  const tokens: ExcerptToken[] = [];
  let node: VariationNode | undefined = first;
  let alternatives = siblings;
  let numbered = true;
  while (node !== undefined) {
    const { number, isWhiteMove } = plyLabel(startFen, node.ply);
    tokens.push({ kind: "move", node, label: isWhiteMove ? `${number}.` : numbered ? `${number}...` : "" });
    numbered = false;
    if (variations && alternatives[0] === node && alternatives.length > 1) {
      for (const alternative of alternatives.slice(1)) {
        tokens.push({ kind: "variation", tokens: lineTokens(startFen, alternative, [], variations) });
      }
      numbered = true;
    }
    if (untilPly !== undefined && node.ply >= untilPly) break;
    alternatives = node.children;
    node = node.children[0];
  }
  return tokens;
};

/** The window's moves, side lines nested where they branch — what the move list draws. */
export const excerptTokens = (tree: GameTree, window: ExcerptWindow): ExcerptToken[] => {
  if (window.toPly <= window.fromPly) return [];
  const line = mainline(tree);
  const first = line[window.fromPly];
  const siblings = window.fromPly === 0 ? tree.moves : line[window.fromPly - 1].children;
  return lineTokens(tree.startFen, first, siblings, window.variations, window.toPly);
};

/** `"11. Nxe6"`, `"11... fxe6"` — a move as it is named on its own. */
export const moveName = (startFen: string, node: VariationNode): string => {
  const { number, isWhiteMove } = plyLabel(startFen, node.ply);
  return `${number}${isWhiteMove ? "." : "..."} ${node.san}`;
};
