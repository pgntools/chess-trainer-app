import { describe, expect, it } from "vitest";
import { DEFAULT_POSITION } from "chess.js";
import { FenParseError, parseFen } from "./fen";

describe("parseFen", () => {
  it("takes a valid FEN and hands it back", () => {
    expect(parseFen(DEFAULT_POSITION)).toBe(DEFAULT_POSITION);
  });

  it("normalises the whitespace a copied FEN arrives with", () => {
    const wrapped = `\n  rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR   w\tKQkq - 0 1  \n`;
    expect(parseFen(wrapped)).toBe(DEFAULT_POSITION);
  });

  it("rejects an empty paste with its own message", () => {
    expect(() => parseFen("   ")).toThrow(FenParseError);
    expect(() => parseFen("")).toThrow(/No FEN text found/);
  });

  it("rejects malformed notation and says why", () => {
    let detail = "";
    try {
      parseFen("not a fen");
    } catch (cause) {
      detail = (cause as FenParseError).detail;
    }

    // The underlying reason is carried through, not swallowed into "invalid" —
    // and it is the placement that is named, not a field filled in behind it.
    expect(detail).toMatch(/piece data/i);
  });

  describe("a partial FEN, completed as lichess does", () => {
    // The reported case (CTA-200): the piece placement alone.
    const placement = "1r3rk1/2pbqp2/2np3p/1pb1p1pn/4P3/1BPPNNB1/1P3PPP/R2Q1RK1";

    it("takes the piece placement alone, White to move", () => {
      expect(parseFen(placement)).toBe(`${placement} w - - 0 1`);
    });

    it("no longer asks for six fields when the placement is valid", () => {
      expect(() => parseFen(placement)).not.toThrow();
      expect(() => parseFen(`  ${placement}\n`)).not.toThrow(/six space-delimited fields/i);
    });

    it.each([
      [`${placement} b`, `${placement} b - - 0 1`],
      ["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq", DEFAULT_POSITION],
      [
        "rnbqkbnr/pppp1ppp/8/8/3pP3/8/PPP2PPP/RNBQKBNR b KQkq e3",
        "rnbqkbnr/pppp1ppp/8/8/3pP3/8/PPP2PPP/RNBQKBNR b KQkq e3 0 1",
      ],
      [`${placement} w - - 12`, `${placement} w - - 12 1`],
    ])("completes %j", (given, expected) => {
      expect(parseFen(given)).toBe(expected);
    });

    it("still names a bad field it was given", () => {
      expect(() => parseFen(`${placement} x`)).toThrow(/side-to-move/i);
      expect(() => parseFen("8/8/8")).toThrow(/piece data/i);
    });

    it("still refuses an impossible position", () => {
      // A board with no kings on it, its other fields left off.
      expect(() => parseFen("8/8/8/8/8/8/8/8")).toThrow(FenParseError);
    });

    it("still refuses more than six fields", () => {
      expect(() => parseFen(`${DEFAULT_POSITION} 7`)).toThrow(/six space-delimited fields/i);
    });
  });

  it("rejects a well-formed FEN that is not a playable position", () => {
    // Well-formed notation, but a board with no kings on it.
    expect(() => parseFen("8/8/8/8/8/8/8/8 w - - 0 1")).toThrow(FenParseError);
  });
});
