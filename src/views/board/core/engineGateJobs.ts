import type { JobRecord } from "@pgntools/jobs-runtime";

import { jobRuntime } from "../../../lib/jobs/runtime";
import { useJobQueueHeld, useJobRecords } from "../../jobs/useJobs";

/*
  **What the engine gate reads of the Jobs module** (CTA-237) — every job of
  the page's runtime, in any tab (the runtime's store is shared, its feed
  broadcast), the queue hold (CTA-258) and the pause any tab may ask for. One seam, so a board's test
  stubs a running job here rather than running one.
*/

/** Every job — `undefined` until the first read lands. Starts the page's runtime, as any reader does. */
export const useEngineGateJobs = (): readonly JobRecord[] | undefined => useJobRecords();

/** Is the queue held (CTA-258) — a running job is then going back to the queue, its engine stopping. */
export const useEngineGateHeld = (): boolean => useJobQueueHeld() === true;

/** Ask the job to pause — the tab running it stops it within its step; Resume goes on from its checkpoint. */
export const pauseEngineJob = (id: string): Promise<unknown> => jobRuntime().pause(id);
