import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { Link as RouterLink } from "react-router";
import { useTranslation } from "react-i18next";

import { visuallyHidden } from "../../../design-system/components/a11y";
import { IconAction } from "../../../design-system/components/toolbars";
import { jobProgress, type JobStatus } from "../../../lib/jobs";
import type { JobV2 } from "../../../lib/jobsV2";
import { startJobV2Runner } from "../../../lib/jobV2Runner";
import { jobsV2Path } from "../paths";
import { useJobsV2 } from "../useAnalysisProjects";

/*
  **Jobs V2 in the app shell** (CTA-188, dev-only) — what `views/main/Layout.tsx`
  loads lazily under `import.meta.env.DEV` (a production build has neither the
  chunk nor the code): the runner, mounted beside V1's, and the header's
  indicator, beside V1's `JobsIndicator`, which stays untouched.
*/

/**
 * **The Jobs V2 runner, mounted once** — started from an effect (never during
 * render, so the pre-render starts none) and never stopped by one: a
 * StrictMode remount must not leave a job half run. It draws nothing.
 */
export function JobV2Runner() {
  useEffect(() => {
    startJobV2Runner();
  }, []);
  return null;
}

const ANNOUNCED: Partial<Record<JobStatus, "started" | "paused" | "done" | "failed" | "cancelled">> = {
  running: "started",
  paused: "paused",
  done: "done",
  failed: "failed",
  cancelled: "cancelled",
};

const statusesOf = (jobs: readonly JobV2[]): ReadonlyMap<string, JobStatus> => new Map(jobs.map((job) => [job.id, job.status]));

/**
 * **The shell's Jobs V2 indicator** — V1's `JobsIndicator`, cloned: while a
 * Jobs V2 job runs, a link to the Jobs V2 view with its progress ("Jobs V2
 * 12/80", the Case's name after it out of sight), or the count queued; an
 * icon alone under the breakpoint, named in full; nothing while none runs or
 * waits. **Announced politely, only when a job starts or ends** — never the
 * progress, nothing for the first read of the store.
 */
export function JobsV2Indicator({ compact }: { compact: boolean }) {
  const { t } = useTranslation();
  const jobs = useJobsV2();
  const [seen, setSeen] = useState<{ jobs: readonly JobV2[]; statuses: ReadonlyMap<string, JobStatus> } | undefined>();
  const [message, setMessage] = useState("");

  // What changed since the list last seen, adjusted during render (`react-hooks/set-state-in-effect`).
  if (jobs !== undefined && seen?.jobs !== jobs) {
    if (seen !== undefined) {
      for (const job of jobs) {
        const reached = ANNOUNCED[job.status];
        if (reached !== undefined && seen.statuses.get(job.id) !== job.status) {
          setMessage(t(`analysisV2.jobs.indicator.${reached}`, { name: job.source.name || t("jobs.untitled") }));
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
      ? t("analysisV2.jobs.indicator.label", { name: running.source.name || t("jobs.untitled"), done: progress.done, total: progress.total })
      : t("analysisV2.jobs.indicator.labelQueued", { count: queued });
  const shown =
    progress !== undefined
      ? t("analysisV2.jobs.indicator.running", { done: progress.done, total: progress.total })
      : t("analysisV2.jobs.indicator.queued", { count: queued });
  const spinner = <CircularProgress size={14} aria-hidden="true" variant={progress === undefined ? "indeterminate" : "determinate"} value={progress?.percent} />;

  return (
    <>
      <Box role="status" data-testid="analysis-v2-jobs-indicator-status" sx={visuallyHidden}>
        {message}
      </Box>
      {(running !== undefined || queued > 0) &&
        (compact ? (
          <IconAction label={label} link={{ component: RouterLink, to: jobsV2Path() }} testId="analysis-v2-jobs-indicator">
            {spinner}
          </IconAction>
        ) : (
          <Button
            component={RouterLink}
            to={jobsV2Path()}
            size="small"
            variant="text"
            startIcon={spinner}
            data-testid="analysis-v2-jobs-indicator"
            sx={{ whiteSpace: "nowrap" }}
          >
            {shown}
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
