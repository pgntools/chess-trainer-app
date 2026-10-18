import { computerAnalysisOptionsFrom, DEFAULT_COMPUTER_ANALYSIS_OPTIONS } from "../computerAnalysis";
import type { UciOptionValue } from "../engineTypes";

/**
 * **An engine job's engine settings, against the ones in effect** (CTA-236)
 * — what Resume compares before an engine-lane job goes on. A job's input
 * snapshots its engine, its preset (the option values it sends) and its
 * search (depth, move time, Threads, Hash) when it is queued, and runs with
 * them however the reader's settings change since. Resumed, the job is
 * compared with **what a new job of its kind would be given now** — the Jobs
 * default engine and preset (else the board's engine and its selected
 * preset), the preset's depth and move time, the Engine menu's Threads and
 * Hash, held to the engine as the New-job forms hold them
 * ({@link currentJobEngineSettings}). Equal, it resumes; different, the Jobs
 * screens ask (`JobSettingsChangedDialog`), and *Continue with current
 * settings* re-queues it as a new job (`continueJob.ts`).
 *
 * Pure: no store, no React — each kind reads its stored input
 * ({@link recordedJobEngineSettingsFrom}), the screen gathers the current
 * settings, this compares them.
 */

/** The search fields a job is compared on, in the order the dialog lists them. */
const JOB_SEARCH_FIELDS = ["depth", "moveTimeMs", "threads", "hashMb"] as const;
type JobSearchField = (typeof JOB_SEARCH_FIELDS)[number];

/** The preset a job was given: its id and name (the reader's words then), and the option values it sends. */
export type JobEnginePreset = { id: string; name: string; values: Readonly<Record<string, UciOptionValue>> };

/** **An engine job's engine settings** — the engine (a registry id), the preset, the search. */
export type JobEngineSettings = {
  engine: string;
  preset: JobEnginePreset;
} & Record<JobSearchField, number>;

/** What a stored job says it runs with — only the fields its input carries: an older record's missing one is never "different". */
export type RecordedJobEngineSettings = Partial<JobEngineSettings>;

/** **One setting that differs** — the job's value, then the one in effect now. */
export type JobEngineChange =
  /** The engine, by registry id — the screen names it. */
  | { field: "engine"; job: string; current: string }
  /** The preset, by name — listed when its values differ and it is another preset (or renamed). */
  | { field: "preset"; job: string; current: string }
  /** One option the two presets send differently; `undefined` is not sent — the engine's own default. */
  | { field: "option"; name: string; job: UciOptionValue | undefined; current: UciOptionValue | undefined }
  | { field: JobSearchField; job: number; current: number };

const isRow = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const isOptionValue = (value: unknown): value is UciOptionValue =>
  typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value));

/**
 * **A stored input's engine settings, read as it carries them** — the
 * engine's id, the preset (`{ id, name?, values? }` — `null` or a row with no
 * id is none) and each search field a finite number; anything missing or
 * mistyped left out, so it is never compared. Never throws.
 */
export const recordedJobEngineSettingsFrom = (engine: unknown, preset: unknown, search: unknown): RecordedJobEngineSettings => {
  const recorded: RecordedJobEngineSettings = {};
  if (typeof engine === "string" && engine !== "") recorded.engine = engine;
  if (isRow(preset) && typeof preset.id === "string") {
    const values = isRow(preset.values)
      ? Object.fromEntries(Object.entries(preset.values).filter((entry): entry is [string, UciOptionValue] => isOptionValue(entry[1])))
      : {};
    recorded.preset = { id: preset.id, name: typeof preset.name === "string" ? preset.name : "", values };
  }
  if (isRow(search)) {
    for (const field of JOB_SEARCH_FIELDS) {
      const value = search[field];
      if (typeof value === "number" && Number.isFinite(value)) recorded[field] = value;
    }
  }
  return recorded;
};

/**
 * **What a new engine job would be given now** — the New-job forms' seeding
 * (`ComputerAnalysisNewJob`, `RepertoireEvaluationNewJob`): the engine and
 * the preset (its values as a job's input keeps them, `presetSentValues`),
 * the preset's depth and move time, the Engine menu's Threads and Hash —
 * every number held to the engine's bounds as the forms hold them
 * (`computerAnalysisOptionsFrom`).
 */
export const currentJobEngineSettings = ({
  engine,
  preset,
  search,
  threads,
  hashMb,
}: {
  engine: string;
  preset: JobEnginePreset;
  search: { depth: number; moveTimeMs: number };
  threads: number;
  hashMb: number;
}): JobEngineSettings => {
  const held = computerAnalysisOptionsFrom({
    ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS,
    engine,
    depth: search.depth,
    moveTimeMs: search.moveTimeMs,
    threads,
    hashMb,
  });
  return { engine: held.engine, preset, depth: held.depth, moveTimeMs: held.moveTimeMs, threads: held.threads, hashMb: held.hashMb };
};

/** A preset's name as the dialog shows it — its id where it had none. */
const presetNameOf = (preset: JobEnginePreset): string => preset.name || preset.id;

/**
 * **What a job's settings say that the current ones do not** — the dialog's
 * rows, in order: the engine; the preset — its name, when the two send
 * different values and are not the same preset under the same name — then
 * each option sent differently (the job's first, in its order, then the
 * current preset's others); then depth, move time, Threads and Hash. A field
 * the job does not carry is skipped. None: the job resumes as it is.
 */
export const jobEngineChanges = (recorded: RecordedJobEngineSettings, current: JobEngineSettings): JobEngineChange[] => {
  const changes: JobEngineChange[] = [];
  if (recorded.engine !== undefined && recorded.engine !== current.engine) {
    changes.push({ field: "engine", job: recorded.engine, current: current.engine });
  }
  if (recorded.preset !== undefined) {
    const job = recorded.preset.values;
    const now = current.preset.values;
    const names = [...new Set([...Object.keys(job), ...Object.keys(now)])];
    const options = names.flatMap((name): JobEngineChange[] =>
      job[name] === now[name] ? [] : [{ field: "option", name, job: job[name], current: now[name] }],
    );
    if (options.length > 0) {
      const jobName = presetNameOf(recorded.preset);
      const currentName = presetNameOf(current.preset);
      if (recorded.preset.id !== current.preset.id || jobName !== currentName) {
        changes.push({ field: "preset", job: jobName, current: currentName });
      }
      changes.push(...options);
    }
  }
  for (const field of JOB_SEARCH_FIELDS) {
    const value = recorded[field];
    if (value !== undefined && value !== current[field]) changes.push({ field, job: value, current: current[field] });
  }
  return changes;
};

/* ─── The job a new one continues ─────────────────────────────────────── */

/**
 * **The job a continued job continues** (CTA-236) — what *Continue with
 * current settings* writes into the new job's input: the old job's id, its
 * title and when it was asked for. The old job is removed once the new one
 * is queued, so this is the only trace of it — its page says it.
 */
export type JobContinuation = { jobId: string; title: string; createdAt: string };

/** A stored continuation read back — `undefined` without the old job's id. Never throws. */
export const jobContinuationFrom = (value: unknown): JobContinuation | undefined => {
  if (!isRow(value) || typeof value.jobId !== "string" || value.jobId === "") return undefined;
  return {
    jobId: value.jobId,
    title: typeof value.title === "string" ? value.title : "",
    createdAt: typeof value.createdAt === "string" ? value.createdAt : "",
  };
};
