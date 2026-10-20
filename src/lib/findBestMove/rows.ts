import type { TrainingSide } from "../accuracyTrainer";
import type { AnalysisCase } from "../analysisProjects";
import { readPgnTags } from "../pgn";
import { isOlderSessionTags, sessionRecordOf } from "./pgn";
import { progressOf, type SessionProgress } from "./selectors";

/**
 * **The Find Best Move sessions lobby's rows** (CTA-239; read from the tags
 * alone since CTA-244) — pure: one row per Case of the *Find Best Move*
 * project, its session read from its PGN's tags (`readPgnTags`, no movetext
 * parse — `pgn.ts`), and the table's sort. A Case that is not a session keeps
 * its row, not resumable; an **older session** (v3's format) says so, and
 * opens in Analysis.
 */

/** The lobby's columns, in order — the whitelist `?sort=` is read against. */
export const FIND_BEST_MOVE_SESSION_COLUMNS = ["name", "side", "moves", "progress", "found", "status", "updated"] as const;

export type FindBestMoveSessionColumn = (typeof FIND_BEST_MOVE_SESSION_COLUMNS)[number];

/** One session as the lobby lists it. */
export type FindBestMoveSessionRow = {
  /** Its Case's id — its address. */
  id: string;
  /** Its Case's name as the reader sees it. */
  name: string;
  /** ISO 8601 — its Case's last change. */
  updatedAt: string;
  /** What its PGN says — absent for a Case that is not a session: it cannot be resumed. */
  session?: { side: TrainingSide; wanted: number; progress: SessionProgress };
  /** A session of an older format (Find Best Move v3's) — never converted: it opens in Analysis. */
  older?: true;
};

/** **A session Case's row** — its tags read and its progress counted; a Case whose tags are no session has none. */
export const findBestMoveSessionRowOf = (record: Pick<AnalysisCase, "id" | "pgn" | "updatedAt">, name: string): FindBestMoveSessionRow => {
  const row = { id: record.id, name, updatedAt: record.updatedAt };
  const tags = readPgnTags(record.pgn);
  const read = sessionRecordOf(tags);
  if (read !== undefined) return { ...row, session: { side: read.record.side, wanted: read.record.wanted, progress: progressOf(read.record) } };
  return isOlderSessionTags(tags) ? { ...row, older: true } : row;
};

/** A row's value for a column — `undefined` where it has none (a Case that is not a session), which sorts last. */
const valueOf = (row: FindBestMoveSessionRow, column: FindBestMoveSessionColumn): string | number | undefined => {
  const { session } = row;
  switch (column) {
    case "name":
      return row.name;
    case "updated":
      return Date.parse(row.updatedAt) || undefined;
    case "side":
      return session?.side;
    case "moves":
      return session?.wanted;
    case "progress":
      return session === undefined || session.progress.total === 0
        ? undefined
        : (session.progress.answered + session.progress.passed) / session.progress.total;
    case "found":
      return session === undefined || session.progress.target === 0 ? undefined : session.progress.found / session.progress.target;
    case "status":
      return session === undefined ? undefined : session.progress.done ? 1 : 0;
  }
};

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/**
 * **The rows in a column's order** — missing values last either way, ties
 * newest first.
 */
export const sortedFindBestMoveSessions = (
  rows: readonly FindBestMoveSessionRow[],
  column: FindBestMoveSessionColumn,
  direction: "asc" | "desc",
): FindBestMoveSessionRow[] => {
  const sign = direction === "asc" ? 1 : -1;
  const newest = (a: FindBestMoveSessionRow, b: FindBestMoveSessionRow) => collator.compare(b.updatedAt, a.updatedAt);
  return [...rows].sort((a, b) => {
    const left = valueOf(a, column);
    const right = valueOf(b, column);
    if (left === undefined || right === undefined) return left === right ? newest(a, b) : left === undefined ? 1 : -1;
    const order = typeof left === "number" && typeof right === "number" ? left - right : collator.compare(String(left), String(right));
    return order === 0 ? newest(a, b) : order * sign;
  });
};

/** Which way a column opens — the numbers and the date high first, the words A to Z. */
export const findBestMoveSessionFirstDirection = (column: FindBestMoveSessionColumn): "asc" | "desc" =>
  column === "name" || column === "side" ? "asc" : "desc";
