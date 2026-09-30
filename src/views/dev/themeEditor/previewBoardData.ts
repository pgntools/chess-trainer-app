import type { ChessTokens } from "../../../design-system/themes";

/*
  The theme editor's preview board (CTA-115): a position, its squares and
  the arrows drawn over it — pure, beside `PreviewBoard.tsx`.
*/

/** After 1.e4 e5 2.Nf3 — the last move g1–f3. */
export const PREVIEW_FEN = "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2";

/** An arrow over the preview board; `border` draws it as a play-chance arrow (a fill inside a border). */
export type Arrow = { from: string; to: string; color: string; border?: string };

const FILES = "abcdefgh";

/** Every square of the board from a8 to h1 (White at the bottom), with the piece a FEN puts on it (`wN`). */
export const piecesOfFen = (fen: string): { square: string; piece?: string }[] =>
  fen
    .split(" ")[0]
    .split("/")
    .flatMap((row, rank) => {
      const cells: (string | undefined)[] = [];
      for (const char of row) {
        if (/\d/.test(char)) cells.push(...Array<undefined>(Number(char)).fill(undefined));
        else cells.push(`${char === char.toUpperCase() ? "w" : "b"}${char.toUpperCase()}`);
      }
      return cells.map((piece, file) => ({ square: `${FILES[file]}${8 - rank}`, piece }));
    });

/** Whether a square is a light one (a1 is dark). */
export const squareIsLight = (square: string): boolean => (FILES.indexOf(square[0]) + Number(square[1])) % 2 === 1;

/** A square's centre in board units (a square is 1), White at the bottom. */
export const squareCentre = (square: string): [number, number] => [FILES.indexOf(square[0]) + 0.5, 8 - Number(square[1]) + 0.5];

/** A move list carrying every move mark, and the tone each glyph is drawn in. */
export const MARKED_MOVES: readonly { number?: number; san: string; glyph?: string; tone?: keyof ChessTokens["nag"] }[] = [
  { number: 1, san: "e4" },
  { san: "e5" },
  { number: 2, san: "Nf3", glyph: "!", tone: "good" },
  { san: "Nc6" },
  { number: 3, san: "Bb5", glyph: "!!", tone: "brilliant" },
  { san: "a6", glyph: "?!", tone: "dubious" },
  { number: 4, san: "Ba4", glyph: "!?", tone: "interesting" },
  { san: "f5", glyph: "?", tone: "mistake" },
  { number: 5, san: "exf5", glyph: "!", tone: "good" },
  { san: "Qh4", glyph: "??", tone: "blunder" },
];
