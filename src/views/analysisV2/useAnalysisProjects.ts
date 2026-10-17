import { useMemo, useSyncExternalStore } from "react";

import { analysisCasesSnapshot, subscribeAnalysisCases } from "../../lib/analysisCaseStore";
import { projectFoldersSnapshot, subscribeProjectFolders } from "../../lib/analysisProjectFolderStore";
import { caseLinksSnapshot, subscribeCaseLinks } from "../../lib/analysisCaseLinkStore";
import { analysisProjectsSnapshot, subscribeAnalysisProjects } from "../../lib/analysisProjectStore";
import { projectPickerRowsOf, type ProjectPickerRow } from "../../lib/analysisProjectPickerRows";
import type { AnalysisCase, AnalysisProject, CaseLink, ProjectFolder } from "../../lib/analysisProjects";

/**
 * **Analysis V2's stores as React state** (CTA-186) — `useSyncExternalStore`
 * over the folders, the Projects, the Cases, the links between Cases and
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

/** The links between Cases (CTA-188). */
export const useCaseLinks = (): readonly CaseLink[] | undefined =>
  useSyncExternalStore(subscribeCaseLinks, caseLinksSnapshot, caseLinksSnapshot);


const unsubscribed = () => () => {};

/**
 * **The Project picker's rows** (CTA-226, `ProjectPickerDialog`): every
 * Project with its folder path and its count of Cases. The folders and the
 * Cases are subscribed to only while `active` (the picker open) — a screen
 * that hands games to Analysis does not read every Case to sit idle — and
 * read as kept otherwise, so a closing picker keeps its rows.
 */
export const useProjectPickerRows = (active: boolean): readonly ProjectPickerRow[] => {
  const projects = useAnalysisProjects();
  const folders = useSyncExternalStore(active ? subscribeProjectFolders : unsubscribed, projectFoldersSnapshot, projectFoldersSnapshot);
  const cases = useSyncExternalStore(active ? subscribeAnalysisCases : unsubscribed, analysisCasesSnapshot, analysisCasesSnapshot);
  return useMemo(() => projectPickerRowsOf(projects ?? [], folders ?? [], cases ?? []), [projects, folders, cases]);
};
