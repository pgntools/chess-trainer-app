import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Link as RouterLink, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import { JobSummary } from "../../blocks/panels";
import { JobsTable } from "../../blocks/tables";
import { ConfirmDialog } from "../../design-system/components/dialogs";
import { EmptyState } from "../../design-system/components/states";
import { ListScreenHeader } from "../../design-system/components/toolbars";
import { analysisBoardPath } from "../../lib/analysesListContext";
import type { Job } from "../../lib/jobs";
import { cancelJob, pauseJob, removeJob, resumeJob } from "../../lib/jobStore";
import { useOwnPageHeading } from "../main/pageTitle";
import { RightPanel } from "../main/rightPanel";
import JobLiveReport from "./JobLiveReport";
import JobReport from "./JobReport";
import { useJobs } from "./useJobs";

/** The parameter naming the job whose details are open. */
const JOB_PARAM = "job";

/**
 * **The Jobs screen** (`/jobs`, CTA-173) — the background jobs, a game's
 * computer analysis each (CTA-171), run app-wide by `lib/jobRunner.ts`:
 *
 * - **The square: the list** (`JobsTable`), newest first — each job's game,
 *   status, progress (the move being searched), its times, and Resume /
 *   Pause / Cancel / Delete. A row's game opens its details: `?job=<id>`, written
 *   with history replace, so a link names the job.
 * - **The panel: one job** (`JobSummary`) — every option it was given, the
 *   engine that ran it, a link to the game it came from and to each Saved
 *   analysis it made, why it failed, and a finished job's **report and eval
 *   graph** (`JobReport`, read back from its first output) — or, for a job not
 *   done, **its results so far** (`JobLiveReport`, CTA-178: the graph filling
 *   in, the latest position's eval and line, the report over the moves judged).
 *
 * Pause, Cancel, Resume and Delete are store writes (`lib/jobStore.ts`);
 * the runner, in whichever tab holds it, acts on them. Delete asks first, and
 * keeps the analyses the job saved. The rules are `.claude/rules/jobs.md`.
 */
function JobsScreen() {
  // The list header's title is the page's `h1` (CTA-112).
  useOwnPageHeading();
  const { t } = useTranslation();
  const jobs = useJobs();
  const [searchParams] = useSearchParams();
  const selectedId = searchParams.get(JOB_PARAM);
  const selected = selectedId === null ? undefined : jobs?.find((job) => job.id === selectedId);
  const [deleting, setDeleting] = useState<Job | undefined>();
  const nameOf = (job: Job) => job.source.name || t("jobs.untitled");

  const linkTo = (job: Job) => ({ component: RouterLink, to: `/jobs?${JOB_PARAM}=${encodeURIComponent(job.id)}`, replace: true });

  return (
    <>
      <Box data-testid="jobs-screen" sx={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <ListScreenHeader
          title={t("jobs.title")}
          count={<span data-testid="jobs-count">{jobs === undefined ? "" : t("jobs.count", { count: jobs.length })}</span>}
          testId="jobs-header"
        >
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("jobs.intro")}
          </Typography>
        </ListScreenHeader>
        <JobsTable
          rows={jobs ?? []}
          loading={jobs === undefined}
          rowLink={linkTo}
          selectedId={selectedId}
          onCancel={(job) => void cancelJob(job.id)}
          onPause={(job) => void pauseJob(job.id)}
          onResume={(job) => void resumeJob(job.id)}
          onDelete={setDeleting}
          testId="jobs-table"
        />
      </Box>

      <RightPanel>
        {/* The aside does not scroll; the panel is its own scrolling column. */}
        <Box data-testid="jobs-panel" sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          {selected !== undefined ? (
            <JobSummary
              job={selected}
              sourceLink={
                selected.source.analysisId === null
                  ? undefined
                  : { component: RouterLink, to: analysisBoardPath(selected.source.analysisId) }
              }
              outputLink={(output) => ({ component: RouterLink, to: analysisBoardPath(output.analysisId) })}
              onCancel={() => void cancelJob(selected.id)}
              onPause={() => void pauseJob(selected.id)}
              onResume={() => void resumeJob(selected.id)}
              onDelete={() => setDeleting(selected)}
              testId="jobs-summary"
            >
              {selected.status === "done" ? (
                <JobReport job={selected} testId="jobs-report" />
              ) : (
                <JobLiveReport job={selected} testId="jobs-live" />
              )}
            </JobSummary>
          ) : (
            <EmptyState testId="jobs-none-selected">
              {selectedId !== null && jobs !== undefined ? t("jobs.missing") : t("jobs.noneSelected")}
            </EmptyState>
          )}
        </Box>
      </RightPanel>

      <ConfirmDialog
        open={deleting !== undefined}
        onClose={() => setDeleting(undefined)}
        onConfirm={() => {
          if (deleting !== undefined) void removeJob(deleting.id);
          setDeleting(undefined);
        }}
        title={t("jobs.confirmDelete.title")}
        message={deleting === undefined ? undefined : t("jobs.confirmDelete.body", { name: nameOf(deleting) })}
        confirmLabel={t("jobs.confirmDelete.confirm")}
        cancelLabel={t("jobs.confirmDelete.cancel")}
        tone="destructive"
        testId="jobs-delete-dialog"
      />
    </>
  );
}

export default JobsScreen;
