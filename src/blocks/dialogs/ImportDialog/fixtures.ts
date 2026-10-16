import { gameCaseOf, type AnalysisProject } from "../../../lib/analysisProjects";
import type { ImportCaps, ImportCurrent, ImportDump, ImportProject } from "../../../lib/dataImport";
import { DEFAULT_ENGINE_SETTINGS } from "../../../lib/engineSettings";
import { parsePgnTree } from "../../../lib/pgn";
import { playedGameOf } from "../../../lib/playedGames";
import { savedRepertoireOf, type SavedRepertoire } from "../../../lib/savedRepertoires";

/*
  The Import dialog's sample zip and app (CTA-109), built with `src/lib/`'s own
  record constructors, so they are records the stores would keep. Imported
  only by the block's gallery and its test.
*/

const WHEN = new Date("2026-09-20T10:00:00.000Z");

const project = (id: string, name: string, folderId: string | null = null): AnalysisProject => ({
  id,
  name,
  folderId,
  createdAt: WHEN.toISOString(),
  updatedAt: WHEN.toISOString(),
});

/** A Project of the zip, with one Game Case of `pgn`. */
const projectWithCase = (id: string, name: string, pgn: string): ImportProject => ({
  ...project(id, name),
  cases: [gameCaseOf({ id: `${id}-case`, projectId: id, name: "", now: WHEN }, parsePgnTree(pgn))],
});

const repertoire = (id: string, name: string, pgn: string, folderId: string | null = null): SavedRepertoire => ({
  ...savedRepertoireOf(id, { index: 0, name, pgn, tree: parsePgnTree(pgn) }, name, undefined, WHEN),
  folderId,
});

const folder = (id: string, name: string, parentId: string | null = null) => ({ id, name, parentId, savedAt: WHEN.toISOString(), updatedAt: WHEN.toISOString() });

/** An Export of every category: games, Projects in a nested folder and at the top, repertoires in a folder, an upload in a Library folder, two shipped collections. */
export const DUMP: ImportDump = {
  appVersion: "0.4.0",
  exportedAt: "2026-09-21T08:30:00.000Z",
  categories: ["collections", "games", "repertoires", "analysisProjects"],
  games: [
    playedGameOf("g1", parsePgnTree("1. e4 e5 2. Nf3 *"), [], DEFAULT_ENGINE_SETTINGS, undefined, WHEN),
    playedGameOf("g2", parsePgnTree("1. d4 d5 *"), [], DEFAULT_ENGINE_SETTINGS, undefined, WHEN),
  ],
  skippedAnalyses: 0,
  repertoires: [
    { record: repertoire("r1", "Italian", "1. e4 e5 2. Nf3 Nc6 3. Bc4 *"), folder: ["White"] },
    { record: repertoire("r2", "Caro-Kann", "1. e4 c6 *"), folder: [] },
  ],
  repertoireFolders: [["White"], ["Black"]],
  collections: [{ record: { id: "u1", name: "Club games", games: ["1. e4 e5 *", "1. c4 e5 *"] }, folder: ["Club"] }],
  collectionFolders: [["Club"]],
  shippedCollections: 2,
  enginePresets: [],
  enginePresetSelections: [],
  analysisProjects: [
    { record: projectWithCase("p1", "Najdorf", "1. e4 c5 *"), folder: ["Openings", "Sicilian"] },
    { record: projectWithCase("p2", "Indian games", "1. d4 Nf6 *"), folder: [] },
  ],
  projectFolders: [["Openings"], ["Openings", "Sicilian"]],
  caseLinks: [],
};

/** An Export from before CTA-192, holding three saved analyses — no longer supported, said and skipped. */
export const OLD_DUMP: ImportDump = { ...DUMP, skippedAnalyses: 3 };

/** An app with nothing in it — only the top levels clash, as they always exist. */
export const EMPTY_APP: ImportCurrent = {
  playedGames: [],
  repertoires: [],
  repertoireFolders: [],
  collections: [],
  collectionFolders: [],
  enginePresets: [],
  enginePresetSelections: [],
  projectFolders: [],
  analysisProjects: [],
  analysisCases: [],
};

/** An app that already has some of it: a game, the Openings folder, the White folder with a repertoire in it. */
export const CLASHING_APP: ImportCurrent = {
  playedGames: [playedGameOf("g9", parsePgnTree("1. c4 *"), [], DEFAULT_ENGINE_SETTINGS, undefined, WHEN)],
  repertoires: [repertoire("r9", "Ruy Lopez", "1. e4 e5 2. Nf3 Nc6 3. Bb5 *", "rf1")],
  repertoireFolders: [{ id: "rf1", name: "White", savedAt: WHEN.toISOString(), updatedAt: WHEN.toISOString() }],
  collections: [],
  collectionFolders: [folder("lf1", "Club")],
  enginePresets: [],
  enginePresetSelections: [],
  projectFolders: [folder("f1", "Openings")],
  analysisProjects: [project("p9", "French", "f1")],
  analysisCases: [],
};

/** A zip that holds only Projects, with a Hebrew folder name among them — for the RTL switch. */
export const HEBREW_DUMP: ImportDump = {
  ...DUMP,
  categories: ["analysisProjects"],
  analysisProjects: [{ record: projectWithCase("h1", "סיציליאנית", "1. e4 c5 *"), folder: ["פתיחות"] }],
  projectFolders: [["פתיחות"]],
};

export const HEBREW_APP: ImportCurrent = { ...EMPTY_APP, projectFolders: [folder("hf", "פתיחות")] };

/** The shipped caps. */
export const CAPS: ImportCaps = { playedGames: 500, repertoires: 500, folders: 100, enginePresets: 50, analysisProjects: 1_000 };

/** Caps a small app would pass: the played games' warning, the repertoires refused. */
export const TIGHT_CAPS: ImportCaps = { playedGames: 1, repertoires: 1, folders: 100, enginePresets: 50, analysisProjects: 1_000 };
