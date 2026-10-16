import type { DataTableSort } from "../../../design-system/patterns/tables";

/** The queue's columns — every one sortable (CTA-221). */
export type JobQueueColumn = "title" | "kind" | "status" | "progress" | "created";

/** The queue's sort until the reader turns it: newest first. */
export const JOB_QUEUE_DEFAULT_SORT: DataTableSort<JobQueueColumn> = { column: "created", direction: "desc" };
