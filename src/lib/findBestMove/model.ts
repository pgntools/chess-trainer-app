import { Chess } from "chess.js";

import { trainingPositionFrom, type StoredTrainingLine, type TrainingPosition, type TrainingSide } from "../accuracyTrainer";
import { turnOf } from "../computerAnalysis";
import type { GameTree, LineMove } from "../gameTree";

/**
 * **A Find Best Move session, v4** (CTA-244, the design note CTA-243's
 * `docs/design/find-best-move-v4.md` §4) — pure: the session's record, its
 * positions' identity and what is derived from them. The reference is
 * `.claude/rules/accuracy-trainer.md`.
 *
 * - **A position is named by its key** ({@link PositionKey}): the ply of its
 *   move in the session's own **recorded game**, which never changes after the
 *   session starts — not an index into a list, not a FEN, not a tree node.
 * - **One record per position** ({@link PositionRecord}), in a map keyed by
 *   it: its lines, its answer, its engine, its work.
 * - **Two explicit axes** per position, the answer and the engine
 *   ({@link AnswerState}, {@link EngineState}); the reducer
 *   (`reducer.ts`) moves them, the selectors (`selectors.ts`) read them.
 *
 * React, the stores and the router never reach this folder but through
 * `store.ts`, the session's one writer.
 */

/** The format this build writes and reads — `[FindBestMove "2"]` (`pgn.ts`). */
export const SESSION_FORMAT_VERSION = 2;

/** How many best moves a session may ask for — the setting's range. */
export const MOVES_BOUNDS = { min: 1, max: 10 } as const;

/** The moves to find to start with, and when a PGN says something unreadable. */
export const DEFAULT_MOVES = 3;

/**
 * **When a position's engine search starts** (CTA-247): `move` — on the
 * reader's first move there, so it searches while they analyse; `grade` —
 * only once the position is graded (Results, or Next while answering), the
 * answer waiting for it. A pass never wants it under either.
 */
export type EngineStart = "move" | "grade";

/** The engine's start to begin with, and what a session from before CTA-247 reads as — today's behaviour. */
export const DEFAULT_ENGINE_START: EngineStart = "move";

/** The ply of the move to find, 1-based from the recorded game's start (`TrainingPosition.ply`). */
export type PositionKey = number;

/** **The answer axis**: open, passed, a pass being answered again (only ever `current`), answered — final. */
export type AnswerState =
  | { kind: "open" }
  | { kind: "passed" }
  | { kind: "reopened" }
  | { kind: "answered"; moves: readonly string[] };

/**
 * **The engine axis** — `idle` until the reader starts on a position whose
 * top lines are too few; `searched` and `failed` are terminal, so a
 * position's engine is never asked twice.
 */
export type EngineState =
  | { kind: "idle" }
  | { kind: "wanted" }
  | { kind: "queued"; jobId: string }
  | { kind: "searched"; jobId: string }
  | { kind: "failed"; jobId?: string };

/** **One position of the session**: what it is graded against, its two axes, and the reader's own lines there. */
export type PositionRecord = {
  key: PositionKey;
  /** Every line the position is graded against: the source's, then the engine's merged in. Grows only. */
  lines: readonly StoredTrainingLine[];
  answer: AnswerState;
  engine: EngineState;
  /** The reader's own lines from the position (moves, comments, NAGs), a tree from its FEN; `null` none. */
  work: GameTree | null;
};

/** **The recorded game** — its start and its mainline, copied from the source when the session starts and never edited after. */
export type RecordedGame = { startFen: string; moves: readonly string[] };

/** The session's settings — the engine on, the next-move arrows, when a position's search starts. */
export type SessionSettings = { engine: boolean; arrows: boolean; engineStart: EngineStart };

/** **A session**, whole — what its Case's tags hold (`pgn.ts`). */
export type FindBestMoveRecord = {
  version: typeof SESSION_FORMAT_VERSION;
  /** The game's name — job titles, the lobby. */
  name: string;
  side: TrainingSide;
  /** N, the moves to find — 1–10, fixed for the session. */
  wanted: number;
  settings: SessionSettings;
  game: RecordedGame;
  /** The manifest: every position's key, ascending, fixed at start. */
  keys: readonly PositionKey[];
  /** The position on screen — always one of `keys`. */
  current: PositionKey;
  positions: ReadonlyMap<PositionKey, PositionRecord>;
};

/* ─── The recorded game, replayed ─────────────────────────────────────── */

/** The recorded game played out: every move with its squares and the position after it, and every position (`fens[0]` the start). */
export type ReplayedGame = { lineMoves: readonly LineMove[]; fens: readonly string[] };

const replayed = new WeakMap<RecordedGame, ReplayedGame | null>();

/** A SAN line played from `fen` — each move with its squares and the position after it — cut at the first that does not play. */
export const lineMovesOf = (fen: string, sans: readonly string[]): LineMove[] => {
  const moves: LineMove[] = [];
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return moves;
  }
  for (const san of sans) {
    let move;
    try {
      move = chess.move(san);
    } catch {
      break;
    }
    moves.push({ san: move.san, from: move.from, to: move.to, fen: chess.fen(), ...(move.captured === undefined ? {} : { captured: move.captured }) });
  }
  return moves;
};

/**
 * **The recorded game played out**, once per game (cached) — `undefined`
 * where a move does not play from the start: no position can then be named.
 */
export const replayGame = (game: RecordedGame): ReplayedGame | undefined => {
  const cached = replayed.get(game);
  if (cached !== undefined) return cached ?? undefined;
  const lineMoves = lineMovesOf(game.startFen, game.moves);
  const result = lineMoves.length === game.moves.length && (game.moves.length > 0 || isFen(game.startFen))
    ? { lineMoves, fens: [game.startFen, ...lineMoves.map((move) => move.fen)] }
    : null;
  replayed.set(game, result);
  return result ?? undefined;
};

const isFen = (fen: string): boolean => {
  try {
    new Chess(fen);
    return true;
  } catch {
    return false;
  }
};

/** Whether a key names a position of the game — its FEN is known: a ply from 1 to one past the last move. */
export const isPositionOf = (game: RecordedGame, key: PositionKey): boolean =>
  Number.isInteger(key) && key >= 1 && key <= game.moves.length + 1;

/** A position's SAN path from the start — the moves before it. */
export const positionPathOf = (game: RecordedGame, key: PositionKey): readonly string[] => game.moves.slice(0, key - 1);

/** A position's FEN — `undefined` for a key that names none. */
export const positionFenOf = (game: RecordedGame, key: PositionKey): string | undefined =>
  isPositionOf(game, key) ? replayGame(game)?.fens[key - 1] : undefined;

/** The game's move at a position — none past the end, or for a session from a position (its game is empty). */
export const gameMoveOf = (game: RecordedGame, key: PositionKey): string | undefined => game.moves[key - 1];

/** The move number as a PGN writes it at a ply from a start (`12` for both `12.` and `12…`). */
const moveNumberOf = (startFen: string, ply: number): number => {
  const startNumber = Number(startFen.split(" ")[5]) || 1;
  const blackFirst = turnOf(startFen) === "b";
  return startNumber + Math.floor((ply - 1 + (blackFirst ? 1 : 0)) / 2);
};

/**
 * **A position as the grading reads it** (`gradePosition`'s
 * `TrainingPosition`) — derived from the recorded game and its stored lines,
 * never stored, so it cannot drift from them. `undefined` for a key the
 * record has no position for.
 */
export const trainingPositionOf = (record: Pick<FindBestMoveRecord, "game" | "positions">, key: PositionKey): TrainingPosition | undefined => {
  const position = record.positions.get(key);
  const fen = positionFenOf(record.game, key);
  if (position === undefined || fen === undefined) return undefined;
  return trainingPositionFrom(
    {
      // No tree node names a v4 position: its path does.
      nodeId: null,
      path: positionPathOf(record.game, key),
      fen,
      turn: turnOf(fen),
      ply: key,
      moveNumber: moveNumberOf(record.game.startFen, key),
      playedSan: gameMoveOf(record.game, key) ?? "",
    },
    position.lines,
  );
};

/**
 * A position's lines as a record keeps them — what a `TrainingPosition`'s
 * are before they are scored and ranked; the game's move by itself alone
 * (its continuation is the recorded game's), so a record reads back as it
 * was written.
 */
export const storedLinesOf = (position: Pick<TrainingPosition, "lines">): StoredTrainingLine[] =>
  position.lines.map(({ san, score, listed, played, sans }) => ({
    san,
    // Whole centipawns, as the tag writes them.
    score: score.kind === "cp" ? { kind: "cp", value: Math.round(score.value) } : score,
    listed,
    played,
    sans: played ? [san] : [...sans],
  }));

/** A record with one position replaced — the same record back when it is the same object. */
export const withPosition = (record: FindBestMoveRecord, position: PositionRecord): FindBestMoveRecord => {
  if (record.positions.get(position.key) === position) return record;
  const positions = new Map(record.positions);
  positions.set(position.key, position);
  return { ...record, positions };
};

/** The side a position's board faces: its side to move. */
export const facingOf = (game: RecordedGame, key: PositionKey): "white" | "black" =>
  turnOf(positionFenOf(game, key) ?? game.startFen) === "w" ? "white" : "black";
