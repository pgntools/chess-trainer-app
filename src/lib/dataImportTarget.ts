import { MAX_ANALYSIS_CASES, MAX_ANALYSIS_PROJECTS, MAX_PROJECT_FOLDERS } from "./analysisProjects";
import { analysisProjectStores } from "./analysisProjectsEnabled";
import type { IndexedRow } from "./collectionIndex";
import type {
  CapProblem,
  ImportCaps,
  ImportCurrent,
  ImportReport,
  ImportWrites,
} from "./dataImport";
import type { ExportCategory } from "./dataExport";
import { MAX_ENGINE_PRESETS } from "./enginePresets";
import { importEnginePresets, loadEnginePresetSelections, loadEnginePresets } from "./enginePresetStore";
import {
  addCollection,
  loadUploadedCollections,
  removeCollection,
} from "./libraryCollectionStore";
import { addLibraryFolders, loadLibraryFolders, MAX_LIBRARY_FOLDERS } from "./libraryFolderStore";
import { importPlayedGames, loadPlayedGames, MAX_PLAYED_GAMES } from "./playedGameStore";
import { addAnalysisFolders, loadAnalysisFolders, MAX_ANALYSIS_FOLDERS } from "./savedAnalysisFolderStore";
import { importAnalyses, loadSavedAnalyses, MAX_SAVED_ANALYSES } from "./savedAnalysisStore";
import {
  addRepertoireFolders,
  loadRepertoireFolders,
  MAX_REPERTOIRE_FOLDERS,
} from "./savedRepertoireFolderStore";
import { importRepertoires, loadSavedRepertoires, MAX_SAVED_REPERTOIRES } from "./savedRepertoireStore";

/**
 * **The import's reads and writes** (CTA-89) — the stores behind
 * `lib/dataImport.ts`: what the app holds now ({@link loadImportCurrent}),
 * the caps it plans against ({@link IMPORT_CAPS}), and the writes it planned,
 * applied through each store's own operations ({@link applyImport}).
 *
 * A category is written folders first, then its records — the records
 * removed and added in one write, so a refusal (the cap, the quota) leaves
 * the category's records as they were. Nothing here throws: every store
 * answers a problem, and so does this.
 */

/** Analysis V2's folders, Projects and Cases — none in a build without the module. */
const loadAnalysisProjectsCurrent = async (): Promise<
  Pick<ImportCurrent, "projectFolders" | "analysisProjects" | "analysisCases" | "caseLinks">
> => {
  const stores = await analysisProjectStores();
  if (stores === undefined) return { projectFolders: [], analysisProjects: [], analysisCases: [], caseLinks: [] };
  const [projectFolders, analysisProjects, analysisCases, caseLinks] = await Promise.all([
    stores.folders.loadProjectFolders(),
    stores.projects.loadAnalysisProjects(),
    stores.cases.loadAnalysisCases(),
    stores.links.loadCaseLinks(),
  ]);
  return { projectFolders, analysisProjects, analysisCases, caseLinks };
};

/** Every store the import writes, read now if it has not been. */
export const loadImportCurrent = async (): Promise<ImportCurrent> => {
  const [
    playedGames,
    analyses,
    analysisFolders,
    repertoires,
    repertoireFolders,
    collections,
    collectionFolders,
    enginePresets,
    enginePresetSelections,
    analysisProjects,
  ] = await Promise.all([
    loadPlayedGames(),
    loadSavedAnalyses(),
    loadAnalysisFolders(),
    loadSavedRepertoires(),
    loadRepertoireFolders(),
    loadUploadedCollections(),
    loadLibraryFolders(),
    loadEnginePresets(),
    loadEnginePresetSelections(),
    loadAnalysisProjectsCurrent(),
  ]);
  return {
    playedGames,
    analyses,
    analysisFolders,
    repertoires,
    repertoireFolders,
    collections,
    collectionFolders,
    enginePresets,
    enginePresetSelections,
    ...analysisProjects,
  };
};

/** The stores' caps. The three folder stores share one, which `folders` is. */
export const IMPORT_CAPS: ImportCaps = {
  playedGames: MAX_PLAYED_GAMES,
  analyses: MAX_SAVED_ANALYSES,
  repertoires: MAX_SAVED_REPERTOIRES,
  folders: Math.min(MAX_ANALYSIS_FOLDERS, MAX_REPERTOIRE_FOLDERS, MAX_LIBRARY_FOLDERS, MAX_PROJECT_FOLDERS),
  enginePresets: MAX_ENGINE_PRESETS,
  analysisProjects: MAX_ANALYSIS_PROJECTS,
  analysisCases: MAX_ANALYSIS_CASES,
};

/** Why a category was not (wholly) written. */
type ImportFailure = "storage" | "too-many" | "indexing";

/** What became of one category. */
export type ImportResult =
  | { status: "done"; report: ImportReport }
  /** Past a cap before anything was written. */
  | { status: "refused"; cap: CapProblem }
  /** A store refused a write; what was written before it stays. */
  | { status: "failed"; failure: ImportFailure };

export type ImportResults = Partial<Record<ExportCategory, ImportResult>>;

export type ApplyOptions = {
  /** An uploaded collection's index rows, one per game — the Library's worker pass. Rejects on failure. */
  index: (games: readonly string[], name: string) => Promise<IndexedRow[]>;
  now?: Date;
};

const failed = (failure: ImportFailure): ImportResult => ({ status: "failed", failure });

/** The uploaded collections: removed, then each indexed and added under its own id and folder. */
const applyCollections = async (
  { folders, add, remove }: NonNullable<ImportWrites["collections"]>["writes"],
  { index, now = new Date() }: ApplyOptions,
): Promise<ImportFailure | undefined> => {
  const folderProblem = await addLibraryFolders(folders);
  if (folderProblem !== undefined) return folderProblem;
  for (const id of remove) {
    if ((await removeCollection(id)) !== undefined) return "storage";
  }
  for (const collection of add) {
    let rows: IndexedRow[];
    try {
      rows = await index(collection.games, collection.name);
    } catch {
      return "indexing";
    }
    // The settings the zip carries beside the games (CTA-121): the description, the tournament mark.
    const written = await addCollection(collection.name, collection.games, rows, now, collection.id, collection.folderId, {
      description: collection.description,
      tournament: collection.tournament,
    });
    if ("problem" in written) return "storage";
  }
  return undefined;
};

/**
 * **Write what was planned** — each category the writes hold, in the
 * manifest's order: a refused one untouched, the others folders first, then
 * records. Answers what became of each.
 */
export const applyImport = async (writes: ImportWrites, options: ApplyOptions): Promise<ImportResults> => {
  const results: ImportResults = {};
  const run = async <W>(
    category: ExportCategory,
    planned: { writes: W; report: ImportReport; refused?: CapProblem } | undefined,
    write: (writes: W) => Promise<ImportFailure | undefined>,
  ) => {
    if (planned === undefined) return;
    if (planned.refused !== undefined) {
      results[category] = { status: "refused", cap: planned.refused };
      return;
    }
    const failure = await write(planned.writes);
    results[category] = failure === undefined ? { status: "done", report: planned.report } : failed(failure);
  };

  await run("collections", writes.collections, (planned) => applyCollections(planned, options));
  await run("games", writes.games, ({ add, remove }) => importPlayedGames(add, remove));
  await run(
    "analyses",
    writes.analyses,
    async ({ folders, add, remove }) => (await addAnalysisFolders(folders)) ?? (await importAnalyses(add, remove)),
  );
  await run(
    "repertoires",
    writes.repertoires,
    async ({ folders, add, remove }) => (await addRepertoireFolders(folders)) ?? (await importRepertoires(add, remove)),
  );
  await run("enginePresets", writes.enginePresets, async (planned) => {
    const problem = await importEnginePresets(planned);
    return problem === "default" ? "storage" : problem;
  });
  // Analysis V2 (CTA-186): the folders, then the Projects, then their Cases, then the links between the Cases (CTA-188).
  await run("analysisProjects", writes.analysisProjects, async ({ folders, add, remove, cases, links }) => {
    const stores = await analysisProjectStores();
    if (stores === undefined) return "storage";
    return (
      (await stores.folders.addProjectFolders(folders)) ??
      (await stores.projects.importAnalysisProjects({ add, remove })) ??
      (await stores.cases.importAnalysisCases(cases)) ??
      (await stores.links.importCaseLinks(links))
    );
  });
  return results;
};
