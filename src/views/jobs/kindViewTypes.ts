import type { ComponentType } from "react";
import type { TFunction } from "i18next";
import type { EntityRef, JobRecord } from "@pgntools/jobs-runtime";

import type { NewJobKindOption } from "../../blocks/dialogs";

/*
  **What a kind's views are given** (CTA-221) — the contract of
  `kindViews.ts`. Every view is optional: a kind without them still lists,
  runs and offers its outputs generically.
*/

/**
 * **A kind's New-job form** — it renders `NewJobFrame` itself (the kinds
 * passed through, so the reader can switch), holds its own state and queues
 * the job with `jobRuntime().enqueue`, then calls `onStarted`.
 */
export type NewJobKindProps = {
  open: boolean;
  onClose: () => void;
  /** The job is queued: the host closes and offers to open it. */
  onStarted: (job: { id: string; title: string }) => void;
  /** What the job is for — one entity, or several (the collections picked). */
  subjects: readonly EntityRef[];
  /** What the screen knows that the store does not — a Case's tree as its board holds it. */
  context?: unknown;
  /** The kinds the frame offers, and the one chosen (this one). */
  kinds: readonly NewJobKindOption[];
  kindId: string;
  onKindChange: (kindId: string) => void;
  testId: string;
};

/** A view of one job. */
export type JobViewProps = { job: JobRecord; testId: string };

/** A running job's live view — its telemetry, from whichever tab runs it. */
export type JobLiveViewProps = JobViewProps & { live: unknown };

/** A data output, drawn by its kind. */
export type JobDataViewProps = JobViewProps & { output: { key: string; schema: string; value: unknown } };

/** What the header indicator adds while a job of the kind runs: the beat's time, the live numbers' words. */
export type JobLiveSummary = { heardAt?: number; words?: string };

export type JobKindViews = {
  NewJob?: ComponentType<NewJobKindProps>;
  /** Under the progress bar while it runs. */
  Live?: ComponentType<JobLiveViewProps>;
  /** The details section — its report, its results so far. */
  Details?: ComponentType<JobViewProps>;
  /** What it was asked to do. */
  Parameters?: ComponentType<JobViewProps>;
  /** A data output. */
  Data?: ComponentType<JobDataViewProps>;
  /** For the header indicator. */
  liveSummary?: (live: unknown, t: TFunction) => JobLiveSummary | undefined;
  /** Why it cannot be started on these subjects ("Pick two or more collections") — absent, it can. */
  unavailable?: (subjects: readonly EntityRef[], t: TFunction) => string | undefined;
};
