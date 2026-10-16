import { useEffect, useMemo } from "react";
import { Link as RouterLink, useHref, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

import { JobsIndicatorView, useJobStatusAnnouncement } from "../../blocks/panels";
import { useSnackbar } from "../../design-system/components/feedback";
import { subscribeEvalSourceUnreachable } from "../../lib/evalSources";
import { startJobRuntime } from "../../lib/jobs/runtime";
import { jobTitleOf } from "./jobViews";
import { kindViewsOf } from "./kindViews";
import { JOBS_PATH } from "./paths";
import { useJobLiveOf, useJobRecords } from "./useJobs";

/*
  **The Jobs module in the app shell** (CTA-221) — what `views/main/Layout.tsx`
  mounts: the runtime's start, and the header's indicator.
*/

/** Settings → Engine — where the eval sources are turned off. */
const ENGINE_SETTINGS_PATH = "/settings/engine";

/**
 * **The page's job runtime, started once** — from an effect (never during
 * render, so the pre-render starts none) and never stopped by one: a
 * StrictMode remount must not leave a job half run. It draws nothing but
 * **a warning when an eval source** (CTA-193, CTA-196) **did not answer** an
 * engine job's lookup, or **did not take its evals** (writing on) — once per
 * run, the job going on with the engine — naming the source, whose button
 * opens Settings → Engine, where it is turned off.
 */
export function JobRuntimeStarter() {
  const { t } = useTranslation();
  const { show } = useSnackbar();
  const navigate = useNavigate();
  const base = useHref("/");
  useEffect(() => {
    startJobRuntime();
  }, []);
  useEffect(
    () =>
      subscribeEvalSourceUnreachable(({ name, kind, source }) => {
        // Settings → Engine, on the source's own tab.
        const path = `${ENGINE_SETTINGS_PATH}?source=${encodeURIComponent(source.id)}`;
        show({
          severity: "warning",
          duration: 10_000,
          testId: "jobs-eval-source-unreachable",
          message: t(kind === "write" ? "evalSources.writeRefused" : "evalSources.unreachable", {
            source: t(source.labelKey),
            name: name || t("jobs.untitled"),
          }),
          action: {
            label: t("evalSources.open"),
            onClick: () => navigate(path),
            href: base === "/" ? path : `${base}${path}`,
            testId: "jobs-eval-source-settings",
          },
        });
      }),
    [base, navigate, show, t],
  );
  return null;
}

/**
 * **The shell's Jobs indicator** (CTA-221, generic over every kind — Jobs
 * V2's of CTA-173, CTA-188 before): while a job runs, a link to `/jobs` with
 * its progress ("Jobs 12/80", its title out of sight), or the count queued;
 * an icon alone under the breakpoint, named in full; nothing while none runs
 * or waits (`JobsIndicatorView`). **Announced politely, only on a change of
 * status** (`useJobStatusAnnouncement`) — never the progress, nothing for the
 * first read. While an engine kind's engine reports, its spinner **beats**
 * each time the engine is heard (CTA-190, CTA-194) and the live numbers join
 * its name, never announced — the kind's `liveSummary`.
 */
export function JobsIndicator({ compact }: { compact: boolean }) {
  const { t } = useTranslation();
  const jobs = useJobRecords();
  const announced = useMemo(() => jobs?.map((job) => ({ id: job.id, title: jobTitleOf(t, job), status: job.status })), [jobs, t]);
  const announcement = useJobStatusAnnouncement(announced);
  const running = useMemo(
    () => jobs?.filter((job) => job.status === "running").sort((a, b) => (b.startedAt ?? "").localeCompare(a.startedAt ?? ""))[0],
    [jobs],
  );
  const queued = jobs?.filter((job) => job.status === "queued").length ?? 0;
  const live = useJobLiveOf(running?.id ?? "");
  const summary = running === undefined || live === undefined ? undefined : kindViewsOf(running.kind).liveSummary?.(live, t);
  return (
    <JobsIndicatorView
      running={running === undefined ? undefined : { title: jobTitleOf(t, running), progress: running.progress }}
      queuedCount={queued}
      link={{ component: RouterLink, to: JOBS_PATH }}
      compact={compact}
      heardAt={summary?.heardAt}
      liveWords={summary?.words}
      announcement={announcement}
      testId="jobs-indicator"
    />
  );
}
