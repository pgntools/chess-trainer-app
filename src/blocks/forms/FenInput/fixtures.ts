import { FenParseError } from "../../../lib/fen";

/*
  The FEN input's sample text (CTA-113), and a problem worded from
  `src/lib/`'s own parse error. Imported only by the block's gallery and its test.
*/

export const FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";

export const BROKEN = "rnbqkbnr/pppppppp/8/8 w";

export const PROBLEM = `Could not read this FEN. ${new FenParseError("the board has 4 ranks, not 8").detail}`;
