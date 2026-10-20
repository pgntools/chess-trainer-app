import { gradePosition, needsEngine, sessionSummaryOf, type PositionGrade, type SessionSummary } from "../accuracyTrainer";
import { noPieces, piecesOf, sessionMaterialOf, type AchievementPieces, type SessionMaterial } from "../achievements/material";
import { positionPathOf, trainingPositionOf, type FindBestMoveRecord, type PositionKey } from "./model";

/**
 * **What the session's panels read** (CTA-244, the design note §4.4–§4.5) —
 * pure functions of the record: a position's phase and grade, the Results
 * rows, the summary, the lobby's progress, the next position, the replay's
 * plan. The screen shows what these say and decides nothing itself.
 */

/** At most this many of the game's plies are played out between two positions; a longer gap jumps to the start of them. */
export const REPLAY_MAX_PLIES = 2;

/**
 * **A position's phase** — one pure function of its two axes: being
 * answered (the one on screen, open or a pass reopened), not answered yet,
 * answered and waiting for its engine, graded, or passed.
 */
export type Phase = "answering" | "unanswered" | "waiting" | "graded" | "passed";

export const phaseOf = (record: FindBestMoveRecord, key: PositionKey): Phase | undefined => {
  const position = record.positions.get(key);
  if (position === undefined) return undefined;
  switch (position.answer.kind) {
    case "open":
      return key === record.current ? "answering" : "unanswered";
    case "reopened":
      return "answering";
    case "passed":
      return "passed";
    case "answered":
      return position.engine.kind === "wanted" || position.engine.kind === "queued" ? "waiting" : "graded";
  }
};

/** Whether a graded position was graded without its engine — the job failed, was cancelled or is gone; said beside it. */
export const engineFailedAt = (record: FindBestMoveRecord, key: PositionKey): boolean => record.positions.get(key)?.engine.kind === "failed";

/**
 * **A position's grade** — its answer against the top N (`gradePosition`
 * over the derived position): graded, its moves'; passed, a pass's (it
 * finds nothing, and counts in the summary as one). `null` otherwise.
 */
export const gradeOf = (record: FindBestMoveRecord, key: PositionKey): PositionGrade | null => {
  const phase = phaseOf(record, key);
  const position = record.positions.get(key);
  const training = trainingPositionOf(record, key);
  if (position === undefined || training === undefined) return null;
  if (phase === "graded" && position.answer.kind === "answered") return gradePosition(training, position.answer.moves, { wanted: record.wanted });
  if (phase === "passed") return gradePosition(training, [], { wanted: record.wanted });
  return null;
};

/** The reader's answer at a position — its moves, `[]` a pass, `null` not yet. */
export const answerOf = (record: FindBestMoveRecord, key: PositionKey): readonly string[] | null => {
  const answer = record.positions.get(key)?.answer;
  return answer?.kind === "answered" ? answer.moves : answer?.kind === "passed" ? [] : null;
};

/** One row of Results. */
export type ResultRow = { key: PositionKey; state: "graded" | "waiting" | "passed" | "answering"; grade: PositionGrade | null };

/**
 * **Results** — every position answered or passed, and the one being
 * answered (so a pass reopened stays in its place), in game order.
 */
export const resultsOf = (record: FindBestMoveRecord): ResultRow[] =>
  record.keys.flatMap((key): ResultRow[] => {
    const phase = phaseOf(record, key);
    return phase === undefined || phase === "unanswered" ? [] : [{ key, state: phase, grade: gradeOf(record, key) }];
  });

/** **The summary** — over the graded positions and the passes. */
export const summaryOf = (record: FindBestMoveRecord): SessionSummary =>
  sessionSummaryOf(record.keys.flatMap((key) => {
    const grade = gradeOf(record, key);
    return grade === null ? [] : [grade];
  }));

/**
 * **A position's achievements** (CTA-249, `lib/achievements/`) — a piece (or
 * none) per category, derived from the record and never stored: graded, the
 * answer's — none for one graded without its engine; passed, none; `null`
 * while it is not graded.
 */
export const achievementsOf = (record: FindBestMoveRecord, key: PositionKey): AchievementPieces | null => {
  const phase = phaseOf(record, key);
  if (phase === "passed") return noPieces();
  const grade = phase === "graded" ? gradeOf(record, key) : null;
  const position = record.positions.get(key);
  const training = trainingPositionOf(record, key);
  if (grade === null || position === undefined || training === undefined) return null;
  if (engineFailedAt(record, key)) return noPieces();
  return piecesOf({ position: training, grade, work: position.work, wanted: record.wanted });
};

/** **The session's material** — every graded position's pieces, per category and in all, and how many of each. */
export const materialOf = (record: FindBestMoveRecord): SessionMaterial =>
  sessionMaterialOf(record.keys.flatMap((key) => {
    const pieces = achievementsOf(record, key);
    return pieces === null ? [] : [pieces];
  }));

/** **How far a session has got** — what the lobby lists, from the record alone, so it is what the screen says. */
export type SessionProgress = {
  total: number;
  /** Answered with moves. */
  answered: number;
  passed: number;
  /** The best moves found, in their place, and how many there were to find — over the graded positions. */
  found: number;
  inPlace: number;
  target: number;
  /** Every position answered or passed. */
  done: boolean;
};

export const progressOf = (record: FindBestMoveRecord): SessionProgress => {
  let answered = 0;
  let passed = 0;
  let found = 0;
  let inPlace = 0;
  let target = 0;
  for (const key of record.keys) {
    const answer = record.positions.get(key)?.answer;
    if (answer?.kind === "passed") passed += 1;
    if (answer?.kind !== "answered") continue;
    answered += 1;
    const grade = phaseOf(record, key) === "graded" ? gradeOf(record, key) : null;
    if (grade === null) continue;
    found += grade.found;
    inPlace += grade.inPlace;
    target += grade.target;
  }
  return { total: record.keys.length, answered, passed, found, inPlace, target, done: isDone(record) };
};

/** **Done**: every position answered or passed. */
export const isDone = (record: FindBestMoveRecord): boolean =>
  record.keys.every((key) => {
    const kind = record.positions.get(key)?.answer.kind;
    return kind === "answered" || kind === "passed";
  });

/**
 * **Whether to offer the engine at a position** (CTA-245): the session's
 * engine is off (a game's starts so, CTA-246), and the position — still to answer, its engine never asked — has
 * fewer top lines than N (`needsEngine`), so the engine would be asked for it
 * were it on. The screen asks the reader then, on their first move there.
 */
export const engineOfferedAt = (record: FindBestMoveRecord, key: PositionKey): boolean => {
  if (record.settings.engine) return false;
  const position = record.positions.get(key);
  const training = trainingPositionOf(record, key);
  return (
    position !== undefined &&
    training !== undefined &&
    (position.answer.kind === "open" || position.answer.kind === "reopened") &&
    position.engine.kind === "idle" &&
    needsEngine(training, record.wanted)
  );
};

/** **The next position**: the first key after `current`, in the manifest's order, still open — `undefined` when none is (the summary's turn). */
export const nextOpen = (record: FindBestMoveRecord): PositionKey | undefined =>
  record.keys.find((key) => key > record.current && record.positions.get(key)?.answer.kind === "open");

/** Where a position stands in the manifest, 1-based — "Position 3 of 12". */
export const placeOf = (record: FindBestMoveRecord, key: PositionKey): number => record.keys.indexOf(key) + 1;

/**
 * **The trained position the board stands at** — the deepest key, up to the
 * one on screen, whose path leads to where the board is (`here`, its SAN
 * path from the start): the position on screen inside its lines, an earlier
 * one when the reader steps back to it or past it. `undefined` before the
 * first.
 */
export const positionAtPath = (record: FindBestMoveRecord, here: readonly string[]): PositionKey | undefined => {
  let found: PositionKey | undefined;
  for (const key of record.keys) {
    if (key > record.current) break;
    const path = positionPathOf(record.game, key);
    if (path.length <= here.length && path.every((san, at) => here[at] === san)) found = key;
  }
  return found;
};

/**
 * **The replay between two positions** — the recorded game's moves from
 * `from` to `to`, as plies from the start: the board starts at `start` plies
 * and plays `sans` out. **Capped** at {@link REPLAY_MAX_PLIES}: a longer gap
 * (met only where the positions between were not trained) starts two plies
 * short of `to`. Backwards, nothing is played: the board jumps to `to`.
 */
export type ReplayPlan = { start: number; sans: readonly string[] };

export const replayPlan = (record: Pick<FindBestMoveRecord, "game">, from: PositionKey, to: PositionKey): ReplayPlan => {
  const end = to - 1;
  if (to <= from) return { start: end, sans: [] };
  const start = Math.max(from - 1, end - REPLAY_MAX_PLIES);
  return { start, sans: record.game.moves.slice(start, end) };
};
