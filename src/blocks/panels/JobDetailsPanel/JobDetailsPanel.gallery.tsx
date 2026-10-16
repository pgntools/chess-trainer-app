import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import { EVERY_STATUS, HEBREW, RUNNING } from "./fixtures";
import JobDetailsPanel, { type JobDetailsView } from "./JobDetailsPanel";

const noop = () => {};

const slot = (words: string) => (
  <Typography variant="body2" sx={{ color: "text.secondary" }}>
    {words}
  </Typography>
);

const demo = (job: JobDetailsView, withSlots = false) => (
  <Box sx={{ maxWidth: 520 }}>
    <JobDetailsPanel
      job={job}
      onPause={noop}
      onResume={noop}
      onCancel={noop}
      onDelete={noop}
      live={withSlots && job.status === "running" ? slot("(the kind's live view — the engine kinds' JobEngineProgress)") : undefined}
      details={withSlots ? slot("(the kind's details section — its report)") : undefined}
      parameters={withSlots ? slot("(the kind's parameters — the job's options)") : undefined}
      testId="gallery-job-details"
    />
  </Box>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "panels",
  title: "JobDetailsPanel",
  demos: [
    ...EVERY_STATUS.map(({ name, job }, index) => ({ name, render: () => demo(job, index === 0) })),
    {
      name: "Live — Pause and Resume change the status, announced politely",
      render: () => (
        <WithState<JobDetailsView> initial={RUNNING}>
          {(job, set) => (
            <Box sx={{ maxWidth: 520 }}>
              <JobDetailsPanel
                job={job}
                onPause={() => set((before) => ({ ...before, status: "paused", canPause: false, canResume: true }))}
                onResume={() => set((before) => ({ ...before, status: "running", canPause: true, canResume: false }))}
                onCancel={() => set((before) => ({ ...before, status: "cancelled", canPause: false, canResume: false, canCancel: false }))}
                onDelete={noop}
                testId="gallery-job-details-live"
              />
            </Box>
          )}
        </WithState>
      ),
    },
    { name: "A Hebrew title and kind (switch the direction to RTL)", render: () => demo(HEBREW) },
  ],
};

export default gallery;
