import { idbDatabase } from "./idb";

/**
 * **The database Analysis V2 lives in** (CTA-186) — IndexedDB,
 * `chessapp.analysisProjects`, with five object stores: `folders` (the
 * nested folders, `lib/analysisProjectFolderStore.ts`), `projects`
 * (`lib/analysisProjectStore.ts`), `cases` (`lib/analysisCaseStore.ts`) and,
 * since CTA-188, `jobs` (Jobs V2, `lib/jobV2Store.ts`) and `caseLinks` (the
 * links between Cases, `lib/analysisCaseLinkStore.ts`) — version 3: an upgrade
 * only creates what is missing, every folder, Project and Case kept. (Version
 * 2, on CTA-188's branch only, had a `projectLinks` store instead — left
 * where it is, unread: a store is never dropped.)
 * One database for them, because a folder, the Projects filed in it, their
 * Cases and their jobs are read by the same screens; a database of its own, apart
 * from the legacy `chessapp.analyses`, so the legacy module's removal takes
 * nothing of it. Opened through `lib/idb.ts`; the app's storage as a whole is
 * `.claude/rules/database.md`.
 *
 * Dev-only while the module is built (`analysisProjectsEnabled.ts`): only
 * its screens and the Export / Import (behind the same flag) open it.
 */

export const ANALYSIS_PROJECTS_DB_NAME = "chessapp.analysisProjects";
const DB_VERSION = 3;
export const PROJECT_FOLDERS_STORE = "folders";
export const PROJECTS_STORE = "projects";
export const CASES_STORE = "cases";
/** Jobs V2 (CTA-188) — a Case's computer analysis. */
export const JOBS_V2_STORE = "jobs";
/** The directed links between Cases (CTA-188). */
export const CASE_LINKS_STORE = "caseLinks";
/** The `BroadcastChannel` the stores announce their writes on. */
export const ANALYSIS_PROJECTS_CHANNEL = "chessapp.analysisProjects";

const analysisProjectsDb = idbDatabase(ANALYSIS_PROJECTS_DB_NAME, DB_VERSION, [
  PROJECT_FOLDERS_STORE,
  PROJECTS_STORE,
  CASES_STORE,
  JOBS_V2_STORE,
  CASE_LINKS_STORE,
]);

/** The connection, opened once (and again after a failure or a newer version elsewhere). */
export const openAnalysisProjectsDb = analysisProjectsDb.open;

/** **For tests**: close the connection and delete the database. */
export const deleteAnalysisProjectsDb = analysisProjectsDb.remove;
