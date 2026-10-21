import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { AccuracyReportRow, AccuracyTrainerAchievements, AccuracyTrainerMoves, AccuracyTrainerResult } from "../../../blocks/panels";
import { targetOf } from "../../../lib/accuracyTrainer";
import type { AnalysisCase } from "../../../lib/analysisProjects";
import { gameMoveOf, trainingPositionOf, type EngineStart, type FindBestMoveRecord, type PositionKey } from "../../../lib/findBestMove/model";
import type { SessionIssue } from "../../../lib/findBestMove/pgn";
import type { AnswerWords } from "../../../lib/findBestMove/projection";
import { reduceSession, sessionEvents as events, type SessionEvent } from "../../../lib/findBestMove/reducer";
import {
  achievementsOf,
  answerOf,
  engineFailedAt,
  engineRetryOfferedAt,
  gradeOf,
  materialOf,
  nextOpen,
  phaseOf,
  placeOf,
  positionAtPath,
  resultsOf,
  summaryOf,
} from "../../../lib/findBestMove/selectors";
import { sessionPgnOf } from "../../../lib/findBestMove/store";
import { sanPathTo } from "../../../lib/gameTree";
import { readPgnTags } from "../../../lib/pgn";
import { useSessionBoard } from "./useSessionBoard";
import { useSessionEngine } from "./useSessionEngine";

/** Where the screen goes after an action: on to the next position's moves, its result, or the summary. */
export type Landing = "moves" | "result" | "summary";

/**
 * **A Find Best Move session, run** (CTA-244, the design note §7) — the
 * composition of the screen's units over the pure record: the board
 * (`useSessionBoard`), the replay inside it, the engine jobs
 * (`useSessionEngine`) and the persistence the route holds
 * (`useSessionCase`'s `dispatch`). It names the actions — each **one event
 * list, one write**, the board's work flushed first — and reads every panel
 * from the selectors. The screen (`FindBestMove.tsx`) places what this
 * returns and decides nothing.
 */
export const useFindBestMove = ({
  caseRecord,
  record,
  issues,
  dispatch,
  words,
  stepDelayMs,
}: {
  caseRecord: AnalysisCase;
  record: FindBestMoveRecord;
  issues: readonly SessionIssue[];
  dispatch: (events: readonly SessionEvent[]) => Promise<unknown>;
  words: AnswerWords;
  stepDelayMs?: number;
}) => {
  const { t } = useTranslation();
  const board = useSessionBoard({ record, dispatch, words, ...(stepDelayMs === undefined ? {} : { stepDelayMs }) });
  const { core } = board;

  const sideOf = useCallback(
    (key: PositionKey) => t(trainingPositionOf(record, key)?.turn === "b" ? "accuracyTrainer.position.black" : "accuracyTrainer.position.white"),
    [record, t],
  );
  /** A position's move, as a job's title and the panels name it ("12. White"). */
  const labelOf = useCallback(
    (key: PositionKey) => t("accuracyTrainer.session.moveLabel", { number: trainingPositionOf(record, key)?.moveNumber ?? 1, side: sideOf(key) }),
    [record, sideOf, t],
  );
  const titleOf = useCallback(
    (key: PositionKey) => t("accuracyTrainer.session.jobTitle", { name: record.name, move: labelOf(key) }),
    [record.name, labelOf, t],
  );
  const engine = useSessionEngine({ caseId: caseRecord.id, record, dispatch, titleOf, labelOf });

  const key = record.current;
  const phase = phaseOf(record, key);
  const answering = phase === "answering";
  const position = trainingPositionOf(record, key);
  const grade = gradeOf(record, key);

  /** Events after the board's work — moving on from `key` plays the game's moves out (Next, Skip). */
  const act = async (list: readonly SessionEvent[], { replay = false } = {}): Promise<boolean> => {
    const all = [board.flushWork(), ...list];
    const moved = reduceSession(record, all).current !== record.current;
    board.setReplayFrom(replay && moved ? key : null);
    const problem = await dispatch(all);
    if (problem !== undefined) board.setReplayFrom(null);
    return moved;
  };

  /** **Results**: the reader's moves graded, the Result opened — the board back on the position, where the graded arrows are drawn. */
  const check = () => {
    if (board.candidates.length === 0) return;
    board.newMove();
    void act([events.answer(key, board.candidates)]);
  };
  /** **Next while answering** (CTA-240): graded as Results grades them, and on at once — `summary` when none is left. */
  const checkAndNext = (): Landing => {
    if (board.candidates.length === 0) return "moves";
    const list = [events.answer(key, board.candidates), events.next()];
    void act(list, { replay: true });
    return reduceSession(record, list).current === key ? "summary" : "moves";
  };
  /** **Skip** (`pass`): put off for later, and on at once. */
  const pass = (): Landing => {
    const list = [events.pass(key), events.next()];
    void act(list, { replay: true });
    return reduceSession(record, list).current === key ? "summary" : "moves";
  };
  /** **Next** once answered — the next position still to answer, or the summary. */
  const next = (): Landing => {
    if (nextOpen(record) === undefined) return "summary";
    void act([events.next()], { replay: true });
    return "moves";
  };
  /** **Answer it now**: a pass reopened as the position on screen, straight there — the board back on it. */
  const answerAgain = (at: PositionKey) => {
    if (at === key) board.newMove();
    void act([events.reopen(at)]);
  };
  /** A position opened from the summary or Results — straight there, nothing played out. */
  const open = (at: PositionKey) => {
    if (at === key) board.newMove();
    else void act([events.goTo(at)]);
  };
  /**
   * Back to a position from Results — the one being answered, the board back
   * on it; passed, to answer it now; answered, its result.
   */
  const openResult = (at: PositionKey): Landing => {
    const shown = phaseOf(record, at);
    if (at === key && shown === "answering") {
      board.newMove();
      return "moves";
    }
    if (shown === "passed") {
      answerAgain(at);
      return "moves";
    }
    open(at);
    return "result";
  };
  /**
   * **Evaluate again** (CTA-250): a position graded without its engine asks it once more — one write, the session's
   * engine on first (a position whose offer was declined), so it waits for a new Evaluate Position job.
   */
  const evaluateAgain = (at: PositionKey) => {
    if (engineRetryOfferedAt(record, at)) void act([events.settingsChanged({ engine: true }), events.engineRetry(at)]);
  };
  // The engine is turned on by the offer alone (`useSessionBoard`, CTA-245) — no switch (CTA-246).
  const changeArrows = (arrows: boolean) => void dispatch([events.settingsChanged({ arrows })]);
  /** When a position's engine starts — its first move, or its grading (CTA-247); a position already asked keeps its search. */
  const changeEngineStart = (engineStart: EngineStart) => void dispatch([events.settingsChanged({ engineStart })]);

  // The trained position the board stands at — the one on screen inside its lines, an earlier one stepped back to.
  const shownAt = positionAtPath(record, sanPathTo(core.tree, core.nodeId)) ?? key;
  const shownLabel = t("accuracyTrainer.details.positionLabel", { at: placeOf(record, shownAt), count: record.keys.length, move: labelOf(shownAt) });
  const shownMoves = ((): AccuracyTrainerMoves | undefined => {
    const shownPosition = trainingPositionOf(record, shownAt);
    if (shownPosition === undefined) return undefined;
    const label = shownLabel;
    switch (phaseOf(record, shownAt)) {
      case "answering":
        return { kind: "answering", label, list: board.candidates, onMove: board.moveCandidate, onRemove: board.removeCandidate };
      case "passed":
        return { kind: "passed", label, onAnswerAgain: () => answerAgain(shownAt) };
      case "waiting":
        return { kind: "waiting", label, list: answerOf(record, shownAt) ?? [] };
      case "graded": {
        const shownGrade = gradeOf(record, shownAt);
        if (shownGrade === null) return undefined;
        return {
          kind: "graded",
          label,
          position: shownPosition,
          grade: shownGrade,
          ...(engineRetryOfferedAt(record, shownAt) ? { onEvaluateAgain: () => evaluateAgain(shownAt) } : {}),
        };
      }
      default:
        return { kind: "unanswered", label };
    }
  })();

  // Its pieces, derived from the record — never stored (CTA-249): the left panel's Achievements.
  const shownAchievements: AccuracyTrainerAchievements | undefined =
    trainingPositionOf(record, shownAt) === undefined ? undefined : { label: shownLabel, pieces: achievementsOf(record, shownAt), wanted: record.wanted };

  const playedOf = (at: PositionKey) => gameMoveOf(record.game, at) ?? "–";
  const results: AccuracyTrainerResult[] = resultsOf(record).map((row) => {
    // A pass wins nothing: its slots are disabled pawns too.
    const pieces = row.state === "graded" || row.state === "passed" ? achievementsOf(record, row.key) : null;
    return {
      index: row.key,
      label: labelOf(row.key),
      playedSan: playedOf(row.key),
      state: row.state === "graded" && row.grade === null ? "waiting" : row.state,
      ...(row.state === "graded" && row.grade !== null ? { grade: row.grade } : {}),
      // Its pieces, derived from the record (CTA-249): the row's five slots.
      ...(pieces === null ? {} : { achievements: pieces }),
      current: row.key === shownAt,
    };
  });

  const reportRows = useMemo<AccuracyReportRow[]>(
    () =>
      record.keys.flatMap((at) => {
        const each = trainingPositionOf(record, at);
        return each === undefined
          ? []
          : [{
              index: at,
              moveNumber: each.moveNumber,
              turn: each.turn,
              playedSan: gameMoveOf(record.game, at) ?? "–",
              best: each.lines.slice(0, targetOf(each, record.wanted)).map((line) => line.san),
              suggestions: answerOf(record, at) ?? [],
              grade: gradeOf(record, at),
            }];
      }),
    [record],
  );
  const summary = useMemo(() => summaryOf(record), [record]);
  // The achievements, derived from the record — never stored (CTA-249).
  const material = useMemo(() => materialOf(record), [record]);

  /** The session's PGN, projected from the record now with the board's work in — what Download saves. */
  const pgn = () => sessionPgnOf(reduceSession(record, [board.flushWork()]), readPgnTags(caseRecord.pgn), words);

  /** How many positions read leniently — said once. */
  const unreadPositions = new Set(issues.flatMap((issue) => ("key" in issue ? [issue.key] : []))).size;

  return {
    core,
    board,
    record,
    position,
    key,
    place: placeOf(record, key),
    answering,
    /** Whether the position on screen is answered — moves or a pass: its Result is on. */
    answered: answerOf(record, key) !== null,
    grade,
    waiting: phase === "waiting",
    engineFailed: phase === "graded" && engineFailedAt(record, key),
    /** Whether the position on screen offers *Evaluate again* (CTA-250) — beside the Result's word on its engine. */
    engineRetry: engineRetryOfferedAt(record, key),
    searching: answering && engine.searchingAt(key),
    candidates: phase === "waiting" || phase === "graded" ? (answerOf(record, key) ?? []) : board.candidates,
    shownMoves,
    shownAchievements,
    results,
    reportRows,
    summary,
    material,
    hasNext: nextOpen(record) !== undefined,
    unreadPositions,
    sideOf,
    pgn,
    check,
    checkAndNext,
    pass,
    next,
    answerAgain,
    open,
    openResult,
    evaluateAgain,
    changeArrows,
    changeEngineStart,
  };
};
