import { gradePosition, sessionSummaryOf, trainingPositionsOf, type SessionSummary } from "../../../lib/accuracyTrainer";
import { parsePgnTree } from "../../../lib/pgn";
import type { AccuracyReportRow } from "./AccuracySessionReport";

/*
  An Accuracy Trainer session (CTA-238), read and graded as the screen does:
  three positions of a computer analysis's shape — the best found, a pass,
  a mistake beside a move outside the lines — and one still to answer.
  Imported only by the block's gallery and its test.
*/

const ANALYSED = `[AnalysedPlies "1-4"]

1. e4 { [%eval 0.30,20] } (1. d4 { [%eval 0.25,20] }) (1. Nf3 { [%eval 0.20,20] })
1... e5 { [%eval 0.30,20] } (1... c5 { [%eval 0.35,20] })
2. Qh5 { [%eval -1.50,20] } (2. Nf3 { [%eval 0.30,20] }) (2. Bc4 { [%eval 0.20,20] })
2... Nc6 { [%eval -1.40,20] } (2... g6 { [%eval -1.45,20] }) *`;

const positions = trainingPositionsOf(parsePgnTree(ANALYSED));
const answers: readonly (readonly string[] | null)[] = [["e4", "d4"], [], ["Qh5", "h3"], null];

const grades = positions.map((position, index) => {
  const answer = answers[index];
  return answer === null || answer === undefined ? null : gradePosition(position, answer);
});

/** Every position, the last still to answer. */
export const ROWS: readonly AccuracyReportRow[] = positions.map((position, index) => ({
  index,
  moveNumber: position.moveNumber,
  turn: position.turn,
  playedSan: position.playedSan,
  bestSan: position.lines[0].san,
  suggestions: answers[index] ?? [],
  grade: grades[index],
}));

/** The summary over the three graded. */
export const SUMMARY: SessionSummary = sessionSummaryOf(grades.flatMap((grade) => (grade === null ? [] : [grade])));

/** A session ended before its first answer. */
export const EMPTY: SessionSummary = sessionSummaryOf([]);
