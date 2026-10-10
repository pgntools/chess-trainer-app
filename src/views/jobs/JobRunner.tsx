import { useEffect } from "react";

import { startJobRunner } from "../../lib/jobRunner";

/**
 * **The app's background job runner, mounted once** (CTA-173): the shell
 * renders this beside its outlets, so the runner (`lib/jobRunner.ts`) starts
 * with the first page and outlives every navigation. Started from an effect —
 * never during render, so the pre-render starts none — and never stopped by
 * one: StrictMode's remount, or a screen's, must not leave a job half run.
 * It draws nothing.
 */
export function JobRunner() {
  useEffect(() => {
    startJobRunner();
  }, []);
  return null;
}
