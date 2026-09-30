import type { ImportProblem } from "../../../lib/dataImport";

/*
  The incompatible-zip dialog's sample problems (CTA-109), typed with
  `src/lib/dataImport.ts`'s own `ImportProblem`. Imported only by the block's
  gallery and its test.
*/

export const NEWER: ImportProblem = { kind: "newer", version: 3 };
export const NOT_ZIP: ImportProblem = { kind: "not-zip" };
export const UNREADABLE: ImportProblem = { kind: "unreadable", path: "analyses.pgn" };

/** A zip's PGN files, as `readImport` lists them. */
export const PGN_FILES: readonly string[] = ["games.pgn", "analyses.pgn", "collections/club/blitz/friday.pgn", "repertoires/white.pgn"];

/** A path long enough to wrap. */
export const LONG_FILES: readonly string[] = [
  "collections/club/blitz/a-very-long-folder-name-the-reader-typed-once/another-level/friday-night-games-2026.pgn",
];
