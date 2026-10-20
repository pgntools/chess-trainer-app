import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router";
import { useTranslation } from "react-i18next";

import { NewJobFrame } from "../../../blocks/dialogs";
import {
  ComputerAnalysisForm,
  computerAnalysisStartNote,
  initialJobTarget,
  JobTargetFields,
  jobTargetProblem,
  type JobTargetChoice,
} from "../../../blocks/forms";
import { createAnalysisProject, removeAnalysisProject } from "../../../lib/analysisProjectStore";
import { caseTree, type AnalysisProject } from "../../../lib/analysisProjects";
import {
  analysisPositionsOf,
  computerAnalysisOptionsFrom,
  DEFAULT_COMPUTER_ANALYSIS_OPTIONS,
  type ComputerAnalysisOptions,
} from "../../../lib/computerAnalysis";
import type { EngineSearchSettings } from "../../../lib/engineSearchSettings";
import { engineLimitsOf } from "../../../lib/engineSettings";
import { resolveEngine } from "../../../lib/engines";
import { mainline, plyLabel, treeToPgn, type GameTree } from "../../../lib/gameTree";
import { ANALYSIS_CASE_ENTITY } from "../../../lib/jobs/entityTypes";
import { JOB_ENTITIES } from "../../../lib/jobs/entities";
import { COMPUTER_ANALYSIS_KIND, type ComputerAnalysisTarget } from "../../../lib/jobs/kinds/computerAnalysis/core";
import { jobRuntime } from "../../../lib/jobs/runtime";
import { useAnalysisCases, useAnalysisProjects } from "../../analysisV2/useAnalysisProjects";
import { useEngineSearchSettings } from "../../shared/useEngineSearchSettings";
import { isJobOf, newestFirst } from "../jobViews";
import type { NewJobKindProps } from "../kindViewTypes";
import { jobPath } from "../paths";
import { useJobRecords } from "../useJobs";
import { useEngineJobChoice, type EngineJobSeed } from "./useEngineJobChoice";

/** What the Case's screen hands the form: the tree as its board holds it, and its name as shown. */
export type ComputerAnalysisContext = { tree: GameTree; name: string };

const isContext = (value: unknown): value is ComputerAnalysisContext =>
  typeof value === "object" && value !== null && "tree" in value && "name" in value;

/** The form's first options: the preset's depth and time, the search settings' Threads, Hash and lines (CTA-188's decision). */
const seedOptions = (seed: EngineJobSeed, settings: EngineSearchSettings): ComputerAnalysisOptions =>
  computerAnalysisOptionsFrom({
    ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS,
    engine: seed.engineId,
    depth: seed.search.depth,
    minDepth: seed.search.depth,
    moveTimeMs: seed.search.moveTimeMs,
    multiPv: settings.multiPv,
    threads: settings.threads,
    hashMb: settings.hashMb,
  });

/** No engine runs here — what the form knows of it is its descriptor's. */
const NO_OPTIONS = new Map();

/**
 * **A Case's computer analysis, started** (CTA-221 — New Job V2 of CTA-188
 * on the generic `NewJobFrame`): the Case on the board — its tree as the
 * board holds it, or, opened elsewhere, as it is stored —
 *
 * - **a line when the Case has a job of this kind already** (the newest
 *   unfinished, else done, else newest), its status said, a link to it;
 * - **the engine and its preset**, seeded from the Jobs settings' default
 *   where one applies, else the board's engine and its selected preset —
 *   **prefilling** the depth and time per move (the preset's) and Threads,
 *   Hash and lines (the search settings) — all editable;
 * - **Where to save the results** (`JobTargetFields`): new Cases in its
 *   Project, another Project (a new one, named after the Case, made on Start
 *   in the source Project's folder, or an existing one), or into this Case —
 *   one variant;
 * - **Start** queues it (`jobRuntime().enqueue`) with the tree and the
 *   preset's values as they are then. A refusal stays in the frame, a Project
 *   made for it taken back.
 */
function ComputerAnalysisNewJob({ open, onClose, onStarted, subjects, context, kinds, kindId, onKindChange, testId }: NewJobKindProps) {
  const { t } = useTranslation();
  const jobs = useJobRecords();
  const projects = useAnalysisProjects();
  const cases = useAnalysisCases();
  const { settings } = useEngineSearchSettings();

  const caseId = subjects.find((ref) => ref.type === ANALYSIS_CASE_ENTITY)?.id;
  const record = cases?.find((each) => each.id === caseId);
  const given = isContext(context) ? context : undefined;
  const tree = useMemo(() => given?.tree ?? (record === undefined ? undefined : caseTree(record)), [given, record]);
  const name = given?.name ?? (caseId === undefined ? "" : (JOB_ENTITIES[ANALYSIS_CASE_ENTITY].label(caseId) ?? t("jobs.untitled")));

  const [engineId, setEngineId] = useState(() => resolveEngine(DEFAULT_COMPUTER_ANALYSIS_OPTIONS.engine).id);
  const choice = useEngineJobChoice(engineId);
  const [presetId, setPresetId] = useState("");
  const [options, setOptions] = useState<ComputerAnalysisOptions>(DEFAULT_COMPUTER_ANALYSIS_OPTIONS);
  const [target, setTarget] = useState<JobTargetChoice>(() => initialJobTarget(""));
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<"invalid" | "storage" | "too-many" | undefined>();

  // Seeded as the frame opens — adjusted during render (`react-hooks/set-state-in-effect`).
  const [seededFor, setSeededFor] = useState<string | undefined>();
  const seedKey = open ? (caseId ?? "") : undefined;
  if (seedKey !== seededFor) {
    setSeededFor(seedKey);
    if (seedKey !== undefined) {
      const seed = choice.seed();
      setEngineId(seed.engineId);
      setPresetId(seed.presetId);
      setOptions(seedOptions(seed, settings));
      // A new Project is named after the Case analysed, not the Project it is in.
      setTarget(initialJobTarget(t("jobs.kinds.computerAnalysis.defaultProjectName", { name })));
      setProblem(undefined);
    }
  }

  const sourceProject = record === undefined ? undefined : projects?.find((project) => project.id === record.projectId);
  const projectName = sourceProject === undefined ? "" : sourceProject.name || t("analysisV2.project.untitled");
  const descriptor = resolveEngine(engineId);
  const single = target.kind === "case";
  // Into the Case: one variant, the first ticked.
  const shownOptions = useMemo(
    (): ComputerAnalysisOptions => (single && options.outputs.length !== 1 ? { ...options, outputs: [options.outputs[0] ?? "light"] } : options),
    [single, options],
  );
  const mainlineLength = useMemo(() => (tree === undefined ? 0 : mainline(tree).length), [tree]);
  const lastMove = tree === undefined || mainlineLength === 0 ? undefined : plyLabel(tree.startFen, mainlineLength).number;
  const inRange = useMemo(() => tree !== undefined && analysisPositionsOf(tree, shownOptions).length > 0, [tree, shownOptions]);
  const blocked = lastMove === undefined ? "noMoves" : inRange ? undefined : "noRange";
  const targetProblem = jobTargetProblem(target);
  const formNote = computerAnalysisStartNote(shownOptions, blocked);
  const note =
    record === undefined
      ? t("jobs.kinds.computerAnalysis.caseGone")
      : formNote !== undefined
        ? t(formNote)
        : targetProblem === undefined
          ? undefined
          : t(`jobs.kinds.computerAnalysis.targetProblem.${targetProblem}`);

  const existing = useMemo(() => {
    if (jobs === undefined || caseId === undefined) return undefined;
    const ofCase = newestFirst(jobs).filter((job) => job.kind === COMPUTER_ANALYSIS_KIND && isJobOf(job, { type: ANALYSIS_CASE_ENTITY, id: caseId }));
    return (
      ofCase.find((job) => job.status !== "done" && job.status !== "failed" && job.status !== "cancelled") ??
      ofCase.find((job) => job.status === "done") ??
      ofCase[0]
    );
  }, [jobs, caseId]);

  const candidates = useMemo(() => {
    if (record === undefined || projects === undefined) return [];
    return projects
      .filter((project) => project.id !== record.projectId)
      .map((project) => ({ id: project.id, name: project.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [record, projects]);

  const prefill = (engine: string, search: EngineJobSeed["search"]) =>
    setOptions((current) =>
      computerAnalysisOptionsFrom({ ...current, engine, depth: search.depth, moveTimeMs: search.moveTimeMs, minDepth: Math.min(current.minDepth, search.depth) }),
    );

  const start = async () => {
    if (record === undefined || tree === undefined || sourceProject === undefined || note !== undefined) return;
    setBusy(true);
    setProblem(undefined);
    let made: AnalysisProject | undefined;
    let jobTarget: ComputerAnalysisTarget;
    if (target.kind === "case") jobTarget = { kind: "case" };
    else if (target.kind === "project") jobTarget = { kind: "project", projectId: sourceProject.id };
    else {
      let projectId = target.projectId;
      if (target.otherMode === "new") {
        made = await createAnalysisProject(target.newName, sourceProject.folderId);
        projectId = made?.id ?? null;
      }
      if (projectId === null) {
        setBusy(false);
        setProblem("storage");
        return;
      }
      jobTarget = { kind: "other", projectId };
    }
    const result = await jobRuntime().enqueue(COMPUTER_ANALYSIS_KIND, {
      source: { projectId: sourceProject.id, caseId: record.id, name, pgn: treeToPgn(tree) },
      options: { ...shownOptions, engine: engineId },
      preset: choice.jobPreset(presetId),
      target: jobTarget,
    });
    setBusy(false);
    if ("problem" in result) {
      if (made !== undefined) await removeAnalysisProject(made.id);
      setProblem(result.problem === "too-many" ? "too-many" : result.problem === "storage" ? "storage" : "invalid");
      return;
    }
    onStarted({ id: result.id, title: name });
  };

  return (
    <NewJobFrame
      open={open}
      onClose={onClose}
      title={t("computerAnalysis.form.title")}
      onStart={() => void start()}
      kinds={kinds}
      kindId={kindId}
      onKindChange={onKindChange}
      subjectLabel={name}
      startBlockedNote={note}
      problem={problem === undefined ? undefined : t(`computerAnalysis.form.problem.${problem}`)}
      busy={busy}
      testId={testId}
    >
      <Box sx={{ display: "grid", gap: 2 }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("jobs.kinds.computerAnalysis.newJobIntro")}
        </Typography>
        {existing !== undefined && (
          <Typography variant="body2" data-testid={`${testId}-existing`}>
            {t("jobs.kinds.computerAnalysis.existing", { status: t(`jobs.status.${existing.status}`) })}{" "}
            <Link component={RouterLink} to={jobPath(existing.id)} onClick={onClose} underline="hover" data-testid={`${testId}-existing-link`}>
              {t("jobs.kinds.computerAnalysis.openExisting")}
            </Link>
          </Typography>
        )}
        <JobTargetFields
          value={target}
          onChange={(patch) => {
            setProblem(undefined);
            setTarget((current) => ({ ...current, ...patch }));
          }}
          projectName={projectName}
          projects={candidates}
          testId={`${testId}-target`}
        />
        <ComputerAnalysisForm
          options={shownOptions}
          onChange={(patch) => {
            setProblem(undefined);
            // Held to the bounds of the engine the job will run.
            setOptions(computerAnalysisOptionsFrom({ ...shownOptions, ...patch, engine: engineId }));
          }}
          engineOptions={NO_OPTIONS}
          multiThread={descriptor.capabilities.multiThread}
          deviceLimits={engineLimitsOf(descriptor)}
          lastMove={lastMove}
          blocked={blocked}
          engineChoice={choice.engineChoice(
            presetId,
            (seed) => {
              setEngineId(seed.engineId);
              setPresetId(seed.presetId);
              prefill(seed.engineId, seed.search);
            },
            (next, search) => {
              setPresetId(next);
              prefill(engineId, search);
            },
          )}
          singleVariant={single}
          testId={`${testId}-form`}
        />
      </Box>
    </NewJobFrame>
  );
}

export default ComputerAnalysisNewJob;
