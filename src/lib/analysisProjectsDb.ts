import { idbDatabase } from "./idb";

/**
 * **The database Analysis V2 lives in** (CTA-186) — IndexedDB,
 * `chessapp.analysisProjects`, with three object stores: `folders` (the
 * nested folders, `lib/analysisProjectFolderStore.ts`), `projects`
 * (`lib/analysisProjectStore.ts`) and `cases` (`lib/analysisCaseStore.ts`).
 * One database for the three, because a folder, the Projects filed in it and
 * their Cases are read by the same screens; a database of its own, apart
 * from the legacy `chessapp.analyses`, so the legacy module's removal takes
 * nothing of it. Opened through `lib/idb.ts`; the app's storage as a whole is
 * `.claude/rules/database.md`.
 *
 * Dev-only while the module is built (`analysisProjectsEnabled.ts`): only
 * its screens and the Export / Import (behind the same flag) open it.
 */

export const ANALYSIS_PROJECTS_DB_NAME = "chessapp.analysisProjects";
const DB_VERSION = 1;
export const PROJECT_FOLDERS_STORE = "folders";
export const PROJECTS_STORE = "projects";
export const CASES_STORE = "cases";
/** The `BroadcastChannel` the three stores announce their writes on. */
export const ANALYSIS_PROJECTS_CHANNEL = "chessapp.analysisProjects";

const analysisProjectsDb = idbDatabase(ANALYSIS_PROJECTS_DB_NAME, DB_VERSION, [
  PROJECT_FOLDERS_STORE,
  PROJECTS_STORE,
  CASES_STORE,
]);

/** The connection, opened once (and again after a failure or a newer version elsewhere). */
export const openAnalysisProjectsDb = analysisProjectsDb.open;

/** **For tests**: close the connection and delete the database. */
export const deleteAnalysisProjectsDb = analysisProjectsDb.remove;
