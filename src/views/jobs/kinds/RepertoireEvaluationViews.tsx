import { useState } from "react";
import { useTranslation } from "react-i18next";

import { NewJobFrame } from "../../../blocks/dialogs";
import { RepertoireEvaluationForm } from "../../../blocks/forms";
import { RepertoireEvaluationReport } from "../../../blocks/panels";
import { KeyValueList } from "../../../design-system/components/lists";
import { engineLimitsOf } from "../../../lib/engineSettings";
import { resolveEngine } from "../../../lib/engines";
import { REPERTOIRE_ENTITY } from "../../../lib/jobs/entityTypes";
import { JOB_ENTITIES } from "../../../lib/jobs/entities";
import {
  DEFAULT_REPERTOIRE_EVALUATION_SETTINGS,
  parseRepertoireEvaluationInput,
  parseRepertoireEvaluationReport,
  REPERTOIRE_EVALUATION_KIND,
  repertoireEvaluationSettingsFrom,
  type RepertoireEvaluationSettings,
} from "../../../lib/jobs/kinds/repertoireEvaluation/core";
import { jobRuntime } from "../../../lib/jobs/runtime";
import { REPERTOIRE_AT_PARAM } from "../../../lib/repertoireLink";
import { useEngineSearchSettings } from "../../shared/useEngineSearchSettings";
import { useSavedRepertoires } from "../../repertoires/useSavedRepertoires";
import { continuesRowsOf, linkTo } from "../jobViews";
import type { JobDataViewProps, JobViewProps, NewJobKindProps } from "../kindViewTypes";
import { useEngineJobChoice } from "./useEngineJobChoice";

/** No engine runs here — what the form knows of it is its descriptor's. */
const NO_OPTIONS = new Map();

/**
 * **A repertoire's evaluation, started** (CTA-221, over CTA-219's form) —
 * the repertoire as it is stored now, its side prefilled from its main
 * colour, the engine and preset seeded as every engine job's are, the search
 * prefilled from the preset (depth and time) and the search settings
 * (Threads, Hash, lines).
 */
export function RepertoireEvaluationNewJob({ open, onClose, onStarted, subjects, kinds, kindId, onKindChange, testId }: NewJobKindProps) {
  const { t } = useTranslation();
  const repertoires = useSavedRepertoires();
  const { settings: search } = useEngineSearchSettings();
  const repertoireId = subjects.find((ref) => ref.type === REPERTOIRE_ENTITY)?.id;
  const saved = repertoires?.find((each) => each.id === repertoireId);
  const name = saved?.name || t("repertoires.untitled");

  const [engineId, setEngineId] = useState(() => resolveEngine("").id);
  const choice = useEngineJobChoice(engineId);
  const [presetId, setPresetId] = useState("");
  const [settings, setSettings] = useState<RepertoireEvaluationSettings>(DEFAULT_REPERTOIRE_EVALUATION_SETTINGS);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | undefined>();

  // Seeded as the frame opens (and once the repertoire is read) — adjusted during render.
  const [seededFor, setSeededFor] = useState<string | undefined>();
  const seedKey = open && saved !== undefined ? saved.id : undefined;
  if (seedKey !== seededFor) {
    setSeededFor(seedKey);
    if (seedKey !== undefined && saved !== undefined) {
      const seed = choice.seed();
      setEngineId(seed.engineId);
      setPresetId(seed.presetId);
      setSettings(
        repertoireEvaluationSettingsFrom(
          {
            ...DEFAULT_REPERTOIRE_EVALUATION_SETTINGS,
            side: saved.settings.color === "black" ? "b" : "w",
            search: { depth: seed.search.depth, moveTimeMs: seed.search.moveTimeMs, threads: search.threads, hashMb: search.hashMb, multiPv: search.multiPv },
          },
          seed.engineId,
        ),
      );
      setProblem(undefined);
    }
  }

  const descriptor = resolveEngine(engineId);
  const note = saved === undefined ? t("jobs.kinds.repertoireEvaluation.repertoireGone") : undefined;

  const start = async () => {
    if (saved === undefined) return;
    setBusy(true);
    setProblem(undefined);
    const result = await jobRuntime().enqueue(REPERTOIRE_EVALUATION_KIND, {
      repertoireId: saved.id,
      name,
      pgn: saved.pgn,
      engine: engineId,
      preset: choice.jobPreset(presetId),
      ...settings,
    });
    setBusy(false);
    if ("problem" in result) {
      setProblem(t(`jobs.newJob.problem.${result.problem}`));
      return;
    }
    onStarted({ id: result.id, title: name });
  };

  return (
    <NewJobFrame
      open={open}
      onClose={onClose}
      onStart={() => void start()}
      kinds={kinds}
      kindId={kindId}
      onKindChange={onKindChange}
      subjectLabel={name}
      title={t("jobs.kinds.repertoireEvaluation.title", { name })}
      startBlockedNote={note}
      problem={problem}
      busy={busy}
      testId={testId}
    >
      <RepertoireEvaluationForm
        settings={settings}
        onChange={(patch) => {
          setProblem(undefined);
          // Held to the bounds of the engine the job will run.
          setSettings((current) => repertoireEvaluationSettingsFrom({ ...current, ...patch }, engineId));
        }}
        repertoireName={name}
        engineOptions={NO_OPTIONS}
        multiThread={descriptor.capabilities.multiThread}
        deviceLimits={engineLimitsOf(descriptor)}
        engineChoice={choice.engineChoice(
          presetId,
          (seed) => {
            setEngineId(seed.engineId);
            setPresetId(seed.presetId);
            setSettings((current) =>
              repertoireEvaluationSettingsFrom({ ...current, search: { ...current.search, ...seed.search } }, seed.engineId),
            );
          },
          (next, presetSearch) => {
            setPresetId(next);
            setSettings((current) => repertoireEvaluationSettingsFrom({ ...current, search: { ...current.search, ...presetSearch } }, engineId));
          },
        )}
        testId={`${testId}-form`}
      />
    </NewJobFrame>
  );
}

/**
 * **The report, drawn** — every repertoire-side move judged, the flagged ones
 * first, each move a link opening the repertoire there (`?at=` its SAN path)
 * while the repertoire is there.
 */
export function RepertoireEvaluationData({ job, output, testId }: JobDataViewProps) {
  const { t } = useTranslation();
  // Kept with the screen: the filter and the page are the reader's while the report is open.
  const [flaggedOnly, setFlaggedOnly] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  useSavedRepertoires();
  const report = parseRepertoireEvaluationReport(output.value);
  if (report === undefined) return null;
  const there = JOB_ENTITIES[REPERTOIRE_ENTITY].exists(report.repertoireId) === true;
  const shown = flaggedOnly ? report.moves.filter((move) => move.verdict !== "good" && move.verdict !== "pending").length : report.moves.length;
  return (
    <RepertoireEvaluationReport
      report={report}
      flaggedOnly={flaggedOnly}
      onFlaggedOnlyChange={(on) => {
        setFlaggedOnly(on);
        setPage(0);
      }}
      moveLink={
        there
          ? (move) =>
              linkTo(`/repertoires/${encodeURIComponent(report.repertoireId)}?${new URLSearchParams({ [REPERTOIRE_AT_PARAM]: move.path.join(",") })}`)
          : undefined
      }
      paging={
        shown > 25
          ? {
              page,
              rowsPerPage,
              onPageChange: setPage,
              onRowsPerPageChange: (rows) => {
                setRowsPerPage(rows);
                setPage(0);
              },
              labelRowsPerPage: t("jobs.kinds.repertoireEvaluation.report.rowsPerPage"),
            }
          : undefined
      }
      testId={`${testId}-${job.id}`}
    />
  );
}

/** **What a repertoire evaluation was asked to do** — and the job it continues (CTA-236). */
export function RepertoireEvaluationParameters({ job, testId }: JobViewProps) {
  const { t, i18n } = useTranslation();
  const input = parseRepertoireEvaluationInput(job.input);
  if (input === undefined) return null;
  const seconds = (ms: number) => (ms === 0 ? t("jobs.facts.noTimeLimit") : t("jobs.facts.seconds", { count: Math.round(ms / 100) / 10 }));
  const outputs = [
    t("jobs.kinds.repertoireEvaluation.facts.report"),
    ...(input.outputs.repertoire ? [t("jobs.kinds.repertoireEvaluation.facts.repertoire")] : []),
    ...(input.outputs.pgnFile ? [t("jobs.kinds.repertoireEvaluation.facts.pgnFile")] : []),
  ];
  const rows = [
    { id: "engine", label: t("jobs.facts.engine"), value: resolveEngine(input.engine).name },
    { id: "preset", label: t("jobs.kinds.computerAnalysis.facts.preset"), value: <bdi>{input.preset?.name || input.preset?.id || "–"}</bdi> },
    { id: "side", label: t("jobs.kinds.repertoireEvaluation.facts.side"), value: t(`jobs.sides.${input.side}`) },
    { id: "plies", label: t("jobs.kinds.repertoireEvaluation.facts.plies"), value: <bdi dir="ltr">{input.maxPlies}</bdi> },
    { id: "depth", label: t("jobs.facts.depth"), value: <bdi dir="ltr">{input.search.depth}</bdi> },
    { id: "time", label: t("jobs.facts.time"), value: seconds(input.search.moveTimeMs) },
    { id: "lines", label: t("jobs.facts.lines"), value: <bdi dir="ltr">{input.search.multiPv}</bdi> },
    { id: "threads", label: t("jobs.facts.threads"), value: <bdi dir="ltr">{input.search.threads}</bdi> },
    { id: "hash", label: t("jobs.facts.hash"), value: <bdi dir="ltr">{`${input.search.hashMb} MB`}</bdi> },
    { id: "outputs", label: t("jobs.facts.variants"), value: outputs.join(", ") },
    ...continuesRowsOf(t, i18n.language, input.continues, Object.keys(input.seed ?? {}).length),
  ];
  return <KeyValueList rows={rows} ariaLabel={t("jobs.facts.title")} testId={testId} />;
}
