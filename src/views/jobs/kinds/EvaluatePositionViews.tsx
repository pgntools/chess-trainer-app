import { JobEngineSettings } from "../../../blocks/cards";
import { parseEvaluatePositionInput, parseEvaluatePositionState } from "../../../lib/jobs/kinds/evaluatePosition/core";
import type { JobViewProps } from "../kindViewTypes";

/**
 * **The engine settings an Evaluate Position job ran with** (CTA-248) — its
 * input read through the kind's own parser, drawn as the `JobEngineSettings`
 * plate: the engine (the one that ran it, from the state, else the one asked
 * for), the preset and the option values it sent, and the search.
 */
export function EvaluatePositionParameters({ job, testId }: JobViewProps) {
  const input = parseEvaluatePositionInput(job.input);
  if (input === undefined) return null;
  const state = job.state === null ? undefined : parseEvaluatePositionState(job.state, job.kindVersion);
  const { preset, search } = input;
  return (
    <JobEngineSettings
      settings={{
        engine: state?.engine?.name ?? input.engine,
        preset: preset === null ? null : { name: preset.name || preset.id, values: preset.values },
        ...search,
      }}
      testId={testId}
    />
  );
}
