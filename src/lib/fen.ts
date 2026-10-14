import { Chess, validateFen } from "chess.js";

/**
 * FEN ingestion: text in, a position out.
 *
 * The counterpart of `lib/pgn.ts` for the other way a reader sets a board up.
 * PGN gives a game; a FEN gives a *position*, which the analysis board then
 * starts a new tree from — so what comes out of here is a validated string, and
 * `lib/gameTree.ts` `emptyTree` is what turns it into something playable.
 *
 * Pure, and it never lets a `chess.js` error escape: a bad paste is a message in
 * the panel, exactly as a bad PGN is.
 */

/**
 * Raised instead of letting a `chess.js` validation failure escape into the UI.
 * `detail` is the underlying reason — English, and specific enough to say which
 * field is wrong; the screen renders a *translated* string built around it.
 */
export class FenParseError extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super(detail);
    this.name = "FenParseError";
    this.detail = detail;
  }
}

/**
 * The fields a FEN may leave off, after the piece placement, and what each
 * defaults to — lichess's (chessops `parseFen`): White to move, no castling, no
 * en passant square, the move counters at their start.
 */
const FEN_FIELD_DEFAULTS = ["w", "-", "-", "0", "1"] as const;

/**
 * Validate a pasted FEN and return it normalised — trimmed, with runs of
 * whitespace collapsed to single spaces, which is what a FEN copied out of a
 * wrapped text box needs before anything will take it.
 *
 * A partial FEN is completed rather than refused, as lichess does: the piece
 * placement alone (or any of the first five fields) is a position, its missing
 * trailing fields taken from `FEN_FIELD_DEFAULTS`. What comes back is always all six.
 *
 * Validated twice on purpose. `validateFen` checks the notation; constructing a
 * `Chess` is what proves the position can actually be played from, and it
 * rejects a handful of well-formed-but-impossible boards that the notation check
 * lets through.
 */
export const parseFen = (text: string): string => {
  const given = text.trim().replace(/\s+/g, " ");
  if (given === "") throw new FenParseError("No FEN text found.");

  const fields = given.split(" ");
  const fen =
    fields.length > FEN_FIELD_DEFAULTS.length
      ? given
      : [...fields, ...FEN_FIELD_DEFAULTS.slice(fields.length - 1)].join(" ");

  // `validateFen` reads the fields last to first, so the placement is checked on
  // its own before the rest: text that is not a FEN at all is named as such, not
  // as a bad castling field.
  for (const candidate of [[fields[0], ...FEN_FIELD_DEFAULTS].join(" "), fen]) {
    const validation = validateFen(candidate);
    if (!validation.ok) {
      throw new FenParseError(validation.error ?? "Invalid FEN.");
    }
  }

  try {
    new Chess(fen);
  } catch (cause) {
    throw new FenParseError(
      cause instanceof Error ? cause.message : String(cause),
    );
  }

  return fen;
};
