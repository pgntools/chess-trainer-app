import { collectionImportFileOf, type CollectionImportSource } from "../../../lib/libraryCollections";

/*
  What an import can bring in (CTA-113), read by `src/lib/`'s own
  `collectionImportFileOf` from PGN text, as `/library/new` reads it.
  Imported only by the block's gallery and its test.
*/

const game = (white: string, black: string, whiteElo: number, blackElo: number, date: string, event: string) =>
  `[Event "${event}"]\n[Date "${date}"]\n[White "${white}"]\n[Black "${black}"]\n[WhiteElo "${whiteElo}"]\n[BlackElo "${blackElo}"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 1-0`;

const CLUB = [
  game("Amy", "Bob", 1500, 1620, "2023.04.02", "Club"),
  game("Carl", "Amy", 1810, 1520, "2023.05.10", "Club"),
  game("Bob", "Dana", 1640, 2100, "2024.01.20", "Spring Open"),
].join("\n\n");

const read = (text: string, name?: string, stem?: string) => collectionImportFileOf(text, text.length, name, stem).file;

/** One file of three games: players, an Elo span, dates, two events. */
export const ONE_FILE: CollectionImportSource = { name: "club.pgn", size: CLUB.length, zip: false, files: [read(CLUB, "club.pgn", "club")] };

/** A paste with no tags to filter on. */
const BARE = "1. d4 d5 2. c4 *";
export const PASTE: CollectionImportSource = { size: BARE.length, zip: false, files: [read(BARE)] };

/** A zip of two files. */
const HEBREW = [game("כהן", "לוי", 1700, 1750, "2025.02.01", "אליפות המועדון")].join("\n\n");
export const ZIP: CollectionImportSource = {
  name: "games.zip",
  size: CLUB.length + HEBREW.length,
  zip: true,
  files: [read(CLUB, "club.pgn", "club"), read(HEBREW, "מועדון.pgn", "מועדון")],
};
