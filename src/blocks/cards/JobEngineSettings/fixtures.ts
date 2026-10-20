import type { JobEngineSettingsView } from "./JobEngineSettings";

/*
  The engine settings plate's samples (CTA-248) — an Evaluate Position job's
  input as Find Best Move queues it. Imported only by the block's gallery and
  its test.
*/

/** Stockfish run with a preset that sent its options. */
export const WITH_OPTIONS: JobEngineSettingsView = {
  engine: "Stockfish 19 Lite",
  preset: { name: "Deep analysis", values: { Threads: 4, Hash: 256, UCI_ShowWDL: true, Contempt: 24, SyzygyPath: "/opt/syzygy" } },
  depth: 24,
  moveTimeMs: 5_000,
  multiPv: 3,
  threads: 4,
  hashMb: 256,
};

/** The Default preset, which sends nothing — the engine's own defaults; no time limit. */
export const NO_OPTIONS: JobEngineSettingsView = {
  engine: "Stockfish 19 Lite",
  preset: { name: "Default", values: {} },
  depth: 18,
  moveTimeMs: 0,
  multiPv: 1,
  threads: 1,
  hashMb: 16,
};

/** A job whose input recorded no preset, its engine named by its registry id (it has not run). */
export const NO_PRESET: JobEngineSettingsView = {
  engine: "stockfish-19-lite-single",
  preset: null,
  depth: 20,
  moveTimeMs: 2_500,
  multiPv: 5,
  threads: 2,
  hashMb: 64,
};

/** A preset named in Hebrew (switch to RTL): the numbers and the options stay left to right. */
export const HEBREW: JobEngineSettingsView = {
  ...WITH_OPTIONS,
  preset: { name: "ניתוח עמוק", values: { Threads: 4, "Skill Level": 20, UCI_ShowWDL: false } },
};
