import type { JobStatus } from "../../../lib/jobs";

/**
 * A job status's colour, a theme palette path (CTA-173) — the Jobs table's
 * and the job's summary. The status's words carry it; the colour only
 * repeats them.
 */
export const JOB_STATUS_TONES: Readonly<Record<JobStatus, string>> = {
  queued: "text.secondary",
  running: "info.main",
  interrupted: "warning.main",
  done: "success.main",
  failed: "error.main",
  cancelled: "text.secondary",
};
