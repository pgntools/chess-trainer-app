import { gradePosition, trainingPositionsOf, type PositionGrade, type TrainingPosition } from "../../../lib/accuracyTrainer";
import { parsePgnTree } from "../../../lib/pgn";

/*
  A graded position of the Accuracy Trainer (CTA-238), read as the screen
  reads it: a computer analysis's shape (the engine's lines as side lines,
  each first move with its eval), then the reader's suggestions graded.
  Imported only by the block's gallery and its test.
*/

/** 2. Qh5 was played, below the engine's two lines; 2. Nf3 is best. */
const ANALYSED = `[AnalysedPlies "3-3"]

1. e4 e5 2. Qh5 { [%eval -1.50,20] } (2. Nf3 { [%eval 0.30,20] } 2... Nc6 3. Bb5) (2. Bc4 { [%eval 0.20,20] } 2... Nf6) *`;

export const POSITION: TrainingPosition = trainingPositionsOf(parsePgnTree(ANALYSED))[0];

/** The best move, a listed line and one outside them. */
export const MIXED: PositionGrade = gradePosition(POSITION, ["Nf3", "Bc4", "a3"]);

/** One of the top lines, not the best. */
export const TOP: PositionGrade = gradePosition(POSITION, ["Bc4"]);

/** The game's move — a mistake against line 1 — and a move outside the lines. */
export const MISSED: PositionGrade = gradePosition(POSITION, ["Qh5", "h4"]);

/** A pass. */
export const PASSED: PositionGrade = gradePosition(POSITION, []);
