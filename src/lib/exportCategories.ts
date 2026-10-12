import { ANALYSIS_PROJECTS_ENABLED } from "./analysisProjectsEnabled";
import { EXPORT_CATEGORIES, type ExportCategory } from "./dataExport";

/**
 * **The categories this build offers** in Settings' Export and Import — every
 * one the format knows (`dataExport.ts`'s `EXPORT_CATEGORIES`) but Analysis
 * V2's projects in a build without the module (CTA-186, dev-only while it is
 * built: `analysisProjectsEnabled.ts`). Apart from `dataExport.ts`, which Node
 * reads too, so the build's flag never reaches it.
 */
export const OFFERED_EXPORT_CATEGORIES: readonly ExportCategory[] = ANALYSIS_PROJECTS_ENABLED
  ? EXPORT_CATEGORIES
  : EXPORT_CATEGORIES.filter((category) => category !== "analysisProjects");
