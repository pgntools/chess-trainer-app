import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import { ATTEMPTS, EVENTS, FAILED, UNDER_WAY, describeEvent, describeEventHebrew } from "./fixtures";
import JobHistory, { type JobHistoryProps } from "./JobHistory";

const demo = (props: Pick<JobHistoryProps, "attempts" | "events"> & Partial<JobHistoryProps>) => (
  <Box sx={{ maxWidth: 520 }}>
    <JobHistory describe={describeEvent} defaultOpen testId="gallery-job-history" {...props} />
  </Box>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "lists",
  title: "JobHistory",
  demos: [
    { name: "A retry, a pause, then done — newest first", render: () => demo({ attempts: ATTEMPTS, events: EVENTS }) },
    { name: "An attempt under way", render: () => demo({ attempts: UNDER_WAY, events: EVENTS.slice(0, 6) }) },
    { name: "Failed, its attempts spent", render: () => demo({ attempts: FAILED, events: EVENTS.slice(0, 2) }) },
    { name: "Closed (the default)", render: () => demo({ attempts: ATTEMPTS, events: EVENTS, defaultOpen: false }) },
    { name: "Not run yet", render: () => demo({ attempts: [], events: [] }) },
    { name: "Hebrew events (switch the direction to RTL)", render: () => demo({ attempts: ATTEMPTS, events: EVENTS, describe: describeEventHebrew }) },
  ],
};

export default gallery;
