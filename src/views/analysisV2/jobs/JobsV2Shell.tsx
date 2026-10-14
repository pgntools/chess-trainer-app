import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { Link as RouterLink, useHref, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

import { useEnginePulse } from "../../../blocks/panels";
import { visuallyHidden } from "../../../design-system/components/a11y";
import { useSnackbar } from "../../../design-system/components/feedback";
import { IconAction } from "../../../design-system/components/toolbars";
import { formatEngineCount } from "../../../lib/engineAnalysis";
import { jobProgress, type JobStatus, type JobV2 } from "../../../lib/jobsV2";
import { startJobV2Runner } from "../../../lib/jobV2Runner";
import { subscribeEvalSourceUnreachable } from "../../../lib/evalSources";
import { jobsV2Path } from "../paths";
import { useJobsV2 } from "../useAnalysisProjects";
import { liveOfJob, useJobV2Live } from "./useJobV2Live";

/*
  **Jobs V2 in the app shell** (CTA-188; the app's one job runner since
  CTA-192 removed the legacy Jobs) — what `views/main/Layout.tsx` mounts: the
  runner, and the header's indicator.
*/

/**
 * **The Jobs V2 runner, mounted once** — started from an effect (never during
 * render, so the pre-render starts none) and never stopped by one: a
 * StrictMode remount must not leave a job half run. It draws nothing — but
 * for **a warning when an eval source** (CTA-193's lichess evaluation API,
 * `lib/evalSources/` since CTA-196) **did not answer** during a job's run
 * (once per run — the job goes on with the engine), or **did not take the
 * engine's evals** (writing on — the job goes on without sending them), naming
 * the source, whose button opens Settings → Engine, where it is turned off.
 */
export function JobV2Runner() {
  const { t } = useTranslation();
  const { show } = useSnackbar();
  const navigate = useNavigate();
  const base = useHref("/");
  useEffect(() => {
    startJobV2Runner();
  }, []);
  useEffect(
    () =>
      subscribeEvalSourceUnreachable(({ name, kind, source }) => {
        const path = ENGINE_SETTINGS_PATH;
        show({
          severity: "warning",
          duration: 10_000,
          testId: "analysis-v2-jobs-eval-api-unreachable",
          message: t(kind === "write" ? "evalSources.writeRefused" : "evalSources.unreachable", {
            source: t(source.labelKey),
            name: name || t("jobs.untitled"),
          }),
          action: {
            label: t("evalSources.open"),
            onClick: () => navigate(path),
            href: base === "/" ? path : `${base}${path}`,
            testId: "analysis-v2-jobs-eval-api-settings",
          },
        });
      }),
    [base, navigate, show, t],
  );
  return null;
}

/** Settings → Engine — where the eval sources are turned off. */
const ENGINE_SETTINGS_PATH = "/settings/engine";

const ANNOUNCED: Partial<Record<JobStatus, "started" | "paused" | "done" | "failed" | "cancelled">> = {
  running: "started",
  paused: "paused",
  done: "done",
  failed: "failed",
  cancelled: "cancelled",
};

const statusesOf = (jobs: readonly JobV2[]): ReadonlyMap<string, JobStatus> => new Map(jobs.map((job) => [job.id, job.status]));

/**
 * **The shell's Jobs V2 indicator** (CTA-173, CTA-188): while a
 * Jobs V2 job runs, a link to the Jobs V2 view with its progress ("Jobs V2
 * 12/80", the Case's name after it out of sight), or the count queued; an
 * icon alone under the breakpoint, named in full; nothing while none runs or
 * waits. **Announced politely, only when a job starts or ends** — never the
 * progress, nothing for the first read of the store.
 *
 * **While the engine reports on the running job's position** (CTA-190,
 * `useJobV2Live` — this tab's runner or another's), its spinner **beats once
 * each time the engine is heard** — an `info` line or, through a long quiet
 * stretch deep in a search, an engine server's heartbeat (CTA-194,
 * `useEnginePulse`): an opacity beat timed by the theme's
 * `transitions.duration.complex`, which the theme makes 0 under
 * `prefers-reduced-motion` — then it stays still; and the live numbers join
 * its name ("Jobs V2 12/80, Alice – Bob, depth 22, 3.1M nodes"), never
 * announced.
 */
export function JobsV2Indicator({ compact }: { compact: boolean }) {
  const { t } = useTranslation();
  const jobs = useJobsV2();
  const liveSnapshot = useJobV2Live();
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
  const live = liveOfJob(liveSnapshot, running);
  const liveWords =
    live === undefined
      ? ""
      : [
          t("analysisV2.jobs.indicator.liveDepth", { depth: live.depth }),
          ...(live.nodes === undefined ? [] : [t("analysisV2.jobs.indicator.liveNodes", { nodes: formatEngineCount(live.nodes) })]),
        ]
          .map((part) => `, ${part}`)
          .join("");
  const label =
    running !== undefined && progress !== undefined
      ? `${t("analysisV2.jobs.indicator.label", { name: running.source.name || t("jobs.untitled"), done: progress.done, total: progress.total })}${liveWords}`
      : t("analysisV2.jobs.indicator.labelQueued", { count: queued });
  const shown =
    progress !== undefined
      ? t("analysisV2.jobs.indicator.running", { done: progress.done, total: progress.total })
      : t("analysisV2.jobs.indicator.queued", { count: queued });
  const pulse = useEnginePulse(live?.heardAt);
  const spinner = (
    <Box
      component="span"
      aria-hidden="true"
      data-testid="analysis-v2-jobs-indicator-heartbeat"
      data-live={live !== undefined}
      data-beating={pulse.beating}
      data-pulse={pulse.pulse}
      // Under reduced motion the theme's durations are 0: no animation, the spinner stays still.
      sx={{ display: "inline-flex", animation: pulse.animation }}
    >
      <CircularProgress size={14} variant={progress === undefined ? "indeterminate" : "determinate"} value={progress?.percent} />
    </Box>
  );

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
                {`, ${running.source.name || t("jobs.untitled")}${liveWords}`}
              </Box>
            )}
          </Button>
        ))}
    </>
  );
}
