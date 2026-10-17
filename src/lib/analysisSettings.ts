/**
 * **The engine settings an analysis is worked under** — what a saved
 * analysis records, so a later look can tell how it was searched; and, since
 * CTA-181, nothing a board keeps of its own: the search settings are the
 * reader's one global set (`lib/engineSearchSettings.ts`, the top bar's
 * Engine menu), and a session's settings are those with the Analysis Board's
 * **Write evaluations into the game** switch beside them
 * ({@link analysisSettingsOf}). Opening a record whose settings differ from
 * the ones in effect asks whether to put them back ("Engine options
 * changed").
 *
 * It lived in the legacy Analysis Board's hook until a saved analysis had to
 * record it (both removed in CTA-192), and then moved here for the reason
 * [`engineSettings.ts`](./engineSettings.ts) exists: a record is plain data
 * and cannot import a hook.
 *
 * As there, it is **not** a description of the running engine. Which knobs the
 * worker actually has is the handle's `options`' business
 * (`.claude/rules/chessboard.md` §4.1), so a stored value is a *request* that
 * the engine module clamps to whatever the running build declared.
 */

import { engineSettingBoundsOf } from "./engineSettings";
import { DEFAULT_ENGINE_SEARCH_SETTINGS, type EngineSearchSettings } from "./engineSearchSettings";
import { withMissingFields } from "./recordedFields";

/** The engine settings an analysis records — the global search settings, and whether evaluations are written. */
export type AnalysisSettings = {
  /** Plies per search — where every search stops, if its move time has not stopped it first. */
  depth: number;
  /** UCI `MultiPV` — how many lines the Variations tab shows. */
  multiPv: number;
  /**
   * Milliseconds per search; `0` means "depth alone decides". (A record from
   * before CTA-185 may carry an `infinite` too — infinite analysis, gone: it
   * is read as nothing.)
   */
  moveTimeMs: number;
  /**
   * UCI `Threads` and `Hash` (MB) — the same on every board (CTA-160, one
   * global set since CTA-181). Requests, held to `ENGINE_SETTING_BOUNDS` by
   * {@link analysisUciOptionsOf} — an engine server's engine to its own,
   * wider bounds (CTA-175) — and clamped to what the running engine declares
   * (the single-thread build pins `Threads` to 1). Stored as asked, never cut
   * back to the in-browser ceiling.
   */
  threads: number;
  hashMb: number;
  /**
   * **Write evaluations into the game** (CTA-167): each finished search's
   * score written as `[%eval]` on the move it evaluates (`lib/engineEvals.ts`).
   * Off by default; offered on the Analysis Board's engine menu only (beside
   * its play / pause engine button, CTA-181). Not an engine knob, and not
   * global — the session's, kept here because the record keeps it.
   */
  writeEvals: boolean;
};

/**
 * The global search settings' defaults (depth 20 — about 3.5 s on a fast
 * desktop with the default engine, CTA-160 — three lines, no time limit,
 * one thread, 16 MB) and evaluations not written: what a
 * record from before a field reads it as.
 */
export const DEFAULT_ANALYSIS_SETTINGS: AnalysisSettings = {
  ...DEFAULT_ENGINE_SEARCH_SETTINGS,
  writeEvals: false,
};

/** A session's settings: the global search settings in effect, and its own evaluations switch. */
export const analysisSettingsOf = (search: EngineSearchSettings, writeEvals: boolean): AnalysisSettings => ({
  multiPv: search.multiPv,
  depth: search.depth,
  moveTimeMs: search.moveTimeMs,
  threads: search.threads,
  hashMb: search.hashMb,
  writeEvals,
});

/**
 * Which UCI option each setting drives. The names are the engine's; whether the
 * running build *has* them is answered by the handle's `options`, never by this table.
 *
 * `Skill Level` is deliberately absent. An analysis board wants the engine's
 * best answer, so it never weakens it — and the build's own default is full
 * strength, so there is nothing to post.
 */
const ANALYSIS_UCI_OPTION = {
  multiPv: "MultiPV",
  threads: "Threads",
  hashMb: "Hash",
} as const satisfies Partial<Record<keyof AnalysisSettings, string>>;

/**
 * The option-backed settings as the engine module takes them — UCI name →
 * requested value — with `Threads` and `Hash` held to the ceilings whatever a
 * stored or imported analysis says (a hash past them crashes the tab).
 * Play with Engine's `uciOptionsOf`, without the strength — and, like it,
 * `engineId` (the engine that will run) moves the ceilings to an engine
 * server's engine's own (`engineSettingBoundsOf`, CTA-175); absent, the
 * in-browser ones.
 */
export const analysisUciOptionsOf = (
  settings: Pick<AnalysisSettings, keyof typeof ANALYSIS_UCI_OPTION>,
  engineId?: string,
): Record<string, number> => {
  const bounds = engineSettingBoundsOf(engineId);
  return {
    [ANALYSIS_UCI_OPTION.multiPv]: settings.multiPv,
    [ANALYSIS_UCI_OPTION.threads]: Math.min(settings.threads, bounds.threads.max),
    [ANALYSIS_UCI_OPTION.hashMb]: Math.min(settings.hashMb, bounds.hashMb.max),
  };
};

const finiteNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback;

/**
 * Read settings back out of stored JSON, filling in the default for anything
 * missing, mistyped or nonsensical. Never throws — a stored record is text
 * another version of this app wrote, so what cannot be read is replaced rather
 * than allowed to reach the engine. A field the row lacks is marked as such
 * (`missingFieldsOf`, `lib/recordedFields.ts`).
 */
export const analysisSettingsFrom = (value: unknown): AnalysisSettings => {
  if (typeof value !== "object" || value === null) {
    return withMissingFields({ ...DEFAULT_ANALYSIS_SETTINGS }, Object.keys(DEFAULT_ANALYSIS_SETTINGS));
  }
  const row = value as Record<string, unknown>;

  // A field the stored row lacks is its default — and marked, so it never reads as a choice (CTA-181).
  return withMissingFields({
    depth: finiteNumber(row.depth, DEFAULT_ANALYSIS_SETTINGS.depth),
    multiPv: finiteNumber(row.multiPv, DEFAULT_ANALYSIS_SETTINGS.multiPv),
    moveTimeMs: finiteNumber(
      row.moveTimeMs,
      DEFAULT_ANALYSIS_SETTINGS.moveTimeMs,
    ),
    // A record from before threads and a hash has none (CTA-160): Play with Engine's defaults.
    // (An `infinite` it carries — infinite analysis, gone since CTA-185 — is read as nothing.)
    threads: finiteNumber(row.threads, DEFAULT_ANALYSIS_SETTINGS.threads),
    hashMb: finiteNumber(row.hashMb, DEFAULT_ANALYSIS_SETTINGS.hashMb),
    // …nor one from before the evaluations switch (CTA-167): off.
    writeEvals: row.writeEvals === true,
  }, Object.keys(DEFAULT_ANALYSIS_SETTINGS).filter((field) => row[field] === undefined));
};

/** Whether two settings would drive the engine identically — and write the same into the game. */
export const sameAnalysisSettings = (
  a: AnalysisSettings,
  b: AnalysisSettings,
): boolean =>
  a.depth === b.depth &&
  a.multiPv === b.multiPv &&
  a.moveTimeMs === b.moveTimeMs &&
  a.threads === b.threads &&
  a.hashMb === b.hashMb &&
  a.writeEvals === b.writeEvals;
