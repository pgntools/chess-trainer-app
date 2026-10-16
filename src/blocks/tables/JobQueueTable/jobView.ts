import type { LinkTarget } from "../../../design-system/components/link";

/*
  **The Jobs module's view models** (CTA-217) — what the generic Jobs blocks
  read of a job. Block-local on purpose: the blocks never import the runtime
  (`@pgntools/jobs-runtime`) or a store, and the screen (CTA-221) maps the
  runtime's records onto these. The statuses are the runtime contract's
  `JobStatus`, re-declared here as a string union.
*/

/** A job's status — the runtime contract's `JobStatus`. */
export type JobViewStatus = "queued" | "running" | "paused" | "interrupted" | "failed" | "cancelled" | "done";

/** Every status, in the order a filter offers them. */
export const JOB_VIEW_STATUSES: readonly JobViewStatus[] = ["running", "queued", "paused", "interrupted", "failed", "cancelled", "done"];

/** What a job is applied to (an entity): its name, where it opens, and whether it has been deleted since. */
export type JobSubjectView = {
  label: string;
  /** Where it opens. Absent (or `deleted`), the name is plain words. */
  link?: LinkTarget;
  /** Deleted since the job was started — said, muted, and never a link. */
  deleted?: boolean;
};

/** How far a job has got — the runtime's `JobProgress`. */
export type JobProgressView = {
  done: number;
  /** 0 while the job has not been planned. */
  total: number;
  /** The kind's words for the unit under way ("7. Nf3"), after the count. */
  label?: string;
};

/** A job as a row of the queue — its title, its kind's name, its status, progress and subjects, and what may be done to it. */
export type JobRowView = {
  id: string;
  title: string;
  /** The kind's name in the reader's language ("Computer analysis"); a kind no longer registered says so. */
  kindLabel: string;
  status: JobViewStatus;
  progress: JobProgressView;
  subjects: readonly JobSubjectView[];
  /** ISO time it was enqueued. */
  createdAt: string;
  canPause: boolean;
  canResume: boolean;
  canCancel: boolean;
};

/** How far a job has got, 0–100: a planned job's share done, a finished one whole, else none. */
export const jobPercent = (status: JobViewStatus, progress: JobProgressView): number => {
  if (progress.total > 0) return Math.min(100, Math.max(0, (progress.done / progress.total) * 100));
  return status === "done" ? 100 : 0;
};

/** A time as the tables write a date, with the time after it: `2026-10-10 14:05` (local time). */
export const jobStampText = (value: string): string | undefined => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
