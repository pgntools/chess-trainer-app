import type { JobRecord } from "@pgntools/jobs-runtime";

import { jobRuntime } from "../../../lib/jobs/runtime";
import { useJobRecords } from "../../jobs/useJobs";

/*
  **What the engine gate reads of the Jobs module** (CTA-237) — every job of
  the page's runtime, in any tab (the runtime's store is shared, its feed
  broadcast), and the pause any tab may ask for. One seam, so a board's test
  stubs a running job here rather than running one.
*/

/** Every job — `undefined` until the first read lands. Starts the page's runtime, as any reader does. */
export const useEngineGateJobs = (): readonly JobRecord[] | undefined => useJobRecords();

/** Ask the job to pause — the tab running it stops it within its step; Resume goes on from its checkpoint. */
export const pauseEngineJob = (id: string): Promise<unknown> => jobRuntime().pause(id);
