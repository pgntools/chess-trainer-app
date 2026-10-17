import type { JobViewStatus } from "./jobView";

/** The Jobs queue's filters as they are — `""` is "any" (CTA-217; in the table's headers since CTA-221). */
export type JobQueueFilterValues = {
  status: JobViewStatus | "";
  /** A kind's id (`analysis.computer-analysis`). */
  kind: string;
};

/** A choice of a filter: its value and the words for it in the reader's language. */
export type JobQueueFilterOption = { value: string; label: string };

/** No filter on. */
export const NO_JOB_QUEUE_FILTERS: JobQueueFilterValues = { status: "", kind: "" };

/** Whether any filter is on. */
export const jobQueueFiltered = (values: JobQueueFilterValues): boolean => values.status !== "" || values.kind !== "";
