/**
 * **What a result was to the one it is shown for** (CTA-120): a win, a draw,
 * a loss, a game not finished yet, or no game at all.
 */
export type ResultOutcome = "win" | "draw" | "loss" | "unfinished" | "none";

/**
 * The glyph each outcome is written as — text, so the tone beside it is
 * never the only signal: `1`, `½`, `0`, `*` for an unfinished game and an en
 * dash for none.
 */
export const RESULT_GLYPHS: Readonly<Record<ResultOutcome, string>> = {
  win: "1",
  draw: "½",
  loss: "0",
  unfinished: "*",
  none: "–",
};
