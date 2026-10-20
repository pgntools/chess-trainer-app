import { computerAnalysisOptionsFrom, type ComputerAnalysisOptions, type PositionResult } from "../../../computerAnalysis";
import type { UciOptionValue } from "../../../engineTypes";
import { parseFen } from "../../../fen";
import type { JobEnginePreset } from "../../engineJobSettings";
import { positionResultFrom, type RanEngine } from "../computerAnalysis/core";

/**
 * **Evaluate Position** (CTA-238; its input a session's position key since
 * CTA-244, `analysis.evaluate-session-position`) — pure: one position
 * searched once, for the Accuracy Trainer's Find Best Move. The reference is
 * `.claude/rules/jobs.md` §3.2 and `accuracy-trainer.md`.
 *
 * The trainer queues it when the reader starts on a position (their first
 * move there, or a check) that has fewer of the engine's lines than they
 * asked for; its search is the top bar's Engine menu's, its MultiPV the lines
 * asked for. Its result is a data output, and the session's record takes it
 * (`engineSearched`, the kind's adapter, `kind.ts`). No engine, store,
 * runtime or React here.
 */

export const EVALUATE_POSITION_KIND = "analysis.evaluate-session-position";

/** The input's shape — another version is refused. */
export const EVALUATE_POSITION_INPUT_VERSION = 2;

/** Its state's shape — bump when it changes. */
export const EVALUATE_POSITION_STATE_VERSION = 1;

/** The data output's schema: a {@link PositionResult}. */
export const EVALUATE_POSITION_RESULT_SCHEMA = "analysis.evaluate-position.result@1";

/** The search: the Engine menu's depth, move time, Threads and Hash, and the lines asked for. */
export type EvaluatePositionSearch = Pick<ComputerAnalysisOptions, "threads" | "hashMb" | "depth" | "moveTimeMs" | "multiPv">;

export type EvaluatePositionInput = {
  version: typeof EVALUATE_POSITION_INPUT_VERSION;
  /** The session's Case — the job's subject, and whose record takes its search. */
  caseId: string;
  /** The session's position — its key (the ply of its move in the recorded game). */
  key: number;
  /** The job's title ("Evaluate position — Alice – Bob, 12. White"). */
  name: string;
  /** The position searched. */
  fen: string;
  /** The move to find, as the live progress names it ("12. White"). */
  label: string;
  /** The engine, a registry id (`lib/engines/`). */
  engine: string;
  /** The engine's preset when queued: its id, name and the values it sends. */
  preset: JobEnginePreset | null;
  search: EvaluatePositionSearch;
};

/** The state: the search's result once a step has it, and the engine that ran it. */
export type EvaluatePositionState = { result: PositionResult | null; engine: RanEngine | null };

const isRow = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const isOptionValue = (value: unknown): value is UciOptionValue =>
  typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value));

const presetFrom = (value: unknown): JobEnginePreset | null => {
  if (!isRow(value) || typeof value.id !== "string") return null;
  const values = isRow(value.values)
    ? Object.fromEntries(Object.entries(value.values).filter((entry): entry is [string, UciOptionValue] => isOptionValue(entry[1])))
    : {};
  return { id: value.id, name: typeof value.name === "string" ? value.name : "", values };
};

const fenFrom = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  try {
    return parseFen(value);
  } catch {
    return undefined;
  }
};

/**
 * **The input, read leniently** (`parseInput`): `undefined` for another
 * version, without the Case, its key or a position that reads; the search as
 * the computer analysis's options read it — each number held to its bounds,
 * the engine's own for Threads and Hash — and the engine the default where
 * none is named. Never throws.
 */
export const parseEvaluatePositionInput = (value: unknown): EvaluatePositionInput | undefined => {
  if (!isRow(value) || value.version !== EVALUATE_POSITION_INPUT_VERSION) return undefined;
  if (typeof value.caseId !== "string" || value.caseId === "") return undefined;
  if (typeof value.key !== "number" || !Number.isInteger(value.key) || value.key < 1) return undefined;
  const fen = fenFrom(value.fen);
  if (fen === undefined) return undefined;
  const search = isRow(value.search) ? value.search : {};
  const options = computerAnalysisOptionsFrom({ ...search, ...(typeof value.engine === "string" && value.engine !== "" ? { engine: value.engine } : {}) });
  return {
    version: EVALUATE_POSITION_INPUT_VERSION,
    caseId: value.caseId,
    key: value.key,
    name: typeof value.name === "string" ? value.name : "",
    fen,
    label: typeof value.label === "string" ? value.label : "",
    engine: options.engine,
    preset: presetFrom(value.preset),
    search: { threads: options.threads, hashMb: options.hashMb, depth: options.depth, moveTimeMs: options.moveTimeMs, multiPv: options.multiPv },
  };
};

const ranEngineFrom = (value: unknown): RanEngine | null =>
  isRow(value) && typeof value.id === "string" && typeof value.name === "string"
    ? { id: value.id, name: value.name, version: typeof value.version === "string" ? value.version : "" }
    : null;

/** The state, read leniently (`parseState`) — a result that does not read is none, so the step searches again. */
export const parseEvaluatePositionState = (value: unknown, fromVersion: number): EvaluatePositionState | undefined => {
  if (fromVersion !== EVALUATE_POSITION_STATE_VERSION || !isRow(value)) return undefined;
  return { result: positionResultFrom(value.result) ?? null, engine: ranEngineFrom(value.engine) };
};

/** **The data output read back** — the trainer's: a search's result, or `undefined` for anything else. */
export const parseEvaluatePositionResult = (value: unknown): PositionResult | undefined => positionResultFrom(value);
