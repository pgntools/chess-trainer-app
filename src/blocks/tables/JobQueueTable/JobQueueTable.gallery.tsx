import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import { HEBREW, JOBS, MANY } from "./fixtures";
import JobQueueTable, { type JobQueueTableProps } from "./JobQueueTable";
import type { JobRowView } from "./jobView";

const noop = () => {};

const demo = (rows: readonly JobRowView[], extra: Partial<JobQueueTableProps> = {}) => (
  <Box sx={{ display: "flex", flexDirection: "column", height: 420 }}>
    <JobQueueTable
      rows={rows}
      rowLink={(job) => ({ href: `#job-${job.id}` })}
      onPause={noop}
      onResume={noop}
      onCancel={noop}
      onDelete={noop}
      testId="gallery-job-queue"
      {...extra}
    />
  </Box>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "tables",
  title: "JobQueueTable",
  demos: [
    {
      name: "Every status, three kinds, a deleted subject and an unknown kind — Resume, Pause and Cancel where allowed",
      render: () => demo(JOBS),
    },
    {
      name: "Picks — tick rows, then Delete picked",
      render: () => (
        <WithState<Set<string>> initial={new Set(["failed", "cancelled"])}>
          {(picked, setPicked) => demo(JOBS, { picks: { picked, onChange: setPicked, onDeletePicked: () => setPicked(new Set()) } })}
        </WithState>
      ),
    },
    {
      name: "Paging — sixty jobs, 25 a page",
      render: () => (
        <WithState<{ page: number; rowsPerPage: number }> initial={{ page: 0, rowsPerPage: 25 }}>
          {(paging, setPaging) =>
            demo(MANY, {
              paging: {
                ...paging,
                onPageChange: (page) => setPaging((before) => ({ ...before, page })),
                onRowsPerPageChange: (rowsPerPage) => setPaging({ page: 0, rowsPerPage }),
              },
            })
          }
        </WithState>
      ),
    },
    { name: "No jobs yet", render: () => demo([]) },
    { name: "A filter leaves no job", render: () => demo([], { filtered: true, onClearFilters: noop }) },
    { name: "Still reading", render: () => demo([], { loading: true }) },
    { name: "A Hebrew title and a long one (switch the direction to RTL)", render: () => demo(HEBREW) },
  ],
};

export default gallery;
