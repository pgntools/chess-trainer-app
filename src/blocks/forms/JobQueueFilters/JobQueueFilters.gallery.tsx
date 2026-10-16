import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import { NO_JOB_QUEUE_FILTERS, type JobQueueFilterOption, type JobQueueFilterValues } from "./filterValues";
import { ENTITY_TYPES, HEBREW_KINDS, KINDS, ONE_ENTITY_TYPE, ONE_KIND, SOME_FILTERS } from "./fixtures";
import JobQueueFilters from "./JobQueueFilters";

/** The filters on fixtures, their values held by the demo as the queue's URL would hold them. */
const demo = (initial: JobQueueFilterValues, kinds: readonly JobQueueFilterOption[], entityTypes: readonly JobQueueFilterOption[]) => (
  <Box sx={{ maxWidth: 320 }}>
    <WithState<JobQueueFilterValues> initial={initial}>
      {(values, set) => (
        <JobQueueFilters
          values={values}
          onChange={(patch) => set((before) => ({ ...before, ...patch }))}
          onClear={() => set(NO_JOB_QUEUE_FILTERS)}
          kinds={kinds}
          entityTypes={entityTypes}
          testId="gallery-job-filters"
        />
      )}
    </WithState>
  </Box>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "JobQueueFilters",
  demos: [
    { name: "Every filter, none on", render: () => demo(NO_JOB_QUEUE_FILTERS, KINDS, ENTITY_TYPES) },
    { name: "Some on — failed repertoire evaluations", render: () => demo(SOME_FILTERS, KINDS, ENTITY_TYPES) },
    { name: "One kind and one entity type — the status alone", render: () => demo(NO_JOB_QUEUE_FILTERS, ONE_KIND, ONE_ENTITY_TYPE) },
    { name: "Hebrew kinds (switch the direction to RTL)", render: () => demo(NO_JOB_QUEUE_FILTERS, HEBREW_KINDS, ENTITY_TYPES) },
  ],
};

export default gallery;
