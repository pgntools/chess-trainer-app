import { COMPUTER_ANALYSIS_KIND } from "../../lib/jobs/kinds/computerAnalysis/core";
import { EVALUATE_POSITION_KIND } from "../../lib/jobs/kinds/evaluatePosition/core";
import { REPERTOIRE_EVALUATION_KIND } from "../../lib/jobs/kinds/repertoireEvaluation/core";
import type { JobKindViews } from "./kindViewTypes";
import ComputerAnalysisNewJob from "./kinds/ComputerAnalysisNewJob";
import { ComputerAnalysisDetails, ComputerAnalysisParameters } from "./kinds/ComputerAnalysisViews";
import { engineLiveSummary } from "./kinds/engineLive";
import EngineLiveView from "./kinds/EngineLiveView";
import { RepertoireEvaluationData, RepertoireEvaluationNewJob, RepertoireEvaluationParameters } from "./kinds/RepertoireEvaluationViews";

export type { JobKindViews } from "./kindViewTypes";

/**
 * **The kinds' views** (CTA-221) — one line per kind: its New-job form, its
 * live view, its details, its parameters and its data outputs'
 * (`kindViewTypes.ts` the contract). Every view is optional: a kind without
 * them still lists, runs and offers its outputs generically.
 */
const JOB_KIND_VIEWS: Readonly<Record<string, JobKindViews>> = {
  [COMPUTER_ANALYSIS_KIND]: {
    NewJob: ComputerAnalysisNewJob,
    Live: EngineLiveView,
    Details: ComputerAnalysisDetails,
    Parameters: ComputerAnalysisParameters,
    liveSummary: engineLiveSummary,
  },
  [REPERTOIRE_EVALUATION_KIND]: {
    NewJob: RepertoireEvaluationNewJob,
    Live: EngineLiveView,
    Parameters: RepertoireEvaluationParameters,
    Data: RepertoireEvaluationData,
    liveSummary: engineLiveSummary,
  },
  // CTA-238: queued by Find Best Move alone (no New-job form); its result is the trainer's, its lines the
  // session Case's. Dev-only, as its kind.
  ...(import.meta.env.DEV ? { [EVALUATE_POSITION_KIND]: { Live: EngineLiveView, liveSummary: engineLiveSummary } } : {}),
};

/** A kind's views — none for a kind not registered here (a retired kind's stored jobs are drawn generically). */
export const kindViewsOf = (kindId: string): JobKindViews => JOB_KIND_VIEWS[kindId] ?? {};
