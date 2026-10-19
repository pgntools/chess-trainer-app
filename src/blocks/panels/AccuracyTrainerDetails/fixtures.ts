import { gradePosition, trainingPositionsOf, type PositionGrade, type TrainingPosition } from "../../../lib/accuracyTrainer";
import { parsePgnTree } from "../../../lib/pgn";
import type { AccuracyTrainerResult } from "./AccuracyTrainerDetails";

/*
  An Accuracy Trainer exercise's panel (CTA-238): the headings it shows.
  Imported only by the block's gallery and its test.
*/

/** A game loaded — its players. */
export const GAME_TITLE = "Alice – Bob";

/** Nothing loaded yet: the exercise's own name. */
export const EXERCISE_TITLE = "Find Best Move v3";

/** A name in Hebrew, read right to left. */
export const HEBREW_TITLE = "אליס – בוב";

/** The session's Case, as its link points — an address (the gallery has no router). */
export const CASE_LINK = { href: "/analysis/projects/p1/cases/c1" };

/** The reader's moves at a position, their best first. */
export const MOVES: readonly string[] = ["Nf3", "d4", "c4"];

/** A position checked: 2. Qh5 the game's (below the engine's two lines), Nf3 best, Bc4 second. */
const ANALYSED = `[AnalysedPlies "3-3"]

1. e4 e5 2. Qh5 { [%eval -1.50,20] } (2. Nf3 { [%eval 0.30,20] }) (2. Bc4 { [%eval 0.20,20] }) *`;

export const GRADED_POSITION: TrainingPosition = trainingPositionsOf(parsePgnTree(ANALYSED))[0];

/** Both found, the wrong way round, and a move outside the lines. */
export const GRADED: PositionGrade = gradePosition(GRADED_POSITION, ["Bc4", "Nf3", "a3"], { wanted: 2 });

/** The position's label, as the screen names it. */
export const LABEL = "Position 2 of 3 · 2. White";

/** Both best moves, in order. */
const PERFECT: PositionGrade = gradePosition(GRADED_POSITION, ["Nf3", "Bc4"], { wanted: 2 });

/** Five positions of a session: perfect, passed, found two the wrong way round (on screen), waiting for the engine, being answered. */
export const RESULTS: readonly AccuracyTrainerResult[] = [
  { index: 0, label: "1. White", playedSan: "e4", state: "graded", grade: PERFECT, current: false },
  { index: 1, label: "1. Black", playedSan: "e5", state: "passed", current: false },
  { index: 2, label: "2. White", playedSan: "Qh5", state: "graded", grade: GRADED, current: true },
  { index: 3, label: "3. White", playedSan: "Bc4", state: "waiting", current: false },
  { index: 4, label: "4. White", playedSan: "O-O", state: "answering", current: false },
];
