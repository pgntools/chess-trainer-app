import type { JobViewStatus } from "./jobView";

/**
 * A job status's colour, a theme palette path (CTA-173; the Jobs module's
 * blocks' since CTA-221). The status's words carry it; the colour only
 * repeats them.
 */
export const JOB_STATUS_TONES: Readonly<Record<JobViewStatus, string>> = {
  queued: "text.secondary",
  running: "info.main",
  paused: "warning.main",
  interrupted: "warning.main",
  done: "success.main",
  failed: "error.main",
  cancelled: "text.secondary",
};
