import { useSyncExternalStore } from "react";

import type { Job } from "../../lib/jobs";
import { jobsSnapshot, subscribeJobs } from "../../lib/jobStore";

/**
 * **The background jobs as React state** (CTA-173) — the store's kept list,
 * newest first, **`undefined` until its first read lands** (IndexedDB),
 * like every store's binding. The server snapshot is the same function, so
 * the pre-render reads `undefined` (`static-pages.md`).
 *
 * The New Job dialog's read too (CTA-177): a game's job makes Analyse ask
 * first, and Check existing opens it on the Jobs screen.
 */
export const useJobs = (): readonly Job[] | undefined => useSyncExternalStore(subscribeJobs, jobsSnapshot, jobsSnapshot);

/** One job by id — `undefined` while the store is read, `null` for no such job. */
export const useJob = (id: string | null | undefined): Job | null | undefined => {
  const jobs = useJobs();
  if (jobs === undefined) return undefined;
  return jobs.find((job) => job.id === id) ?? null;
};
