import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { AccuracyReportRow } from "../../../blocks/panels";
import type { SideValue } from "../../../design-system/components/forms";
import {
  gradePosition,
  needsEngine,
  sessionPositionsOf,
  sessionSummaryOf,
  trainingPositionsOf,
  withEngineResult,
  type PositionGrade,
  type TrainingPosition,
} from "../../../lib/accuracyTrainer";
import { saveCaseState } from "../../../lib/analysisCaseStore";
import { caseStateOf, DEFAULT_CASE_DISPLAY, type CaseState } from "../../../lib/analysisProjects";
import {
  answerPosition,
  caseTreeOf,
  chosenMoveOf,
  isAtPosition,
  nextUnanswered,
  openPosition,
  startSession,
  withPositionJob,
  withSessionAnnotations,
  type FindBestMoveSession,
  type PositionAnnotation,
} from "../../../lib/findBestMoveSession";
import { useAutosave } from "../../board/core/useAutosave";
import { useBoardCore } from "../../board/core/useBoardCore";
import { createSessionCase } from "./sessionCase";
import type { SessionSource } from "./SessionSetup";
import { useEvaluatePositionJobs, type PositionEngineState } from "./useEvaluatePositionJobs";

/** How many of the engine's lines a position needs, to start with. */
const DEFAULT_LINES = 3;

const NO_JOBS: readonly (string | null)[] = [];

/** The side a position's board faces: its side to move. */
const facing = (position: TrainingPosition): "white" | "black" => (position.turn === "w" ? "white" : "black");

/** The session's settings — the left panel's, for the session. */
export type SessionSettings = { showArrows: boolean; engine: boolean; lines: number };

/**
 * **A Find Best Move session, run** (CTA-238, v3) — the screen's one hook:
 * the board core, the session (`lib/findBestMoveSession.ts`), its Case and
 * its autosave, the Evaluate Position jobs and the grading. The screen
 * composes what it returns and decides nothing itself. The reference is
 * `.claude/rules/accuracy-trainer.md`.
 *
 * - **Start** makes the session's Case (`createSessionCase`), then opens its
 *   first position. **Opening** a position loads its view of the Case's tree
 *   — every move before it, its continuation set aside — facing the side to
 *   move, on the position.
 * - **The Case's tree now** is the board's with the continuation put back
 *   (`caseTreeOf`) and the session's annotations written — the engine's lines
 *   and the graded answers (`withSessionAnnotations`); autosaved, with the
 *   done jobs' ids as its merges.
 * - **The engine**: on, a position with fewer top lines than needed is
 *   searched once the reader moves a piece there (or chooses); a choice its
 *   search is still running for **waits** for it, then is graded against the
 *   tree's lines and the engine's.
 */
export const useFindBestMoveSession = () => {
  const { t } = useTranslation();
  const core = useBoardCore();

  const [settings, setSettings] = useState<SessionSettings>({ showArrows: true, engine: false, lines: DEFAULT_LINES });
  const [session, setSession] = useState<FindBestMoveSession | null>(null);
  const [starting, setStarting] = useState(false);
  const [startProblem, setStartProblem] = useState<string | undefined>(undefined);
  // The positions a job is being queued for — a second move before the enqueue answers queues none.
  const queuing = useRef(new Set<string>());
  // The game's name, for the jobs' titles — the source's when the session started.
  const sourceName = useRef("");

  const engineJobs = useEvaluatePositionJobs({ caseId: session?.caseRef.caseId, lines: settings.lines, jobIds: session?.jobs ?? NO_JOBS });
  const engineAt = useCallback((index: number): PositionEngineState => engineJobs.states[index] ?? { kind: "none" }, [engineJobs.states]);

  /** Each position with its engine search, once it has one. */
  const positions = useMemo(
    () =>
      session === null
        ? []
        : session.positions.map((each, index) => {
            const state = engineJobs.states[index];
            return state?.kind === "done" ? withEngineResult(each, state.result) : each;
          }),
    [session, engineJobs.states],
  );

  /** Whether a position's answer waits for its search — a move chosen while the job runs. */
  const waitsAt = useCallback(
    (index: number): boolean => {
      const given = session?.answers[index];
      return given !== null && given !== undefined && given.length > 0 && engineAt(index).kind === "pending";
    },
    [session, engineAt],
  );

  const grades = useMemo(
    (): (PositionGrade | null)[] =>
      positions.map((each, index) => {
        const given = session?.answers[index];
        return given === null || given === undefined || waitsAt(index) ? null : gradePosition(each, given);
      }),
    [positions, session, waitsAt],
  );

  /** A position's move, as a job's title and the live progress name it ("12. White"). */
  const labelOf = useCallback(
    (each: TrainingPosition) =>
      t("accuracyTrainer.session.moveLabel", {
        number: each.moveNumber,
        side: t(each.turn === "w" ? "accuracyTrainer.position.white" : "accuracyTrainer.position.black"),
      }),
    [t],
  );

  /** A graded answer as the Case's comment says it — none while it waits (a comment written once, never rewritten). */
  const answerTextOf = useCallback(
    (index: number): string | undefined => {
      const given = session?.answers[index];
      if (given === null || given === undefined) return undefined;
      if (given.length === 0) return t("accuracyTrainer.session.answer.passed");
      const graded = grades[index]?.suggestions[0];
      if (graded === undefined) return undefined;
      if (graded.kind === "outside") {
        return t("accuracyTrainer.session.answer.outside", { san: graded.san, count: positions[index]?.topCount ?? 0, loss: graded.lossAtLeast });
      }
      const verdict =
        graded.verdict !== null
          ? t(`computerAnalysis.verdicts.${graded.verdict}`)
          : t(graded.loss === 0 ? "accuracyTrainer.lines.best" : "accuracyTrainer.lines.good");
      return t("accuracyTrainer.session.answer.line", { san: graded.san, verdict, loss: graded.loss });
    },
    [session, grades, positions, t],
  );

  /** The Case's tree now: the board's, its continuation back, the session's annotations written. */
  const caseTree = useMemo(() => {
    if (session === null) return undefined;
    const annotations = session.positions.map((each, index): PositionAnnotation => {
      const state = engineJobs.states[index];
      const answer = answerTextOf(index);
      return { path: each.path, ...(state?.kind === "done" ? { engine: state.result } : {}), ...(answer === undefined ? {} : { answer }) };
    });
    return withSessionAnnotations(caseTreeOf(session, core.tree), annotations);
  }, [session, core.tree, engineJobs.states, answerTextOf]);

  const caseId = session?.caseRef.caseId;
  const caseState = useMemo<CaseState | undefined>(
    () => (caseTree === undefined ? undefined : caseStateOf(caseTree, null, "white", DEFAULT_CASE_DISPLAY, engineJobs.merges)),
    [caseTree, engineJobs.merges],
  );
  const saveCase = useCallback(
    (state: CaseState) => {
      if (caseId !== undefined) void saveCaseState(caseId, state);
    },
    [caseId],
  );
  useAutosave({ enabled: session !== null, record: caseState, save: saveCase });

  /** Load a session's position on the board — its view, facing the side to move, on the position. */
  const show = (next: FindBestMoveSession) => {
    setSession(next);
    core.loadTree(next.view.board);
    core.goToNode(next.view.nodeId);
    const position = next.positions[next.index];
    if (position !== undefined) core.setOrientation(facing(position));
  };

  /** Search a position with the engine — once, where the engine is on and its lines are fewer than needed. */
  const evaluateAt = (index: number) => {
    if (!settings.engine || session === null || session.jobs[index] !== null) return;
    const target = positions[index];
    const key = `${session.caseRef.caseId}:${index}`;
    if (target === undefined || !needsEngine(target, settings.lines) || queuing.current.has(key)) return;
    queuing.current.add(key);
    const forCase = session.caseRef.caseId;
    void engineJobs
      .evaluate({ fen: target.fen, path: target.path, label: labelOf(target) }, t("accuracyTrainer.session.jobTitle", { name: sourceName.current, move: labelOf(target) }))
      .then((jobId) => {
        queuing.current.delete(key);
        if (jobId === undefined) return;
        setSession((current) => (current === null || current.caseRef.caseId !== forCase ? current : withPositionJob(current, index, jobId)));
      });
  };

  /** **Start** a session on a game and a side: its Case made, then its first position. */
  const start = async (source: SessionSource, side: SideValue) => {
    if (starting) return;
    const trained = sessionPositionsOf(
      trainingPositionsOf(source.tree, { unevaluated: settings.engine }),
      side === "all" ? "both" : side === "white" ? "w" : "b",
    );
    if (trained.length === 0) return;
    setStarting(true);
    setStartProblem(undefined);
    const made = await createSessionCase({
      tree: source.tree,
      projectName: t("accuracyTrainer.session.projectName"),
      caseName: t("accuracyTrainer.session.caseName", { name: source.name }),
    });
    setStarting(false);
    const started = made === undefined ? undefined : startSession({ caseRef: made, positions: trained, tree: made.base });
    if (started === undefined) {
      setStartProblem(t("accuracyTrainer.session.caseProblem"));
      return;
    }
    sourceName.current = source.name;
    show(started);
  };

  /** Back to the setup — the Case and the jobs stay. */
  const reset = () => {
    setSession(null);
    core.reset();
  };

  /** Open a position of the session, on the Case's tree as it stands. */
  const open = (index: number) => {
    if (session === null || caseTree === undefined) return;
    show(openPosition(session, index, caseTree));
  };

  /** Answer the position on screen — the move chosen, or a pass. A choice its lines are too few for asks the engine. */
  const answer = (moves: readonly string[]) => {
    if (session === null) return;
    if (moves.length > 0) evaluateAt(session.index);
    setSession(answerPosition(session, moves));
  };

  /** **Next**: the next position still to answer — `false` when none is left (the summary's turn). */
  const next = (): boolean => {
    if (session === null) return false;
    const later = nextUnanswered(session);
    if (later === undefined) return false;
    open(later);
    return true;
  };

  const index = session?.index ?? 0;
  const position = session === null ? undefined : positions[index];
  const answered = session === null ? null : session.answers[index];
  const answering = position !== undefined && answered === null;
  const atPosition = session !== null && isAtPosition(session.view, core.tree, core.nodeId);

  // The reader's first move at a position starts its search: their drops go through the core, then ask.
  const onPieceDrop: typeof core.onPieceDrop = (args) => {
    const accepted = core.onPieceDrop(args);
    if (accepted && answering && atPosition) evaluateAt(index);
    return accepted;
  };
  const resolvePromotion: typeof core.resolvePromotion = (piece) => {
    core.resolvePromotion(piece);
    if (piece !== null && answering && atPosition) evaluateAt(index);
  };

  const reportRows = useMemo<AccuracyReportRow[]>(
    () =>
      session === null
        ? []
        : positions.map((each, at) => ({
            index: at,
            moveNumber: each.moveNumber,
            turn: each.turn,
            playedSan: each.playedSan,
            bestSan: each.lines[0]?.san ?? "–",
            suggestions: session.answers[at] ?? [],
            grade: grades[at],
          })),
    [session, positions, grades],
  );
  const summary = useMemo(() => sessionSummaryOf(grades.flatMap((each) => (each === null ? [] : [each]))), [grades]);

  return {
    core,
    settings,
    setSettings,
    session,
    /** The position on screen, its engine search in. */
    position,
    /** Its answer: the move chosen, `[]` a pass, `null` not yet. */
    answered,
    answering,
    grade: session === null ? null : grades[index],
    waiting: session !== null && waitsAt(index),
    engine: session === null ? undefined : engineAt(index),
    /** The move Choose would take — the line on screen's first from the position. */
    candidate: session === null ? undefined : chosenMoveOf(session.view, core.tree, core.nodeId),
    /** Whether the reader may move a piece: while answering, on the position or inside a line from it; once answered, anywhere. */
    canMove: session !== null && (atPosition || !answering),
    hasNext: session !== null && nextUnanswered(session) !== undefined,
    reportRows,
    summary,
    starting,
    startProblem,
    start,
    reset,
    open,
    choose: (san: string) => answer([san]),
    pass: () => answer([]),
    next,
    board: { onPieceDrop, resolvePromotion },
  };
};
