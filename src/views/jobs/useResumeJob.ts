import { createElement, useState, type ReactNode } from "react";
import { useHref, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import type { JobRecord } from "@pgntools/jobs-runtime";

import { JobSettingsChangedDialog } from "../../blocks/dialogs";
import { useSnackbar } from "../../design-system/components/feedback";
import { getEngine } from "../../lib/engines";
import { continueWithCurrentSettings, resumeChangesOf } from "../../lib/jobs/continueJob";
import { currentJobEngineSettings, type JobEngineChange } from "../../lib/jobs/engineJobSettings";
import { jobRuntime } from "../../lib/jobs/runtime";
import { useEngineSearchSettings } from "../shared/useEngineSearchSettings";
import { jobTitleOf } from "./jobViews";
import { useEngineJobChoice } from "./kinds/useEngineJobChoice";
import { jobPath } from "./paths";

/** The statuses Resume takes a job from — the runtime's. */
const RESUMABLE = new Set<JobRecord["status"]>(["paused", "interrupted", "failed"]);

/**
 * **Resume, asking first when the settings changed** (CTA-236) — the Jobs
 * screens' Resume (`/jobs`' rows, `/jobs/<id>`): an engine job is compared
 * with what a new job of its kind would be given now (`resumeChangesOf` —
 * the Jobs default engine and preset, else the board's engine and its
 * selected preset; the preset's depth and move time; the Engine menu's
 * Threads and Hash — `useEngineJobChoice`'s seed, as the New-job forms are
 * seeded). The same, or a kind not compared: it resumes at once. Different:
 * the `JobSettingsChangedDialog` — **Continue with the job's settings**
 * (`runtime.resume`), **Continue with current settings**
 * (`continueWithCurrentSettings`: a new job, its results so far carried
 * over, then the old one removed — a refusal said in the dialog, the job
 * left as it was; queued, a snackbar's **Open job** and `onContinued` with
 * the new id), or Cancel.
 *
 * `resume(job)`; render `dialog` once.
 */
export const useResumeJob = (testId: string, onContinued?: (id: string) => void): { resume: (job: JobRecord) => void; dialog: ReactNode } => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const base = useHref("/");
  const { show } = useSnackbar();
  const choice = useEngineJobChoice("");
  const { settings } = useEngineSearchSettings();
  const [asking, setAsking] = useState<{ job: JobRecord; changes: readonly JobEngineChange[] } | undefined>();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | undefined>();

  /** What a new engine job would be given now — read at the click, as the New-job forms are seeded at their opening. */
  const current = () => {
    const seed = choice.seed();
    return currentJobEngineSettings({
      engine: seed.engineId,
      preset: choice.jobPreset(seed.presetId),
      search: seed.search,
      threads: settings.threads,
      hashMb: settings.hashMb,
    });
  };

  const close = () => {
    setAsking(undefined);
    setProblem(undefined);
  };

  const resume = (job: JobRecord) => {
    const changes = resumeChangesOf(job, current());
    if (changes.length === 0) {
      void jobRuntime().resume(job.id);
      return;
    }
    setProblem(undefined);
    setAsking({ job, changes });
  };

  const keep = () => {
    if (asking !== undefined) void jobRuntime().resume(asking.job.id);
    close();
  };

  const continueWithCurrent = async () => {
    if (asking === undefined) return;
    const runtime = jobRuntime();
    // As it is now: another tab may have resumed, run or removed it while the dialog was open.
    const job = runtime.snapshot()?.find((each) => each.id === asking.job.id);
    if (job === undefined || !RESUMABLE.has(job.status)) {
      close();
      return;
    }
    setBusy(true);
    setProblem(undefined);
    const result = await continueWithCurrentSettings(runtime, job, current());
    setBusy(false);
    if ("problem" in result) {
      setProblem(t(`jobs.newJob.problem.${result.problem}`));
      return;
    }
    close();
    const path = jobPath(result.id);
    show({
      severity: "success",
      duration: 10_000,
      testId: `${testId}-continued`,
      message: t("jobs.settingsChanged.continued", { name: jobTitleOf(t, job) }),
      action: {
        label: t("jobs.openJob"),
        onClick: () => navigate(path),
        href: base === "/" ? path : `${base}${path}`,
        testId: `${testId}-open-job`,
      },
    });
    onContinued?.(result.id);
  };

  // The engines by name — an engine no longer here (an engine server's, gone) by its id, never the fallback's name.
  const engineName = (id: string) => getEngine(id)?.name ?? id;
  const changes = (asking?.changes ?? []).map((change) =>
    change.field === "engine" ? { ...change, job: engineName(change.job), current: engineName(change.current) } : change,
  );

  const dialog = createElement(JobSettingsChangedDialog, {
    open: asking !== undefined,
    name: asking === undefined ? "" : jobTitleOf(t, asking.job),
    changes,
    busy,
    error: problem,
    onKeep: keep,
    onCurrent: () => void continueWithCurrent(),
    onClose: close,
    testId,
  });
  return { resume, dialog };
};
