import { Chess, DEFAULT_POSITION } from "chess.js";

import type { Score } from "./engineAnalysis";
import { formatEval } from "./engineEvals";
import type { GameHeaders } from "./gameModel";
import { moveTreeToPgn, type PgnMove } from "./gameTree";

/**
 * **The eco.json opening tree as one evaluated PGN** (CTA-184) — the pure part
 * of `scripts/ecoEvalsPgn.mjs`, which reads the vendored book
 * (`src/data/openings/eco{A..E}.json`), looks every position up in the lichess
 * evaluation database and writes `src/data/openings/eco-evals.pgn`:
 *
 * - **The tree** (`openingTreeOf`): every entry's `moves` replayed with
 *   `chess.js` from the standard start and merged by SAN, so every eco.json
 *   line is a path in it. A move whose position (the full FEN — the book's
 *   key) is an entry carries that entry.
 * - **The order** (`orderedTree`): at every branch the moves are sorted by
 *   the evaluation of the position after them, **best for the side that
 *   played them**, so `children[0]` is the best move and the mainline the
 *   best line. A mate beats any centipawn score; a shorter mate for the mover
 *   is better, a longer one against him is better; a move that mates on the
 *   board is best of all. Moves with no evaluation go last. Ties: the ECO
 *   code (the move's entry's, else the smallest below it), then the SAN.
 * - **The comments** (`moveComment`): `{ B20 Sicilian Defense [%eval 0.32,60] }`
 *   — the entry's ECO and name where the position is one, unless they repeat
 *   the nearest named move above it (eco.json's interpolated positions repeat
 *   their line's name), then the `[%eval]` in the app's own format
 *   (`formatEval`, `.claude/rules/pgn-annotations.md` §2), so the Analysis
 *   Board reads it as it reads its own evaluations.
 * - **The PGN** (`openingEvalsPgn`): one game from the standard start, the
 *   start position's evaluation and the sources in its opening comment,
 *   written by `treeToPgn`'s own writer (`moveTreeToPgn`). Deterministic: the
 *   same book and evaluations give the same bytes.
 *
 * Evaluations are keyed by {@link lookupFenOf} — the FEN's first four fields,
 * the form the database matches on. `chess.js` writes an en passant square
 * only when a capture is legal, as lichess does, so its FEN is the one sent.
 */

/** One eco.json entry as the app vendors it (`src/data/openings/eco*.json`). */
export type OpeningEntry = { eco: string; name: string; moves: string };

/** One position's evaluation: White's view, and the depth it was searched to. */
export type PositionEval = { score: Score; depth: number };

/**
 * What is known of a position: its evaluation, `null` when the database has
 * none, `undefined` when it was never looked up.
 */
export type EvalLookup = (lookupFen: string) => PositionEval | null | undefined;

/** One move of the opening tree. */
export type OpeningMove = {
  san: string;
  /** 1-based, from the standard start. */
  ply: number;
  /** The full FEN after the move, as `chess.js` writes it. */
  fen: string;
  /** The book's entry for that position, when it is one. */
  entry?: OpeningEntry;
  /** The move mates: no position after it to look up. */
  checkmate?: true;
  children: OpeningMove[];
};

/** The FEN as the evaluation database matches it: its first four fields. */
export const lookupFenOf = (fen: string): string => fen.split(" ").slice(0, 4).join(" ");

/** An eco.json `moves` line as SANs: `"1. e4 c5 2. Nf3"` → `["e4", "c5", "Nf3"]`. */
export const sansOf = (moves: string): string[] =>
  moves
    .split(/\s+/)
    .map((token) => token.replace(/^\d+\.(\.\.)?/, ""))
    .filter((token) => token !== "");

/**
 * **Every book line merged into one tree** from the standard start, children
 * in the order their lines first reach them. `book` is keyed by full FEN, as
 * the vendored shards are; a move whose position is a key carries its entry.
 * A line `chess.js` refuses throws, naming it.
 */
export const openingTreeOf = (book: Readonly<Record<string, OpeningEntry>>): OpeningMove[] => {
  const roots: OpeningMove[] = [];
  const chess = new Chess();
  for (const entry of Object.values(book)) {
    chess.reset();
    let siblings = roots;
    let ply = 0;
    for (const san of sansOf(entry.moves)) {
      ply += 1;
      let move;
      try {
        move = chess.move(san);
      } catch {
        throw new Error(`${entry.eco} ${entry.name}: "${san}" is not legal in "${entry.moves}"`);
      }
      let node = siblings.find((sibling) => sibling.san === move.san);
      if (node === undefined) {
        const fen = chess.fen();
        node = { san: move.san, ply, fen, children: [] };
        const named = book[fen];
        if (named !== undefined) node.entry = named;
        if (chess.isCheckmate()) node.checkmate = true;
        siblings.push(node);
      }
      siblings = node.children;
    }
  }
  return roots;
};

/** Every move of the tree, depth first. */
export const movesOf = (tree: readonly OpeningMove[]): OpeningMove[] => {
  const out: OpeningMove[] = [];
  const stack = [...tree].reverse();
  while (stack.length > 0) {
    const node = stack.pop()!;
    out.push(node);
    for (let i = node.children.length - 1; i >= 0; i -= 1) stack.push(node.children[i]);
  }
  return out;
};

/** A mate on the board outranks every mate in N, which outranks every centipawn score. */
const MATE_RANK = 1_000_000;

/**
 * How good the position after a move is **for the side that played it** — a
 * number to sort by, higher better — or `undefined` with no evaluation. The
 * mover is the side not to move in the position after the move.
 */
export const moverValue = (move: OpeningMove, evals: EvalLookup): number | undefined => {
  if (move.checkmate) return MATE_RANK + 1;
  const found = evals(lookupFenOf(move.fen));
  if (found === null || found === undefined) return undefined;
  const sign = move.fen.split(" ")[1] === "b" ? 1 : -1; // White moved when Black is to move
  const { kind, value } = found.score;
  if (kind === "cp") return sign * value;
  const forMover = sign * value;
  // A mate for the mover: the shorter the better. Against him: the longer.
  return forMover > 0 ? MATE_RANK - forMover : -MATE_RANK - forMover;
};

/** The ECO a move sorts by: its entry's, else the smallest of the lines through it. */
const ecoOf = (move: OpeningMove, memo: Map<OpeningMove, string>): string => {
  const known = memo.get(move);
  if (known !== undefined) return known;
  let eco = move.entry?.eco ?? "";
  for (const child of move.children) {
    const below = ecoOf(child, memo);
    if (below !== "" && (eco === "" || (move.entry === undefined && below < eco))) eco = below;
  }
  memo.set(move, eco);
  return eco;
};

/** Plain code-point order — the same bytes on every machine and locale. */
const compareText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * **The tree sorted** at every branch: best for the mover first, unevaluated
 * last, then by ECO and SAN (the module note). A new tree; `tree` is untouched.
 */
export const orderedTree = (tree: readonly OpeningMove[], evals: EvalLookup): OpeningMove[] => {
  const memo = new Map<OpeningMove, string>();
  const sort = (moves: readonly OpeningMove[]): OpeningMove[] => {
    const keyed = moves.map((move) => ({
      move: { ...move, children: sort(move.children) },
      value: moverValue(move, evals),
      eco: ecoOf(move, memo),
    }));
    keyed.sort((a, b) => {
      if (a.value !== b.value) {
        if (a.value === undefined) return 1;
        if (b.value === undefined) return -1;
        return b.value - a.value;
      }
      return compareText(a.eco, b.eco) || compareText(a.move.san, b.move.san);
    });
    return keyed.map(({ move }) => move);
  };
  return sort(tree);
};

/**
 * A move's comment: the entry's ECO and name (left off when `above`, the
 * nearest named move before it, has the same), then the `[%eval]` — or
 * `undefined` when there is neither.
 */
export const moveComment = (
  entry: OpeningEntry | undefined,
  above: OpeningEntry | undefined,
  found: PositionEval | null | undefined,
): string | undefined => {
  const repeats = entry !== undefined && above?.eco === entry.eco && above.name === entry.name;
  const parts = [
    entry === undefined || repeats ? "" : `${entry.eco} ${entry.name}`,
    found === null || found === undefined ? "" : `[%eval ${formatEval(found.score, found.depth)}]`,
  ].filter((part) => part !== "");
  return parts.length === 0 ? undefined : parts.join(" ");
};

/**
 * **A `/fen` answer of the evaluation API** (`GET /fen?fen=…&best=true`, over
 * the lichess evaluation database) as a {@link PositionEval}: the deepest
 * evaluation of the position asked for, its first line's `cp` or `mate` —
 * White's view, as lichess stores them. `null` when it holds none.
 */
export const evalFromApi = (body: unknown): PositionEval | null => {
  type Pv = { cp?: number | null; mate?: number | null };
  type Eval = { depth?: number; pvs?: Pv[] };
  const positions = (body as { positions?: { evals?: Eval[] }[] } | null)?.positions;
  let best: PositionEval | null = null;
  for (const evaluation of positions?.[0]?.evals ?? []) {
    const pv = evaluation.pvs?.[0];
    const depth = evaluation.depth;
    if (pv === undefined || typeof depth !== "number") continue;
    const score: Score | undefined =
      typeof pv.mate === "number"
        ? { kind: "mate", value: pv.mate }
        : typeof pv.cp === "number"
          ? { kind: "cp", value: pv.cp }
          : undefined;
    if (score !== undefined && (best === null || depth > best.depth)) best = { score, depth };
  }
  return best;
};

/** What a run looked up and found. */
export type EvalSummary = {
  /** Moves in the tree. */
  moves: number;
  /** Distinct positions looked up — the start and every move's but a mate's. */
  positions: number;
  evaluated: number;
  missing: number;
  /** Moves that mate: nothing to look up. */
  checkmates: number;
  depth?: { min: number; median: number; max: number };
};

/** The distinct positions a tree asks the database for: the start's, then each move's. */
export const lookupFensOf = (tree: readonly OpeningMove[]): string[] => {
  const fens = new Set([lookupFenOf(DEFAULT_POSITION)]);
  for (const move of movesOf(tree)) if (!move.checkmate) fens.add(lookupFenOf(move.fen));
  return [...fens];
};

/** The run's numbers, for the script's summary. */
export const evalSummaryOf = (tree: readonly OpeningMove[], evals: EvalLookup): EvalSummary => {
  const moves = movesOf(tree);
  const fens = lookupFensOf(tree);
  const depths = fens
    .map((fen) => evals(fen)?.depth)
    .filter((depth): depth is number => depth !== undefined)
    .sort((a, b) => a - b);
  const middle = depths.length >> 1;
  return {
    moves: moves.length,
    positions: fens.length,
    evaluated: depths.length,
    missing: fens.length - depths.length,
    checkmates: moves.filter((move) => move.checkmate).length,
    ...(depths.length === 0
      ? {}
      : {
          depth: {
            min: depths[0],
            median: depths.length % 2 === 1 ? depths[middle] : (depths[middle - 1] + depths[middle]) / 2,
            max: depths[depths.length - 1],
          },
        }),
  };
};

/** The PGN's tags: the Seven Tag Roster, neutral, and who evaluated it. */
export const OPENING_EVALS_HEADERS: GameHeaders = {
  Event: "eco.json opening tree",
  Site: "?",
  Date: "????.??.??",
  Round: "-",
  White: "?",
  Black: "?",
  Result: "*",
  Annotator: "lichess evaluation database",
};

/**
 * **The PGN**: `tree` ordered by `evals` and annotated, as one game from the
 * standard start. `about` is the prose of the game's opening comment (the
 * sources, when it was made), after the start position's `[%eval]`.
 */
export const openingEvalsPgn = (
  tree: readonly OpeningMove[],
  evals: EvalLookup,
  about: string,
): string => {
  const write = (moves: readonly OpeningMove[], above: OpeningEntry | undefined): PgnMove[] =>
    moves.map((move) => {
      const comment = moveComment(move.entry, above, evals(lookupFenOf(move.fen)));
      return {
        san: move.san,
        ply: move.ply,
        ...(comment === undefined ? {} : { comments: [comment] }),
        children: write(move.children, move.entry ?? above),
      };
    });
  const start = moveComment(undefined, undefined, evals(lookupFenOf(DEFAULT_POSITION)));
  return `${moveTreeToPgn({
    headers: OPENING_EVALS_HEADERS,
    startFen: DEFAULT_POSITION,
    comments: [[start, about].filter((part) => part !== undefined && part !== "").join(" ")],
    moves: write(orderedTree(tree, evals), undefined),
  })}\n`;
};
