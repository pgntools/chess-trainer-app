import { buildExport, zipExport, type ExportSource } from "../../src/lib/dataExport";
import { DEFAULT_ANALYSIS_SETTINGS } from "../../src/lib/analysisSettings";
import { DEFAULT_ENGINE_SETTINGS } from "../../src/lib/engineSettings";
import { MASK_PRESETS } from "../../src/lib/pieceMask";
import { DEFAULT_REPERTOIRE_SETTINGS } from "../../src/lib/repertoireSettings";
import type { PlayedGame } from "../../src/lib/playedGames";
import type { SavedAnalysis } from "../../src/lib/savedAnalyses";
import type { SavedRepertoire } from "../../src/lib/savedRepertoires";

/*
  The data every page is checked with (CTA-116): what a reader who has used the
  app for a while would have — a game still on, a finished one, a masked one and
  one that cannot be read; a saved analysis in a folder; a repertoire; an
  uploaded collection in a folder. It is the app's **own export**, built by its
  own builder (`buildExport`, `zipExport`), and put in through Settings →
  Import (`seed.setup.ts`) — so the seeding uses no store and no schema of its
  own, and the pass exercises the import too.

  The ids are fixed: `routes.ts` names them in the paths it visits.
*/

export const SEED = {
  analysisId: "e2e-analysis",
  repertoireId: "e2e-repertoire",
  collectionId: "ue2e-friday",
} as const;

/*
  Each kind has a record at the top level and one in a folder, so a list shows
  both its rows and cards and its folder's. The pages that open one record
  (`routes.ts`) open the first, at the top level.
*/

const AT = "2026-09-20T18:30:00.000Z";
const LATER = "2026-09-21T09:15:00.000Z";

const tags = (fields: Record<string, string>) =>
  Object.entries(fields)
    .map(([name, value]) => `[${name} "${value}"]`)
    .join("\n");

const game = (fields: Record<string, string>, movetext: string) => `${tags(fields)}\n\n${movetext}`;

const played = (id: string, movetext: string, result: string, extra: Partial<PlayedGame> = {}): PlayedGame => ({
  id,
  pgn: game(
    { Event: "Play with Engine", Site: "Chess Trainer App", Date: "2026.09.20", Round: "-", White: "You", Black: "Stockfish", Result: result },
    movetext,
  ),
  settings: DEFAULT_ENGINE_SETTINGS,
  path: [],
  savedAt: AT,
  updatedAt: AT,
  ...extra,
});

const PLAYED_GAMES: PlayedGame[] = [
  // Still on: the Lobby offers Continue.
  played("e2e-on", "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 *", "*", { updatedAt: LATER }),
  // Finished: mated on the board.
  played("e2e-mated", "1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0", "1-0"),
  // Finished: resigned.
  played("e2e-resigned", "1. d4 d5 2. c4 e6 3. Nc3 Nf6 *", "*", { resigned: "white" }),
  // Played on Masked Pieces, in its costume.
  played("e2e-masked", "1. e4 c5 2. Nf3 d6 *", "*", { mask: { pieces: MASK_PRESETS.nonPawns, notation: true } }),
  // A record whose PGN cannot be read: the Lobby says so across the row.
  played("e2e-unreadable", "1. e4 e5 2. Ke9 Qz7 *", "*"),
];

const PGN_ANALYSIS = game(
  { Event: "Analysis", White: "Anderssen", Black: "Kieseritzky", Result: "*" },
  "1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 { the Bishop's Gambit, Kieseritzky's Gambit line } 5. Bxb5 Nf6 (5... Bb7 6. Nf3) 6. Nf3 Qh6 *",
);

const ANALYSIS: SavedAnalysis = {
  id: SEED.analysisId,
  pgn: PGN_ANALYSIS,
  settings: DEFAULT_ANALYSIS_SETTINGS,
  path: ["e4", "e5", "f4"],
  orientation: "white",
  description: "The Immortal Game's opening — where White stands after 4… b5.",
  showArrows: true,
  arrowWidthSource: "none",
  arrowPalette: "classic",
  name: "King's Gambit, Bishop's line",
  folderId: null,
  savedAt: AT,
  updatedAt: LATER,
};

const ANALYSIS_IN_A_FOLDER: SavedAnalysis = {
  ...ANALYSIS,
  id: "e2e-analysis-filed",
  pgn: game({ Event: "Analysis", White: "?", Black: "?", Result: "*" }, "1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 *"),
  path: ["d4", "Nf6", "c4"],
  description: "",
  name: "Nimzo-Indian",
  folderId: "e2e-folder-openings",
  savedAt: AT,
  updatedAt: AT,
};

const REPERTOIRE_PGN = game(
  { Event: "Caro-Kann Defence", Site: "?", White: "?", Black: "Me", Result: "*" },
  [
    "1. e4 c6 { The Caro-Kann: solid, and easy to play. }",
    "( 1... e6 2. d4 d5 )",
    "2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5 { The main line. } 5. Ng3 Bg6 6. h4 h6",
    "( 6... h5 7. Bd3 )",
    "7. Nf3 Nd7 8. h5 Bh7 9. Bd3 Bxd3 10. Qxd3 e6 *",
  ].join(" "),
);

const REPERTOIRE: SavedRepertoire = {
  id: SEED.repertoireId,
  name: "Caro-Kann as Black",
  pgn: REPERTOIRE_PGN,
  previewFen: "rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3",
  stats: { moves: 22, variations: 2 },
  settings: DEFAULT_REPERTOIRE_SETTINGS,
  folderId: null,
  savedAt: AT,
  updatedAt: LATER,
};

const REPERTOIRE_IN_A_FOLDER: SavedRepertoire = {
  ...REPERTOIRE,
  id: "e2e-repertoire-filed",
  name: "Sicilian Najdorf",
  pgn: game({ Event: "Najdorf", Result: "*" }, "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 *"),
  stats: { moves: 9, variations: 0 },
  folderId: "e2e-folder-black",
  updatedAt: AT,
};

const UPLOADED: { white: string; black: string; whiteElo: number; blackElo: number; result: string; eco: string; event: string; date: string; moves: string }[] = [
  { white: "Rosen, Anna", black: "Klein, Yosef", whiteElo: 2104, blackElo: 1987, result: "1-0", eco: "C23", event: "Friday Blitz", date: "2026.08.07", moves: "1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0" },
  { white: "Klein, Yosef", black: "Rosen, Anna", whiteElo: 1987, blackElo: 2104, result: "0-1", eco: "A02", event: "Friday Blitz", date: "2026.08.14", moves: "1. f3 e5 2. g4 Qh4# 0-1" },
  { white: "Ben-David, Noa", black: "Rosen, Anna", whiteElo: 1850, blackElo: 2104, result: "1-0", eco: "C41", event: "Friday Blitz", date: "2026.08.21", moves: "1. e4 e5 2. Nf3 d6 3. Bc4 Bg4 4. Nc3 g6 5. Nxe5 Bxd1 6. Bxf7+ Ke7 7. Nd5# 1-0" },
  { white: "Rosen, Anna", black: "Ben-David, Noa", whiteElo: 2104, blackElo: 1850, result: "1/2-1/2", eco: "C54", event: "Friday Blitz", date: "2026.08.28", moves: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 1/2-1/2" },
  { white: "Levi, Dan", black: "Klein, Yosef", whiteElo: 1720, blackElo: 1987, result: "0-1", eco: "B90", event: "Club Championship", date: "2026.09.04", moves: "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e5 7. Nb3 Be6 0-1" },
  { white: "Klein, Yosef", black: "Levi, Dan", whiteElo: 1987, blackElo: 1720, result: "1-0", eco: "B12", event: "Club Championship", date: "2026.09.11", moves: "1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5 5. Ng3 Bg6 6. h4 h6 7. Nf3 Nd7 1-0" },
];

const UPLOADED_GAMES = UPLOADED.map((row, index) =>
  game(
    {
      Event: row.event,
      Site: "Haifa",
      Date: row.date,
      Round: String(index + 1),
      White: row.white,
      Black: row.black,
      Result: row.result,
      WhiteElo: String(row.whiteElo),
      BlackElo: String(row.blackElo),
      ECO: row.eco,
    },
    row.moves,
  ),
);

const SOURCE: ExportSource = {
  playedGames: PLAYED_GAMES,
  analyses: [ANALYSIS, ANALYSIS_IN_A_FOLDER],
  analysisFolders: [{ id: "e2e-folder-openings", name: "Openings", parentId: null, savedAt: AT, updatedAt: AT }],
  repertoires: [REPERTOIRE, REPERTOIRE_IN_A_FOLDER],
  repertoireFolders: [{ id: "e2e-folder-black", name: "Black", savedAt: AT, updatedAt: AT }],
  collections: [
    {
      summary: { id: SEED.collectionId, name: "Friday club games", source: "uploaded", count: UPLOADED_GAMES.length, addedAt: AT, folderId: null },
      games: UPLOADED_GAMES,
    },
    {
      summary: { id: "ue2e-blitz", name: "Blitz nights", source: "uploaded", count: 2, addedAt: LATER, folderId: "e2e-folder-club" },
      games: UPLOADED_GAMES.slice(0, 2),
    },
  ],
  collectionFolders: [{ id: "e2e-folder-club", name: "Club", parentId: null, savedAt: AT, updatedAt: AT }],
};

/** The seed as one export zip: every category, the shipped collections left out. */
export const seedZip = (): Uint8Array =>
  zipExport(
    buildExport(
      SOURCE,
      { collections: true, games: true, analyses: true, repertoires: true, shippedCollections: false },
      { appVersion: "0.0.0-e2e", now: new Date(AT) },
    ),
  );
