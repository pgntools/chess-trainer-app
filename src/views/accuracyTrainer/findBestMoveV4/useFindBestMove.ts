import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { AccuracyReportRow, AccuracyTrainerMoves, AccuracyTrainerResult } from "../../../blocks/panels";
import { targetOf } from "../../../lib/accuracyTrainer";
import type { AnalysisCase } from "../../../lib/analysisProjects";
import { gameMoveOf, trainingPositionOf, type FindBestMoveRecord, type PositionKey } from "../../../lib/findBestMove/model";
import type { SessionIssue } from "../../../lib/findBestMove/pgn";
import type { AnswerWords } from "../../../lib/findBestMove/projection";
import { reduceSession, sessionEvents as events, type SessionEvent } from "../../../lib/findBestMove/reducer";
import {
  answerOf,
  engineFailedAt,
  gradeOf,
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

  /** Events after the board's work — moving on from `key` plays the game's moves out (Next, Pass). */
  const act = async (list: readonly SessionEvent[], { replay = false } = {}): Promise<boolean> => {
    const all = [board.flushWork(), ...list];
    const moved = reduceSession(record, all).current !== record.current;
    board.setReplayFrom(replay && moved ? key : null);
    const problem = await dispatch(all);
    if (problem !== undefined) board.setReplayFrom(null);
    return moved;
  };

  /** **Results**: the reader's moves graded, the Result opened. */
  const check = () => {
    if (board.candidates.length > 0) void act([events.answer(key, board.candidates)]);
  };
  /** **Next while answering** (CTA-240): graded as Results grades them, and on at once — `summary` when none is left. */
  const checkAndNext = (): Landing => {
    if (board.candidates.length === 0) return "moves";
    const list = [events.answer(key, board.candidates), events.next()];
    void act(list, { replay: true });
    return reduceSession(record, list).current === key ? "summary" : "moves";
  };
  /** **Pass**: put off for later, and on at once. */
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
  const changeSettings = (settings: { engine?: boolean; arrows?: boolean }) => void dispatch([events.settingsChanged(settings)]);

  // The trained position the board stands at — the one on screen inside its lines, an earlier one stepped back to.
  const shownAt = positionAtPath(record, sanPathTo(core.tree, core.nodeId)) ?? key;
  const shownMoves = ((): AccuracyTrainerMoves | undefined => {
    const shownPosition = trainingPositionOf(record, shownAt);
    if (shownPosition === undefined) return undefined;
    const label = t("accuracyTrainer.details.positionLabel", { at: placeOf(record, shownAt), count: record.keys.length, move: labelOf(shownAt) });
    switch (phaseOf(record, shownAt)) {
      case "answering":
        return { kind: "answering", label, list: board.candidates, onMove: board.moveCandidate, onRemove: board.removeCandidate };
      case "passed":
        return { kind: "passed", label, onAnswerAgain: () => answerAgain(shownAt) };
      case "waiting":
        return { kind: "waiting", label, list: answerOf(record, shownAt) ?? [] };
      case "graded": {
        const shownGrade = gradeOf(record, shownAt);
        return shownGrade === null ? undefined : { kind: "graded", label, position: shownPosition, grade: shownGrade };
      }
      default:
        return { kind: "unanswered", label };
    }
  })();

  const playedOf = (at: PositionKey) => gameMoveOf(record.game, at) ?? "–";
  const results: AccuracyTrainerResult[] = resultsOf(record).map((row) => ({
    index: row.key,
    label: labelOf(row.key),
    playedSan: playedOf(row.key),
    state: row.state === "graded" && row.grade === null ? "waiting" : row.state,
    ...(row.state === "graded" && row.grade !== null ? { grade: row.grade } : {}),
    current: row.key === shownAt,
  }));

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
    searching: answering && engine.searchingAt(key),
    candidates: phase === "waiting" || phase === "graded" ? (answerOf(record, key) ?? []) : board.candidates,
    shownMoves,
    results,
    reportRows,
    summary,
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
    changeSettings,
  };
};
