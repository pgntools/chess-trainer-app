import type { EnqueueProblem, JobRecord, JobRuntime } from "@pgntools/jobs-runtime";

import { jobEngineChanges, type JobEngineChange, type JobEngineSettings, type RecordedJobEngineSettings } from "./engineJobSettings";
import {
  COMPUTER_ANALYSIS_KIND,
  continuedInputOf as continuedComputerAnalysis,
  parseState as parseComputerAnalysisState,
  readInput as readComputerAnalysisInput,
  recordedEngineSettingsOf as recordedComputerAnalysis,
} from "./kinds/computerAnalysis/core";
import {
  continuedInputOf as continuedRepertoireEvaluation,
  parseRepertoireEvaluationInput,
  parseRepertoireEvaluationState,
  recordedEngineSettingsOf as recordedRepertoireEvaluation,
  REPERTOIRE_EVALUATION_KIND,
} from "./kinds/repertoireEvaluation/core";

/**
 * **Resume, against the settings in effect** (CTA-236) — what the Jobs
 * screens ask before an engine job goes on, and *Continue with current
 * settings*.
 *
 * The runtime keeps a job's input immutable and `resume(id)` takes none, so
 * a job cannot be given other settings: continuing with the current ones
 * **queues a new job** of the same kind — the old one's source, target and
 * form, today's engine, preset and search, the old job named
 * (`continues`), its results so far as the seed its plan starts from — and
 * only once that is queued **removes the old one**. A refused enqueue leaves
 * the old job as it was.
 *
 * One entry per engine-lane kind; a kind with none (a retired kind's job,
 * CTA-232) is never asked about.
 */

type EngineJobKindSettings = {
  /** The engine settings the stored input carries. */
  recorded: (input: unknown) => RecordedJobEngineSettings;
  /** The new job's input — `undefined` when the stored input does not read. */
  continued: (job: JobRecord, current: JobEngineSettings) => unknown;
};

/** The job the new one continues, as its input names it. */
const continuationOf = (job: JobRecord) => ({ jobId: job.id, title: job.title, createdAt: job.createdAt });

const ENGINE_JOB_KINDS: Readonly<Record<string, EngineJobKindSettings>> = {
  [COMPUTER_ANALYSIS_KIND]: {
    recorded: recordedComputerAnalysis,
    continued: (job, current) => {
      const input = readComputerAnalysisInput(job.input);
      if (input === undefined) return undefined;
      const state = job.state === null ? null : (parseComputerAnalysisState(job.state, job.kindVersion) ?? null);
      return continuedComputerAnalysis(input, state, current, continuationOf(job));
    },
  },
  [REPERTOIRE_EVALUATION_KIND]: {
    recorded: recordedRepertoireEvaluation,
    continued: (job, current) => {
      const input = parseRepertoireEvaluationInput(job.input);
      if (input === undefined) return undefined;
      const state = job.state === null ? null : (parseRepertoireEvaluationState(job.state, job.kindVersion) ?? null);
      return continuedRepertoireEvaluation(input, state, current, continuationOf(job));
    },
  },
};

/** Whether a kind's jobs are compared on Resume — the engine-lane kinds. */
export const isEngineJobKind = (kindId: string): boolean => Object.hasOwn(ENGINE_JOB_KINDS, kindId);

/**
 * **What Resume should ask about** — the settings `job` was queued with that
 * differ from `current`; none means resume at once: a job of a kind not
 * compared, one with no position left to search (its search is done — what
 * remains is its outputs, which the settings do not touch), or one whose
 * settings are the current ones.
 */
export const resumeChangesOf = (job: JobRecord, current: JobEngineSettings): JobEngineChange[] => {
  const kind = Object.hasOwn(ENGINE_JOB_KINDS, job.kind) ? ENGINE_JOB_KINDS[job.kind] : undefined;
  if (kind === undefined) return [];
  const searching = job.phase === "plan" || (job.phase === "steps" && job.progress.done < job.progress.total);
  return searching ? jobEngineChanges(kind.recorded(job.input), current) : [];
};

/**
 * **Continue with current settings** — the new job queued, then the old one
 * removed. `{ id }` the new job's; `{ problem }` the runtime's refusal
 * (`invalid` for an input that no longer reads), the old job untouched.
 */
export const continueWithCurrentSettings = async (
  runtime: Pick<JobRuntime, "enqueue" | "remove">,
  job: JobRecord,
  current: JobEngineSettings,
): Promise<{ id: string } | { problem: EnqueueProblem }> => {
  const kind = Object.hasOwn(ENGINE_JOB_KINDS, job.kind) ? ENGINE_JOB_KINDS[job.kind] : undefined;
  const input = kind?.continued(job, current);
  if (input === undefined) return { problem: kind === undefined ? "unknown-kind" : "invalid" };
  const queued = await runtime.enqueue(job.kind, input);
  if ("problem" in queued) return queued;
  await runtime.remove([job.id]);
  return queued;
};
