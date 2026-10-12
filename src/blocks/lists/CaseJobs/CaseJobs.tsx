import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { useTranslation } from "react-i18next";

import { linkProps, type LinkTarget } from "../../../design-system/components/link";
import { LoadingLine, ProgressLine } from "../../../design-system/components/states";
import { tableDate } from "../../../design-system/components/tables";
import { jobMoveLabel, jobProgress } from "../../../lib/jobs";
import type { JobV2 } from "../../../lib/jobsV2";
import { JOB_STATUS_TONES } from "../../tables";

export type CaseJobsProps = {
  /** The Case's Jobs V2, newest first; `undefined` while the store is read. */
  jobs: readonly JobV2[] | undefined;
  /** A job on the Jobs V2 view (`/analysis/jobs?job=<id>`). */
  jobLink: (job: JobV2) => LinkTarget;
  /** Open the New Job V2 popup for the Case on the board. */
  onNewJob: () => void;
  /** The root; New job is `-new`, each job `-job-<id>` (its link `-job-<id>-link`, its status `-job-<id>-status`), none `-empty`. */
  testId: string;
};

/** When a job was asked for, as the tables write a date and a time. */
const askedAt = (job: JobV2): string => {
  const day = tableDate(job.createdAt);
  return day === undefined ? "" : `${day.text} ${new Date(job.createdAt).toTimeString().slice(0, 5)}`;
};

/**
 * **A Case's jobs** (CTA-188) — the Case view's Jobs tab (`CaseDetails`):
 * **New job**, which opens the New Job V2 popup for the Case on the board,
 * then each of the Case's Jobs V2, newest first — when it was asked for and
 * where its results go (a link to it on the Jobs V2 view), its status in
 * words and its progress ("12 of 80 positions · 7. Nf3"). None: a line
 * saying so.
 *
 * Presentational: the jobs, their links and New job are props; the screen
 * reads the store. Its words are `analysisV2.jobs.*` and the status's `jobs.*`.
 */
function CaseJobs({ jobs, jobLink, onNewJob, testId }: CaseJobsProps) {
  const { t } = useTranslation();

  return (
    <Box data-testid={testId} sx={{ display: "grid", gap: 1.5, px: 1 }}>
      <Box>
        <Button size="small" variant="outlined" startIcon={<AddRoundedIcon />} onClick={onNewJob} data-testid={`${testId}-new`}>
          {t("analysisV2.jobs.newJob")}
        </Button>
      </Box>
      {jobs === undefined ? (
        <LoadingLine testId={`${testId}-loading`}>{t("analysisV2.jobs.loading")}</LoadingLine>
      ) : jobs.length === 0 ? (
        <Typography variant="body2" data-testid={`${testId}-empty`} sx={{ color: "text.secondary" }}>
          {t("analysisV2.jobs.caseNone")}
        </Typography>
      ) : (
        <Box component="ul" aria-label={t("analysisV2.jobs.caseList")} sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1.5 }}>
          {jobs.map((job) => {
            const progress = jobProgress(job);
            const move = job.status === "done" || progress.current === undefined ? undefined : jobMoveLabel(progress.current);
            const name = t("analysisV2.jobs.caseJob", {
              date: askedAt(job),
              target: t(`analysisV2.jobs.targets.${job.target.kind}`),
            });
            return (
              <Box component="li" key={job.id} data-testid={`${testId}-job-${job.id}`} sx={{ display: "grid", gap: 0.5 }}>
                <Link {...(linkProps(jobLink(job)) as Record<string, unknown>)} underline="hover" data-testid={`${testId}-job-${job.id}-link`}>
                  {name}
                </Link>
                <Typography
                  variant="body2"
                  data-testid={`${testId}-job-${job.id}-status`}
                  sx={{ color: JOB_STATUS_TONES[job.status], fontWeight: 600 }}
                >
                  {t(`jobs.status.${job.status}`)}
                </Typography>
                <ProgressLine
                  value={progress.percent}
                  label={t("jobs.table.progressOf", { name })}
                  caption={
                    <>
                      {t("jobs.progress", { done: progress.done, total: progress.total })}
                      {move !== undefined && (
                        <>
                          {" · "}
                          <bdi dir="ltr">{move}</bdi>
                        </>
                      )}
                    </>
                  }
                  testId={`${testId}-job-${job.id}-progress`}
                />
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

export default CaseJobs;
