import { useState, type ReactNode } from "react";
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
import { PanelTabs, tabPanelProps } from "../../../design-system/components/tabs";
import type { ComputerAnalysisVariant } from "../../../lib/computerAnalysis";
import { canCancelJob, canPauseJob, canResumeJob, jobMoveLabel, jobProgress, type JobV2 } from "../../../lib/jobsV2";
import { JOB_STATUS_TONES } from "../../tables";

/** What the panel reads of a job: its outputs need only their variant, its error only a code. */
export type JobSummaryJob = Pick<
  JobV2,
  "kind" | "status" | "positions" | "checkpoint" | "startedAt" | "finishedAt" | "createdAt" | "options" | "engine"
> & {
  source: { name: string };
  outputs: readonly { variant: ComputerAnalysisVariant }[];
  error: string | null;
};

/** One more line of the Parameters tab — Jobs V2's preset and target. */
export type JobSummaryFact = { id: string; label: string; value: ReactNode };

export type JobSummaryProps<J extends JobSummaryJob = JobV2> = {
  job: J;
  /** The saved analysis it was sent from, on the Analysis Board — absent for a board never saved. */
  sourceLink?: LinkTarget;
  /** The source's button's words — absent, "Open the game" (`jobs.openSource`). */
  sourceLabel?: string;
  /** An output, where it is — absent, the outputs are not linked (Jobs V2's links come as `links`). */
  outputLink?: (output: J["outputs"][number]) => LinkTarget;
  /** More links after the outputs' — Jobs V2's new Cases, the linked Project or the source Case merged into. */
  links?: ReactNode;
  /** More facts, after the engine's — Jobs V2's preset and target. */
  extraFacts?: readonly JobSummaryFact[];
  /** Under the progress bar, while the job runs: its engine's live progress — Jobs V2's `JobEngineProgress` (CTA-190). Absent, nothing there. */
  live?: ReactNode;
  /** Why it failed, in words — absent, `jobs.errors.<code>`. */
  errorText?: string;
  onCancel: () => void;
  /** Pause a job waiting or being run — Resume takes it up again (CTA-178). */
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
  /** The Results tab: a finished job's report and eval graph, read from an output by the screen — or another job's results so far (CTA-178). */
  children?: ReactNode;
  /** The root; the parts are `-status`, `-progress`, `-error`, `-facts` (each fact `-facts-<id>`), `-source`, `-output-<variant>`, `-pause`, `-cancel`, `-resume`, `-delete`, the tab strip `-tabs` (each tab `-tabs-tab-<results|params>`) and its panel `-panel`. */
  testId: string;
};

/** The panel's two tabs (CTA-178): what the run found, and what it was run with. */
const JOB_SUMMARY_TABS = ["results", "params"] as const;
type JobSummaryTab = (typeof JOB_SUMMARY_TABS)[number];

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
 * analyses and a button back to it (at the header's other end, CTA-178), its status and progress ("12 of 80
 * positions · 7. Nf3"), why it failed, the engine that ran it and every option
 * it was given, when it was asked for, started and ended, a link to each Saved
 * analysis it made, and Resume / Pause / Cancel / Delete. Under them **two
 * tabs** (CTA-178): **Results** — a finished job's report and eval graph, or
 * another job's results so far (`children` — `ComputerAnalysisReport`,
 * `EvalGraph`) — and **Parameters**, the engine, every option and the times.
 * The tab picked is the panel's own, kept while another job is opened.
 *
 * Presentational: the job, its links and its actions are props; its words are
 * the app's (`jobs.*`). Jobs V2's preset and target come as `extraFacts`
 * (CTA-188), its outputs as `links`, and its engine's live progress under the
 * progress bar as `live` (CTA-190).
 */
function JobSummary<J extends JobSummaryJob = JobV2>({
  job,
  sourceLink,
  sourceLabel,
  outputLink,
  links,
  extraFacts = [],
  live,
  errorText,
  onCancel,
  onPause,
  onResume,
  onDelete,
  children,
  testId,
}: JobSummaryProps<J>) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<JobSummaryTab>("results");
  const name = job.source.name || t("jobs.untitled");
  const progress = jobProgress(job);
  const move = job.status === "done" || progress.current === undefined ? undefined : jobMoveLabel(progress.current);
  const { options } = job;
  const seconds = (ms: number) => (ms === 0 ? t("jobs.facts.noTimeLimit") : t("jobs.facts.seconds", { count: Math.round(ms / 100) / 10 }));

  const facts = [
    { id: "kind", label: t("jobs.facts.kind"), value: t(`jobs.kinds.${job.kind}`) },
    { id: "engine", label: t("jobs.facts.engine"), value: job.engine?.name ?? options.engine },
    ...extraFacts,
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
      {/* The game and its status at the start; the way back to it at the other end, dropping under them where the panel is narrow. */}
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
        <Box sx={{ flex: "1 1 12rem", minWidth: 0 }}>
          <Typography component="h2" variant="subtitle1" dir="auto" sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>
            {name}
          </Typography>
          <Typography variant="body2" data-testid={`${testId}-status`} sx={{ color: JOB_STATUS_TONES[job.status], fontWeight: 600 }}>
            {t(`jobs.status.${job.status}`)}
          </Typography>
        </Box>
        {sourceLink !== undefined && (
          <Button size="small" variant="outlined" data-testid={`${testId}-source`} sx={{ flexShrink: 0, whiteSpace: "nowrap" }} {...linkProps(sourceLink)}>
            {sourceLabel ?? t("jobs.openSource")}
          </Button>
        )}
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

      {live}

      {job.status === "failed" && job.error !== null && (
        <InlineAlert severity="error" dense testId={`${testId}-error`}>
          {errorText ?? t(`jobs.errors.${job.error}`)}
        </InlineAlert>
      )}

      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
        {canResumeJob(job) && (
          <Button size="small" variant="contained" onClick={onResume} data-testid={`${testId}-resume`}>
            {t("jobs.resume")}
          </Button>
        )}
        {canPauseJob(job) && (
          <Button size="small" variant="outlined" onClick={onPause} data-testid={`${testId}-pause`}>
            {t("jobs.pause")}
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

      {((outputLink !== undefined && job.outputs.length > 0) || links !== undefined) && (
        <Box component="section" aria-label={t("jobs.links")} sx={{ display: "grid", gap: 0.5 }}>
          {outputLink !== undefined &&
            job.outputs.map((output) => (
              <Link
                key={output.variant}
                {...(linkProps(outputLink(output)) as Record<string, unknown>)}
                underline="hover"
                data-testid={`${testId}-output-${output.variant}`}
              >
                {t("jobs.openOutput", { variant: t(`computerAnalysis.variants.${output.variant}`) })}
              </Link>
            ))}
          {links}
        </Box>
      )}

      <Box>
        <PanelTabs
          tabs={JOB_SUMMARY_TABS.map((id) => ({ id, label: t(`jobs.tabs.${id}`) }))}
          value={tab}
          onChange={(id) => setTab(id as JobSummaryTab)}
          ariaLabel={t("jobs.tabs.label")}
          idPrefix={`${testId}-tabs`}
          testId={`${testId}-tabs`}
        />
        <Box {...tabPanelProps(`${testId}-tabs`, tab)} data-testid={`${testId}-panel`} sx={{ pt: 1.5 }}>
          {tab === "results" ? (
            children
          ) : (
            <KeyValueList rows={facts} ariaLabel={t("jobs.facts.title")} testId={`${testId}-facts`} />
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default JobSummary;
