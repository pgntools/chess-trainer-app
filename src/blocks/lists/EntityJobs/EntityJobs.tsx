import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { useTranslation } from "react-i18next";

import { linkProps, type LinkTarget } from "../../../design-system/components/link";
import { LoadingLine } from "../../../design-system/components/states";
import { JobProgressBar, JobStamp, JobStatusText, type JobRowView } from "../../tables";

export type EntityJobsProps = {
  /** The entity's jobs, newest first; `undefined` while the queue is read. */
  jobs: readonly JobRowView[] | undefined;
  /** A job's own page (`/jobs/<id>`). */
  jobLink: (job: JobRowView) => LinkTarget;
  /** Open New job for the entity. */
  onNewJob: () => void;
  /** New job's words where the entity has one kind to offer ("Evaluate with engine…") — absent, "New job". */
  newJobLabel?: string;
  /** The list's name for a screen reader ("This Case's jobs"). */
  label: string;
  /** The words for none ("No jobs for this Case yet."). */
  emptyText: string;
  /** The root; New job is `-new`, each job `-job-<id>` (its link `-link`, kind `-kind`, status `-status`, progress `-progress`), none `-empty`. */
  testId: string;
};

/**
 * **One entity's jobs** (CTA-221, replacing Jobs V2's `CaseJobs`) — a Case's
 * Jobs tab, or any screen's: **New job**, then each job whose subjects
 * include the entity, newest first — its title (a link to its page), its
 * kind and when it was created, its status in words and its progress
 * ("12 of 80 · 7. Nf3"). None: a line saying so.
 *
 * Presentational over `JobRowView` (the generic Jobs blocks' view model);
 * the screen reads the runtime. Its words are `jobs.*`.
 */
function EntityJobs({ jobs, jobLink, onNewJob, newJobLabel, label, emptyText, testId }: EntityJobsProps) {
  const { t } = useTranslation();

  return (
    <Box data-testid={testId} sx={{ display: "grid", gap: 1.5, px: 1 }}>
      <Box>
        <Button size="small" variant="outlined" startIcon={<AddRoundedIcon />} onClick={onNewJob} data-testid={`${testId}-new`}>
          {newJobLabel ?? t("jobs.newJob.title")}
        </Button>
      </Box>
      {jobs === undefined ? (
        <LoadingLine testId={`${testId}-loading`}>{t("jobs.queue.loading")}</LoadingLine>
      ) : jobs.length === 0 ? (
        <Typography variant="body2" data-testid={`${testId}-empty`} sx={{ color: "text.secondary" }}>
          {emptyText}
        </Typography>
      ) : (
        <Box component="ul" aria-label={label} sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1.5 }}>
          {jobs.map((job) => {
            const id = `${testId}-job-${job.id}`;
            return (
              <Box component="li" key={job.id} data-testid={id} sx={{ display: "grid", gap: 0.5, minWidth: 0 }}>
                <Link {...(linkProps(jobLink(job)) as Record<string, unknown>)} underline="hover" dir="auto" data-testid={`${id}-link`} sx={{ overflowWrap: "anywhere" }}>
                  {job.title}
                </Link>
                <Typography variant="caption" data-testid={`${id}-kind`} sx={{ color: "text.secondary" }}>
                  <bdi dir="auto">{job.kindLabel}</bdi>{" · "}
                  <JobStamp value={job.createdAt} />
                </Typography>
                <JobStatusText status={job.status} testId={`${id}-status`} />
                <JobProgressBar title={job.title} status={job.status} progress={job.progress} testId={`${id}-progress`} />
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

export default EntityJobs;
