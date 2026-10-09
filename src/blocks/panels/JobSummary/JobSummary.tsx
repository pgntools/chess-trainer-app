import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { InlineAlert } from "../../../design-system/components/feedback";
import { linkProps, type LinkTarget } from "../../../design-system/components/link";
import { KeyValueList } from "../../../design-system/components/lists";
import { ProgressLine } from "../../../design-system/components/states";
import { tableDate } from "../../../design-system/components/tables";
import { canCancelJob, canResumeJob, jobMoveLabel, jobProgress, type Job, type JobOutput } from "../../../lib/jobs";
import { JOB_STATUS_TONES } from "../../tables";

export type JobSummaryProps = {
  job: Job;
  /** The saved analysis it was sent from, on the Analysis Board — absent for a board never saved. */
  sourceLink?: LinkTarget;
  /** A saved output, on the Analysis Board. */
  outputLink: (output: JobOutput) => LinkTarget;
  onCancel: () => void;
  onResume: () => void;
  onDelete: () => void;
  /** Under it: a finished job's report and eval graph, read from an output by the screen. */
  children?: ReactNode;
  /** The root; the parts are `-status`, `-progress`, `-error`, `-facts` (each fact `-facts-<id>`), `-source`, `-output-<variant>`, `-cancel`, `-resume`, `-delete`. */
  testId: string;
};

/** A date and time, as the Jobs table writes one. */
const stamp = (value: string | null): ReactNode => {
  const day = tableDate(value);
  if (value === null || day === undefined) return "–";
  return (
    <time dir="ltr" dateTime={value}>
      {day.text} {new Date(value).toTimeString().slice(0, 5)}
    </time>
  );
};

/**
 * **One job, whole** (CTA-173) — the Jobs screen's right-hand panel: what it
 * analyses and a link back to it, its status and progress ("12 of 80
 * positions · 7. Nf3"), why it failed, the engine that ran it and every option
 * it was given, when it was asked for, started and ended, a link to each Saved
 * analysis it made, and Resume / Cancel / Delete. A finished job's report and
 * eval graph go under it (`children` — `ComputerAnalysisReport`, `EvalGraph`).
 *
 * Presentational: the job, its links and its actions are props; its words are
 * the app's (`jobs.*`).
 */
function JobSummary({ job, sourceLink, outputLink, onCancel, onResume, onDelete, children, testId }: JobSummaryProps) {
  const { t } = useTranslation();
  const name = job.source.name || t("jobs.untitled");
  const progress = jobProgress(job);
  const move = job.status === "done" || progress.current === undefined ? undefined : jobMoveLabel(progress.current);
  const { options } = job;
  const seconds = (ms: number) => (ms === 0 ? t("jobs.facts.noTimeLimit") : t("jobs.facts.seconds", { count: Math.round(ms / 100) / 10 }));

  const facts = [
    { id: "kind", label: t("jobs.facts.kind"), value: t(`jobs.kinds.${job.kind}`) },
    { id: "engine", label: t("jobs.facts.engine"), value: job.engine?.name ?? options.engine },
    { id: "depth", label: t("jobs.facts.depth"), value: <bdi dir="ltr">{options.depth}</bdi> },
    { id: "time", label: t("jobs.facts.time"), value: seconds(options.moveTimeMs) },
    { id: "lines", label: t("jobs.facts.lines"), value: <bdi dir="ltr">{options.multiPv}</bdi> },
    { id: "threads", label: t("jobs.facts.threads"), value: <bdi dir="ltr">{options.threads}</bdi> },
    { id: "hash", label: t("jobs.facts.hash"), value: <bdi dir="ltr">{`${options.hashMb} MB`}</bdi> },
    { id: "side", label: t("jobs.facts.side"), value: t(`jobs.sides.${options.side}`) },
    {
      id: "moves",
      label: t("jobs.facts.moves"),
      value:
        options.toMove === null
          ? t("jobs.facts.fromMove", { move: `${options.fromMove}${options.fromColour === "b" ? "..." : ""}` })
          : t("jobs.facts.moveRange", { from: `${options.fromMove}${options.fromColour === "b" ? "..." : ""}`, to: options.toMove }),
    },
    { id: "variants", label: t("jobs.facts.variants"), value: options.outputs.map((variant) => t(`computerAnalysis.variants.${variant}`)).join(", ") },
    { id: "created", label: t("jobs.facts.created"), value: stamp(job.createdAt) },
    { id: "started", label: t("jobs.facts.started"), value: stamp(job.startedAt) },
    { id: "finished", label: t("jobs.facts.finished"), value: stamp(job.finishedAt) },
  ];

  return (
    <Box data-testid={testId} sx={{ display: "grid", gap: 1.5 }}>
      <Box>
        <Typography component="h2" variant="subtitle1" dir="auto" sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>
          {name}
        </Typography>
        <Typography variant="body2" data-testid={`${testId}-status`} sx={{ color: JOB_STATUS_TONES[job.status], fontWeight: 600 }}>
          {t(`jobs.status.${job.status}`)}
        </Typography>
      </Box>

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
        testId={`${testId}-progress`}
      />

      {job.status === "failed" && job.error !== null && (
        <InlineAlert severity="error" dense testId={`${testId}-error`}>
          {t(`jobs.errors.${job.error}`)}
        </InlineAlert>
      )}

      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
        {canResumeJob(job) && (
          <Button size="small" variant="contained" onClick={onResume} data-testid={`${testId}-resume`}>
            {t("jobs.resume")}
          </Button>
        )}
        {canCancelJob(job) && (
          <Button size="small" variant="outlined" onClick={onCancel} data-testid={`${testId}-cancel`}>
            {t("jobs.cancel")}
          </Button>
        )}
        <Button size="small" variant="outlined" color="error" onClick={onDelete} data-testid={`${testId}-delete`}>
          {t("jobs.delete")}
        </Button>
      </Stack>

      <Box component="section" aria-label={t("jobs.links")} sx={{ display: "grid", gap: 0.5 }}>
        {sourceLink !== undefined && (
          <Link {...(linkProps(sourceLink) as Record<string, unknown>)} underline="hover" data-testid={`${testId}-source`}>
            {t("jobs.openSource")}
          </Link>
        )}
        {job.outputs.map((output) => (
          <Link
            key={output.analysisId}
            {...(linkProps(outputLink(output)) as Record<string, unknown>)}
            underline="hover"
            data-testid={`${testId}-output-${output.variant}`}
          >
            {t("jobs.openOutput", { variant: t(`computerAnalysis.variants.${output.variant}`) })}
          </Link>
        ))}
      </Box>

      {children}

      <KeyValueList rows={facts} ariaLabel={t("jobs.facts.title")} testId={`${testId}-facts`} />
    </Box>
  );
}

export default JobSummary;
