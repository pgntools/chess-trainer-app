import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import { evalSeriesOf } from "./computerAnalysisTree";
import { mainline, nodeAtSanPath, sanPathTo, treeToPgn, type GameTree } from "./gameTree";
import { arrowWidthSourcesIn, evalOf, nextMoveWeights } from "./nextMoveWeights";
import { parsePgnTree } from "./pgn";

/*
 * **`src/data/openings/eco-evals.pgn`** (CTA-184) — the eco.json book as one
 * PGN tree, every move's `[%eval]` from the lichess evaluation database,
 * written by the standalone eco-json-lichess-evaluation tool
 * (`openings-explorer.md` §9.4.1) — held to the vendored book it was made
 * from and to the app's own readers. Fails when the book is re-vendored and
 * the PGN is not regenerated.
 */

type OpeningEntry = { eco: string; name: string; moves: string };

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

describe("src/data/openings/eco-evals.pgn", () => {
  it("parses as one tree and round-trips through treeToPgn", { timeout: 60_000 }, () => {
    expect(pgn).toBeDefined();
    expect(`${treeToPgn(tree())}\n`).toBe(pgn);
  });

  it("holds every vendored line", { timeout: 60_000 }, () => {
    const chess = new Chess();
    const unreachable = Object.values(book).filter((entry) => {
      // eco.json often leaves the check marks off (`Qh4` for `Qh4#`): replay for the canonical SAN.
      chess.reset();
      const line = entry.moves
        .split(/\s+/)
        .map((token) => token.replace(/^\d+\.(\.\.)?/, ""))
        .filter((token) => token !== "")
        .map((san) => chess.move(san).san);
      const id = nodeAtSanPath(tree(), line);
      return id === null || sanPathTo(tree(), id).length !== line.length;
    });
    expect(unreachable.map((entry) => entry.moves)).toEqual([]);
  });

  it("names the positions and carries evaluations the Analysis Board reads: the arrows and the Evaluations tab", { timeout: 60_000 }, () => {
    const line = mainline(tree());
    expect(line[0].comments?.[0]).toMatch(/^B00 King's Pawn Game \[%eval -?\d+\.\d\d,\d+\]$/);
    expect(line.slice(0, 5).every((node) => evalOf(node) !== undefined)).toBe(true);
    expect(arrowWidthSourcesIn(tree()).has("eval")).toBe(true);
    // The best move first: the widest arrow at the start is the mainline's.
    expect(nextMoveWeights(tree().moves, "eval")?.[0]).toBe(1);
    const series = evalSeriesOf(tree());
    expect(series[0].nodeId).toBeNull();
    expect(series.length).toBeGreaterThan(5);
  });
});
