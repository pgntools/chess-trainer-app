import { useMemo } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { useTranslation } from "react-i18next";

import type { LinkTarget } from "../../../design-system/components/link";
import { SelectField } from "../../../design-system/components/forms";
import { IconAction, SelectionBar } from "../../../design-system/components/toolbars";
import { DataTable, type DataTableColumn, type DataTablePaging, type DataTablePicks, type DataTableSort } from "../../../design-system/patterns/tables";
import type { SortDirection } from "../../../design-system/components/tables";
import type { JobQueueColumn } from "./jobQueueSort";
import { jobQueueFiltered, type JobQueueFilterOption, type JobQueueFilterValues } from "./filterValues";
import { JobProgressBar, JobStamp, JobStatusText } from "./jobParts";
import { JOB_VIEW_STATUSES, jobPercent, type JobRowView } from "./jobView";

/** The queue's picks, for deleting several jobs at once — the screen asks before it deletes. */
export type JobQueuePicks = {
  picked: ReadonlySet<string>;
  onChange: (picked: Set<string>) => void;
  /** Delete the picked jobs — the screen's confirmation first. */
  onDeletePicked: () => void;
};

/** The queue's paging — the words are the table's own. */
export type JobQueuePaging = Omit<DataTablePaging, "labelRowsPerPage" | "labelDisplayedRows">;

/** The filters in the headers — the status's over Status, the kind's over Kind (CTA-221). */
export type JobQueueFiltersInHeaders = {
  values: JobQueueFilterValues;
  onChange: (patch: Partial<JobQueueFilterValues>) => void;
  /** The kinds there are — the kind filter shows when there are two or more (or one is on). */
  kinds: readonly JobQueueFilterOption[];
};

export type JobQueueTableProps = {
  /** The jobs, in the order shown (the screen's: newest first). */
  rows: readonly JobRowView[];
  /** Where a job's title goes — its own page (`/jobs/<id>`). */
  rowLink: (job: JobRowView) => LinkTarget;
  /** The four row actions; each shows only where the row allows it (Delete always). */
  onPause: (job: JobRowView) => void;
  onResume: (job: JobRowView) => void;
  onCancel: (job: JobRowView) => void;
  onDelete: (job: JobRowView) => void;
  /** A checkbox per row, select-all in the header, and a bar to delete the picked. Absent, no picks. */
  picks?: JobQueuePicks;
  /** Absent, every row shows. */
  paging?: JobQueuePaging;
  /** The sort shown — the rows arrive unsorted, the table sorts them (`JOB_QUEUE_DEFAULT_SORT` to start). */
  sort: DataTableSort<JobQueueColumn>;
  onSort: (column: JobQueueColumn, direction: SortDirection) => void;
  /**
   * The filters, each in its column's header under its label (the rows
   * arrive filtered). A filter on, no row means no match, and
   * `onClearFilters` is offered — there, and above the table. Absent, none.
   */
  filters?: JobQueueFiltersInHeaders;
  onClearFilters?: () => void;
  /** The queue is still being read. */
  loading?: boolean;
  /**
   * The root; the parts are `DataTable`'s under it, a job's title link
   * `-link-<id>`, kind `-kind-<id>`, subjects `-subjects-<id>` (each
   * `-<n>`), status `-status-<id>`, progress `-progress-<id>`, its actions
   * `-pause-`, `-resume-`, `-cancel-`, `-delete-<id>`; the picks' bar
   * `-selection` (its delete `-delete-picked`).
   */
  testId: string;
};

/** A status's place in the order a filter offers them — running first, done last. */
const STATUS_ORDER = new Map(JOB_VIEW_STATUSES.map((status, index) => [status, index]));

/**
 * **The Jobs queue** (CTA-217) — every background job, of any kind, as a
 * row: its title (the link to its page), its kind, its status in words, how
 * far it has got and when it was asked for — and, at the row's end, Resume,
 * Pause, Cancel (where the job allows them) and Delete, each named for its
 * job. **Every column sorts** from its header (CTA-221; newest first to
 * start), and **the filters stand over their columns** — the status under
 * Status's label, the kind under Kind's — with Clear above the table while
 * one is on. What a job is applied to is its page's (`JobDetailsPanel`).
 * Optional picks (a bar counting them, with Delete picked), paging and the
 * no-match row.
 *
 * Presentational over `JobRowView` (block-local view models — the screen
 * maps the runtime's records onto them). Its words are `jobs.*`.
 */
function JobQueueTable({
  rows,
  rowLink,
  onPause,
  onResume,
  onCancel,
  onDelete,
  picks,
  paging,
  sort,
  onSort,
  filters,
  onClearFilters,
  loading = false,
  testId,
}: JobQueueTableProps) {
  const { t } = useTranslation();

  const filtered = filters !== undefined && jobQueueFiltered(filters.values);
  const columns = useMemo<DataTableColumn<JobRowView, JobQueueColumn>[]>(() => {
    const statusFilter =
      filters === undefined ? undefined : (
        <SelectField
          label={t("jobs.filters.status")}
          labelHidden
          value={filters.values.status}
          onChange={(status) => filters.onChange({ status: status as JobQueueFilterValues["status"] })}
          emptyOption={t("jobs.filters.anyStatus")}
          options={JOB_VIEW_STATUSES.map((status) => ({ value: status, label: t(`jobs.status.${status}`) }))}
          fullWidth
          testId={`${testId}-filter-status`}
        />
      );
    // A filter with one choice or none filters nothing: the kind's shows with two kinds (or while it is on).
    const kindFilter =
      filters === undefined || (filters.kinds.length < 2 && filters.values.kind === "") ? undefined : (
        <SelectField
          label={t("jobs.filters.kind")}
          labelHidden
          value={filters.values.kind}
          onChange={(kind) => filters.onChange({ kind })}
          emptyOption={t("jobs.filters.anyKind")}
          options={filters.kinds}
          fullWidth
          testId={`${testId}-filter-kind`}
        />
      );
    return [
      {
        id: "title",
        header: t("jobs.queue.title"),
        sortable: true,
        sortValue: (job) => job.title.toLocaleLowerCase(),
        wrap: true,
        dir: "auto",
        render: (job) => job.title,
      },
      {
        id: "kind",
        header: t("jobs.queue.kind"),
        sortable: true,
        sortValue: (job) => job.kindLabel.toLocaleLowerCase(),
        filter: kindFilter,
        cellTestId: (job) => `${testId}-kind-${job.id}`,
        render: (job) => job.kindLabel,
      },
      {
        id: "status",
        header: t("jobs.queue.status"),
        sortable: true,
        sortValue: (job) => STATUS_ORDER.get(job.status) ?? JOB_VIEW_STATUSES.length,
        filter: statusFilter,
        render: (job) => <JobStatusText status={job.status} testId={`${testId}-status-${job.id}`} />,
      },
      {
        id: "progress",
        header: t("jobs.queue.progressColumn"),
        sortable: true,
        firstDirection: "desc",
        sortValue: (job) => jobPercent(job.status, job.progress),
        width: 200,
        render: (job) => <JobProgressBar title={job.title} status={job.status} progress={job.progress} testId={`${testId}-progress-${job.id}`} />,
      },
      {
        id: "created",
        header: t("jobs.queue.created"),
        sortable: true,
        firstDirection: "desc",
        sortValue: (job) => job.createdAt,
        render: (job) => <JobStamp value={job.createdAt} />,
      },
    ];
  }, [t, testId, filters]);

  // The sort's hint, and the picks' beside it where there are picks (DataTable's union: a sort comes with its hint).
  const pickProps: { picks?: DataTablePicks<JobRowView>; hint: string } =
    picks === undefined
      ? { hint: t("jobs.queue.sortHint") }
      : {
          picks: {
            picked: picks.picked,
            onChange: picks.onChange,
            selectAllLabel: t("jobs.queue.selectAll"),
            pickLabel: (job) => t("jobs.queue.pick", { name: job.title }),
          },
          hint: `${t("jobs.queue.sortHint")} ${t("jobs.queue.hint")}`,
        };
  const pickedCount = picks === undefined ? 0 : rows.reduce((count, job) => (picks.picked.has(job.id) ? count + 1 : count), 0);

  return (
    <DataTable<JobRowView, JobQueueColumn>
      columns={columns}
      rows={rows}
      rowId={(job) => job.id}
      sort={sort}
      onSort={onSort}
      // Ties go by when they were asked for, newest first.
      tieBreak={(a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)}
      rowLink={rowLink}
      linkColumn="title"
      linkTestId={(job) => `${testId}-link-${job.id}`}
      rowLinkLabel={(job) => t("jobs.queue.open", { name: job.title })}
      rowActions={(job) => (
        <>
          {job.canResume && (
            <IconAction label={t("jobs.resumeNamed", { name: job.title })} onClick={() => onResume(job)} testId={`${testId}-resume-${job.id}`}>
              <PlayArrowRoundedIcon fontSize="small" />
            </IconAction>
          )}
          {job.canPause && (
            <IconAction label={t("jobs.pauseNamed", { name: job.title })} onClick={() => onPause(job)} testId={`${testId}-pause-${job.id}`}>
              <PauseRoundedIcon fontSize="small" />
            </IconAction>
          )}
          {job.canCancel && (
            <IconAction label={t("jobs.cancelNamed", { name: job.title })} onClick={() => onCancel(job)} testId={`${testId}-cancel-${job.id}`}>
              <BlockRoundedIcon fontSize="small" />
            </IconAction>
          )}
          <IconAction label={t("jobs.deleteNamed", { name: job.title })} color="error" onClick={() => onDelete(job)} testId={`${testId}-delete-${job.id}`}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconAction>
        </>
      )}
      actionsLabel={t("jobs.queue.actions")}
      {...pickProps}
      toolbar={
        picks === undefined || pickedCount === 0 ? undefined : (
          <SelectionBar
            count={pickedCount}
            countLabel={t("jobs.queue.picked", { count: pickedCount })}
            onClear={() => picks.onChange(new Set())}
            clearLabel={t("jobs.queue.clearPicks")}
            actions={
              <IconAction
                label={t("jobs.queue.deletePicked", { count: pickedCount })}
                color="error"
                onClick={picks.onDeletePicked}
                testId={`${testId}-delete-picked`}
              >
                <DeleteOutlineRoundedIcon fontSize="small" />
              </IconAction>
            }
            testId={`${testId}-selection`}
            rootTestId={`${testId}-selection`}
          />
        )
      }
      paging={paging === undefined ? undefined : { ...paging, labelRowsPerPage: t("jobs.queue.rowsPerPage") }}
      filters={
        filtered && onClearFilters !== undefined ? (
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button size="small" onClick={onClearFilters} data-testid={`${testId}-clear-filters`}>
              {t("jobs.filters.clear")}
            </Button>
          </Box>
        ) : undefined
      }
      filtered={filtered}
      noMatchLabel={
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          {t("jobs.queue.noMatch")}
          {onClearFilters !== undefined && (
            <Button size="small" variant="outlined" onClick={onClearFilters} data-testid={`${testId}-no-match-clear`}>
              {t("jobs.filters.clear")}
            </Button>
          )}
        </Box>
      }
      loading={loading}
      loadingLabel={t("jobs.queue.loading")}
      emptyLabel={t("jobs.queue.empty")}
      density="dense"
      ariaLabel={t("jobs.queue.label")}
      testId={testId}
    />
  );
}

export default JobQueueTable;
