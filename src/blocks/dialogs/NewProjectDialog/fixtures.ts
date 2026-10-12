/*
  A new Project's sample file (CTA-186): a PGN of two games, as a picked file.
  Imported only by the block's gallery and its test.
*/

export const TWO_GAMES = `[Event "Club Championship"]
[White "Carlsen"]
[Black "Caruana"]
[Result "1-0"]

1. e4 e5 2. Nf3 1-0

[Event "Club Championship"]
[White "Ding"]
[Black "Nepomniachtchi"]
[Result "1/2-1/2"]

1. d4 d5 1/2-1/2`;

export const pgnFile = (name = "club-championship.pgn", text = TWO_GAMES): File => new File([text], name, { type: "application/x-chess-pgn" });
