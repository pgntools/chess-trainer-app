import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import { Link as RouterLink, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import { JobHistory, JobOutputsList, type JobArtifactOutputView, type JobDataOutputView } from "../../blocks/lists";
import { JobDetailsPanel } from "../../blocks/panels";
import { ConfirmDialog } from "../../design-system/components/dialogs";
import { useSnackbar } from "../../design-system/components/feedback";
import { BackButton } from "../../design-system/components/navigation";
import { LoadingLine, MissState } from "../../design-system/components/states";
import { jobRuntime } from "../../lib/jobs/runtime";
import { downloadBlob } from "../../lib/pgnExport";
import { useOwnPageHeading, usePageTitle } from "../main/pageTitle";
import { attemptViewsOf, describeEvent, jobDetailsOf, jobTitleOf, outputViewsOf } from "./jobViews";
import { kindViewsOf } from "./kindViews";
import { JOBS_PATH, jobPath } from "./paths";
import { useJobEntitiesVersion, useJobLiveOf, useJobRecord, useJobRecords } from "./useJobs";
import { useResumeJob } from "./useResumeJob";

/**
 * **One job** (`/jobs/<id>`, CTA-221) — the `JobDetailsPanel` block, its
 * title the page's `h1` (and the page's title, `usePageTitle`): its kind and
 * status and the actions; its progress, with **the kind's live view** while
 * it runs (the engine kinds' `JobEngineProgress`); why it failed or what it
 * waits on (a scheduled retry counting down); what it is applied to, linked;
 * **the kind's details** and **parameters**; then **its outputs**
 * (`JobOutputsList` — an entity opens, a file downloads, through
 * `runtime.readArtifact` and an object URL, a data output is drawn by its
 * kind's view) and **its attempts and history** (`JobHistory`). Delete asks
 * first, then returns to `/jobs`; the outputs stay. Resume on an engine job
 * whose settings differ from the current ones asks first (`useResumeJob`,
 * CTA-236); continued with the current ones, the page moves to the new job.
 */
function JobScreen() {
  useOwnPageHeading();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { show } = useSnackbar();
  const { jobId = "" } = useParams();
  const jobs = useJobRecords();
  const job = useJobRecord(jobId);
  const live = useJobLiveOf(jobId);
  useJobEntitiesVersion();
  usePageTitle(job === undefined ? undefined : jobTitleOf(t, job));
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState<string | undefined>();
  // Continued as a new job, this one is gone: its page follows to the new one.
  const resumer = useResumeJob("job-settings-changed", (id) => navigate(jobPath(id)));

  // A scheduled retry counts down: the clock ticks each second while one waits.
  const [now, setNow] = useState(() => Date.now());
  const waiting = job?.status === "queued" && job.runAfter !== undefined;
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [waiting]);

  const details = useMemo(() => (job === undefined ? undefined : jobDetailsOf(t, job, now)), [job, now, t]);
  const outputs = useMemo(() => (job === undefined ? [] : outputViewsOf(t, job)), [job, t]);
  const attempts = useMemo(() => (job === undefined ? [] : attemptViewsOf(t, job)), [job, t]);

  if (job === undefined || details === undefined) {
    return jobs === undefined ? (
      <LoadingLine testId="job-loading">{t("jobs.loading")}</LoadingLine>
    ) : (
      <MissState title={t("jobs.missingTitle")} backLabel={t("jobs.backToJobs")} backLink={{ component: RouterLink, to: JOBS_PATH }} testId="job-missing">
        {t("jobs.missing")}
      </MissState>
    );
  }

  const views = kindViewsOf(job.kind);
  const runtime = jobRuntime();
  const { Live, Details, Parameters, Data } = views;

  const download = async (output: JobArtifactOutputView) => {
    const applied = job.outputs.find((each) => each.key === output.key);
    if (applied?.kind !== "artifact") return;
    setDownloading(output.key);
    const blob = await runtime.readArtifact(applied.artifactId);
    setDownloading(undefined);
    if (blob === undefined || !downloadBlob(applied.name, () => blob)) {
      show({ severity: "error", message: t("jobs.outputs.downloadFailed", { name: applied.name }), testId: "job-download-failed" });
    }
  };

  const renderData = (output: JobDataOutputView) => {
    const applied = job.outputs.find((each) => each.key === output.key);
    if (applied?.kind !== "data" || Data === undefined) return null;
    return <Data job={job} output={{ key: applied.key, schema: applied.schema, value: applied.value }} testId={`job-data-${applied.key}`} />;
  };

  return (
    <Box data-testid="job-screen" sx={{ display: "grid", gap: 3, pb: 4, minWidth: 0 }}>
      <Box>
        <BackButton label={t("jobs.backToJobs")} link={{ component: RouterLink, to: JOBS_PATH }} testId="job-back" />
      </Box>
      <JobDetailsPanel
        job={details}
        headingLevel={1}
        onPause={() => void runtime.pause(job.id)}
        onResume={() => resumer.resume(job)}
        onCancel={() => void runtime.cancel(job.id)}
        onDelete={() => setDeleting(true)}
        live={Live === undefined ? undefined : <Live job={job} live={live} testId="job-engine" />}
        details={Details === undefined ? undefined : <Details job={job} testId="job-kind-details" />}
        parameters={Parameters === undefined ? undefined : <Parameters job={job} testId="job-parameters" />}
        testId="job-details"
      />
      <JobOutputsList
        outputs={outputs}
        onDownload={(output) => void download(output)}
        renderData={renderData}
        downloadingKey={downloading}
        headingLevel={2}
        testId="job-outputs"
      />
      <JobHistory attempts={attempts} events={job.history} describe={(event) => describeEvent(t, event)} headingLevel={2} testId="job-history" />

      {resumer.dialog}
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={() => {
          setDeleting(false);
          void runtime.remove([job.id]);
          navigate(JOBS_PATH);
        }}
        title={t("jobs.confirmDelete.title")}
        message={t("jobs.screen.confirmDelete", { name: details.title })}
        confirmLabel={t("jobs.confirmDelete.confirm")}
        cancelLabel={t("jobs.confirmDelete.cancel")}
        tone="destructive"
        testId="job-delete-dialog"
      />
    </Box>
  );
}

export default JobScreen;
