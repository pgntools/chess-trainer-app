import { gradePosition, sessionSummaryOf, trainingPositionsOf, type SessionSummary } from "../../../lib/accuracyTrainer";
import { parsePgnTree } from "../../../lib/pgn";
import type { AccuracyReportRow } from "./AccuracySessionReport";

/*
  An Accuracy Trainer session (CTA-238), read and graded as the screen does:
  three positions of a computer analysis's shape, two best moves to find at
  each — both found in order, a pass, none found — and one still to answer.
  Imported only by the block's gallery and its test.
*/

const ANALYSED = `[AnalysedPlies "1-4"]

1. e4 { [%eval 0.30,20] } (1. d4 { [%eval 0.25,20] }) (1. Nf3 { [%eval 0.20,20] })
1... e5 { [%eval 0.30,20] } (1... c5 { [%eval 0.35,20] })
2. Qh5 { [%eval -1.50,20] } (2. Nf3 { [%eval 0.30,20] }) (2. Bc4 { [%eval 0.20,20] })
2... Nc6 { [%eval -1.40,20] } (2... g6 { [%eval -1.45,20] }) *`;

const positions = trainingPositionsOf(parsePgnTree(ANALYSED));
/** Two best moves to find at each position. */
const WANTED = 2;

/** Both found in order; a pass; none of the top 2 (the game's mistake, and a move outside the lines); one still to answer. */
const answers: readonly (readonly string[] | null)[] = [["e4", "d4"], [], ["Qh5", "h3"], null];

const grades = positions.map((position, index) => {
  const answer = answers[index];
  return answer === null || answer === undefined ? null : gradePosition(position, answer, { wanted: WANTED });
});

/** Every position, the last still to answer. */
export const ROWS: readonly AccuracyReportRow[] = positions.map((position, index) => ({
  index,
  moveNumber: position.moveNumber,
  turn: position.turn,
  playedSan: position.playedSan,
  best: position.lines.slice(0, Math.min(WANTED, position.topCount)).map((line) => line.san),
  suggestions: answers[index] ?? [],
  grade: grades[index],
}));

/** The summary over the three graded. */
export const SUMMARY: SessionSummary = sessionSummaryOf(grades.flatMap((grade) => (grade === null ? [] : [grade])));

/** A session ended before its first answer. */
export const EMPTY: SessionSummary = sessionSummaryOf([]);
