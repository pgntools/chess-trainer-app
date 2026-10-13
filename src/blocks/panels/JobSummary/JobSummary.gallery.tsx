import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { JobV2 } from "../../../lib/jobsV2";
import type { BlockFamilyId } from "../../families";
import { ComputerAnalysisReport } from "../ComputerAnalysisReport";
import { DONE, FAILED, REPORT, RUNNING, SOURCE_GONE } from "./fixtures";
import JobSummary from "./JobSummary";

const demo = (job: JobV2, withReport = false) => (
  <Box sx={{ maxWidth: 400 }}>
    <JobSummary
      job={job}
      sourceLink={job === SOURCE_GONE ? undefined : { href: `?case=${job.source.caseId}` }}
      outputLink={(output) => ({ href: `?case=${output.caseId}` })}
      onCancel={() => {}}
      onPause={() => {}}
      onResume={() => {}}
      onDelete={() => {}}
      testId="gallery-job"
    >
      {withReport && <ComputerAnalysisReport report={REPORT} testId="gallery-job-report" />}
    </JobSummary>
  </Box>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "JobSummary",
  demos: [
    { name: "Running — its progress and the move searched", render: () => demo(RUNNING) },
    { name: "Done — its outputs, and its report under it", render: () => demo(DONE, true) },
    { name: "Failed — why, and Resume", render: () => demo(FAILED) },
    { name: "Queued, its Case gone since — no source link, no name", render: () => demo(SOURCE_GONE) },
  ],
};

export default gallery;
