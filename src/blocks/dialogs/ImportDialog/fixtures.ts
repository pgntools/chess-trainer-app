import { DEFAULT_ANALYSIS_SETTINGS } from "../../../lib/analysisSettings";
import type { ImportCaps, ImportCurrent, ImportDump } from "../../../lib/dataImport";
import { DEFAULT_ENGINE_SETTINGS } from "../../../lib/engineSettings";
import { parsePgnTree } from "../../../lib/pgn";
import { playedGameOf } from "../../../lib/playedGames";
import { savedAnalysisOf, type SavedAnalysis } from "../../../lib/savedAnalyses";
import { savedRepertoireOf, type SavedRepertoire } from "../../../lib/savedRepertoires";

/*
  The Import dialog's sample zip and app (CTA-109), built with `src/lib/`'s own
  record constructors, so they are records the stores would keep. Imported
  only by the block's gallery and its test.
*/

const WHEN = new Date("2026-09-20T10:00:00.000Z");

const analysis = (id: string, pgn: string, folderId: string | null = null): SavedAnalysis => ({
  ...savedAnalysisOf(id, parsePgnTree(pgn), [], DEFAULT_ANALYSIS_SETTINGS, "white", WHEN),
  folderId,
});

const repertoire = (id: string, name: string, pgn: string, folderId: string | null = null): SavedRepertoire => ({
  ...savedRepertoireOf(id, { index: 0, name, pgn, tree: parsePgnTree(pgn) }, name, undefined, WHEN),
  folderId,
});

const folder = (id: string, name: string, parentId: string | null = null) => ({ id, name, parentId, savedAt: WHEN.toISOString(), updatedAt: WHEN.toISOString() });

/** An Export of every category: games, analyses in a nested folder and unfiled, repertoires in a folder, an upload in a Library folder, two shipped collections. */
export const DUMP: ImportDump = {
  appVersion: "0.4.0",
  exportedAt: "2026-09-21T08:30:00.000Z",
  categories: ["collections", "games", "analyses", "repertoires"],
  games: [
    playedGameOf("g1", parsePgnTree("1. e4 e5 2. Nf3 *"), [], DEFAULT_ENGINE_SETTINGS, undefined, WHEN),
    playedGameOf("g2", parsePgnTree("1. d4 d5 *"), [], DEFAULT_ENGINE_SETTINGS, undefined, WHEN),
  ],
  analyses: [
    { record: analysis("a1", "1. e4 c5 *"), folder: ["Openings", "Sicilian"] },
    { record: analysis("a2", "1. d4 Nf6 *"), folder: [] },
  ],
  analysisFolders: [["Openings"], ["Openings", "Sicilian"]],
  repertoires: [
    { record: repertoire("r1", "Italian", "1. e4 e5 2. Nf3 Nc6 3. Bc4 *"), folder: ["White"] },
    { record: repertoire("r2", "Caro-Kann", "1. e4 c6 *"), folder: [] },
  ],
  repertoireFolders: [["White"], ["Black"]],
  collections: [{ record: { id: "u1", name: "Club games", games: ["1. e4 e5 *", "1. c4 e5 *"] }, folder: ["Club"] }],
  collectionFolders: [["Club"]],
  shippedCollections: 2,
};

/** An app with nothing in it — only the top levels clash, as they always exist. */
export const EMPTY_APP: ImportCurrent = {
  playedGames: [],
  analyses: [],
  analysisFolders: [],
  repertoires: [],
  repertoireFolders: [],
  collections: [],
  collectionFolders: [],
};

/** An app that already has some of it: a game, the Openings folder, the White folder with a repertoire in it. */
export const CLASHING_APP: ImportCurrent = {
  playedGames: [playedGameOf("g9", parsePgnTree("1. c4 *"), [], DEFAULT_ENGINE_SETTINGS, undefined, WHEN)],
  analyses: [analysis("a9", "1. e4 e6 *", "f1")],
  analysisFolders: [folder("f1", "Openings")],
  repertoires: [repertoire("r9", "Ruy Lopez", "1. e4 e5 2. Nf3 Nc6 3. Bb5 *", "rf1")],
  repertoireFolders: [{ id: "rf1", name: "White", savedAt: WHEN.toISOString(), updatedAt: WHEN.toISOString() }],
  collections: [],
  collectionFolders: [folder("lf1", "Club")],
};

/** A zip that holds only games, with a Hebrew folder name among the analyses — for the RTL switch. */
export const HEBREW_DUMP: ImportDump = {
  ...DUMP,
  categories: ["analyses"],
  analyses: [{ record: analysis("h1", "1. e4 c5 *"), folder: ["פתיחות"] }],
  analysisFolders: [["פתיחות"]],
};

export const HEBREW_APP: ImportCurrent = { ...EMPTY_APP, analysisFolders: [folder("hf", "פתיחות")] };

/** The shipped caps. */
export const CAPS: ImportCaps = { playedGames: 500, analyses: 20_000, repertoires: 500, folders: 100 };

/** Caps a small app would pass: the played games' warning, the repertoires refused. */
export const TIGHT_CAPS: ImportCaps = { playedGames: 1, analyses: 20_000, repertoires: 1, folders: 100 };
