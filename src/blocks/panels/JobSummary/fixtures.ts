import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS, type ComputerAnalysisReport } from "../../../lib/computerAnalysis";
import { jobV2Of, type JobV2 } from "../../../lib/jobsV2";

/*
  One Jobs V2 job in the states its summary shows differently (CTA-173,
  CTA-188), typed with `lib/jobsV2.ts`'s own. Imported only by the block's gallery and its test.
*/

const PGN = '[White "Carlsen, Magnus"]\n[Black "Nepomniachtchi, Ian"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *';

const base = jobV2Of(
  "job",
  {
    source: { projectId: "project-1", caseId: "case-1", name: "Carlsen – Nepomniachtchi", pgn: PGN },
    options: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, depth: 22, moveTimeMs: 15000, multiPv: 3, threads: 4, hashMb: 256, outputs: ["light", "medium"] },
    preset: { id: "default", name: "Default", values: {} },
    target: { kind: "project", projectId: "project-1" },
  },
  new Date("2026-10-10T12:00:00Z"),
)!;

const finished = (count: number) =>
  base.positions.map((position, index) =>
    index < count ? { fen: position.fen, lines: [{ score: { kind: "cp" as const, value: 20 }, depth: 22, pv: [] }] } : null,
  );

const engine = { id: "stockfish-19-lite-multi", name: "Stockfish 19 Lite (multi-thread)", version: "19" };

export const RUNNING: JobV2 = { ...base, status: "running", startedAt: "2026-10-10T12:01:00.000Z", engine, checkpoint: finished(2) };

export const DONE: JobV2 = {
  ...base,
  status: "done",
  startedAt: "2026-10-10T12:01:00.000Z",
  finishedAt: "2026-10-10T12:09:00.000Z",
  engine,
  checkpoint: finished(base.positions.length),
  outputs: [
    { variant: "light", projectId: "project-1", caseId: "out-light" },
    { variant: "medium", projectId: "project-1", caseId: "out-medium" },
  ],
};

export const FAILED: JobV2 = { ...RUNNING, status: "failed", error: "engine", finishedAt: "2026-10-10T12:03:00.000Z" };

/** Its Case deleted since, and named nothing: no source to link back to. */
export const SOURCE_GONE: JobV2 = { ...base, id: "gone", source: { ...base.source, name: "" } };

/** The finished job's report, as an output reads back. */
export const REPORT: ComputerAnalysisReport = {
  w: { moves: 3, inaccuracies: 1, mistakes: 0, blunders: 0, missedMates: 0, acpl: 18, accuracy: 91.2 },
  b: { moves: 3, inaccuracies: 0, mistakes: 1, blunders: 0, missedMates: 0, acpl: 40, accuracy: 81.7 },
};
