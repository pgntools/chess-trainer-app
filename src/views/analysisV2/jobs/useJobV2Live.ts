import { useSyncExternalStore } from "react";

import { jobV2LiveSnapshot, subscribeJobV2Live, type JobV2Live } from "../../../lib/jobV2Live";

/**
 * **The running Jobs V2 job's live engine progress** (CTA-190) — this tab's
 * runner's or another tab's (`lib/jobV2Live.ts`), `undefined` while no
 * position is being searched. A caller shows it only for a job whose record
 * is `running` ({@link liveOfJob}), so a paused, cancelled, failed, done or
 * queued job never shows a snapshot still in flight.
 */
export const useJobV2Live = (): JobV2Live | undefined =>
  useSyncExternalStore(subscribeJobV2Live, jobV2LiveSnapshot, () => undefined);

/** The snapshot if it is this job's and the job is running. */
export const liveOfJob = (live: JobV2Live | undefined, job: { id: string; status: string } | undefined): JobV2Live | undefined =>
  live !== undefined && job !== undefined && job.status === "running" && live.jobId === job.id ? live : undefined;
