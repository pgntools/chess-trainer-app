import type { JobViewStatus } from "../../tables";

/** The Jobs queue's filters as they are — `""` is "any" (CTA-217). */
export type JobQueueFilterValues = {
  status: JobViewStatus | "";
  /** A kind's id (`analysis.computer-analysis`). */
  kind: string;
  /** An entity type (`analysis-case`, `repertoire`, `library-collection`). */
  entityType: string;
};

/** A choice of a filter: its value and the words for it in the reader's language. */
export type JobQueueFilterOption = { value: string; label: string };

/** No filter on. */
export const NO_JOB_QUEUE_FILTERS: JobQueueFilterValues = { status: "", kind: "", entityType: "" };
