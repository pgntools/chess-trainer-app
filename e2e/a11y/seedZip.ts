import { buildExport, zipExport, type ExportSource } from "../../src/lib/dataExport";
import { DEFAULT_ENGINE_SETTINGS } from "../../src/lib/engineSettings";
import { MASK_PRESETS } from "../../src/lib/pieceMask";
import { DEFAULT_REPERTOIRE_SETTINGS } from "../../src/lib/repertoireSettings";
import type { PlayedGame } from "../../src/lib/playedGames";
import type { AnalysisCase, AnalysisProject, CaseDisplay } from "../../src/lib/analysisProjects";
import type { SavedRepertoire } from "../../src/lib/savedRepertoires";

/*
  The data every page is checked with (CTA-116): what a reader who has used the
  app for a while would have — a game still on, a finished one, a masked one and
  one that cannot be read; an Analysis project at the top level and one in a
  folder, their cases a game and a position (CTA-192); a repertoire; an
  uploaded collection in a folder. It is the app's **own export**, built by its
  own builder (`buildExport`, `zipExport`), and put in through Settings →
  Import (`seed.setup.ts`) — so the seeding uses no store and no schema of its
  own, and the pass exercises the import too.

  The ids are fixed: `routes.ts` names them in the paths it visits.
*/

export const SEED = {
  /** An Analysis project at the top level, and its game case (CTA-192). */
  projectId: "e2e-project",
  caseId: "e2e-case",
  repertoireId: "e2e-repertoire",
  collectionId: "ue2e-friday",
  /** A collection marked as a tournament (CTA-142) — its own view, a tab per route. */
  tournamentId: "ue2e-cup",
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
    { Event: "Play with Engine", Site: "chessapp.dev", Date: "2026.09.20", Round: "-", White: "You", Black: "Stockfish", Result: result },
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

const DISPLAY: CaseDisplay = {
  showArrows: true,
  arrowWidthSource: "none",
  arrowPalette: "classic",
  showMoveMarks: true,
  showEvalBar: true,
  showVariations: true,
};

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const PROJECT: AnalysisProject = { id: SEED.projectId, name: "King's Gambit", folderId: null, createdAt: AT, updatedAt: LATER };

const PROJECT_IN_A_FOLDER: AnalysisProject = { id: "e2e-project-filed", name: "Nimzo-Indian", folderId: "e2e-folder-openings", createdAt: AT, updatedAt: AT };

/** A Game case — the reader standing at 2. f4. */
const GAME_CASE: AnalysisCase = {
  id: SEED.caseId,
  name: "",
  type: "game",
  projectId: SEED.projectId,
  source: { kind: "pgn", pgn: PGN_ANALYSIS, startPath: [], fen: START },
  pgn: PGN_ANALYSIS,
  path: ["e4", "e5", "f4"],
  orientation: "white",
  display: DISPLAY,
  merges: [],
  createdAt: AT,
  updatedAt: LATER,
};

const NIMZO_FEN = "rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4";

/** A Position case, from a FEN, facing the side to move. */
const POSITION_CASE: AnalysisCase = {
  id: "e2e-case-position",
  name: "The Nimzo-Indian's starting position",
  type: "position",
  projectId: PROJECT_IN_A_FOLDER.id,
  source: { kind: "fen", fen: NIMZO_FEN },
  pgn: `[SetUp "1"]\n[FEN "${NIMZO_FEN}"]\n\n*`,
  path: [],
  orientation: "white",
  display: DISPLAY,
  merges: [],
  createdAt: AT,
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

/** A four-player round robin, every pair once over three rounds (CTA-142) — the seeded tournament. */
const CUP_PAIRINGS: readonly [number, string, string, string][] = [
  [1, "Rosen, Anna", "Levi, Dan", "1-0"],
  [1, "Klein, Yosef", "Ben-David, Noa", "1/2-1/2"],
  [2, "Levi, Dan", "Klein, Yosef", "0-1"],
  [2, "Ben-David, Noa", "Rosen, Anna", "1/2-1/2"],
  [3, "Rosen, Anna", "Klein, Yosef", "1-0"],
  [3, "Levi, Dan", "Ben-David, Noa", "1/2-1/2"],
];
const ELO: Readonly<Record<string, string>> = { "Rosen, Anna": "2104", "Ben-David, Noa": "1850", "Levi, Dan": "1720", "Klein, Yosef": "1987" };
const CUP_GAMES = CUP_PAIRINGS.map(([round, white, black, result], index) =>
  game(
    {
      Event: "Haifa Club Cup 2026",
      Site: "Haifa",
      Date: `2026.09.${String(2 + round * 7).padStart(2, "0")}`,
      Round: `${round}.${(index % 2) + 1}`,
      White: white,
      Black: black,
      Result: result,
      WhiteElo: ELO[white],
      BlackElo: ELO[black],
    },
    `1. e4 e5 2. Nf3 Nc6 ${result}`,
  ),
);

const SOURCE: ExportSource = {
  playedGames: PLAYED_GAMES,
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
    {
      summary: {
        id: SEED.tournamentId,
        name: "Haifa Club Cup 2026",
        source: "uploaded",
        count: CUP_GAMES.length,
        addedAt: AT,
        folderId: null,
        tournament: { enabled: true, type: "roundRobin" },
      },
      games: CUP_GAMES,
    },
  ],
  collectionFolders: [{ id: "e2e-folder-club", name: "Club", parentId: null, savedAt: AT, updatedAt: AT }],
  enginePresets: [],
  enginePresetSelections: [],
  // Analysis V2 (CTA-186, shipped in CTA-192): a Project at the top level and one in a folder.
  projectFolders: [{ id: "e2e-folder-openings", name: "Openings", parentId: null, savedAt: AT, updatedAt: AT }],
  analysisProjects: [PROJECT, PROJECT_IN_A_FOLDER],
  analysisCases: [GAME_CASE, POSITION_CASE],
};

/** The seed as one export zip: every category, the shipped collections left out. */
export const seedZip = (): Uint8Array =>
  zipExport(
    buildExport(
      SOURCE,
      { collections: true, games: true, repertoires: true, enginePresets: true, analysisProjects: true, shippedCollections: false },
      { appVersion: "0.0.0-e2e", now: new Date(AT) },
    ),
  );
