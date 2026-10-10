import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router";
import { useTranslation } from "react-i18next";

import { ComputerAnalysisForm, type ComputerAnalysisStartProblem } from "../../../blocks/forms";
import { ComputerAnalysisReport, EvalGraph, evalText } from "../../../blocks/panels";
import { JOB_STATUS_TONES } from "../../../blocks/tables";
import { InlineAlert } from "../../../design-system/components/feedback";
import { ProgressLine } from "../../../design-system/components/states";
import {
  analysisPositionsOf,
  computerAnalysisOptionsFrom,
  turnOf,
  type ComputerAnalysisOptions,
  type MoveVerdictKind,
} from "../../../lib/computerAnalysis";
import { evalSeriesOf, reportFromTree, type EvalPoint } from "../../../lib/computerAnalysisTree";
import type { Turn } from "../../../lib/engineAnalysis";
import { deviceEngineLimits } from "../../../lib/engineSettings";
import type { EngineOption } from "../../../lib/engineTypes";
import { gameTag } from "../../../lib/gameModel";
import { mainline, plyLabel, type GameTree } from "../../../lib/gameTree";
import { jobLiveAnalysis } from "../../../lib/jobLiveAnalysis";
import { isActiveJob, isFinishedJob, jobMoveLabel, jobProgress, type Job, type JobSource } from "../../../lib/jobs";
import { enqueueComputerAnalysis } from "../../../lib/jobStore";
import { SAVED_ANALYSIS_PLAYER } from "../../../lib/savedAnalyses";
import { useJobs } from "../../jobs/useJobs";

type ComputerAnalysisTabProps = {
  /** The game on the board, its mainline's length, and where it stands — the mainline's ply, 0 at the start or off the mainline. */
  tree: GameTree;
  mainlineLength: number;
  mainlinePly: number;
  currentNodeId: string | null;
  onGoToNode: (nodeId: string | null) => void;
  /** The form's options — the board's, so they outlive the tab. */
  options: ComputerAnalysisOptions;
  onOptionsChange: (options: ComputerAnalysisOptions) => void;
  /** The engine a job will run (the reader's choice) and what it declared. */
  engine: { id: string; name: string; multiThread: boolean; options: ReadonlyMap<string, EngineOption> };
  /** What a job is sent with, but for the PGN, read when Start is pressed. */
  source: () => JobSource;
  /** The saved analysis on the board — a running job sent from it shows here. */
  recordId: string | null;
  /** The job this board sent — the board's, so it outlives the tab. */
  sentJobId: string | null;
  onSent: (jobId: string) => void;
};

/**
 * The job this game's tab follows: the one it sent; else, of the jobs sent
 * from the same saved analysis, the newest unfinished one, else the newest
 * done one — so a board reopened later still leads to its results.
 */
const jobOfGame = (jobs: readonly Job[] | undefined, sentJobId: string | null, recordId: string | null): Job | undefined => {
  if (jobs === undefined) return undefined;
  const sent = sentJobId === null ? undefined : jobs.find((job) => job.id === sentJobId);
  if (sent !== undefined || recordId === null) return sent;
  // The store keeps the newest first.
  const ofRecord = jobs.filter((job) => job.source.analysisId === recordId);
  return ofRecord.find((job) => !isFinishedJob(job)) ?? ofRecord.find((job) => job.status === "done");
};

/** A player's name from the tags — none for the placeholders a board's own analysis is written with (`Analysis`, `?`). */
const playerOf = (tree: GameTree, key: "White" | "Black"): string | undefined => {
  const name = gameTag(tree.headers, key);
  return name === SAVED_ANALYSIS_PLAYER ? undefined : name;
};

/** The verdicts a report's counts step through, in the order the reader steps: after the move on the board, then round again. */
const nextOfKind = (points: readonly EvalPoint[], side: Turn, kind: MoveVerdictKind, afterPly: number): EvalPoint | undefined => {
  const ofKind = points.filter((point) => point.side === side && point.kind === kind);
  return ofKind.find((point) => point.ply > afterPly) ?? ofKind[0];
};

/**
 * **The Analysis Board's Computer analysis tab** (CTA-174, CTA-171) — three
 * parts, top to bottom:
 *
 * 1. **This game's job**, while there is one — the one this board sent, else
 *    the newest unfinished, else the newest done one sent from the same saved
 *    analysis: its status, its
 *    progress as a status ("12 of 80 positions · 7. Nf3"), why it failed, a
 *    button to each Saved analysis it made once done, and a link to it on the
 *    Jobs screen. The job itself is the shell's runner's
 *    (`.claude/rules/jobs.md`). **While it is queued or running it takes the
 *    form's place** (lichess's request button turning into its progress), so
 *    the same game is not sent twice; Start moves the focus onto it.
 * 2. **The report and the eval graph**, when the tree carries `[%eval]`s — an
 *    output of a computer analysis, a lichess export, the engine's own written
 *    evaluations (`reportFromTree`, `evalSeriesOf`). The graph and the
 *    report's counts move the board (`onGoToNode`).
 * 3. **The form** (`ComputerAnalysisForm`), seeded from the Engine tab and the
 *    reader's engine; Start queues the mainline (`enqueueComputerAnalysis`) —
 *    off with no variant ticked, no moves, or none in the chosen range. Not
 *    shown while this game's job is queued or running.
 */
function ComputerAnalysisTab({
  tree,
  mainlineLength,
  mainlinePly,
  currentNodeId,
  onGoToNode,
  options,
  onOptionsChange,
  engine,
  source,
  recordId,
  sentJobId,
  onSent,
}: ComputerAnalysisTabProps) {
  const { t } = useTranslation();
  const jobs = useJobs();
  const job = jobOfGame(jobs, sentJobId, recordId);
  const active = job !== undefined && isActiveJob(job);
  // Set by a Start that queued a job: the job's section takes the focus when it mounts (the form, and Start with it, goes).
  const focusJobRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<ComputerAnalysisStartProblem | undefined>();

  const read = useMemo(() => {
    const points = evalSeriesOf(tree);
    return points.length === 0 ? undefined : { points, report: reportFromTree(tree) };
  }, [tree]);
  const lastMove = mainlineLength === 0 ? undefined : plyLabel(tree.startFen, mainlineLength).number;
  const inRange = useMemo(() => analysisPositionsOf(tree, options).length > 0, [tree, options]);
  const blocked = lastMove === undefined ? "noMoves" : inRange ? undefined : "noRange";

  const start = async () => {
    setBusy(true);
    setProblem(undefined);
    // Before the write: a saved game's job reaches the store, and mounts its section, before the write's promise settles.
    focusJobRef.current = true;
    const result = await enqueueComputerAnalysis({ source: source(), options: { ...options, engine: engine.id } });
    setBusy(false);
    if (result === "invalid" || result === "storage" || result === "too-many") {
      focusJobRef.current = false;
      setProblem(result);
    } else onSent(result);
  };

  const moveLabel = (point: EvalPoint) => {
    const { number, isWhiteMove } = plyLabel(tree.startFen, point.ply);
    return `${number}${isWhiteMove ? "." : "..."} ${point.san ?? ""}`;
  };

  return (
    <Box data-testid="analysis-computer" sx={{ display: "grid", gap: 2.5 }}>
      {job !== undefined && (
        <GameJob
          key={job.id}
          job={job}
          takeFocusRef={focusJobRef}
          board={{ tree, mainlinePly, currentNodeId, onGoToNode, labelOf: moveLabel }}
        />
      )}

      {read !== undefined && (
        <Box component="section" aria-labelledby="analysis-computer-report-title" sx={{ display: "grid", gap: 1.5 }}>
          <Typography id="analysis-computer-report-title" component="h3" variant="subtitle2" sx={{ fontWeight: 700 }}>
            {t("computerAnalysis.board.reportTitle")}
          </Typography>
          <EvalGraph
            points={read.points}
            currentNodeId={currentNodeId}
            onSelect={(point) => onGoToNode(point.nodeId)}
            labelOf={moveLabel}
            label={t("computerAnalysis.graph.title")}
            testId="analysis-computer-graph"
          />
          <ComputerAnalysisReport
            report={read.report}
            players={{ w: playerOf(tree, "White"), b: playerOf(tree, "Black") }}
            onStep={(side, kind) => {
              const next = nextOfKind(read.points, side, kind, mainlinePly);
              if (next !== undefined) onGoToNode(next.nodeId);
            }}
            testId="analysis-computer-report"
          />
        </Box>
      )}

      {!active && (
        <Box component="section" aria-labelledby="analysis-computer-form-title" sx={{ display: "grid", gap: 1.5 }}>
          <Box>
            <Typography id="analysis-computer-form-title" component="h3" variant="subtitle2" sx={{ fontWeight: 700 }}>
              {t("computerAnalysis.board.formTitle")}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("computerAnalysis.board.formIntro")}
            </Typography>
          </Box>
          <ComputerAnalysisForm
            options={options}
            onChange={(patch) => {
              setProblem(undefined);
              onOptionsChange(computerAnalysisOptionsFrom({ ...options, ...patch }));
            }}
            engineOptions={engine.options}
            multiThread={engine.multiThread}
            engineName={engine.name}
            deviceLimits={deviceEngineLimits()}
            lastMove={lastMove}
            blocked={blocked}
            onStart={() => void start()}
            busy={busy}
            problem={problem}
            testId="analysis-computer-form"
          />
        </Box>
      )}
    </Box>
  );
}

/**
 * The job this game was sent in: its status and progress, its outputs once
 * done, the way to it on the Jobs screen. Mounted afresh per job (`key`); it
 * takes the focus on mounting when `takeFocusRef` says a Start just sent it.
 */
/** What the job's live results need of the board: its game, where it stands, and the way to move it. */
type BoardLink = {
  tree: GameTree;
  mainlinePly: number;
  currentNodeId: string | null;
  onGoToNode: (nodeId: string | null) => void;
  labelOf: (point: EvalPoint) => string;
};

function GameJob({ job, takeFocusRef, board }: { job: Job; takeFocusRef: RefObject<boolean>; board: BoardLink }) {
  const { t } = useTranslation();
  const heading = useRef<HTMLHeadingElement>(null);
  const progress = jobProgress(job);
  const move = isFinishedJob(job) || progress.current === undefined ? undefined : jobMoveLabel(progress.current);
  useEffect(() => {
    if (!takeFocusRef.current) return;
    takeFocusRef.current = false;
    heading.current?.focus();
  }, [takeFocusRef]);
  return (
    <Box component="section" aria-labelledby="analysis-computer-job-title" data-testid="analysis-computer-job" sx={{ display: "grid", gap: 1 }}>
      <Box>
        <Typography
          id="analysis-computer-job-title"
          ref={heading}
          tabIndex={-1}
          component="h3"
          variant="subtitle2"
          sx={{ fontWeight: 700 }}
        >
          {t("computerAnalysis.board.jobTitle")}
        </Typography>
        <Typography
          variant="body2"
          data-testid="analysis-computer-job-status"
          sx={{ color: JOB_STATUS_TONES[job.status], fontWeight: 600 }}
        >
          {t(`jobs.status.${job.status}`)}
        </Typography>
      </Box>
      {job.status !== "done" && (
        <ProgressLine
          value={progress.percent}
          label={t("computerAnalysis.board.progressLabel")}
          announce
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
          testId="analysis-computer-job-progress"
        />
      )}
      {isActiveJob(job) && (
        <Typography variant="body2" data-testid="analysis-computer-job-note" sx={{ color: "text.secondary" }}>
          {t("computerAnalysis.board.running")}
        </Typography>
      )}
      {job.status === "done" && (
        <Typography variant="body2" data-testid="analysis-computer-job-note" sx={{ color: "text.secondary" }}>
          {t("computerAnalysis.board.done")}
        </Typography>
      )}
      {job.status === "failed" && job.error !== null && (
        <InlineAlert severity="error" dense testId="analysis-computer-job-error">
          {t(`jobs.errors.${job.error}`)}
        </InlineAlert>
      )}
      <LiveResults job={job} board={board} />
      <Box sx={{ display: "grid", gap: 1, justifyItems: "start" }}>
        {job.outputs.map((output) => (
          <Button
            key={output.analysisId}
            variant="contained"
            component={RouterLink}
            to={`/tools/analysis?analysis=${encodeURIComponent(output.analysisId)}`}
            data-testid={`analysis-computer-job-output-${output.variant}`}
          >
            {t("jobs.openOutput", { variant: t(`computerAnalysis.variants.${output.variant}`) })}
          </Button>
        ))}
        <Link
          component={RouterLink}
          to={`/jobs?job=${encodeURIComponent(job.id)}`}
          underline="hover"
          data-testid="analysis-computer-job-link"
        >
          {t("computerAnalysis.board.openJobs")}
        </Link>
      </Box>
    </Box>
  );
}

/**
 * **The job's results so far** (`jobLiveAnalysis`), drawn as they land — the
 * eval graph filling in move by move, the latest finished position's eval and
 * best line, and the report over the moves judged so far — lichess's server
 * analysis, filling in. The job's own tree is a re-parse of its source, whose
 * node ids are not the board's: each point is the board's mainline node at its
 * ply, kept only while that node holds the same position, so a click moves the
 * board and a board edited since sending simply loses the points it changed.
 */
function LiveResults({ job, board }: { job: Job; board: BoardLink }) {
  const { t } = useTranslation();
  const live = useMemo(() => jobLiveAnalysis(job), [job]);
  const { tree, mainlinePly, currentNodeId, onGoToNode, labelOf } = board;
  const points = useMemo((): EvalPoint[] => {
    if (live === undefined) return [];
    const nodes = mainline(tree);
    return live.points.flatMap((point): EvalPoint[] => {
      if (point.ply === 0) return tree.startFen === point.fen ? [{ ...point, nodeId: null }] : [];
      const node = nodes[point.ply - 1];
      if (node?.fen !== point.fen) return [];
      // The move was played by the side not to move after it.
      return [{ ...point, nodeId: node.id, san: node.san, side: turnOf(point.fen) === "w" ? "b" : "w" }];
    });
  }, [live, tree]);
  if (live === undefined || points.length === 0) return null;
  const { latest } = live;

  return (
    <Box data-testid="analysis-computer-live" sx={{ display: "grid", gap: 1.5, pt: 0.5 }}>
      <EvalGraph
        points={points}
        currentNodeId={currentNodeId}
        onSelect={(point) => onGoToNode(point.nodeId)}
        labelOf={labelOf}
        label={t("computerAnalysis.board.liveGraph")}
        span={job.positions.length}
        testId="analysis-computer-live-graph"
      />
      {latest !== undefined && (
        <Typography variant="body2" data-testid="analysis-computer-live-latest">
          {latest.move === undefined
            ? t("computerAnalysis.board.latestStart")
            : t("computerAnalysis.board.latest")}{" "}
          {latest.move !== undefined && <bdi dir="ltr">{latest.move}</bdi>}
          {": "}
          <bdi dir="ltr">{evalText(latest.line.score)}</bdi>
          {" · "}
          {t("computerAnalysis.board.depth", { depth: latest.line.depth })}
          {latest.moves !== "" && (
            <>
              {" · "}
              <bdi dir="ltr">{latest.moves}</bdi>
            </>
          )}
        </Typography>
      )}
      {live.verdicts.length > 0 && (
        <ComputerAnalysisReport
          report={live.report}
          players={{ w: playerOf(tree, "White"), b: playerOf(tree, "Black") }}
          onStep={(side, kind) => {
            const next = nextOfKind(points, side, kind, mainlinePly);
            if (next !== undefined) onGoToNode(next.nodeId);
          }}
          testId="analysis-computer-live-report"
        />
      )}
    </Box>
  );
}

export default ComputerAnalysisTab;
