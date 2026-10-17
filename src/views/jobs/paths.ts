/**
 * **The Jobs module's addresses** (CTA-221): every job at `/jobs`, one job at
 * `/jobs/<id>`, the Jobs settings at `/jobs/settings` (a static segment, so
 * it ranks above `:jobId`; a job id is `newRecordId`'s `[0-9a-z]`, never
 * `settings`).
 */

export const JOBS_PATH = "/jobs";

/** One job's page. */
export const jobPath = (jobId: string): string => `${JOBS_PATH}/${encodeURIComponent(jobId)}`;

/** The Jobs settings. */
export const JOBS_SETTINGS_PATH = `${JOBS_PATH}/settings`;
