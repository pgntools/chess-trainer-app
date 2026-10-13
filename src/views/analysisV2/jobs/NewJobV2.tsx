import { useMemo, useState, useSyncExternalStore } from "react";
import { useHref, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

import { NewJobDialog } from "../../../blocks/dialogs";
import {
  initialJobTarget,
  JobTargetFields,
  jobTargetProblem,
  type ComputerAnalysisStartProblem,
  type JobTargetChoice,
} from "../../../blocks/forms";
import { useSnackbar } from "../../../design-system/components/feedback";
import { createAnalysisProject, removeAnalysisProject } from "../../../lib/analysisProjectStore";
import type { AnalysisCase, AnalysisProject } from "../../../lib/analysisProjects";
import {
  analysisPositionsOf,
  computerAnalysisOptionsFrom,
  DEFAULT_COMPUTER_ANALYSIS_OPTIONS,
  type ComputerAnalysisOptions,
} from "../../../lib/computerAnalysis";
import { presetSearchOf, presetSentValues, selectedPresetOf, withDefaultPreset, type EnginePreset } from "../../../lib/enginePresets";
import {
  enginePresetSelectionsSnapshot,
  enginePresetsSnapshot,
  subscribeEnginePresetSelections,
  subscribeEnginePresets,
} from "../../../lib/enginePresetStore";
import type { EngineSearchSettings } from "../../../lib/engineSearchSettings";
import { engineLimitsOf } from "../../../lib/engineSettings";
import { describeEngines, resolveEngine } from "../../../lib/engines";
import { mainline, plyLabel, treeToPgn, type GameTree } from "../../../lib/gameTree";
import { jobV2OfCase, type JobV2Target } from "../../../lib/jobsV2";
import { enqueueJobV2 } from "../../../lib/jobV2Store";
import { useEngineChoice } from "../../shared/useEngineChoice";
import { useEngineSearchSettings } from "../../shared/useEngineSearchSettings";
import { useSelectedEnginePreset } from "../../shared/useSelectedEnginePreset";
import { jobsV2Path } from "../paths";
import { useAnalysisProjects, useJobsV2 } from "../useAnalysisProjects";
import { defaultPresetInEffect, useJobsSettings } from "./useJobsSettings";

/** The Case a New Job V2 is for — its record, the tree on its board, and its name as shown. */
export type NewJobV2Case = { record: AnalysisCase; tree: GameTree; name: string };

/** The engine's own first options: the preset's depth and time, the search settings' Threads, Hash and lines (CTA-188's decision). */
const seedOptions = (engineId: string, preset: EnginePreset, settings: EngineSearchSettings): ComputerAnalysisOptions => {
  const search = presetSearchOf(preset);
  return computerAnalysisOptionsFrom({
    ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS,
    engine: engineId,
    depth: search.depth,
    minDepth: search.depth,
    moveTimeMs: search.moveTimeMs,
    multiPv: settings.multiPv,
    threads: settings.threads,
    hashMb: settings.hashMb,
  });
};

/**
 * **New Job V2** (CTA-188) — the screen side of `NewJobDialog` for a Case,
 * opened from the Case view's Jobs tab (`CaseJobs`' New job):
 *
 * - **asks first when the Case has a job** (`jobV2OfCase`: Start a new
 *   analysis / Check existing — the Jobs V2 view at it);
 * - **the engine and its preset**, each a select as the top bar's Engine menu
 *   offers them — seeded from **the Jobs settings' default** where one is set
 *   and still there (CTA-193), else the board's engine and its selected
 *   preset — **prefill** the depth and time per move (the preset's) and
 *   Threads, Hash and lines (the global search settings) — all editable for
 *   this one job; changing the engine or the preset prefills them again;
 * - **Where to save the results** (`JobTargetFields`): new Cases in the
 *   Project, another Project — a new one, named after the Case, made on
 *   Start in the source Project's folder, or an existing one — or **into
 *   this Case**, one variant; every new Case linked from the source Case (the
 *   runner's);
 * - **Start** queues the job (`enqueueJobV2`) with the Case's tree as the
 *   board holds it then, the preset's values as they are then, closes and
 *   says so in a snackbar whose button opens the job. A refusal stays in the
 *   dialog (a Project made for it taken back).
 *
 * The job is the shell's Jobs V2 runner's (`lib/jobV2Runner.ts`).
 */
function NewJobV2({ open, onClose, testId }: { open: NewJobV2Case | null; onClose: () => void; testId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { show } = useSnackbar();
  const base = useHref("/");
  const jobs = useJobsV2();
  const projects = useAnalysisProjects();
  const { engineId: chosenEngine } = useEngineChoice();
  const { settings } = useEngineSearchSettings();
  const presets = useSyncExternalStore(subscribeEnginePresets, enginePresetsSnapshot, enginePresetsSnapshot);
  const selections = useSyncExternalStore(subscribeEnginePresetSelections, enginePresetSelectionsSnapshot, enginePresetSelectionsSnapshot);
  const jobsSettings = useJobsSettings();

  const [engineId, setEngineId] = useState(() => resolveEngine(chosenEngine).id);
  const [presetId, setPresetId] = useState(() => selectedPresetOf(presets ?? [], selections ?? [], resolveEngine(chosenEngine).id).id);
  const [options, setOptions] = useState<ComputerAnalysisOptions>(DEFAULT_COMPUTER_ANALYSIS_OPTIONS);
  const [target, setTarget] = useState<JobTargetChoice>(() => initialJobTarget(""));
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<ComputerAnalysisStartProblem | undefined>();

  const sourceProject = open === null ? undefined : projects?.find((project) => project.id === open.record.projectId);
  const projectName = sourceProject === undefined ? "" : sourceProject.name || t("analysisV2.project.untitled");

  /*
    Seeded as the dialog opens — the engine chosen, its preset, the search
    settings — and the Case last opened for kept while it fades out. Adjusted
    during render.
  */
  const [shown, setShown] = useState(open);
  if (open !== null && open !== shown) setShown(open);
  const [wasOpen, setWasOpen] = useState(false);
  if ((open !== null) !== wasOpen) {
    setWasOpen(open !== null);
    if (open !== null) {
      // The Jobs settings' default where one applies (CTA-193), else the board's engine and its selected preset.
      const preferred = defaultPresetInEffect(jobsSettings, presets);
      const engine = preferred?.engineId ?? resolveEngine(chosenEngine).id;
      const preset =
        withDefaultPreset(presets ?? []).find((each) => each.id === preferred?.presetId) ??
        selectedPresetOf(presets ?? [], selections ?? [], engine);
      setEngineId(engine);
      setPresetId(preset.id);
      setOptions(seedOptions(engine, preset, settings));
      // A new Project is named after the Case analysed, not the Project it is in.
      setTarget(initialJobTarget(t("analysisV2.jobs.defaultProjectName", { name: open.name })));
      setProblem(undefined);
    }
  }

  const descriptor = resolveEngine(engineId);
  const named = useSelectedEnginePreset(engineId);
  const presetOf = (id: string): EnginePreset => withDefaultPreset(presets ?? []).find((preset) => preset.id === id) ?? withDefaultPreset([])[0];
  const single = target.kind === "case";
  // Into the Case: one variant, the first ticked.
  const shownOptions = useMemo(
    (): ComputerAnalysisOptions => (single && options.outputs.length !== 1 ? { ...options, outputs: [options.outputs[0] ?? "light"] } : options),
    [single, options],
  );

  const existing = open === null ? undefined : jobV2OfCase(jobs, open.record.id);
  const tree = shown?.tree;
  const mainlineLength = useMemo(() => (tree === undefined ? 0 : mainline(tree).length), [tree]);
  const lastMove = tree === undefined || mainlineLength === 0 ? undefined : plyLabel(tree.startFen, mainlineLength).number;
  const inRange = useMemo(() => tree !== undefined && analysisPositionsOf(tree, shownOptions).length > 0, [tree, shownOptions]);
  const blocked = lastMove === undefined ? "noMoves" : inRange ? undefined : "noRange";
  const targetProblem = jobTargetProblem(target);

  const candidates = useMemo(() => {
    if (open === null || projects === undefined) return [];
    return projects
      .filter((project) => project.id !== open.record.projectId)
      .map((project) => ({ id: project.id, name: project.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [open, projects]);

  const prefill = (engine: string, preset: EnginePreset) => {
    const search = presetSearchOf(preset);
    setOptions((current) =>
      computerAnalysisOptionsFrom({ ...current, engine, depth: search.depth, moveTimeMs: search.moveTimeMs, minDepth: Math.min(current.minDepth, search.depth) }),
    );
  };

  const start = async () => {
    if (open === null || sourceProject === undefined || targetProblem !== undefined) return;
    setBusy(true);
    setProblem(undefined);
    let made: AnalysisProject | undefined;
    let jobTarget: JobV2Target;
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
    const preset = presetOf(presetId);
    const result = await enqueueJobV2({
      source: { projectId: sourceProject.id, caseId: open.record.id, name: open.name, pgn: treeToPgn(open.tree) },
      options: { ...shownOptions, engine: engineId },
      preset: { id: preset.id, name: named.presets.find((each) => each.id === preset.id)?.name ?? preset.name, values: presetSentValues(preset) },
      target: jobTarget,
    });
    setBusy(false);
    if (result === "invalid" || result === "storage" || result === "too-many") {
      if (made !== undefined) await removeAnalysisProject(made.id);
      setProblem(result);
      return;
    }
    onClose();
    const path = jobsV2Path(result);
    show({
      severity: "success",
      duration: 10_000,
      testId: `${testId}-notice`,
      message: t("analysisV2.jobs.queued", { name: open.name }),
      action: {
        label: t("analysisV2.jobs.openJob"),
        onClick: () => navigate(path),
        href: base === "/" ? path : `${base}${path}`,
        testId: `${testId}-open-job`,
      },
    });
  };

  return (
    <NewJobDialog
      open={open !== null}
      onClose={onClose}
      title={t("analysisV2.jobs.newJobTitle")}
      intro={t("analysisV2.jobs.newJobIntro")}
      gameName={shown?.name ?? ""}
      existing={
        existing === undefined
          ? undefined
          : {
              status: existing.status,
              onCheck: () => {
                onClose();
                navigate(jobsV2Path(existing.id));
              },
            }
      }
      targetSection={
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
      }
      startBlockedNote={targetProblem === undefined ? undefined : t(`analysisV2.jobs.targetProblem.${targetProblem}`)}
      engineChoice={{
        engines: describeEngines(),
        engineId,
        onEngineChange: (next) => {
          const engine = resolveEngine(next).id;
          const preset = selectedPresetOf(presets ?? [], selections ?? [], engine);
          setEngineId(engine);
          setPresetId(preset.id);
          prefill(engine, preset);
        },
        presets: named.presets,
        presetId,
        onPresetChange: (next) => {
          setPresetId(next);
          prefill(engineId, presetOf(next));
        },
      }}
      singleVariant={single}
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
      onStart={() => void start()}
      busy={busy}
      problem={problem}
      testId={testId}
    />
  );
}

/** No engine runs here — what the form knows of it is its descriptor's. */
const NO_OPTIONS = new Map();

export default NewJobV2;
