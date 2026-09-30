import { fenFields, type PositionFields } from "../../../lib/positionEditor";

/*
  The position fields' sample positions (CTA-113), read by `src/lib/`'s own
  `fenFields`. Imported only by the block's gallery and its test.
*/

export const START: PositionFields = fenFields("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");

/** Black to move after 1. e4, the e3 target set, White's queenside castle gone. */
export const AFTER_E4: PositionFields = fenFields("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b Kkq e3 0 1");
