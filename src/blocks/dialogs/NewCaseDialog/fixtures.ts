/*
  The new-Case dialog's sample texts (CTA-186): a PGN of one game, of two,
  and a FEN. Imported only by the block's gallery and its test.
*/

export const ONE_GAME = `[Event "Club Championship"]
[White "Carlsen"]
[Black "Caruana"]
[Result "1-0"]

1. e4 e5 (1... c5) 2. Nf3 Nc6 3. Bb5 1-0`;

export const TWO_GAMES = `${ONE_GAME}

[Event "Club Championship"]
[White "Ding"]
[Black "Nepomniachtchi"]
[Result "1/2-1/2"]

1. d4 d5 2. c4 1/2-1/2`;

export const ENDGAME_FEN = "8/8/4k3/8/8/4K3/4P3/8 b - - 0 41";

/** Two games that start apart — the first from the standard start, the second from an endgame: no merge (CTA-208). */
export const TWO_STARTS = `${ONE_GAME}

[Event "Endgame drill"]
[SetUp "1"]
[FEN "8/8/4k3/8/8/4K3/4P3/8 w - - 0 1"]
[Result "*"]

1. Kd3 *`;
