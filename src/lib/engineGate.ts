import type { JobRecord } from "@pgntools/jobs-runtime";

/**
 * **One engine at a time — the jobs' side** (CTA-237): which engine job, in
 * any tab, keeps a board's engine off. The jobs runtime runs one engine job
 * at a time (its `engine` lane, `lib/jobs/runtime.ts`), but nothing held a
 * board's engine to it — a job and a board each ran a full preset, together,
 * and took a laptop down. The board core's gate (`useEngineGate`) reads the
 * page's job records through these two, and the rule is:
 *
 * - **While an engine job runs, no board engine searches** —
 *   {@link runningEngineJobOf}, whatever is asked of the job (a job asked to
 *   pause or cancel still runs until its step ends).
 * - **An engine job running and asked nothing** is the one a board asks about
 *   before its engine goes on, and the one that switches every board's
 *   engine off when it starts — {@link claimingEngineJobOf}; a job being
 *   paused for the board (`pausing`) is not.
 *
 * The board-engine side (one board engine app-wide, across tabs) is
 * `lib/boardEngineClaim.ts`. Pure, and nothing at module scope.
 */

/** The job lane whose work is an engine — the computer analysis, the repertoire evaluation. */
export const ENGINE_JOB_LANE = "engine";

type GateRecord = Pick<JobRecord, "id" | "lane" | "status" | "control" | "title">;

/** The engine job running now, in any tab — `undefined` when none runs or the records are not read yet. */
export const runningEngineJobOf = <R extends GateRecord>(records: readonly R[] | undefined): R | undefined =>
  records?.find((job) => job.lane === ENGINE_JOB_LANE && job.status === "running");

/**
 * The engine job running and asked nothing — not to pause, not to cancel, not
 * the one this board is pausing ({@link pausing}): what a board's engine
 * yields to.
 */
export const claimingEngineJobOf = <R extends GateRecord>(
  records: readonly R[] | undefined,
  pausing?: string | null,
): R | undefined =>
  records?.find(
    (job) => job.lane === ENGINE_JOB_LANE && job.status === "running" && job.control === undefined && job.id !== pausing,
  );
