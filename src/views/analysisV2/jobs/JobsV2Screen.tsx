import { useState } from "react";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { Link as RouterLink, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import { JobSummary } from "../../../blocks/panels";
import { JobsTable } from "../../../blocks/tables";
import { ConfirmDialog } from "../../../design-system/components/dialogs";
import { EmptyState } from "../../../design-system/components/states";
import { ListScreenHeader } from "../../../design-system/components/toolbars";
import type { JobV2 } from "../../../lib/jobsV2";
import { cancelJobV2, pauseJobV2, removeJobV2, resumeJobV2 } from "../../../lib/jobV2Store";
import { useOwnPageHeading } from "../../main/pageTitle";
import { RightPanel } from "../../main/rightPanel";
import { casePath, jobsV2Path, projectPath } from "../paths";
import { useAnalysisCases, useAnalysisProjects, useJobsV2 } from "../useAnalysisProjects";
import { JobV2LiveReport, JobV2Report } from "./JobV2Reports";

/**
 * **The Jobs V2 view** (`/analysis/jobs`, CTA-188, dev-only) — Analysis V2's
 * background jobs, a Case's computer analysis each, run by `lib/jobV2Runner.ts`;
 * V1's Jobs screen (`views/jobs/JobsScreen.tsx`, `/jobs`) cloned, not shared:
 *
 * - **The square: the list** (`JobsTable`, over Jobs V2), newest first — each
 *   job's Case, status, progress and times, and Resume / Pause / Cancel /
 *   Delete; a row opens its details (`?job=<id>`, history replace).
 * - **The panel: one job** (`JobSummary`) — its status and progress, why it
 *   failed, a link to its source Case and to its results (the new Cases, the
 *   linked Project, or the source Case merged into), every option it was given
 *   with **the engine and the preset**, where the results go; a finished
 *   job's **report and eval graph** (`JobV2Report`), another's **results so
 *   far** (`JobV2LiveReport`).
 *
 * Pause, Cancel, Resume and Delete are store writes; the runner acts on them.
 * Delete asks first and keeps the job's results.
 */
function JobsV2Screen() {
  useOwnPageHeading();
  const { t } = useTranslation();
  const jobs = useJobsV2();
  const projects = useAnalysisProjects();
  const cases = useAnalysisCases();
  const [searchParams] = useSearchParams();
  const selectedId = searchParams.get("job");
  const selected = selectedId === null ? undefined : jobs?.find((job) => job.id === selectedId);
  const [deleting, setDeleting] = useState<JobV2 | undefined>();
  const nameOf = (job: JobV2) => job.source.name || t("jobs.untitled");
  const projectName = (id: string) => {
    const project = projects?.find((candidate) => candidate.id === id);
    return project === undefined ? undefined : project.name || t("analysisV2.project.untitled");
  };
  const caseThere = (projectId: string, caseId: string) =>
    cases?.some((record) => record.id === caseId && record.projectId === projectId) === true;

  const linkTo = (job: JobV2) => ({ component: RouterLink, to: jobsV2Path(job.id), replace: true });

  /** Where its results are, as links: the new Cases, the linked Project, or the source Case merged into. */
  const resultLinks = (job: JobV2) => {
    const items = job.outputs.flatMap((output) =>
      caseThere(output.projectId, output.caseId)
        ? [
            <Link
              key={output.caseId}
              component={RouterLink}
              to={casePath(output.projectId, output.caseId)}
              underline="hover"
              data-testid={`analysis-v2-jobs-summary-output-${output.variant}`}
            >
              {job.target.kind === "case"
                ? t("analysisV2.jobs.openMerged")
                : t("analysisV2.jobs.openCase", { variant: t(`computerAnalysis.variants.${output.variant}`) })}
            </Link>,
          ]
        : [],
    );
    const linked = job.target.kind === "linked" ? projectName(job.target.projectId) : undefined;
    if (job.target.kind === "linked" && linked !== undefined) {
      items.push(
        <Link key="project" component={RouterLink} to={projectPath(job.target.projectId)} underline="hover" data-testid="analysis-v2-jobs-summary-project">
          {t("analysisV2.jobs.openProject", { name: linked })}
        </Link>,
      );
    }
    return items.length === 0 ? undefined : <>{items}</>;
  };

  const targetText = (job: JobV2) =>
    job.target.kind === "case"
      ? t("analysisV2.jobs.targetFacts.case")
      : t(`analysisV2.jobs.targetFacts.${job.target.kind}`, { name: projectName(job.target.projectId) ?? t("analysisV2.jobs.projectGone") });

  return (
    <>
      <Box data-testid="analysis-v2-jobs-screen" sx={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <ListScreenHeader
          title={t("analysisV2.jobs.title")}
          count={<span data-testid="analysis-v2-jobs-count">{jobs === undefined ? "" : t("jobs.count", { count: jobs.length })}</span>}
          testId="analysis-v2-jobs-header"
        >
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("analysisV2.jobs.intro")}
          </Typography>
        </ListScreenHeader>
        <JobsTable<JobV2>
          rows={jobs ?? []}
          loading={jobs === undefined}
          rowLink={linkTo}
          selectedId={selectedId}
          onCancel={(job) => void cancelJobV2(job.id)}
          onPause={(job) => void pauseJobV2(job.id)}
          onResume={(job) => void resumeJobV2(job.id)}
          onDelete={setDeleting}
          testId="analysis-v2-jobs-table"
        />
      </Box>

      <RightPanel>
        <Box data-testid="analysis-v2-jobs-panel" sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          {selected !== undefined ? (
            <JobSummary<JobV2>
              job={selected}
              sourceLink={
                caseThere(selected.source.projectId, selected.source.caseId)
                  ? { component: RouterLink, to: casePath(selected.source.projectId, selected.source.caseId) }
                  : undefined
              }
              sourceLabel={t("analysisV2.jobs.openSource")}
              links={resultLinks(selected)}
              extraFacts={[
                {
                  id: "preset",
                  label: t("analysisV2.jobs.facts.preset"),
                  // As the popup named it — Default in the reader's words then.
                  value: <bdi>{selected.preset.name || selected.preset.id}</bdi>,
                },
                { id: "target", label: t("analysisV2.jobs.facts.target"), value: targetText(selected) },
              ]}
              errorText={selected.error === null ? undefined : t(`analysisV2.jobs.errors.${selected.error}`)}
              onCancel={() => void cancelJobV2(selected.id)}
              onPause={() => void pauseJobV2(selected.id)}
              onResume={() => void resumeJobV2(selected.id)}
              onDelete={() => setDeleting(selected)}
              testId="analysis-v2-jobs-summary"
            >
              {selected.status === "done" ? (
                <JobV2Report job={selected} testId="analysis-v2-jobs-report" />
              ) : (
                <JobV2LiveReport job={selected} testId="analysis-v2-jobs-live" />
              )}
            </JobSummary>
          ) : (
            <EmptyState testId="analysis-v2-jobs-none-selected">
              {selectedId !== null && jobs !== undefined ? t("jobs.missing") : t("jobs.noneSelected")}
            </EmptyState>
          )}
        </Box>
      </RightPanel>

      <ConfirmDialog
        open={deleting !== undefined}
        onClose={() => setDeleting(undefined)}
        onConfirm={() => {
          if (deleting !== undefined) void removeJobV2(deleting.id);
          setDeleting(undefined);
        }}
        title={t("jobs.confirmDelete.title")}
        message={deleting === undefined ? undefined : t("analysisV2.jobs.confirmDelete", { name: nameOf(deleting) })}
        confirmLabel={t("jobs.confirmDelete.confirm")}
        cancelLabel={t("jobs.confirmDelete.cancel")}
        tone="destructive"
        testId="analysis-v2-jobs-delete-dialog"
      />
    </>
  );
}

export default JobsV2Screen;
