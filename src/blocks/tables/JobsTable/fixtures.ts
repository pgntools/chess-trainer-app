import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS } from "../../../lib/computerAnalysis";
import { computerAnalysisJobOf, type Job, type JobStatus } from "../../../lib/jobs";

/*
  Background jobs in each state (CTA-173), typed with `lib/jobs.ts`'s own.
  Imported only by the block's gallery and its test.
*/

const PGN = '[White "Carlsen, Magnus"]\n[Black "Nepomniachtchi, Ian"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 *';

/** A job of `status`, with its first `done` positions finished. */
export const jobFixture = (id: string, status: JobStatus, done: number, name = "Carlsen – Nepomniachtchi"): Job => {
  const job = computerAnalysisJobOf(
    id,
    {
      source: { analysisId: `analysis-${id}`, name, folderId: null, pgn: PGN },
      options: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, outputs: ["light", "full"] },
    },
    new Date("2026-10-10T12:00:00Z"),
  )!;
  return {
    ...job,
    status,
    startedAt: status === "queued" ? null : "2026-10-10T12:01:00.000Z",
    finishedAt: status === "done" || status === "failed" || status === "cancelled" ? "2026-10-10T12:20:00.000Z" : null,
    engine: status === "queued" ? null : { id: "stockfish-19-lite-single", name: "Stockfish 19 Lite", version: "19" },
    checkpoint: job.positions.map((position, index) =>
      index < done ? { fen: position.fen, lines: [{ score: { kind: "cp", value: 20 }, depth: 20, pv: [] }] } : null,
    ),
    outputs:
      status === "done"
        ? [
            { variant: "light", analysisId: `${id}-light` },
            { variant: "full", analysisId: `${id}-full` },
          ]
        : [],
    error: status === "failed" ? "engine" : null,
  };
};

export const RUNNING = jobFixture("running", "running", 3);
export const PAUSED = jobFixture("paused", "paused", 4);
export const QUEUED = jobFixture("queued", "queued", 0, "Ding – Gukesh");
export const INTERRUPTED = jobFixture("interrupted", "interrupted", 5);
export const DONE = jobFixture("done", "done", 9);
export const FAILED = jobFixture("failed", "failed", 2);
export const CANCELLED = jobFixture("cancelled", "cancelled", 1);

/** One of each state, newest first. */
export const JOBS: readonly Job[] = [RUNNING, QUEUED, PAUSED, INTERRUPTED, DONE, FAILED, CANCELLED];

/** A Hebrew name. */
export const HEBREW: readonly Job[] = [jobFixture("hebrew", "running", 4, "גלפנד – סמירין")];
