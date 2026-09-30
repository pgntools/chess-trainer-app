import type { OpeningEntry } from "../../../lib/openings";

/*
  The current opening's sample entries (CTA-113), typed with `src/lib/`'s own
  book entry. Imported only by the block's gallery and its test.
*/

export const KINGS_PAWN: OpeningEntry = { eco: "B00", name: "King's Pawn Game", moves: "1. e4" };

export const LONG: OpeningEntry = {
  eco: "B97",
  name: "Sicilian Defense: Najdorf Variation, Poisoned Pawn Accepted, Gheorghiu Variation",
  moves: "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Bg5 e6 7. f4 Qb6 8. Qd2 Qxb2",
};
