import { useSyncExternalStore } from "react";

import { analysisCasesSnapshot, subscribeAnalysisCases } from "../../lib/analysisCaseStore";
import { projectFoldersSnapshot, subscribeProjectFolders } from "../../lib/analysisProjectFolderStore";
import { analysisProjectsSnapshot, subscribeAnalysisProjects } from "../../lib/analysisProjectStore";
import type { AnalysisCase, AnalysisProject, ProjectFolder } from "../../lib/analysisProjects";

/**
 * **Analysis V2's stores as React state** (CTA-186) — `useSyncExternalStore`
 * over the folders, the Projects and the Cases, each `undefined` while its
 * first read is out, so a screen arriving by a URL waits for it rather than
 * calling a record missing (`.claude/rules/database.md` §4).
 */

export const useProjectFolders = (): readonly ProjectFolder[] | undefined =>
  useSyncExternalStore(subscribeProjectFolders, projectFoldersSnapshot, projectFoldersSnapshot);

export const useAnalysisProjects = (): readonly AnalysisProject[] | undefined =>
  useSyncExternalStore(subscribeAnalysisProjects, analysisProjectsSnapshot, analysisProjectsSnapshot);

export const useAnalysisCases = (): readonly AnalysisCase[] | undefined =>
  useSyncExternalStore(subscribeAnalysisCases, analysisCasesSnapshot, analysisCasesSnapshot);
