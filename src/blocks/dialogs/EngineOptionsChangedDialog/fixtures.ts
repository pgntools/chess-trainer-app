import type { EngineSearchChange } from "../../../lib/engineSearchSettings";

/*
  "Engine options changed"'s sample differences (CTA-181), typed with
  `src/lib/`'s own. Imported only by the block's gallery and its test.
*/

/** A saved analysis searched deeper, on more lines, with a time limit and infinite analysis. */
export const ANALYSIS_CHANGES: readonly EngineSearchChange[] = [
  { field: "multiPv", recorded: 5, current: 3 },
  { field: "depth", recorded: 26, current: 20 },
  { field: "moveTimeMs", recorded: 5000, current: 0 },
  { field: "infinite", recorded: true, current: false },
];

/** A game played on an engine server's engine: four threads and 1024 MB. */
export const GAME_CHANGES: readonly EngineSearchChange[] = [
  { field: "threads", recorded: 4, current: 1 },
  { field: "hashMb", recorded: 1024, current: 16 },
];

/** What the single-thread build would hold {@link GAME_CHANGES} to. */
export const HELD = [
  { field: "threads", value: 1 },
  { field: "hashMb", value: 512 },
] as const;
