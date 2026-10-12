import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS } from "../../../lib/computerAnalysis";
import { jobV2Of, withCheckpointV2, type JobV2 } from "../../../lib/jobsV2";

/*
  A Case's Jobs V2 (CTA-188): running part way, done into the Case, failed.
  Imported only by the block's gallery and its test.
*/

const PGN = '[White "Carlsen, Magnus"]\n[Black "Caruana, Fabiano"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *';

const jobOf = (id: string, at: string, target: JobV2["target"]): JobV2 =>
  jobV2Of(
    id,
    {
      source: { projectId: "p1", caseId: "c1", name: "Carlsen – Caruana", pgn: PGN },
      options: { ...DEFAULT_COMPUTER_ANALYSIS_OPTIONS, outputs: ["light"] },
      preset: { id: "default", name: "Default", values: {} },
      target,
    },
    new Date(at),
  )!;

const halfway = (job: JobV2): JobV2 =>
  job.positions.slice(0, 3).reduce<JobV2>(
    (done, position, index) =>
      withCheckpointV2(done, index, { fen: position.fen, lines: [{ score: { kind: "cp", value: 20 }, depth: 20, pv: [] }] }),
    job,
  );

export const RUNNING: JobV2 = { ...halfway(jobOf("j-running", "2026-10-12T21:40:00Z", { kind: "case" })), status: "running" };
export const DONE: JobV2 = { ...jobOf("j-done", "2026-10-12T20:05:00Z", { kind: "project", projectId: "p1" }), status: "done" };
export const FAILED: JobV2 = { ...jobOf("j-failed", "2026-10-11T09:00:00Z", { kind: "linked", projectId: "p2" }), status: "failed", error: "engine" };

export const JOBS: readonly JobV2[] = [RUNNING, DONE, FAILED];
