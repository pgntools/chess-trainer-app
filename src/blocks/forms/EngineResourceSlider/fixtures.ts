import { ENGINE_SETTING_BOUNDS } from "../../../lib/engineSettings";

/** Where the slider stops and what the box takes, each for Threads and Hash. */
export type ResourceLimits = { slider: { threads: number; hashMb: number }; typed: { threads: number; hashMb: number } };

/*
  Threads and Hash — sample requests and limits (CTA-185), typed with
  `src/lib/`'s own. Imported only by the block's gallery and its test.
*/

/** The multi-thread build on an 8-core, 8 GB device: the slider to 7 threads and 1024 MB, the box to the build's 32. */
export const MULTI_THREAD: ResourceLimits = { slider: { threads: 7, hashMb: 1024 }, typed: { threads: ENGINE_SETTING_BOUNDS.threads.max, hashMb: ENGINE_SETTING_BOUNDS.hashMb.max } };

/** The single-thread build on a 4 GB device: one thread, fixed; Hash to 512 on the slider, 1024 typed. */
export const SINGLE_THREAD: ResourceLimits = { slider: { threads: 1, hashMb: 512 }, typed: { threads: 1, hashMb: ENGINE_SETTING_BOUNDS.hashMb.max } };

/** An engine server's engine: its own tops, the slider's and the box's alike. */
export const HOSTED: ResourceLimits = { slider: { threads: 15, hashMb: 4096 }, typed: { threads: 15, hashMb: 4096 } };
