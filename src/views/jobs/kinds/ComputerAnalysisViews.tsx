import { useTranslation } from "react-i18next";

import { KeyValueList } from "../../../design-system/components/lists";
import { JOB_ENTITIES } from "../../../lib/jobs/entities";
import { ANALYSIS_CASE_ENTITY, ANALYSIS_PROJECT_ENTITY } from "../../../lib/jobs/entityTypes";
import { readComputerAnalysisJob } from "../../../lib/jobs/kinds/computerAnalysis/kind";
import type { JobViewProps } from "../kindViewTypes";
import { useJobEntitiesVersion } from "../useJobs";
import { ComputerAnalysisDoneReport, ComputerAnalysisLiveReport } from "./ComputerAnalysisReports";

/**
 * **A computer analysis's details** (CTA-221) — a done job's report and eval
 * graph, read back from its first output Case; any other's results so far,
 * filling in with every checkpoint.
 */
export function ComputerAnalysisDetails({ job, testId }: JobViewProps) {
  const read = readComputerAnalysisJob(job);
  if (read === undefined) return null;
  const first = job.outputs.find((output) => output.kind === "entity" && output.ref.type === ANALYSIS_CASE_ENTITY);
  if (job.status === "done" && first !== undefined && first.kind === "entity") {
    return <ComputerAnalysisDoneReport caseId={first.ref.id} testId={`${testId}-report`} />;
  }
  return <ComputerAnalysisLiveReport input={read.input} state={read.state} testId={`${testId}-live-report`} />;
}

/**
 * **What a computer analysis was asked to do** — the engine that ran it (or
 * was asked for), the preset as the popup named it, where the results go,
 * the search and the rest of the form.
 */
export function ComputerAnalysisParameters({ job, testId }: JobViewProps) {
  const { t } = useTranslation();
  useJobEntitiesVersion();
  const read = readComputerAnalysisJob(job);
  if (read === undefined) return null;
  const { input, state } = read;
  const { options, target } = input;
  const seconds = (ms: number) => (ms === 0 ? t("jobs.facts.noTimeLimit") : t("jobs.facts.seconds", { count: Math.round(ms / 100) / 10 }));
  const projectName = (id: string) =>
    JOB_ENTITIES[ANALYSIS_PROJECT_ENTITY].label(id) ??
    (JOB_ENTITIES[ANALYSIS_PROJECT_ENTITY].exists(id) === false ? t("jobs.kinds.computerAnalysis.projectGone") : t("analysisV2.project.untitled"));
  const targetText =
    target.kind === "case"
      ? t("jobs.kinds.computerAnalysis.targetFacts.case")
      : t(`jobs.kinds.computerAnalysis.targetFacts.${target.kind}`, { name: projectName(target.projectId) });
  const from = `${options.fromMove}${options.fromColour === "b" ? "..." : ""}`;
  const rows = [
    { id: "engine", label: t("jobs.facts.engine"), value: state?.engine?.name ?? options.engine },
    // As the popup named it — Default in the reader's words then.
    { id: "preset", label: t("jobs.kinds.computerAnalysis.facts.preset"), value: <bdi>{input.preset.name || input.preset.id || "–"}</bdi> },
    { id: "target", label: t("jobs.kinds.computerAnalysis.facts.target"), value: targetText },
    { id: "depth", label: t("jobs.facts.depth"), value: <bdi dir="ltr">{options.depth}</bdi> },
    { id: "time", label: t("jobs.facts.time"), value: seconds(options.moveTimeMs) },
    { id: "lines", label: t("jobs.facts.lines"), value: <bdi dir="ltr">{options.multiPv}</bdi> },
    { id: "threads", label: t("jobs.facts.threads"), value: <bdi dir="ltr">{options.threads}</bdi> },
    { id: "hash", label: t("jobs.facts.hash"), value: <bdi dir="ltr">{`${options.hashMb} MB`}</bdi> },
    { id: "side", label: t("jobs.facts.side"), value: t(`jobs.sides.${options.side}`) },
    {
      id: "moves",
      label: t("jobs.facts.moves"),
      value: options.toMove === null ? t("jobs.facts.fromMove", { move: from }) : t("jobs.facts.moveRange", { from, to: options.toMove }),
    },
    { id: "variants", label: t("jobs.facts.variants"), value: options.outputs.map((variant) => t(`computerAnalysis.variants.${variant}`)).join(", ") },
  ];
  return <KeyValueList rows={rows} ariaLabel={t("jobs.facts.title")} testId={testId} />;
}
