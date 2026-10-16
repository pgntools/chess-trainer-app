import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { linkProps } from "../../../design-system/components/link";
import { ProgressLine } from "../../../design-system/components/states";
import { JOB_STATUS_TONES } from "../JobsTable/jobStatusTones";
import { jobPercent, jobStampText, type JobProgressView, type JobSubjectView, type JobViewStatus } from "./jobView";

/*
  The parts every generic Jobs block draws a job with (CTA-217): its
  status in words, its progress bar, its subjects and a time.
*/

/** A job's status in words, in its tone — the colour only repeats the words. */
export function JobStatusText({ status, testId }: { status: JobViewStatus; testId: string }) {
  const { t } = useTranslation();
  return (
    <Typography component="span" variant="body2" data-testid={testId} sx={{ color: JOB_STATUS_TONES[status], fontWeight: 600 }}>
      {t(`jobs.status.${status}`)}
    </Typography>
  );
}

/** A job's progress: a determinate bar named for the job, "12 of 80 · 7. Nf3" under it. */
export function JobProgressBar({
  title,
  status,
  progress,
  testId,
}: {
  title: string;
  status: JobViewStatus;
  progress: JobProgressView;
  testId: string;
}) {
  const { t } = useTranslation();
  return (
    <ProgressLine
      value={jobPercent(status, progress)}
      label={t("jobs.queue.progressOf", { name: title })}
      caption={
        <>
          {progress.total > 0 ? t("jobs.queue.progress", { done: progress.done, total: progress.total }) : t("jobs.queue.notPlanned")}
          {progress.label !== undefined && progress.label !== "" && status !== "done" && (
            <>
              {" · "}
              <bdi dir="auto">{progress.label}</bdi>
            </>
          )}
        </>
      }
      testId={testId}
    />
  );
}

/** What a job is applied to: each subject a link, one deleted since muted and said; none, a dash. */
export function JobSubjects({ subjects, testId }: { subjects: readonly JobSubjectView[]; testId: string }) {
  const { t } = useTranslation();
  if (subjects.length === 0) return <span data-testid={testId}>–</span>;
  return (
    <Box
      component="ul"
      data-testid={testId}
      sx={{ listStyle: "none", m: 0, p: 0, display: "inline-flex", flexWrap: "wrap", columnGap: 1, rowGap: 0.25 }}
    >
      {subjects.map((subject, index) => (
        <Box component="li" key={`${index}-${subject.label}`} sx={{ minWidth: 0 }}>
          {subject.deleted === true ? (
            <Typography component="span" variant="body2" data-testid={`${testId}-${index}`} sx={{ color: "text.secondary" }}>
              <bdi dir="auto">{subject.label}</bdi> {t("jobs.subjects.deleted")}
            </Typography>
          ) : subject.link === undefined ? (
            <Typography component="span" variant="body2" dir="auto" data-testid={`${testId}-${index}`}>
              {subject.label}
            </Typography>
          ) : (
            <Link {...(linkProps(subject.link) as Record<string, unknown>)} variant="body2" underline="hover" dir="auto" data-testid={`${testId}-${index}`}>
              {subject.label}
            </Link>
          )}
        </Box>
      ))}
    </Box>
  );
}

/** A time, as the tables write it ("2026-10-10 14:05"); unreadable or absent, a dash. */
export function JobStamp({ value }: { value: string | undefined }) {
  const text = value === undefined ? undefined : jobStampText(value);
  if (value === undefined || text === undefined) return <>–</>;
  return (
    <time dir="ltr" dateTime={value}>
      {text}
    </time>
  );
}
