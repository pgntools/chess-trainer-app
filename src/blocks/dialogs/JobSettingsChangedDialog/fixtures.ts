import type { JobEngineChange } from "../../../lib/jobs/engineJobSettings";

/*
  The Resume dialog's sample changes (CTA-236) — a job's engine settings
  against the ones in effect now. Imported only by the block's gallery and
  its test.
*/

/** A computer analysis queued on another engine and preset, deeper and with no time limit. */
export const EVERYTHING_CHANGED: readonly JobEngineChange[] = [
  { field: "engine", job: "Stockfish 19 (engine server)", current: "Stockfish 19 (single-threaded)" },
  { field: "preset", job: "Deep analysis", current: "Default" },
  { field: "option", name: "Contempt", job: 20, current: undefined },
  { field: "option", name: "UCI_ShowWDL", job: true, current: false },
  { field: "depth", job: 30, current: 20 },
  { field: "moveTimeMs", job: 0, current: 5_000 },
  { field: "threads", job: 8, current: 1 },
  { field: "hashMb", job: 1_024, current: 16 },
];

/** The Engine menu's depth turned up since — one row. */
export const DEPTH_ONLY: readonly JobEngineChange[] = [{ field: "depth", job: 20, current: 24 }];

/** The new job refused — too many jobs kept. */
export const TOO_MANY = "Too many jobs are kept, none of them finished. Let some finish, or delete some in Jobs.";
