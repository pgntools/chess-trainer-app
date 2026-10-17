import { JobEngineProgress } from "../../../blocks/panels";
import type { JobLiveViewProps } from "../kindViewTypes";
import { engineLiveOf } from "./engineLive";

/** **The engine kinds' live view** — `JobEngineProgress`, unchanged (CTA-190, CTA-194), only while the job runs. */
function EngineLiveView({ job, live, testId }: JobLiveViewProps) {
  const payload = job.status === "running" ? engineLiveOf(live, job.id) : undefined;
  return payload === undefined ? null : <JobEngineProgress live={payload} testId={testId} />;
}

export default EngineLiveView;
