import { useSyncExternalStore } from "react";

import { analysisCasesSnapshot, subscribeAnalysisCases } from "../../lib/analysisCaseStore";
import { projectFoldersSnapshot, subscribeProjectFolders } from "../../lib/analysisProjectFolderStore";
import { projectLinksSnapshot, subscribeProjectLinks } from "../../lib/analysisProjectLinkStore";
import { analysisProjectsSnapshot, subscribeAnalysisProjects } from "../../lib/analysisProjectStore";
import type { AnalysisCase, AnalysisProject, ProjectFolder, ProjectLink } from "../../lib/analysisProjects";
import type { JobV2 } from "../../lib/jobsV2";
import { jobsV2Snapshot, subscribeJobsV2 } from "../../lib/jobV2Store";

/**
 * **Analysis V2's stores as React state** (CTA-186) — `useSyncExternalStore`
 * over the folders, the Projects, the Cases, the links between Projects and
 * Jobs V2 (CTA-188), each `undefined` while its
 * first read is out, so a screen arriving by a URL waits for it rather than
 * calling a record missing (`.claude/rules/database.md` §4).
 */

export const useProjectFolders = (): readonly ProjectFolder[] | undefined =>
  useSyncExternalStore(subscribeProjectFolders, projectFoldersSnapshot, projectFoldersSnapshot);

export const useAnalysisProjects = (): readonly AnalysisProject[] | undefined =>
  useSyncExternalStore(subscribeAnalysisProjects, analysisProjectsSnapshot, analysisProjectsSnapshot);

export const useAnalysisCases = (): readonly AnalysisCase[] | undefined =>
  useSyncExternalStore(subscribeAnalysisCases, analysisCasesSnapshot, analysisCasesSnapshot);

/** The links between Projects (CTA-188). */
export const useProjectLinks = (): readonly ProjectLink[] | undefined =>
  useSyncExternalStore(subscribeProjectLinks, projectLinksSnapshot, projectLinksSnapshot);

/** Jobs V2, newest first (CTA-188). */
export const useJobsV2 = (): readonly JobV2[] | undefined => useSyncExternalStore(subscribeJobsV2, jobsV2Snapshot, jobsV2Snapshot);
