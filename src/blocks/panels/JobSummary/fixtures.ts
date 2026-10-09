import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS, type ComputerAnalysisReport } from "../../../lib/computerAnalysis";
import { computerAnalysisJobOf, type Job } from "../../../lib/jobs";

/*
  One background job in the states its summary shows differently (CTA-173),
  typed with `lib/jobs.ts`'s own. Imported only by the block's gallery and its test.
*/

const PGN = '[White "Carlsen, Magnus"]\n[Black "Nepomniachtchi, Ian"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *';

const base = computerAnalysisJobOf(
  "job",
  {
    source: { analysisId: "analysis-1", name: "Carlsen – Nepomniachtchi", folderId: null, pgn: PGN },
    options: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, depth: 22, moveTimeMs: 15000, multiPv: 3, threads: 4, hashMb: 256, outputs: ["light", "medium"] },
  },
  new Date("2026-10-10T12:00:00Z"),
)!;

const finished = (count: number) =>
  base.positions.map((position, index) =>
    index < count ? { fen: position.fen, lines: [{ score: { kind: "cp" as const, value: 20 }, depth: 22, pv: [] }] } : null,
  );

const engine = { id: "stockfish-19-lite-multi", name: "Stockfish 19 Lite (multi-thread)", version: "19" };

export const RUNNING: Job = { ...base, status: "running", startedAt: "2026-10-10T12:01:00.000Z", engine, checkpoint: finished(2) };

export const DONE: Job = {
  ...base,
  status: "done",
  startedAt: "2026-10-10T12:01:00.000Z",
  finishedAt: "2026-10-10T12:09:00.000Z",
  engine,
  checkpoint: finished(base.positions.length),
  outputs: [
    { variant: "light", analysisId: "out-light" },
    { variant: "medium", analysisId: "out-medium" },
  ],
};

export const FAILED: Job = { ...RUNNING, status: "failed", error: "engine", finishedAt: "2026-10-10T12:03:00.000Z" };

/** A board never saved: no source to link back to. */
export const UNSAVED: Job = { ...base, source: { ...base.source, analysisId: null, name: "" } };

/** The finished job's report, as an output reads back. */
export const REPORT: ComputerAnalysisReport = {
  w: { moves: 3, inaccuracies: 1, mistakes: 0, blunders: 0, missedMates: 0, acpl: 18, accuracy: 91.2 },
  b: { moves: 3, inaccuracies: 0, mistakes: 1, blunders: 0, missedMates: 0, acpl: 40, accuracy: 81.7 },
};
