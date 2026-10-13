import type { GalleryModule } from "../../../design-system/gallery/types";
import type { BlockFamilyId } from "../../families";
import type { JobV2 } from "../../../lib/jobsV2";
import { HEBREW, JOBS } from "./fixtures";
import JobsTable from "./JobsTable";

const demo = (rows: readonly JobV2[], loading = false) => (
  <JobsTable
    rows={rows}
    rowLink={(job) => ({ href: `?job=${job.id}` })}
    selectedId="done"
    onCancel={() => {}}
    onPause={() => {}}
    onResume={() => {}}
    onDelete={() => {}}
    loading={loading}
    testId="gallery-jobs"
  />
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "tables",
  title: "JobsTable",
  demos: [
    { name: "One job in each state — Resume on the stopped ones, Pause on the active, Cancel on the unfinished", render: () => demo(JOBS) },
    { name: "Still reading", render: () => demo([], true) },
    { name: "No jobs yet", render: () => demo([]) },
    { name: "Hebrew names (switch the direction to RTL)", render: () => demo(HEBREW) },
  ],
};

export default gallery;
