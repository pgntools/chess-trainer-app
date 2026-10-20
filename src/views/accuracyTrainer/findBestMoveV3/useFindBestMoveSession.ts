import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { AccuracyReportRow, AccuracyTrainerMoves, AccuracyTrainerResult } from "../../../blocks/panels";
import {
  gradePosition,
  needsEngine,
  sessionSummaryOf,
  targetOf,
  withEngineResult,
  type PositionGrade,
  type TrainingPosition,
} from "../../../lib/accuracyTrainer";
import { saveCaseState } from "../../../lib/analysisCaseStore";
import { caseStateOf, DEFAULT_CASE_DISPLAY, type AnalysisCase, type CaseState } from "../../../lib/analysisProjects";
import {
  answerPosition,
  candidatesOf,
  caseTreeOf,
  isAtPosition,
  leavePosition,
  nextUnanswered,
  openPosition,
  positionAtPath,
  reopenPassed,
  reorderedCandidates,
  resumeSession,
  workOf,
  withPositionJob,
  withoutCandidate,
  withoutPositionComment,
  withSessionAnnotations,
  type FindBestMoveSession,
  type PositionAnnotation,
} from "../../../lib/findBestMoveSession";
import { sessionRecordOf, withSessionRecord } from "../../../lib/findBestMoveSessionPgn";
import { nodeAtSanPath, sanPathTo } from "../../../lib/gameTree";
import { parsePgnTree } from "../../../lib/pgn";
import { useAutosave } from "../../board/core/useAutosave";
import { useBoardCore } from "../../board/core/useBoardCore";
import { useEvaluatePositionJobs, type PositionEngineState } from "./useEvaluatePositionJobs";

/** How many best moves to find at each position, to start with. */
const DEFAULT_MOVES = 3;

/** How long each of the game's moves between two positions stays on the board as they are played out. */
export const STEP_DELAY_MS = 1000;

const NO_JOBS: readonly (string | null)[] = [];

/** A position's game move as the panels name it — a session from a position alone has none (CTA-239). */
const playedOf = (position: TrainingPosition): string => (position.playedSan === "" ? "–" : position.playedSan);

/** The side a position's board faces: its side to move. */
const facing = (position: TrainingPosition): "white" | "black" => (position.turn === "w" ? "white" : "black");

/**
 * The left panel's settings: how many best moves to find (fixed for a
 * session once it starts), the next-move arrows, the engine.
 */
export type SessionSettings = { moves: number; showArrows: boolean; engine: boolean };

const DEFAULT_SETTINGS: SessionSettings = { moves: DEFAULT_MOVES, showArrows: true, engine: false };

/**
 * **A session Case read back** (CTA-239): its PGN parsed, the session it
 * holds resumed on it — or `undefined`, a Case that is not a session (one from
 * before CTA-239, one put in the project by hand) or whose PGN will not read.
 */
const resumedOf = (record: AnalysisCase): { session: FindBestMoveSession; settings: SessionSettings } | undefined => {
  let tree;
  try {
    tree = parsePgnTree(record.pgn);
  } catch {
    return undefined;
  }
  const stored = sessionRecordOf(tree);
  const session = stored === undefined ? undefined : resumeSession({ projectId: record.projectId, caseId: record.id }, stored, tree);
  return stored === undefined || session === undefined
    ? undefined
    : { session, settings: { moves: stored.wanted, showArrows: stored.showArrows, engine: stored.engine } };
};

/**
 * **A Find Best Move session, run** (CTA-238, v3) — the screen's one hook:
 * the board core, the session (`lib/findBestMoveSession.ts`), its Case and
 * its autosave, the Evaluate Position jobs and the grading. The screen
 * composes what it returns and decides nothing itself. The reference is
 * `.claude/rules/accuracy-trainer.md`.
 *
 * - **A session is its Case** (CTA-239): the hook **resumes** it from its
 *   Case's PGN (`resume`, read once as the screen mounts) — a new one made by
 *   the lobby's form, its PGN the whole session from the first. **Opening** a position loads its view of the Case's tree
 *   — every move before it, its continuation set aside — facing the side to
 *   move, on the position.
 * - **The Case's tree now** is the board's with the continuation put back
 *   (`caseTreeOf`) and the session's annotations written — the engine's lines,
 *   the graded answers and their lines (`withSessionAnnotations`) — and **the
 *   session itself** (`withSessionRecord`: its tags, each position's command —
 *   nothing of it lives only here); autosaved, with the done jobs' ids (and
 *   the record's own, read) as its merges.
 * - **The answer**: the reader's lines from the position, their first moves
 *   **in their order** (`candidatesOf`) — Check grades them against the top N
 *   the session asks for (`gradePosition`'s `wanted`): found, in place.
 * - **On to the next position** (Next, or a Pass — which goes on at once —,
 *   or Next while answering, which checks first, CTA-240): the
 *   board starts at the position just answered and plays the game's moves to
 *   the next one, one every `stepDelayMs` (the reader's side's game move, then
 *   the reply); the reader navigating stops it.
 * - **The engine**: on, a position with fewer top lines than N is searched
 *   once the reader moves a piece there (or checks); a check its search is
 *   still running for **waits** for it, then is graded against the tree's
 *   lines and the engine's.
 */
export const useFindBestMoveSession = ({
  stepDelayMs = STEP_DELAY_MS,
  resume,
}: {
  stepDelayMs?: number;
  /** The session's Case (CTA-239) — read once, as the screen mounts. */
  resume: AnalysisCase;
}) => {
  const { t } = useTranslation();
  // The Case read back once: the session it holds, or none (`notResumable`).
  const [resumed] = useState(() => resumedOf(resume));
  const opening = resumed?.session;
  const openingPosition = opening?.positions[opening.index];
  const core = useBoardCore(
    opening === undefined
      ? {}
      : { tree: opening.view.board, nodeId: opening.view.nodeId, ...(openingPosition === undefined ? {} : { orientation: facing(openingPosition) }) },
  );

  const [settings, setSettings] = useState<SessionSettings>(() => resumed?.settings ?? DEFAULT_SETTINGS);
  const [session, setSession] = useState<FindBestMoveSession | null>(() => resumed?.session ?? null);
  // The positions a job is being queued for — a second move before the enqueue answers queues none.
  const queuing = useRef(new Set<string>());
  // The same, as the screen reads it: a position whose job is being queued already waits for it — a Check then is not graded without its lines.
  const [queuedAt, setQueuedAt] = useState<ReadonlySet<number>>(() => new Set());
  // The merges the Case held when it was read — its tree holds them, so its autosave must carry them, whatever became of their jobs.
  const [readMerges] = useState<readonly string[]>(() => resume.merges);

  // The session's moves to find, once it runs; the setting's before.
  const wanted = session?.wanted ?? settings.moves;
  const engineJobs = useEvaluatePositionJobs({ caseId: session?.caseRef.caseId, lines: wanted, jobIds: session?.jobs ?? NO_JOBS });
  // A position whose lines already hold its search (a session read back) waits for no job.
  const engineAt = useCallback(
    (index: number): PositionEngineState =>
      session?.searched[index] === true
        ? { kind: "none" }
        : queuedAt.has(index) && session?.jobs[index] === null
          ? { kind: "pending", jobId: "" }
          : (engineJobs.states[index] ?? { kind: "none" }),
    [session, engineJobs.states, queuedAt],
  );

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
        return given === null || given === undefined || waitsAt(index) ? null : gradePosition(each, given, { wanted });
      }),
    [positions, session, waitsAt, wanted],
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
      const grade = grades[index];
      if (grade === null || grade === undefined) return undefined;
      const moves = grade.suggestions.map((each) => {
        if (each.kind === "outside") return t("accuracyTrainer.session.answer.moveOutside", { order: each.order, san: each.san });
        const verdict =
          each.verdict !== null
            ? t(`computerAnalysis.verdicts.${each.verdict}`)
            : t(each.loss === 0 ? "accuracyTrainer.lines.best" : "accuracyTrainer.lines.good");
        return t("accuracyTrainer.session.answer.move", { order: each.order, san: each.san, rank: each.rank, verdict });
      });
      return t("accuracyTrainer.session.answer.moves", { moves: moves.join(", "), found: grade.found, count: grade.target, inPlace: grade.inPlace });
    },
    [session, grades, t],
  );

  /**
   * The Case's tree now: the board's, its continuation back, the session's
   * annotations written — and the session itself (CTA-239): its tags and each
   * position's command, the one on screen's lines of the reader's own the
   * board's.
   */
  const caseTree = useMemo(() => {
    if (session === null) return undefined;
    const annotations = session.positions.map((each, index): PositionAnnotation => {
      const state = engineJobs.states[index];
      const answer = answerTextOf(index);
      const given = session.answers[index];
      // Graded with moves: its lines hung in the tree, as any PGN reader shows them.
      const graded = answer !== undefined && given !== null && given !== undefined && given.length > 0 ? positions[index] : undefined;
      return {
        path: each.path,
        ...(state?.kind === "done" ? { engine: state.result } : {}),
        ...(answer === undefined ? {} : { answer }),
        ...(graded === undefined ? {} : { lines: graded.lines, fen: graded.fen }),
      };
    });
    const annotated = withSessionAnnotations(caseTreeOf(session, core.tree), annotations);
    return withSessionRecord(annotated, {
      side: session.side,
      game: session.game,
      positions,
      wanted: session.wanted,
      index: session.index,
      answers: session.answers,
      jobs: session.jobs,
      // A job done: its lines are in the position's, so it is waited for no more. (One that failed stays named a job — read back, as it reads now.)
      searched: session.jobs.map((_, index) => session.searched[index] === true || engineJobs.states[index]?.kind === "done"),
      work: session.work.map((each, index) => (index === session.index ? workOf(session, core.tree) : each)),
      reopened: session.reopened,
      engine: settings.engine,
      showArrows: settings.showArrows,
    });
  }, [session, core.tree, positions, engineJobs.states, answerTextOf, settings.engine, settings.showArrows]);

  const caseId = session?.caseRef.caseId;
  const merges = useMemo(() => [...new Set([...readMerges, ...engineJobs.merges])], [readMerges, engineJobs.merges]);
  const caseState = useMemo<CaseState | undefined>(
    () => (caseTree === undefined ? undefined : caseStateOf(caseTree, null, "white", DEFAULT_CASE_DISPLAY, merges)),
    [caseTree, merges],
  );
  const saveCase = useCallback(
    (state: CaseState) => {
      if (caseId !== undefined) void saveCaseState(caseId, state);
    },
    [caseId],
  );
  useAutosave({ enabled: session !== null, record: caseState, save: saveCase });

  // The game's moves being played out between two positions — each step's timer, and the node it expects to start from.
  const steps = useRef<number[]>([]);
  const nodeOnScreen = useRef(core.nodeId);
  useEffect(() => {
    nodeOnScreen.current = core.nodeId;
  });
  const stopSteps = useCallback(() => {
    for (const timer of steps.current) window.clearTimeout(timer);
    steps.current = [];
  }, []);
  useEffect(() => stopSteps, [stopSteps]);

  /**
   * Load a session's position on the board — its view, facing the side to
   * move, on the position. Arriving `from` an earlier position on its way
   * (Next, Pass), the board starts there and plays the game's moves between
   * them out, one every `stepDelayMs`; a step finding the board moved on by
   * the reader stops them.
   */
  const show = (next: FindBestMoveSession, from?: readonly string[]) => {
    stopSteps();
    setSession(next);
    core.loadTree(next.view.board);
    const position = next.positions[next.index];
    if (position !== undefined) core.setOrientation(facing(position));
    const to = position?.path ?? [];
    const onTheWay = from !== undefined && from.length < to.length && from.every((san, at) => to[at] === san);
    if (!onTheWay || stepDelayMs <= 0) {
      core.goToNode(next.view.nodeId);
      return;
    }
    const board = next.view.board;
    let expected = nodeAtSanPath(board, from);
    core.goToNode(expected);
    for (let ply = from.length + 1; ply <= to.length; ply += 1) {
      const target = nodeAtSanPath(board, to.slice(0, ply));
      const timer = window.setTimeout(() => {
        // The reader went somewhere else meanwhile: the rest is theirs.
        if (nodeOnScreen.current !== expected) return stopSteps();
        expected = target;
        core.goToNode(target);
      }, (ply - from.length) * stepDelayMs);
      steps.current.push(timer);
    }
  };

  /** Search a position with the engine — once, where the engine is on and its lines are fewer than needed. */
  const evaluateAt = (index: number) => {
    if (!settings.engine || session === null || session.jobs[index] !== null) return;
    const target = positions[index];
    const key = `${session.caseRef.caseId}:${index}`;
    if (target === undefined || !needsEngine(target, session.wanted) || queuing.current.has(key)) return;
    queuing.current.add(key);
    setQueuedAt((current) => new Set([...current, index]));
    const forCase = session.caseRef.caseId;
    void engineJobs
      .evaluate({ fen: target.fen, path: target.path, label: labelOf(target) }, t("accuracyTrainer.session.jobTitle", { name: session.game, move: labelOf(target) }))
      .then((jobId) => {
        queuing.current.delete(key);
        setQueuedAt((current) => new Set([...current].filter((at) => at !== index)));
        if (jobId === undefined) return;
        setSession((current) => (current === null || current.caseRef.caseId !== forCase ? current : withPositionJob(current, index, jobId)));
      });
  };

  /** Open a position of the session, on the Case's tree as it stands — the one on screen left first, its lines kept. */
  const open = (index: number, from: FindBestMoveSession | null = session, played?: readonly string[]) => {
    if (from === null || caseTree === undefined) return;
    show(openPosition(leavePosition(from, core.tree), index, caseTree), played);
  };

  /**
   * **Answer a passed position now** — a pass is "later": the position opened
   * again as the one on screen, on the Case's tree as it stands (the work
   * elsewhere kept), its pass and the pass's comment taken back. Next goes on
   * to the next position still to answer — the one the reader left.
   */
  const answerAgain = (at: number) => {
    const position = session?.positions[at];
    const given = session?.answers[at];
    if (session === null || caseTree === undefined || position === undefined || given === null || given === undefined || given.length > 0) return;
    const left = leavePosition(session, core.tree);
    show(reopenPassed(left, at, withoutPositionComment(caseTree, position.path, t("accuracyTrainer.session.answer.passed"))));
  };

  /** Answer the position on screen — the reader's moves in their order, or a pass. Moves its lines are too few for ask the engine. */
  const answer = (moves: readonly string[]) => {
    if (session === null) return;
    if (moves.length > 0) evaluateAt(session.index);
    setSession(answerPosition(session, moves));
  };

  /** On to the next position still to answer after `from`'s, the game's moves played out — `false` when none is left (the summary's turn). */
  const goOn = (from: FindBestMoveSession): boolean => {
    const later = nextUnanswered(from);
    if (later === undefined) {
      setSession(from);
      return false;
    }
    open(later, from, from.positions[from.index]?.path);
    return true;
  };

  /** **Next**: the next position still to answer — `false` when none is left (the summary's turn). */
  const next = (): boolean => (session === null ? false : goOn(session));

  /** **Pass**: the position put off for later, and on to the next one at once — `false` when none is left. */
  const pass = (): boolean => (session === null ? false : goOn(answerPosition(session, [])));

  /**
   * **Next while answering** (CTA-240): the reader's moves graded as Check
   * grades them — the answer written once, the engine asked where the lines
   * are too few — and on to the next position at once, the result left to
   * Results and the summary. `false` when none is left; nothing done without a
   * move.
   */
  const checkAndNext = (): boolean => {
    if (session === null) return false;
    const moves = candidatesOf(session.view, core.tree);
    if (moves.length === 0) return true;
    evaluateAt(session.index);
    return goOn(answerPosition(session, moves));
  };

  /** **New move** (CTA-240): the board back on the position being answered, so the next move played there starts a new line. */
  const newMove = () => {
    if (session !== null) core.goToNode(session.view.nodeId);
  };

  const index = session?.index ?? 0;
  const position = session === null ? undefined : positions[index];
  const answered = session === null ? null : session.answers[index];
  const answering = position !== undefined && answered === null;
  const atPosition = session !== null && isAtPosition(session.view, core.tree, core.nodeId);
  // On the position's own node — not inside a line from it.
  const onPosition = session !== null && core.nodeId === session.view.nodeId;

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

  /** One of the reader's moves moved a place up or down their order — its line with it. */
  const moveCandidate = (at: number, move: "up" | "down") => {
    if (session !== null && answering) core.replaceTree(reorderedCandidates(session.view, core.tree, at, move));
  };
  /** One of the reader's moves deleted — its whole line. */
  const removeCandidate = (at: number) => {
    if (session !== null && answering) core.replaceTree(withoutCandidate(session.view, core.tree, at));
  };

  /**
   * **What Your moves shows** — the trained position the board stands at
   * (`positionAtPath`: the one on screen inside its lines, an earlier one when
   * the reader steps back to it): being answered, its moves to reorder;
   * checked, waiting for its search or graded — every line, the reader's moves
   * marked; an earlier one skipped, not answered yet.
   */
  // The trained position the board stands at.
  const shownAt = session === null ? undefined : (positionAtPath(session.positions, sanPathTo(core.tree, core.nodeId)) ?? session.index);
  const shownMoves = ((): AccuracyTrainerMoves | undefined => {
    if (session === null || shownAt === undefined) return undefined;
    const at = shownAt;
    const shown = positions[at];
    if (shown === undefined) return undefined;
    const label = t("accuracyTrainer.details.positionLabel", { at: at + 1, count: session.positions.length, move: labelOf(shown) });
    const given = session.answers[at];
    if (at === session.index && given === null) {
      return { kind: "answering", label, list: candidatesOf(session.view, core.tree), onMove: moveCandidate, onRemove: removeCandidate };
    }
    if (given === null) return { kind: "unanswered", label };
    if (given.length === 0) return { kind: "passed", label, onAnswerAgain: () => answerAgain(at) };
    const grade = grades[at];
    return grade === null || grade === undefined ? { kind: "waiting", label, list: given } : { kind: "graded", label, position: shown, grade };
  })();

  /**
   * **Results** — every position answered or passed, and the one being
   * answered now (so a pass reopened stays in its place), in game order:
   * graded, waiting for the engine, passed, or answering.
   */
  const results: AccuracyTrainerResult[] =
    session === null
      ? []
      : session.positions.flatMap((each, at): AccuracyTrainerResult[] => {
          const given = session.answers[at];
          if (given === undefined || (given === null && at !== session.index)) return [];
          const grade = grades[at];
          const state =
            given === null ? "answering" : given.length === 0 ? "passed" : grade === null || grade === undefined ? "waiting" : "graded";
          return [{ index: at, label: labelOf(each), playedSan: playedOf(each), state, ...(state === "graded" && grade !== null && grade !== undefined ? { grade } : {}), current: at === shownAt }];
        });

  /**
   * Back to a position from Results — passed, to answer it now; answered, its
   * result; the one being answered, the board back on it. Straight there, no
   * moves played out.
   */
  const openResult = (at: number): "answer" | "result" => {
    if (session !== null && at === session.index && session.answers[at] === null) {
      core.goToNode(session.view.nodeId);
      return "answer";
    }
    if (session?.answers[at]?.length === 0) {
      answerAgain(at);
      return "answer";
    }
    open(at);
    return "result";
  };

  const reportRows = useMemo<AccuracyReportRow[]>(
    () =>
      session === null
        ? []
        : positions.map((each, at) => ({
            index: at,
            moveNumber: each.moveNumber,
            turn: each.turn,
            playedSan: playedOf(each),
            best: each.lines.slice(0, targetOf(each, wanted)).map((line) => line.san),
            suggestions: session.answers[at] ?? [],
            grade: grades[at],
          })),
    [session, positions, grades, wanted],
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
    /** The reader's moves at the position, in their order — what Check grades; once checked, the answer. */
    candidates: session === null ? [] : (answered ?? candidatesOf(session.view, core.tree)),
    /** What the left panel's Your moves shows — the position the board stands at. */
    shownMoves,
    /** What the left panel's Results lists, and the way back to one. */
    results,
    openResult,
    /** How many best moves the session asks for at each position. */
    wanted,
    /** Whether the reader may move a piece: while answering, on the position or inside a line from it; once answered, anywhere. */
    canMove: session !== null && (atPosition || !answering),
    hasNext: session !== null && nextUnanswered(session) !== undefined,
    reportRows,
    summary,
    /** A Case was given to resume that holds no session this build reads (CTA-239). */
    notResumable: resumed === undefined,
    /** The session's PGN as its Case keeps it — what Download saves. */
    pgn: caseState?.pgn,
    open,
    /** A passed position opened to be answered now. */
    answerAgain,
    check: () => {
      if (session !== null) answer(candidatesOf(session.view, core.tree));
    },
    pass,
    next,
    checkAndNext,
    /** Whether the board stands on the position itself — New move has nowhere to go back to. */
    onPosition,
    newMove,
    board: { onPieceDrop, resolvePromotion },
  };
};
