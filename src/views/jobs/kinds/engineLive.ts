import type { TFunction } from "i18next";

import { formatEngineCount } from "../../../lib/engineAnalysis";
import type { EngineSessionLive } from "../../../lib/jobs/engineSession";
import type { JobLiveSummary } from "../kindViewTypes";

/**
 * **An engine-lane job's live payload, checked** — the engine session's
 * `EngineSessionLive` (CTA-190), as the runtime hands it on from whichever
 * tab runs the job: `undefined` for anything else, or one about another job.
 */
export const engineLiveOf = (live: unknown, jobId: string): EngineSessionLive | undefined => {
  if (typeof live !== "object" || live === null) return undefined;
  const value = live as Partial<EngineSessionLive>;
  return value.jobId === jobId && typeof value.depth === "number" && typeof value.heardAt === "number" && Array.isArray(value.line)
    ? (live as EngineSessionLive)
    : undefined;
};

/** The header indicator's beat and words for an engine job: "depth 22, 3.1M nodes". */
export const engineLiveSummary = (live: unknown, t: TFunction): JobLiveSummary | undefined => {
  if (typeof live !== "object" || live === null) return undefined;
  const value = live as Partial<EngineSessionLive>;
  if (typeof value.depth !== "number" || typeof value.heardAt !== "number") return undefined;
  const words = [
    t("jobs.indicator.liveDepth", { depth: value.depth }),
    ...(value.nodes === undefined ? [] : [t("jobs.indicator.liveNodes", { nodes: formatEngineCount(value.nodes) })]),
  ].join(", ");
  return { heardAt: value.heardAt, words };
};
