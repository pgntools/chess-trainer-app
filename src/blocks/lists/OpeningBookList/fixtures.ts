import type { KnownMoveOpening } from "../../../lib/openings";

/*
  The book's continuations from the start (CTA-113), typed with
  `src/lib/`'s own shape. Imported only by the block's gallery and its test.
*/

const move = (san: string, from: KnownMoveOpening["from"], to: KnownMoveOpening["to"], eco: string, name: string): KnownMoveOpening => ({
  san,
  from,
  to,
  fen: "",
  opening: { eco, name, moves: `1. ${san}` },
});

export const START_MOVES: readonly KnownMoveOpening[] = [
  move("e4", "e2", "e4", "B00", "King's Pawn Game"),
  move("d4", "d2", "d4", "A40", "Queen's Pawn Game"),
  move("Nf3", "g1", "f3", "A04", "Zukertort Opening"),
  move("c4", "c2", "c4", "A10", "English Opening"),
];

/** One continuation with a long name, to see it wrap. */
export const LONG_NAME: readonly KnownMoveOpening[] = [
  move("Nf3", "g1", "f3", "C44", "King's Pawn Game: Tayler Opening, Inverted Hanham, with a very long sub-variation name"),
];
