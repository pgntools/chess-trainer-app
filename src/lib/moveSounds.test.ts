import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import { moveSoundOf } from "./moveSounds";

/** The SAN and the FEN after it, from a SAN played from `fen`. */
const played = (fen: string, san: string) => {
  const chess = new Chess(fen);
  const move = chess.move(san);
  return { san: move.san, fen: move.after };
};

const START = new Chess().fen();

/*
  Which sound a move makes (CTA-260): one kind per move, read from its SAN and
  the position after it.
*/
describe("moveSoundOf", () => {
  it("is a plain move for a quiet move", () => {
    expect(moveSoundOf(played(START, "e4"))).toBe("move");
    expect(moveSoundOf(played(START, "Nf3"))).toBe("move");
  });

  it("is a capture for a move that takes", () => {
    expect(moveSoundOf(played("rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2", "exd5"))).toBe("capture");
  });

  it("is castling on either side", () => {
    expect(moveSoundOf(played("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1", "O-O"))).toBe("castle");
    expect(moveSoundOf(played("r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1", "O-O-O"))).toBe("castle");
  });

  it("is a check for a checking move — a capture with check too", () => {
    expect(moveSoundOf(played("rnbqkbnr/ppppp1pp/8/5p2/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2", "Qh5+"))).toBe("check");
    expect(moveSoundOf({ san: "Bxf7+", fen: START })).toBe("check");
  });

  it("is a promotion for a pawn promoting, with a capture or a check as well", () => {
    expect(moveSoundOf(played("8/4P3/8/8/8/8/k7/7K w - - 0 1", "e8=Q"))).toBe("promote");
    expect(moveSoundOf({ san: "exd8=Q+", fen: START })).toBe("promote");
  });

  it("is the game's end for a mate — and for a move leaving no move, stalemate", () => {
    expect(moveSoundOf(played("rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2", "Qh4#"))).toBe("game-end");
    expect(moveSoundOf(played("k7/8/1Q6/8/8/8/8/7K w - - 0 1", "Qb5"))).toBe("move");
    expect(moveSoundOf(played("k7/8/2Q5/8/8/8/8/7K w - - 0 1", "Qc7"))).toBe("game-end");
  });

  it("is a plain move for a FEN that will not read", () => {
    expect(moveSoundOf({ san: "e4", fen: "not a fen" })).toBe("move");
  });
});
