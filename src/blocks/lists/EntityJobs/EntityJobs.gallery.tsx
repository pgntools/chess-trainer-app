import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import EntityJobs from "./EntityJobs";
import { CASE_JOBS } from "./fixtures";

const demo = (jobs: Parameters<typeof EntityJobs>[0]["jobs"]) => (
  <Box sx={{ width: 380 }}>
    <EntityJobs
      jobs={jobs}
      jobLink={(job) => ({ href: `#job-${job.id}` })}
      onNewJob={() => {}}
      label="This Case's jobs"
      emptyText="No jobs for this Case yet."
      testId="gallery-entity-jobs"
    />
  </Box>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "lists",
  title: "EntityJobs",
  demos: [
    { name: "Running, done and failed", render: () => demo(CASE_JOBS) },
    { name: "None yet", render: () => demo([]) },
    { name: "Reading the queue", render: () => demo(undefined) },
  ],
};

export default gallery;
