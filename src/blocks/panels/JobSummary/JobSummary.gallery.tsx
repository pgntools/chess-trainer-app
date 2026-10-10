import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { Job } from "../../../lib/jobs";
import type { BlockFamilyId } from "../../families";
import { ComputerAnalysisReport } from "../ComputerAnalysisReport";
import { DONE, FAILED, REPORT, RUNNING, UNSAVED } from "./fixtures";
import JobSummary from "./JobSummary";

const demo = (job: Job, withReport = false) => (
  <Box sx={{ maxWidth: 400 }}>
    <JobSummary
      job={job}
      sourceLink={job.source.analysisId === null ? undefined : { href: `?analysis=${job.source.analysisId}` }}
      outputLink={(output) => ({ href: `?analysis=${output.analysisId}` })}
      onCancel={() => {}}
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
    { name: "Queued, from a board never saved — no source link, no name", render: () => demo(UNSAVED) },
  ],
};

export default gallery;
