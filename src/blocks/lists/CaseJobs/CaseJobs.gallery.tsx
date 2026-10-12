import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import CaseJobs from "./CaseJobs";
import { JOBS } from "./fixtures";

const demo = (jobs: Parameters<typeof CaseJobs>[0]["jobs"]) => (
  <Box sx={{ width: 380 }}>
    <CaseJobs jobs={jobs} jobLink={(job) => ({ href: `#job-${job.id}` })} onNewJob={() => {}} testId="gallery-case-jobs" />
  </Box>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "lists",
  title: "CaseJobs",
  demos: [
    { name: "Running, done and failed", render: () => demo(JOBS) },
    { name: "None yet", render: () => demo([]) },
    { name: "Reading the store", render: () => demo(undefined) },
  ],
};

export default gallery;
