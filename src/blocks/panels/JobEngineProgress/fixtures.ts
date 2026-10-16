import type { EngineSessionLive } from "../../../lib/jobs/engineSession";

/*
  A running Jobs V2 job's live engine progress (CTA-190), typed with
  `src/lib/`'s own snapshot. Imported only by the block's gallery and its test.
*/

/** Deep in a search: every number the engine reports, a best line with its score. */
export const DEEP: EngineSessionLive = {
  jobId: "job",
  index: 12,
  move: "7. Nf3",
  depth: 22,
  seldepth: 31,
  nodes: 3_141_592,
  nps: 2_400_000,
  hashfull: 457,
  elapsedMs: 12_340,
  score: { kind: "cp", value: 35 },
  line: ["Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O"],
  heardAt: Date.UTC(2026, 9, 13, 12, 0, 0),
};

/** A search just begun, on the game's last position (no move judged from it): no counts yet, no line. */
export const STARTING: EngineSessionLive = {
  jobId: "job",
  index: 0,
  depth: 0,
  elapsedMs: 0,
  line: [],
  heardAt: Date.UTC(2026, 9, 13, 12, 0, 0),
};

/** A mate found for Black. */
export const MATE: EngineSessionLive = {
  ...DEEP,
  move: "31... Qh4",
  depth: 18,
  seldepth: 24,
  hashfull: undefined,
  score: { kind: "mate", value: -3 },
  line: ["Qh4+", "g3", "Qxg3#"],
};

/** The time the demos measure "heard … ago" to: 3 s after {@link DEEP} was heard — a heartbeat just in. */
export const HEARD_RECENTLY = DEEP.heardAt + 3_000;

/** Deep in a long quiet stretch (CTA-194): no line for minutes, the engine last heard 42 s before {@link SILENT_NOW}. */
export const SILENT: EngineSessionLive = {
  ...DEEP,
  move: "16. Bg3",
  depth: 32,
  seldepth: 51,
  nodes: 912_345_678,
  nps: 1_480_000,
  hashfull: 999,
  elapsedMs: 616_400,
  score: { kind: "cp", value: 87 },
  line: ["Bg3", "Rd7", "f3", "gxf3", "gxf3", "Bf5"],
};

/** The time {@link SILENT}'s demo is measured to. */
export const SILENT_NOW = SILENT.heardAt + 42_000;
