import { MASK_PRESETS, withMaskEntry, type PieceMask } from "../../../lib/pieceMask";

/*
  The mask editor's sample masks (CTA-109), `src/lib/pieceMask.ts`'s own
  `PieceMask`s. Imported only by the block's gallery and its test.
*/

/** The screen's opening mask — every queen, rook, bishop and knight as a pawn. */
export const NON_PAWNS: PieceMask = MASK_PRESETS.nonPawns;

/** No mask at all — *Show real pieces*. */
export const IDENTITY: PieceMask = MASK_PRESETS.identity;

/** A mask of the reader's own: only Black's queen hidden, as a rook — no preset is pressed. */
export const CUSTOM: PieceMask = withMaskEntry(MASK_PRESETS.identity, "bQ", "bR");
