import Box from "@mui/material/Box";

import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { DataTableSort } from "../../../design-system/patterns/tables";
import type { BlockFamilyId } from "../../families";
import { NO_JOB_QUEUE_FILTERS, type JobQueueFilterValues } from "./filterValues";
import { HEBREW, JOBS, KINDS, MANY } from "./fixtures";
import { JOB_QUEUE_DEFAULT_SORT, type JobQueueColumn } from "./jobQueueSort";
import JobQueueTable, { type JobQueueTableProps } from "./JobQueueTable";
import type { JobRowView } from "./jobView";

const noop = () => {};

type DemoState = { sort: DataTableSort<JobQueueColumn>; filters: JobQueueFilterValues };

/** The table as a screen holds it: its sort, and — where asked — its filters over the rows. */
const demo = (rows: readonly JobRowView[], { withFilters = false, extra = {} }: { withFilters?: boolean; extra?: Partial<JobQueueTableProps> } = {}) => (
  <WithState<DemoState> initial={{ sort: JOB_QUEUE_DEFAULT_SORT, filters: NO_JOB_QUEUE_FILTERS }}>
    {(state, set) => {
      const { filters } = state;
      const shown = withFilters
        ? rows.filter(
            (job) =>
              (filters.status === "" || job.status === filters.status) &&
              (filters.kind === "" || KINDS.find((kind) => kind.value === filters.kind)?.label === job.kindLabel),
          )
        : rows;
      return (
        <Box sx={{ display: "flex", flexDirection: "column", height: 460 }}>
          <JobQueueTable
            rows={shown}
            rowLink={(job) => ({ href: `#job-${job.id}` })}
            onPause={noop}
            onResume={noop}
            onCancel={noop}
            onDelete={noop}
            sort={state.sort}
            onSort={(column, direction) => set((before) => ({ ...before, sort: { column, direction } }))}
            {...(withFilters
              ? {
                  filters: {
                    values: filters,
                    onChange: (patch) => set((before) => ({ ...before, filters: { ...before.filters, ...patch } })),
                    kinds: KINDS,
                  },
                  onClearFilters: () => set((before) => ({ ...before, filters: NO_JOB_QUEUE_FILTERS })),
                }
              : {})}
            testId="gallery-job-queue"
            {...extra}
          />
        </Box>
      );
    }}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "tables",
  title: "JobQueueTable",
  demos: [
    {
      name: "Every status, three kinds and an unknown kind — sort by any column; filter the status and the kind from over their columns",
      render: () => demo(JOBS, { withFilters: true }),
    },
    {
      name: "Picks — tick rows, then Delete picked",
      render: () => (
        <WithState<Set<string>> initial={new Set(["failed", "cancelled"])}>
          {(picked, setPicked) => demo(JOBS, { extra: { picks: { picked, onChange: setPicked, onDeletePicked: () => setPicked(new Set()) } } })}
        </WithState>
      ),
    },
    {
      name: "Paging — sixty jobs, 25 a page",
      render: () => (
        <WithState<{ page: number; rowsPerPage: number }> initial={{ page: 0, rowsPerPage: 25 }}>
          {(paging, setPaging) =>
            demo(MANY, {
              extra: {
                paging: {
                  ...paging,
                  onPageChange: (page) => setPaging((before) => ({ ...before, page })),
                  onRowsPerPageChange: (rowsPerPage) => setPaging({ page: 0, rowsPerPage }),
                },
              },
            })
          }
        </WithState>
      ),
    },
    { name: "No jobs yet", render: () => demo([]) },
    {
      name: "A filter leaves no job",
      render: () => demo([], { extra: { filters: { values: { status: "failed", kind: "" }, onChange: noop, kinds: KINDS }, onClearFilters: noop } }),
    },
    { name: "Still reading", render: () => demo([], { extra: { loading: true } }) },
    { name: "A Hebrew title and a long one (switch the direction to RTL)", render: () => demo(HEBREW) },
  ],
};

export default gallery;
