import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import { evalSeriesOf } from "./computerAnalysisTree";
import { mainline, nodeAtSanPath, sanPathTo, treeToPgn, type GameTree } from "./gameTree";
import { arrowWidthSourcesIn, evalOf, nextMoveWeights } from "./nextMoveWeights";
import {
  evalFromApi,
  evalSummaryOf,
  lookupFenOf,
  moveComment,
  moverValue,
  movesOf,
  openingEvalsPgn,
  openingTreeOf,
  orderedTree,
  sansOf,
  type EvalLookup,
  type OpeningEntry,
  type OpeningMove,
  type PositionEval,
} from "./openingEvalTree";
import { parsePgnTree } from "./pgn";

const cp = (value: number, depth = 30): PositionEval => ({ score: { kind: "cp", value }, depth });
const mate = (value: number, depth = 30): PositionEval => ({ score: { kind: "mate", value }, depth });

/** The position after a SAN line, as `chess.js` writes it. */
const fenAfter = (moves: string): string => {
  const chess = new Chess();
  for (const san of sansOf(moves)) chess.move(san);
  return chess.fen();
};

/** A book keyed by full FEN, as the vendored shards are. */
const bookOf = (...entries: OpeningEntry[]): Record<string, OpeningEntry> =>
  Object.fromEntries(entries.map((entry) => [fenAfter(entry.moves), entry]));

/** Evaluations keyed by the position after each SAN line. */
const evalsOf = (byLine: Record<string, PositionEval | null>): EvalLookup => {
  const map = new Map(Object.entries(byLine).map(([moves, found]) => [lookupFenOf(fenAfter(moves)), found]));
  return (fen) => map.get(fen);
};

const sans = (moves: readonly OpeningMove[]): string[] => moves.map((move) => move.san);

describe("sansOf", () => {
  it("reads an eco.json line, numbers and doubled spaces aside", () => {
    expect(sansOf("1. e4  e5 2. Qh5  Nc6 3. Bc4 ")).toEqual(["e4", "e5", "Qh5", "Nc6", "Bc4"]);
    expect(sansOf("1.d4 Nf6 2.c4 e6")).toEqual(["d4", "Nf6", "c4", "e6"]);
  });
});

describe("openingTreeOf", () => {
  const book = bookOf(
    { eco: "B20", name: "Sicilian Defense", moves: "1. e4 c5" },
    { eco: "B27", name: "Sicilian Defense: Hyperaccelerated Dragon", moves: "1. e4 c5 2. Nf3 g6" },
    { eco: "C20", name: "King's Pawn Game", moves: "1. e4 e5" },
    { eco: "A40", name: "Queen's Pawn Game", moves: "1. d4" },
  );

  it("merges every line into one tree from the start, sharing the moves they share", () => {
    const tree = openingTreeOf(book);
    expect(sans(tree)).toEqual(["e4", "d4"]);
    expect(sans(tree[0].children)).toEqual(["c5", "e5"]);
    expect(sans(tree[0].children[0].children)).toEqual(["Nf3"]);
    expect(movesOf(tree)).toHaveLength(6);
    expect(tree[0].children[0].children[0].children[0]).toMatchObject({ san: "g6", ply: 4 });
  });

  it("names a move whose position is a book entry, and only those", () => {
    const tree = openingTreeOf(book);
    expect(tree[0].entry).toBeUndefined();
    expect(tree[0].children[0].entry?.name).toBe("Sicilian Defense");
    expect(tree[0].children[0].children[0].entry).toBeUndefined();
    expect(tree[1].entry?.eco).toBe("A40");
    expect(tree[1].fen).toBe(fenAfter("1. d4"));
  });

  it("marks a move that mates", () => {
    const tree = openingTreeOf(bookOf({ eco: "A00", name: "Fool's Mate", moves: "1. f3 e5 2. g4 Qh4#" }));
    const moves = movesOf(tree);
    expect(moves.filter((move) => move.checkmate).map((move) => move.san)).toEqual(["Qh4#"]);
  });

  it("names the line a move it cannot play is in", () => {
    expect(() => openingTreeOf({ x: { eco: "A00", name: "Broken", moves: "1. e4 e4" } })).toThrow(
      /A00 Broken: "e4"/,
    );
  });
});

describe("the order at a branch", () => {
  it("puts White's best move first by centipawns", () => {
    const tree = openingTreeOf(bookOf(
      { eco: "A00", name: "a", moves: "1. a3" },
      { eco: "C20", name: "b", moves: "1. e4" },
      { eco: "A40", name: "c", moves: "1. d4" },
    ));
    const evals = evalsOf({ "1. a3": cp(-20), "1. e4": cp(25), "1. d4": cp(18) });
    expect(sans(orderedTree(tree, evals))).toEqual(["e4", "d4", "a3"]);
  });

  it("puts Black's best move first — the lowest score in White's view", () => {
    const tree = openingTreeOf(bookOf(
      { eco: "C20", name: "a", moves: "1. e4 e5" },
      { eco: "B20", name: "b", moves: "1. e4 c5" },
      { eco: "B00", name: "c", moves: "1. e4 g5" },
    ));
    const evals = evalsOf({ "1. e4 e5": cp(30), "1. e4 c5": cp(28), "1. e4 g5": cp(150) });
    expect(sans(orderedTree(tree, evals)[0].children)).toEqual(["c5", "e5", "g5"]);
  });

  it("ranks a mate above any score: the shortest for the mover first, the longest against him last-but-best", () => {
    const start = "1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6";
    const tree = openingTreeOf(bookOf(
      { eco: "C20", name: "mate", moves: `${start} 4. Qxf7#` },
      { eco: "C20", name: "a", moves: `${start} 4. d3` },
      { eco: "C20", name: "b", moves: `${start} 4. Qf3` },
      { eco: "C20", name: "c", moves: `${start} 4. Qe2` },
      { eco: "C20", name: "d", moves: `${start} 4. Qh4` },
      { eco: "C20", name: "e", moves: `${start} 4. Qh3` },
      { eco: "C20", name: "f", moves: `${start} 4. Qg5` },
    ));
    const evals = evalsOf({
      [`${start} 4. d3`]: cp(900),
      [`${start} 4. Qf3`]: mate(5),
      [`${start} 4. Qe2`]: mate(2),
      [`${start} 4. Qh4`]: mate(-2),
      [`${start} 4. Qh3`]: mate(-6),
      [`${start} 4. Qg5`]: null,
    });
    const branch = movesOf(orderedTree(tree, evals)).find((move) => move.ply === 6)!.children;
    expect(sans(branch)).toEqual(["Qxf7#", "Qe2", "Qf3", "d3", "Qh3", "Qh4", "Qg5"]);
  });

  it("scores a mate from the mover's side when Black mates", () => {
    const move = openingTreeOf(bookOf({ eco: "C20", name: "a", moves: "1. e4 e5" }))[0].children[0];
    expect(moverValue(move, () => mate(-3))).toBeGreaterThan(moverValue(move, () => mate(-7))!);
    expect(moverValue(move, () => mate(-3))).toBeGreaterThan(moverValue(move, () => cp(-5000))!);
    expect(moverValue(move, () => mate(4))).toBeLessThan(moverValue(move, () => cp(5000))!);
    expect(moverValue(move, () => null)).toBeUndefined();
    expect(moverValue(move, () => undefined)).toBeUndefined();
  });

  it("puts unevaluated moves last, and breaks ties by ECO, then SAN", () => {
    const tree = openingTreeOf(bookOf(
      { eco: "A10", name: "English", moves: "1. c4" },
      { eco: "A04", name: "Reti", moves: "1. Nf3" },
      { eco: "A01", name: "Nimzo-Larsen", moves: "1. b3" },
      { eco: "A00", name: "Grob", moves: "1. g4" },
      { eco: "A00", name: "Polish", moves: "1. b4" },
    ));
    const evals = evalsOf({ "1. c4": cp(20), "1. Nf3": cp(20), "1. b3": null });
    expect(sans(orderedTree(tree, evals))).toEqual(["Nf3", "c4", "b4", "g4", "b3"]);
  });

  it("takes an unnamed move's ECO from the smallest line through it", () => {
    const tree = openingTreeOf(bookOf(
      { eco: "B27", name: "x", moves: "1. e4 c5 2. Nf3 g6" },
      { eco: "B21", name: "y", moves: "1. e4 c5 2. Nf3 d6" },
      { eco: "A45", name: "z", moves: "1. d4 Nf6" },
    ));
    // Neither e4 nor d4 is an entry: e4 sorts by B21, d4 by A45.
    expect(sans(orderedTree(tree, () => undefined))).toEqual(["d4", "e4"]);
  });

  it("leaves the tree it was given as it was", () => {
    const tree = openingTreeOf(bookOf(
      { eco: "A00", name: "a", moves: "1. a3" },
      { eco: "C20", name: "b", moves: "1. e4" },
    ));
    orderedTree(tree, evalsOf({ "1. e4": cp(30), "1. a3": cp(-30) }));
    expect(sans(tree)).toEqual(["a3", "e4"]);
  });
});

describe("moveComment", () => {
  const sicilian = { eco: "B20", name: "Sicilian Defense", moves: "1. e4 c5" };

  it("writes the ECO, the name and the eval", () => {
    expect(moveComment(sicilian, undefined, cp(32, 60))).toBe("B20 Sicilian Defense [%eval 0.32,60]");
    expect(moveComment(sicilian, undefined, mate(-2, 40))).toBe("B20 Sicilian Defense [%eval #-2,40]");
  });

  it("leaves the name off when it repeats the named move above", () => {
    expect(moveComment(sicilian, { ...sicilian, moves: "1. e4" }, cp(-150, 22))).toBe("[%eval -1.50,22]");
    expect(moveComment(sicilian, { ...sicilian, eco: "B21" }, cp(0, 22))).toBe(
      "B20 Sicilian Defense [%eval 0.00,22]",
    );
  });

  it("writes what there is — or nothing", () => {
    expect(moveComment(sicilian, undefined, null)).toBe("B20 Sicilian Defense");
    expect(moveComment(undefined, sicilian, cp(5, 30))).toBe("[%eval 0.05,30]");
    expect(moveComment(undefined, undefined, undefined)).toBeUndefined();
  });
});

describe("evalFromApi", () => {
  it("reads the deepest evaluation's first line, White's view", () => {
    const body = {
      positions: [
        {
          fen: "…",
          evals: [
            { depth: 30, knodes: 1, pvs: [{ cp: 20, mate: null, line: "e7e5" }] },
            { depth: 70, knodes: 2, pvs: [{ cp: 18, mate: null, line: "e7e5" }, { cp: 30, mate: null, line: "c7c5" }] },
          ],
        },
      ],
    };
    expect(evalFromApi(body)).toEqual({ score: { kind: "cp", value: 18 }, depth: 70 });
  });

  it("reads a mate", () => {
    const body = { positions: [{ evals: [{ depth: 45, pvs: [{ cp: null, mate: -3, line: "d8h4" }] }] }] };
    expect(evalFromApi(body)).toEqual({ score: { kind: "mate", value: -3 }, depth: 45 });
  });

  it("is null when there is nothing to read", () => {
    expect(evalFromApi({ positions: [] })).toBeNull();
    expect(evalFromApi({ positions: [{ evals: [{ depth: 10, pvs: [] }] }] })).toBeNull();
    expect(evalFromApi(null)).toBeNull();
  });
});

describe("evalSummaryOf", () => {
  it("counts the distinct positions, what was found and the depths", () => {
    const tree = openingTreeOf(bookOf(
      { eco: "A00", name: "Fool's Mate", moves: "1. f3 e5 2. g4 Qh4#" },
      { eco: "C20", name: "a", moves: "1. e4 e5" },
    ));
    const evals = evalsOf({ "1. f3": cp(-50, 40), "1. f3 e5": cp(-60, 20), "1. e4": cp(20, 70), "1. e4 e5": null });
    expect(evalSummaryOf(tree, evals)).toEqual({
      moves: 6,
      positions: 6, // the start, f3, f3 e5, f3 e5 g4, e4, e4 e5 — Qh4# is not looked up
      evaluated: 3,
      missing: 3,
      checkmates: 1,
      depth: { min: 20, median: 40, max: 70 },
    });
  });
});

describe("openingEvalsPgn", () => {
  const book = bookOf(
    { eco: "B00", name: "King's Pawn", moves: "1. e4" },
    { eco: "B20", name: "Sicilian Defense", moves: "1. e4 c5" },
    { eco: "B20", name: "Sicilian Defense", moves: "1. e4 c5 2. Nf3" },
    { eco: "C20", name: "King's Pawn Game", moves: "1. e4 e5" },
    { eco: "A40", name: "Queen's Pawn Game", moves: "1. d4" },
  );
  const evals: EvalLookup = (fen) =>
    fen === lookupFenOf(new Chess().fen()) ? cp(18, 70) : evalsOf({
      "1. e4": cp(25, 60),
      "1. d4": cp(17, 55),
      "1. e4 c5": cp(30, 50),
      "1. e4 e5": cp(28, 52),
      "1. e4 c5 2. Nf3": null,
    })(fen);

  it("writes one ordered, annotated game", () => {
    expect(openingEvalsPgn(openingTreeOf(book), evals, "Sources.")).toBe(
      [
        '[Event "eco.json opening tree"]',
        '[Site "?"]',
        '[Date "????.??.??"]',
        '[Round "-"]',
        '[White "?"]',
        '[Black "?"]',
        '[Result "*"]',
        '[Annotator "lichess evaluation database"]',
        "",
        "{ [%eval 0.18,70] Sources. } 1. e4 { B00 King's Pawn [%eval 0.25,60] } " +
          "(1. d4 { A40 Queen's Pawn Game [%eval 0.17,55] }) " +
          "1... e5 { C20 King's Pawn Game [%eval 0.28,52] } " +
          "(1... c5 { B20 Sicilian Defense [%eval 0.30,50] } 2. Nf3) *",
        "",
      ].join("\n"),
    );
  });

  it("reads back as a tree, side lines kept, and writes back the same", () => {
    const pgn = openingEvalsPgn(openingTreeOf(book), evals, "Sources.");
    const tree = parsePgnTree(pgn);
    expect(tree.moves.map((move) => move.san)).toEqual(["e4", "d4"]);
    expect(`${treeToPgn(tree)}\n`).toBe(pgn);
  });

  it("is the same bytes whatever order the book is read in", () => {
    const reversed = Object.fromEntries(Object.entries(book).reverse());
    expect(openingEvalsPgn(openingTreeOf(reversed), evals, "x")).toBe(
      openingEvalsPgn(openingTreeOf(book), evals, "x"),
    );
  });
});

/*
 * The committed file (`scripts/ecoEvalsPgn.mjs`'s output) against the
 * vendored book it was made from — fails when the book is re-vendored and the
 * PGN is not regenerated.
 */
describe("src/data/openings/eco-evals.pgn", () => {
  const pgn = Object.values(
    import.meta.glob<string>("../data/openings/eco-evals.pgn", { query: "?raw", import: "default", eager: true }),
  )[0];
  const shards = import.meta.glob<Record<string, OpeningEntry>>("../data/openings/eco*.json", {
    import: "default",
    eager: true,
  });
  const book: Record<string, OpeningEntry> = Object.assign({}, ...Object.values(shards));

  let parsed: GameTree | undefined;
  const tree = (): GameTree => (parsed ??= parsePgnTree(pgn));

  it("parses as one tree and round-trips through treeToPgn", { timeout: 60_000 }, () => {
    expect(pgn).toBeDefined();
    expect(`${treeToPgn(tree())}\n`).toBe(pgn);
  });

  it("holds every vendored line", { timeout: 60_000 }, () => {
    const chess = new Chess();
    const unreachable = Object.values(book).filter((entry) => {
      // eco.json often leaves the check marks off (`Qh4` for `Qh4#`): replay for the canonical SAN.
      chess.reset();
      const line = sansOf(entry.moves).map((san) => chess.move(san).san);
      const id = nodeAtSanPath(tree(), line);
      return id === null || sanPathTo(tree(), id).length !== line.length;
    });
    expect(unreachable.map((entry) => entry.moves)).toEqual([]);
  });

  it("carries evaluations the Analysis Board reads: the arrows and the Evaluations tab", { timeout: 60_000 }, () => {
    const line = mainline(tree());
    expect(line.length).toBeGreaterThan(5);
    expect(line.slice(0, 5).every((node) => evalOf(node) !== undefined)).toBe(true);
    expect(arrowWidthSourcesIn(tree()).has("eval")).toBe(true);
    // The best move first: the widest arrow at the start is the mainline's.
    expect(nextMoveWeights(tree().moves, "eval")?.[0]).toBe(1);
    const series = evalSeriesOf(tree());
    expect(series[0].nodeId).toBeNull();
    expect(series.length).toBeGreaterThan(5);
  });
});
