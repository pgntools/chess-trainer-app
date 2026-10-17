import { plyOfMoveNumber, sansOfLine } from "./demoTree";
import { mainline, nodeAtSanPath, pathTo, plyLabel, type GameTree, type VariationNode } from "./gameTree";
import { readComment } from "./moveAnnotations";

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
  | { kind: "variation"; tokens: ExcerptToken[] }
  /** A PGN comment's words, in place (`excerptTokens`' `comments`): after `node`, or before it (`before`) where it opens a side line; `node` `null` the game's opening one. */
  | { kind: "comment"; node: VariationNode | null; text: string; before?: true };

/** What comments say, the commands (`[%cal]`, `[%eval]`, `prc:` …) taken out — `""` for a comment that only draws. */
export const commentWords = (comments: readonly string[] | undefined): string =>
  (comments ?? [])
    .flatMap((raw) => readComment(raw).paragraphs)
    .filter((text) => text.trim() !== "")
    .join("\n\n");

/**
 * A line from `first` on, as PGN writes it: each move numbered where it
 * must be, and after a move, its alternatives as nested variations.
 * `siblings` are `first`'s own alternatives with it (its parent's children);
 * `untilPly` stops the line there. With `comments`, each move's comments
 * follow it (a side line's opening ones before its first move), and the move
 * after a comment is numbered again, as PGN writes it.
 */
const lineTokens = (
  startFen: string,
  first: VariationNode,
  siblings: readonly VariationNode[],
  variations: boolean,
  untilPly?: number,
  comments = false,
): ExcerptToken[] => {
  const tokens: ExcerptToken[] = [];
  let node: VariationNode | undefined = first;
  let alternatives = siblings;
  let numbered = true;
  while (node !== undefined) {
    const { number, isWhiteMove } = plyLabel(startFen, node.ply);
    const before = comments ? commentWords(node.preComments) : "";
    if (before !== "") tokens.push({ kind: "comment", node, text: before, before: true });
    tokens.push({ kind: "move", node, label: isWhiteMove ? `${number}.` : numbered ? `${number}...` : "" });
    numbered = false;
    const after = comments ? commentWords(node.comments) : "";
    if (after !== "") {
      tokens.push({ kind: "comment", node, text: after });
      numbered = true;
    }
    if (variations && alternatives[0] === node && alternatives.length > 1) {
      for (const alternative of alternatives.slice(1)) {
        tokens.push({ kind: "variation", tokens: lineTokens(startFen, alternative, [], variations, undefined, comments) });
      }
      numbered = true;
    }
    if (untilPly !== undefined && node.ply >= untilPly) break;
    alternatives = node.children;
    node = node.children[0];
  }
  return tokens;
};

/**
 * The window's moves, side lines nested where they branch — what the move
 * list draws. With `comments`, the PGN's comments too, each where it is
 * written (the game's opening one first, where the window opens at the start).
 */
export const excerptTokens = (tree: GameTree, window: ExcerptWindow, { comments = false }: { comments?: boolean } = {}): ExcerptToken[] => {
  if (window.toPly <= window.fromPly) return [];
  const line = mainline(tree);
  const first = line[window.fromPly];
  const siblings = window.fromPly === 0 ? tree.moves : line[window.fromPly - 1].children;
  const tokens = lineTokens(tree.startFen, first, siblings, window.variations, window.toPly, comments);
  const opening = comments && window.fromPly === 0 ? commentWords(tree.comments) : "";
  return opening === "" ? tokens : [{ kind: "comment", node: null, text: opening }, ...tokens];
};

/** `"11. Nxe6"`, `"11... fxe6"` — a move as it is named on its own. */
export const moveName = (startFen: string, node: VariationNode): string => {
  const { number, isWhiteMove } = plyLabel(startFen, node.ply);
  return `${number}${isWhiteMove ? "." : "..."} ${node.san}`;
};

/* --- the move list in two columns --------------------------------- */

type ExcerptMoveToken = Extract<ExcerptToken, { kind: "move" }>;
type ExcerptNoteToken = Extract<ExcerptToken, { kind: "variation" | "comment" }>;

/** One numbered pair of the window's mainline, with the side lines and comments that answer it. */
export type ExcerptRow = {
  number: number;
  /** `null` where the window opens on Black's move, or a comment split the pair: the pair's White cell is empty. */
  white: ExcerptMoveToken | null;
  /** `null` where the window ends on White's move, or a comment split the pair. Both `null`: a row of notes alone (the game's opening comment). */
  black: ExcerptMoveToken | null;
  /** In order, spanning the row's width: the side lines branching from this pair's moves — White's first, Black's after — and the comments. */
  notes: ExcerptNoteToken[];
};

/**
 * **The window's mainline as numbered pairs** — the Analysis Board's move
 * list's rows (`moveRowsOf`), over the tokens `excerptTokens` writes: a pair
 * per move number, a window that opens on Black's move starting with an empty
 * White cell, each side line (with its own, nested ones — they stay a run)
 * hung on the pair holding the move it answers. A **comment** (the tokens'
 * `comments`) is a note in place: after Black's move under the pair, after
 * White's it **splits** the pair — White's move and an empty Black cell, the
 * comment (and White's side lines), then an empty White cell and Black's
 * move — as lichess's list does; the game's opening one a row of its own. Pure.
 */
export const excerptRows = (startFen: string, tokens: readonly ExcerptToken[]): ExcerptRow[] => {
  const rows: ExcerptRow[] = [];
  /** A comment after White's move closed its pair: Black's move opens another. */
  let split = false;
  for (const token of tokens) {
    if (token.kind === "comment" && token.node === null) {
      rows.push({ number: 0, white: null, black: null, notes: [token] });
      split = true;
      continue;
    }
    if (token.kind !== "move") {
      // A side line or comment always follows a move, so a row exists; a stray one is dropped.
      const last = rows.at(-1);
      last?.notes.push(token);
      if (token.kind === "comment" && last !== undefined && last.white !== null && last.black === null) split = true;
      continue;
    }
    const { number, isWhiteMove } = plyLabel(startFen, token.node.ply);
    let row = rows.at(-1);
    if (row === undefined || row.number !== number || split) {
      row = { number, white: null, black: null, notes: [] };
      rows.push(row);
      split = false;
    }
    if (isWhiteMove) row.white = token;
    else row.black = token;
  }
  return rows;
};
