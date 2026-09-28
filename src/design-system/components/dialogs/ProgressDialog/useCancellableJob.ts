import { useCallback, useEffect, useRef, useState } from "react";

/** How far a job has got. */
export type JobProgress = { done: number; total: number };

/** Where a job is: not running, in its cancellable work, or in its write, which cannot be stopped. */
export type JobPhase = "idle" | "working" | "writing";

/** How a run ended. */
export type JobOutcome<T> =
  | { status: "done"; value: T }
  | { status: "cancelled" }
  | { status: "failed"; error: unknown };

/**
 * The job itself: `work` does the long, stoppable part — it reads `signal`
 * and reports progress — and `write` (optional) stores its result, a part that
 * is never cut short once begun.
 */
export type CancellableJob<W, T> = {
  work: (signal: AbortSignal, report: (progress: JobProgress) => void) => Promise<W>;
  write?: (result: W) => Promise<T>;
};

export type CancellableJobState = {
  phase: JobPhase;
  /** The last progress `work` reported; `null` before the first and when idle. */
  progress: JobProgress | null;
  /** Working or writing. */
  busy: boolean;
  /** Stops the work — refused (answers `false`) while writing, when there is nothing left to stop. */
  cancel: () => boolean;
};

/**
 * **A long job that can be cancelled, then written** (CTA-108) — the abort /
 * progress / write-lock logic the Library's import popup and the Analysis
 * Board's several-games popup share line for line:
 *
 * - `run(job)` starts it; a second run while one is going cancels the first.
 * - While **working**, `cancel()` aborts its signal, and the run answers
 *   `cancelled` — never `failed`, whatever the work throws once aborted.
 * - While **writing**, `cancel()` is refused: a half-made write is worse than
 *   a finished one.
 * - **Unmounting cancels** the work, so a closed popup leaves nothing
 *   running and no state is set after it is gone.
 */
export function useCancellableJob(): CancellableJobState & {
  run: <W, T = W>(job: CancellableJob<W, T>) => Promise<JobOutcome<T>>;
} {
  const [phase, setPhase] = useState<JobPhase>("idle");
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const writingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const cancel = useCallback(() => {
    if (writingRef.current) return false;
    controllerRef.current?.abort();
    controllerRef.current = null;
    if (mountedRef.current) {
      setPhase("idle");
      setProgress(null);
    }
    return true;
  }, []);

  const run = useCallback(async <W, T = W>(job: CancellableJob<W, T>): Promise<JobOutcome<T>> => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const live = () => mountedRef.current && controllerRef.current === controller;
    setPhase("working");
    setProgress(null);

    let worked: W;
    try {
      worked = await job.work(controller.signal, (next) => {
        if (live() && !controller.signal.aborted) setProgress(next);
      });
    } catch (error) {
      if (controller.signal.aborted) return { status: "cancelled" };
      if (live()) {
        controllerRef.current = null;
        setPhase("idle");
        setProgress(null);
      }
      return { status: "failed", error };
    }
    if (controller.signal.aborted) return { status: "cancelled" };

    let value: T;
    writingRef.current = true;
    if (live()) setPhase("writing");
    try {
      value = job.write === undefined ? (worked as unknown as T) : await job.write(worked);
    } catch (error) {
      return { status: "failed", error };
    } finally {
      writingRef.current = false;
      if (live()) {
        controllerRef.current = null;
        setPhase("idle");
        setProgress(null);
      }
    }
    return { status: "done", value };
  }, []);

  return { phase, progress, busy: phase !== "idle", cancel, run };
}
