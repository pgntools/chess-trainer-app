import { gradePosition, trainingPositionsOf, type PositionGrade, type TrainingPosition } from "../../../lib/accuracyTrainer";
import { noPieces, piecesOf, type AchievementPieces } from "../../../lib/achievements/material";
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

/** Both best moves, each in its place. */
export const PERFECT: PositionGrade = gradePosition(POSITION, ["Nf3", "Bc4"], { wanted: 2 });

/** Both found, the wrong way round — and a move outside the lines. */
export const SWAPPED: PositionGrade = gradePosition(POSITION, ["Bc4", "Nf3", "a3"], { wanted: 2 });

/** The game's move — a mistake against line 1 — and a move outside the lines: none of the top 2. */
export const MISSED: PositionGrade = gradePosition(POSITION, ["Qh5", "h4"], { wanted: 2 });

/** A pass. */
export const PASSED: PositionGrade = gradePosition(POSITION, [], { wanted: 2 });

/* ─── Achievements (CTA-249) ──────────────────────────────────────────── */

/** The reader's work at the position: 2. Nf3 Nc6 3. Bb5 — the engine's line from Nf3, whole — and 2. Bc4. */
const WORK = parsePgnTree(`[SetUp "1"]
[FEN "${POSITION.fen}"]

2. Nf3 (2. Bc4) 2... Nc6 3. Bb5 *`);

/** Both in place, Nf3's line seen whole (3 plies): A1 Queen, A2 Rook, A3 Queen, A4 Queen, B1 Bishop. */
export const PERFECT_ACHIEVEMENTS: AchievementPieces = piecesOf({ position: POSITION, grade: PERFECT, work: WORK, wanted: 2 });

/** The wrong way round with a move outside the lines: Pawn, Bishop, Pawn, Rook, Pawn. */
export const SWAPPED_ACHIEVEMENTS: AchievementPieces = piecesOf({ position: POSITION, grade: SWAPPED, work: null, wanted: 2 });

/** None of the top 2 — the game's move itself, so A4 gives none; A3's Pawn alone (no blunder). */
export const MISSED_ACHIEVEMENTS: AchievementPieces = piecesOf({ position: POSITION, grade: MISSED, work: null, wanted: 2 });

/** Every piece once, Queen to Pawn — the five drawn side by side. */
export const EVERY_PIECE: AchievementPieces = [
  { category: "order", piece: "queen" },
  { category: "best", piece: "rook" },
  { category: "clean", piece: "bishop" },
  { category: "game", piece: "knight" },
  { category: "line", piece: "pawn" },
];

/** None won — a pass, or a position graded without its engine. */
export const NO_PIECES: AchievementPieces = noPieces();
