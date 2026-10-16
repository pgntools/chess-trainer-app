import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { useTranslation } from "react-i18next";

import { visuallyHidden } from "../../../design-system/components/a11y";
import { InlineAlert } from "../../../design-system/components/feedback";
import { KeyValueList } from "../../../design-system/components/lists";
import { JOB_STATUS_TONES, JobProgressBar, JobStamp, JobSubjects, type JobRowView, type JobViewStatus } from "../../tables";

/** One job, whole — its row and what only its page shows. */
export type JobDetailsView = JobRowView & {
  startedAt?: string;
  finishedAt?: string;
  /** A scheduled retry: a queued job waiting `inSeconds` before its next attempt. */
  retry?: { inSeconds: number; attempt: number; maxAttempts: number };
  /** Why it failed — the runtime's `JobError`, its message in the reader's words where the kind has them. */
  error?: { code: string; message?: string };
};

export type JobDetailsPanelProps = {
  job: JobDetailsView;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onDelete: () => void;
  /** Under the progress bar — while the job runs, the kind's live view (the engine kinds' `JobEngineProgress`). */
  live?: ReactNode;
  /** The kind's details section — its report, its summary. Absent, no section. */
  details?: ReactNode;
  /** What the job was asked to do, as its kind words it. Absent, no section. */
  parameters?: ReactNode;
  /** The title's level: `1` on a page that is the job's own (the shell's one `h1`), the sections one below. Default `2`. */
  headingLevel?: 1 | 2;
  /**
   * The root; the parts are `-title`, `-kind`, `-status`, `-pause`,
   * `-resume`, `-cancel`, `-delete`, `-progress` (`ProgressLine`'s), `-live`,
   * `-waiting`, `-error` (its code `-error-detail`), `-subjects`, `-times`,
   * `-details`, `-parameters`, and the status region `-announcer`.
   */
  testId: string;
};

/** What a job not running is waiting on, in words — a scheduled retry, its turn, a Resume. */
const waitingKey = (status: JobViewStatus, retry: JobDetailsView["retry"]): { key: string; values?: Record<string, number> } | undefined => {
  if (status === "queued" && retry !== undefined) {
    const values = { seconds: Math.max(0, Math.ceil(retry.inSeconds)), attempt: retry.attempt, max: retry.maxAttempts };
    return { key: values.seconds > 0 ? "jobs.details.retrying" : "jobs.details.retryingNow", values };
  }
  if (status === "queued") return { key: "jobs.details.waiting" };
  if (status === "paused") return { key: "jobs.details.paused" };
  if (status === "interrupted") return { key: "jobs.details.interrupted" };
  return undefined;
};

/**
 * **One background job, whole** (CTA-217) — the Jobs module's `/jobs/<id>`
 * panel, for a job of any kind: a header (its title, its kind, its status as
 * a chip, and Pause / Resume / Cancel where the job allows them, Delete
 * always); its progress, a bar with its words, and the kind's live view
 * under it while it runs; what it waits on (a scheduled retry — "Retrying in
 * 40 s — attempt 2 of 3" — its turn, a Resume); why it failed (the error's
 * message, its code under it); what it is applied to, each linked; its
 * times; then the kind's details and parameters as slots.
 *
 * **A status change is announced politely** — "Carlsen – Nepomniachtchi:
 * Done." — never the progress, nor the first status shown, nor another job
 * opened in its place.
 *
 * Presentational over `JobDetailsView` (block-local view models; the screen
 * maps the runtime's record onto it). Its words are `jobs.*`.
 */
function JobDetailsPanel({
  job,
  onPause,
  onResume,
  onCancel,
  onDelete,
  live,
  details,
  parameters,
  headingLevel = 2,
  testId,
}: JobDetailsPanelProps) {
  const { t } = useTranslation();
  const [seen, setSeen] = useState({ id: job.id, status: job.status });
  const [message, setMessage] = useState("");
  // A status change, adjusted during render (`react-hooks/set-state-in-effect`); another job opened resets it, unsaid.
  if (seen.id !== job.id || seen.status !== job.status) {
    setMessage(seen.id === job.id ? t("jobs.details.statusChanged", { name: job.title, status: t(`jobs.status.${job.status}`) }) : "");
    setSeen({ id: job.id, status: job.status });
  }

  const title = headingLevel === 1 ? "h1" : "h2";
  const section = headingLevel === 1 ? "h2" : "h3";
  const tone = JOB_STATUS_TONES[job.status];
  const waiting = waitingKey(job.status, job.retry);
  const id = (part: string) => `${testId}-${part}`;
  const heading = (words: string) => (
    <Typography variant="subtitle2" component={section} sx={{ fontWeight: 700 }}>
      {words}
    </Typography>
  );

  return (
    <Box data-testid={testId} sx={{ display: "grid", gap: 2 }}>
      <Box role="status" data-testid={id("announcer")} sx={visuallyHidden}>
        {message}
      </Box>

      <Box sx={{ display: "grid", gap: 1 }}>
        <Typography variant="h6" component={title} dir="auto" data-testid={id("title")} sx={{ overflowWrap: "anywhere" }}>
          {job.title}
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
          <Typography variant="body2" data-testid={id("kind")} sx={{ color: "text.secondary" }}>
            {t("jobs.details.kind")}: <bdi dir="auto">{job.kindLabel}</bdi>
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            label={t(`jobs.status.${job.status}`)}
            data-testid={id("status")}
            sx={{ color: tone, borderColor: tone, fontWeight: 600 }}
          />
        </Box>
        <Box role="group" aria-label={t("jobs.details.actions")} sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {job.canResume && (
            <Button size="small" variant="contained" startIcon={<PlayArrowRoundedIcon />} onClick={onResume} data-testid={id("resume")}>
              {t("jobs.resume")}
            </Button>
          )}
          {job.canPause && (
            <Button size="small" variant="outlined" startIcon={<PauseRoundedIcon />} onClick={onPause} data-testid={id("pause")}>
              {t("jobs.pause")}
            </Button>
          )}
          {job.canCancel && (
            <Button size="small" variant="outlined" startIcon={<BlockRoundedIcon />} onClick={onCancel} data-testid={id("cancel")}>
              {t("jobs.cancel")}
            </Button>
          )}
          <Button size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={onDelete} data-testid={id("delete")}>
            {t("jobs.delete")}
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: "grid", gap: 1 }}>
        {heading(t("jobs.details.progress"))}
        <JobProgressBar title={job.title} status={job.status} progress={job.progress} testId={id("progress")} />
        {live !== undefined && <Box data-testid={id("live")}>{live}</Box>}
        {waiting !== undefined && (
          <Typography variant="body2" data-testid={id("waiting")} sx={{ color: "text.secondary" }}>
            {t(waiting.key, waiting.values)}
          </Typography>
        )}
      </Box>

      {job.error !== undefined && (
        <InlineAlert severity="error" title={t("jobs.details.failed")} detail={t("jobs.details.code", { code: job.error.code })} testId={id("error")}>
          <Box component="span" dir="auto">
            {job.error.message ?? t("jobs.details.failedUnknown")}
          </Box>
        </InlineAlert>
      )}

      <Box sx={{ display: "grid", gap: 0.5 }}>
        {heading(t("jobs.details.subjects"))}
        <JobSubjects subjects={job.subjects} testId={id("subjects")} />
      </Box>

      <Box sx={{ display: "grid", gap: 0.5 }}>
        {heading(t("jobs.details.times"))}
        <KeyValueList
          rows={[
            { id: "created", label: t("jobs.details.created"), value: <JobStamp value={job.createdAt} />, dir: "ltr" },
            ...(job.startedAt === undefined ? [] : [{ id: "started", label: t("jobs.details.started"), value: <JobStamp value={job.startedAt} />, dir: "ltr" as const }]),
            ...(job.finishedAt === undefined ? [] : [{ id: "finished", label: t("jobs.details.finished"), value: <JobStamp value={job.finishedAt} />, dir: "ltr" as const }]),
          ]}
          testId={id("times")}
        />
      </Box>

      {details !== undefined && (
        <Box data-testid={id("details")} sx={{ display: "grid", gap: 1 }}>
          {heading(t("jobs.details.details"))}
          {details}
        </Box>
      )}

      {parameters !== undefined && (
        <Box data-testid={id("parameters")} sx={{ display: "grid", gap: 1 }}>
          {heading(t("jobs.details.parameters"))}
          {parameters}
        </Box>
      )}
    </Box>
  );
}

export default JobDetailsPanel;
