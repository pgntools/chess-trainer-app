import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { boardEngineClaim } from "../../../lib/boardEngineClaim";
import { claimingEngineJobOf, runningEngineJobOf } from "../../../lib/engineGate";
import { pauseEngineJob, useEngineGateJobs } from "./engineGateJobs";

/**
 * **One engine at a time, in the whole app** (CTA-237) — the board core's
 * gate on a board's engine switch, which every engine board's session takes
 * in place of a `useState` (`useAnalysisSession`, `usePlayGame`, the
 * repertoire player), so the rule is written once:
 *
 * - **An engine job running, in any tab** (`lib/engineGate.ts`): turning the
 *   engine on asks first — `EngineJobRunningDialog`, naming the job: **Pause
 *   the job** (the runtime's pause; the board's engine starts once the job
 *   has stopped) or **Wait for it to finish** (the engine stays off; turning
 *   it on again asks again while a job still runs). A board whose engine
 *   starts on (`initialOn`, Play with Engine) asks on arrival, its engine
 *   searching nothing until the reader answers — or until the jobs are read
 *   and none runs.
 * - **A job starting** (New job, Resume, a queued one picked up) while a
 *   board's engine is on: the engine goes off, and a snackbar names the job.
 * - **One board engine** (`lib/boardEngineClaim.ts`): a board's engine going
 *   on switches off every other board's, in this tab or another.
 *
 * {@link EngineGate.engineOn} is the switch as the reader set it — on through
 * the question; the engine module takes {@link EngineGate.engineRuns} — on, and no engine job running
 * (a job asked to pause runs until its step ends). The dialog and the
 * snackbar are drawn once for the page by `EngineGateHost`, which the shell
 * mounts; this hook publishes into it.
 */

export type EngineGateStart = {
  /** The engine starts on — once the jobs are read and none runs; else it asks. Absent: off at the start. */
  initialOn?: boolean;
};

export type EngineGate = {
  /**
   * The switch, as the reader set it (or arrived with) — on while the jobs
   * are read on arrival and while the dialog asks, so Play is not paused by
   * the question; Wait for it to finish turns it off.
   */
  engineOn: boolean;
  /** Turn the engine on — asking first while an engine job runs — or off. */
  setEngineOn: (on: boolean) => void;
  /** Whether the engine may search now: on, and no engine job running in any tab. */
  engineRuns: boolean;
};

/** A job, as the gate names it. */
export type EngineGateJob = { id: string; title: string };

/** A board asking about a running job — what the host's dialog shows. */
export type EngineGateRequest = { job: EngineGateJob; pause: () => void; wait: () => void };

/*
  The page's one question and the switch-offs, for the host — a store of the
  shell's kind beside `boardEngineState.ts`, outside React.
*/
let request: EngineGateRequest | null = null;
const requestListeners = new Set<() => void>();
const switchedOffListeners = new Set<(job: EngineGateJob) => void>();

const subscribeRequest = (listener: () => void): (() => void) => {
  requestListeners.add(listener);
  return () => {
    requestListeners.delete(listener);
  };
};
const requestSnapshot = (): EngineGateRequest | null => request;

/** The question a board asks now — `null` for none. The host draws it. */
export const useEngineGateRequest = (): EngineGateRequest | null =>
  useSyncExternalStore(subscribeRequest, requestSnapshot, () => null);

/** Told the job each time a job starting switched a board's engine off — the host's snackbar. */
export const subscribeEngineSwitchedOff = (listener: (job: EngineGateJob) => void): (() => void) => {
  switchedOffListeners.add(listener);
  return () => {
    switchedOffListeners.delete(listener);
  };
};

const publishRequest = (asked: EngineGateRequest): (() => void) => {
  request = asked;
  requestListeners.forEach((listener) => listener());
  return () => {
    if (request !== asked) return;
    request = null;
    requestListeners.forEach((listener) => listener());
  };
};

/** How long a board starting on waits for the jobs to be read before it goes on as if none ran. */
export const JOBS_READ_GRACE_MS = 3000;

const gateJobOf = (job: { id: string; title: string }): EngineGateJob => ({ id: job.id, title: job.title });

export const useEngineGate = ({ initialOn = false }: EngineGateStart = {}): EngineGate => {
  const records = useEngineGateJobs();
  const [owner] = useState(() => ({}));
  /** Starting on, and not yet decided: the jobs are not read. */
  const [arriving, setArriving] = useState(initialOn);
  const [wanted, setWanted] = useState(false);
  /** The job the dialog asks about. */
  const [asking, setAsking] = useState<EngineGateJob | null>(null);
  /** The job this board paused, still running out its step — not one that switches the board off. */
  const [pausing, setPausing] = useState<string | null>(null);
  /** The last switch-off by a job starting — one object per event, for the snackbar. */
  const [switchedOff, setSwitchedOff] = useState<{ job: EngineGateJob } | null>(null);
  /** The jobs were not read in time: a board starting on goes on as if none ran (a job found later still switches it off). */
  const [late, setLate] = useState(false);

  const running = runningEngineJobOf(records);
  const claiming = claimingEngineJobOf(records, pausing);

  /*
    Adjusted during render, not in an effect (`react-hooks/set-state-in-effect`):
    each follows from the jobs as read now.
  */
  // The paused job stopped: a later run of it is a job starting like any other.
  if (pausing !== null && running?.id !== pausing) setPausing(null);
  // Arrived on: on, unless a job runs — then ask.
  if (arriving && (records !== undefined || late)) {
    setArriving(false);
    if (claiming !== undefined) setAsking(gateJobOf(claiming));
    else setWanted(true);
  }
  // Asked about a job that has stopped meanwhile: the engine the reader asked for goes on.
  if (asking !== null && claiming === undefined && records !== undefined) {
    setAsking(null);
    setWanted(true);
  }
  // A job started while the engine was on: off, and said.
  if (wanted && claiming !== undefined) {
    setWanted(false);
    setSwitchedOff({ job: gateJobOf(claiming) });
  }

  useEffect(() => {
    if (!initialOn) return;
    const timer = setTimeout(() => setLate(true), JOBS_READ_GRACE_MS);
    return () => clearTimeout(timer);
  }, [initialOn]);

  // One board engine: on claims it, here and in every tab; off — or gone — gives it back.
  useEffect(() => {
    if (!wanted) return;
    const claim = boardEngineClaim();
    claim.claim(owner);
    return () => claim.release(owner);
  }, [wanted, owner]);
  // Another board's engine went on: this one goes off.
  useEffect(
    () =>
      boardEngineClaim().subscribe((lost) => {
        if (lost === owner) setWanted(false);
      }),
    [owner],
  );

  // The question, for the host to draw — until it is answered, or the board goes.
  useEffect(() => {
    if (asking === null) return;
    return publishRequest({
      job: asking,
      pause: () => {
        setPausing(asking.id);
        setAsking(null);
        setWanted(true);
        void pauseEngineJob(asking.id);
      },
      wait: () => {
        setAsking(null);
        setWanted(false);
      },
    });
  }, [asking]);

  useEffect(() => {
    if (switchedOff === null) return;
    switchedOffListeners.forEach((listener) => listener(switchedOff.job));
  }, [switchedOff]);

  const setEngineOn = useCallback(
    (on: boolean) => {
      setArriving(false);
      if (!on) {
        setAsking(null);
        setWanted(false);
      } else if (claiming !== undefined) {
        setAsking(gateJobOf(claiming));
      } else {
        setWanted(true);
      }
    },
    [claiming],
  );

  return {
    // Asked for and not yet refused — arriving, or the dialog asking — reads on: Play stays on through the question.
    engineOn: wanted || arriving || asking !== null,
    setEngineOn,
    engineRuns: wanted && running === undefined,
  };
};
