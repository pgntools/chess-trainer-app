import { needsEngine, withEngineResult } from "../accuracyTrainer";
import type { PositionResult } from "../computerAnalysis";
import type { GameTree } from "../gameTree";
import {
  positionFenOf,
  storedLinesOf,
  trainingPositionOf,
  withPosition,
  type EngineState,
  type FindBestMoveRecord,
  type SessionSettings,
  type PositionKey,
  type PositionRecord,
} from "./model";
import { workFragmentOf } from "./pgn";
import { nextOpen } from "./selectors";

/**
 * **The session's transitions** (CTA-244, the design note §4.3) — one pure
 * reducer over {@link FindBestMoveRecord}. An event that does not apply
 * answers **the same record by reference**, so "changed" is `!==`, as with
 * trees; `editSessionCase` (`store.ts`) writes nothing then.
 *
 * `goTo` (and so `reopen` and `next`) is the only way `current` changes, and
 * it **leaves** the position on screen first: a reopened pass left unanswered
 * is passed again — the one place that rule lives.
 */

/** Every event the session takes. */
export type SessionEvent =
  | { type: "goTo"; key: PositionKey }
  | { type: "workRecorded"; key: PositionKey; work: GameTree | null }
  | { type: "firstMove"; key: PositionKey }
  | { type: "answer"; key: PositionKey; moves: readonly string[] }
  | { type: "pass"; key: PositionKey }
  | { type: "reopen"; key: PositionKey }
  | { type: "next" }
  | { type: "engineQueued"; key: PositionKey; jobId: string }
  | { type: "engineSearched"; key: PositionKey; jobId: string; result: PositionResult }
  | { type: "engineFailed"; key: PositionKey; jobId?: string }
  | { type: "engineRetry"; key: PositionKey }
  | ({ type: "settingsChanged" } & Partial<SessionSettings>);

/** The events, made — what the screen and the job dispatch. */
export const sessionEvents = {
  goTo: (key: PositionKey): SessionEvent => ({ type: "goTo", key }),
  workRecorded: (key: PositionKey, work: GameTree | null): SessionEvent => ({ type: "workRecorded", key, work }),
  firstMove: (key: PositionKey): SessionEvent => ({ type: "firstMove", key }),
  answer: (key: PositionKey, moves: readonly string[]): SessionEvent => ({ type: "answer", key, moves: [...moves] }),
  pass: (key: PositionKey): SessionEvent => ({ type: "pass", key }),
  reopen: (key: PositionKey): SessionEvent => ({ type: "reopen", key }),
  next: (): SessionEvent => ({ type: "next" }),
  engineQueued: (key: PositionKey, jobId: string): SessionEvent => ({ type: "engineQueued", key, jobId }),
  engineSearched: (key: PositionKey, jobId: string, result: PositionResult): SessionEvent => ({ type: "engineSearched", key, jobId, result }),
  engineFailed: (key: PositionKey, jobId?: string): SessionEvent => ({ type: "engineFailed", key, ...(jobId === undefined ? {} : { jobId }) }),
  engineRetry: (key: PositionKey): SessionEvent => ({ type: "engineRetry", key }),
  settingsChanged: (settings: Partial<SessionSettings>): SessionEvent => ({ type: "settingsChanged", ...settings }),
} as const;

/** A position's record changed by `edit` — the record back where the key names none or nothing changed. */
const editPosition = (record: FindBestMoveRecord, key: PositionKey, edit: (position: PositionRecord) => PositionRecord): FindBestMoveRecord => {
  const position = record.positions.get(key);
  return position === undefined ? record : withPosition(record, edit(position));
};

/** `idle → wanted`, where the engine is on and the position's top lines are fewer than N. */
const wantEngine = (record: FindBestMoveRecord, key: PositionKey): FindBestMoveRecord =>
  editPosition(record, key, (position) => {
    if (!record.settings.engine || position.engine.kind !== "idle") return position;
    const training = trainingPositionOf(record, key);
    return training === undefined || !needsEngine(training, record.wanted) ? position : { ...position, engine: { kind: "wanted" } };
  });

/** The position on screen left: a reopened pass is passed again. */
const leave = (record: FindBestMoveRecord): FindBestMoveRecord =>
  editPosition(record, record.current, (position) => (position.answer.kind === "reopened" ? { ...position, answer: { kind: "passed" } } : position));

const goTo = (record: FindBestMoveRecord, key: PositionKey): FindBestMoveRecord => {
  if (key === record.current || !record.positions.has(key)) return record;
  return { ...leave(record), current: key };
};

/** Whether the engine axis is still waiting for a search. */
const pending = (engine: EngineState): boolean => engine.kind === "wanted" || engine.kind === "queued";

/** **The reducer** — one event applied to a record; the same record where it does not apply. */
export const sessionReducer = (record: FindBestMoveRecord, event: SessionEvent): FindBestMoveRecord => {
  switch (event.type) {
    case "goTo":
      return goTo(record, event.key);

    case "workRecorded":
      return editPosition(record, event.key, (position) => {
        const fen = positionFenOf(record.game, event.key);
        // Work is a tree from the position's own FEN — anything else is no work of this position.
        if (event.work !== null && (fen === undefined || !sameBoard(event.work.startFen, fen))) return position;
        const work = event.work !== null && event.work.moves.length === 0 ? null : event.work;
        return workFragmentOf(work) === workFragmentOf(position.work) ? position : { ...position, work };
      });

    case "firstMove":
      // Started on grading alone (CTA-247): a move there asks nothing.
      return record.settings.engineStart === "grade" ? record : wantEngine(record, event.key);

    case "answer": {
      if (event.moves.length === 0) return record;
      const answered = editPosition(record, event.key, (position) =>
        position.answer.kind === "open" || position.answer.kind === "reopened"
          ? { ...position, answer: { kind: "answered", moves: [...event.moves] } }
          : position,
      );
      return answered === record ? record : wantEngine(answered, event.key);
    }

    case "pass":
      return editPosition(record, event.key, (position) =>
        position.answer.kind === "open" || position.answer.kind === "reopened" ? { ...position, answer: { kind: "passed" } } : position,
      );

    case "reopen": {
      const position = record.positions.get(event.key);
      if (position === undefined || position.answer.kind !== "passed") return record;
      // The one on screen is left first (`goTo`), so a reopened pass there is passed again before this one opens.
      const moved = goTo(record, event.key);
      return withPosition(moved, { ...(moved.positions.get(event.key) ?? position), answer: { kind: "reopened" } });
    }

    case "next": {
      const key = nextOpen(record);
      return key === undefined ? record : goTo(record, key);
    }

    case "engineQueued":
      return editPosition(record, event.key, (position) =>
        position.engine.kind === "wanted" ? { ...position, engine: { kind: "queued", jobId: event.jobId } } : position,
      );

    case "engineSearched":
      return editPosition(record, event.key, (position) => {
        if (!pending(position.engine)) return position;
        const training = trainingPositionOf(record, event.key);
        const merged = training === undefined ? undefined : withEngineResult(training, event.result);
        return {
          ...position,
          engine: { kind: "searched", jobId: event.jobId },
          ...(merged === undefined || merged === training ? {} : { lines: storedLinesOf(merged) }),
        };
      });

    case "engineFailed":
      return editPosition(record, event.key, (position) => {
        const { engine } = position;
        if (!pending(engine)) return position;
        // Another job's failure is not this one's — nor, wanted again (`engineRetry`), the new search's: a job's echo names a queued one.
        if (event.jobId !== undefined && (engine.kind !== "queued" || event.jobId !== engine.jobId)) return position;
        const jobId = event.jobId ?? (engine.kind === "queued" ? engine.jobId : undefined);
        return { ...position, engine: { kind: "failed", ...(jobId === undefined ? {} : { jobId }) } };
      });

    case "engineRetry":
      // *Evaluate again* (CTA-250): an answered position whose search was lost (`failed`) or never asked (`idle`, the offer
      // declined), its top lines still too few, wants its engine once more — the one way out of `failed`. The answer stays.
      return editPosition(record, event.key, (position) => {
        if (!record.settings.engine || position.answer.kind !== "answered") return position;
        if (position.engine.kind !== "failed" && position.engine.kind !== "idle") return position;
        const training = trainingPositionOf(record, event.key);
        return training === undefined || !needsEngine(training, record.wanted) ? position : { ...position, engine: { kind: "wanted" } };
      });

    case "settingsChanged": {
      // Only the settings: a position already wanted, queued or searched stays as it is.
      const { engine = record.settings.engine, arrows = record.settings.arrows, engineStart = record.settings.engineStart } = event;
      const { settings } = record;
      return engine === settings.engine && arrows === settings.arrows && engineStart === settings.engineStart
        ? record
        : { ...record, settings: { engine, arrows, engineStart } };
    }
  }
};

/** **Events applied in turn** — one write's worth; the same record back when none applied. */
export const reduceSession = (record: FindBestMoveRecord, events: readonly SessionEvent[]): FindBestMoveRecord =>
  events.reduce(sessionReducer, record);

/** Two FENs of one position — the board, the side to move, castling and en passant. */
const sameBoard = (a: string, b: string): boolean => a.trim().split(/\s+/).slice(0, 4).join(" ") === b.trim().split(/\s+/).slice(0, 4).join(" ");
