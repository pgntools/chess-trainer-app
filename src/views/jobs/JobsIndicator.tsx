import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { Link as RouterLink } from "react-router";
import { useTranslation } from "react-i18next";

import { visuallyHidden } from "../../design-system/components/a11y";
import { IconAction } from "../../design-system/components/toolbars";
import { jobProgress, type Job, type JobStatus } from "../../lib/jobs";
import { useJobs } from "./useJobs";

/** The statuses a reader is told a job reached — not every position, only these. */
const ANNOUNCED: Partial<Record<JobStatus, "started" | "done" | "failed" | "cancelled">> = {
  running: "started",
  done: "done",
  failed: "failed",
  cancelled: "cancelled",
};

const statusesOf = (jobs: readonly Job[]): ReadonlyMap<string, JobStatus> => new Map(jobs.map((job) => [job.id, job.status]));

/**
 * **The shell's jobs indicator** (CTA-173), in the header: while a job runs,
 * a link to the Jobs screen with its progress ("Analysing 12/80", the job's
 * name after it out of sight), or the count queued. Under the shell's
 * breakpoint it is an icon alone, named in full ("Jobs: Alice – Bob, 12 of
 * 80 positions") and that name its tooltip. Nothing at all while no job is running or queued.
 *
 * **Announced politely, and only when a job starts or ends** — a `status`
 * region of its own holding the last such change ("Computer analysis
 * finished: Alice – Bob."), never the progress, which would be read out on
 * every position. The first read of the store announces nothing: a reload is
 * not news.
 */
export function JobsIndicator({ compact }: { compact: boolean }) {
  const { t } = useTranslation();
  const jobs = useJobs();
  const [seen, setSeen] = useState<{ jobs: readonly Job[]; statuses: ReadonlyMap<string, JobStatus> } | undefined>();
  const [message, setMessage] = useState("");

  /*
    What changed since the list last seen, adjusted during render against
    it (an effect would set state in an effect, which
    `react-hooks/set-state-in-effect` rejects).
  */
  if (jobs !== undefined && seen?.jobs !== jobs) {
    if (seen !== undefined) {
      for (const job of jobs) {
        const reached = ANNOUNCED[job.status];
        if (reached !== undefined && seen.statuses.get(job.id) !== job.status) {
          setMessage(t(`jobs.indicator.${reached}`, { name: job.source.name || t("jobs.untitled") }));
        }
      }
    }
    setSeen({ jobs, statuses: statusesOf(jobs) });
  }

  const running = jobs?.find((job) => job.status === "running");
  const queued = jobs?.filter((job) => job.status === "queued").length ?? 0;
  const progress = running === undefined ? undefined : jobProgress(running);

  const label =
    running !== undefined && progress !== undefined
      ? t("jobs.indicator.label", { name: running.source.name || t("jobs.untitled"), done: progress.done, total: progress.total })
      : t("jobs.indicator.labelQueued", { count: queued });
  const shown =
    progress !== undefined ? t("jobs.indicator.running", { done: progress.done, total: progress.total }) : t("jobs.indicator.queued", { count: queued });
  const spinner = <CircularProgress size={14} aria-hidden="true" variant={progress === undefined ? "indeterminate" : "determinate"} value={progress?.percent} />;

  return (
    <>
      <Box role="status" data-testid="jobs-indicator-status" sx={visuallyHidden}>
        {message}
      </Box>
      {(running !== undefined || queued > 0) &&
        (compact ? (
          <IconAction label={label} link={{ component: RouterLink, to: "/jobs" }} testId="jobs-indicator">
            {spinner}
          </IconAction>
        ) : (
          <Button
            component={RouterLink}
            to="/jobs"
            size="small"
            variant="text"
            startIcon={spinner}
            data-testid="jobs-indicator"
            sx={{ whiteSpace: "nowrap" }}
          >
            {shown}
            {/* The visible words first, then the job's name for a screen reader — the name holds the label (WCAG 2.5.3). */}
            {running !== undefined && (
              <Box component="span" sx={visuallyHidden}>
                {`, ${running.source.name || t("jobs.untitled")}`}
              </Box>
            )}
          </Button>
        ))}
    </>
  );
}
