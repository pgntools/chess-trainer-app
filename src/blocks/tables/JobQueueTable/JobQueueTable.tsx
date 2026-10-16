import { useMemo, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { useTranslation } from "react-i18next";

import type { LinkTarget } from "../../../design-system/components/link";
import { IconAction, SelectionBar } from "../../../design-system/components/toolbars";
import { DataTable, type DataTableColumn, type DataTablePaging, type DataTablePicks } from "../../../design-system/patterns/tables";
import { JobProgressBar, JobStamp, JobStatusText, JobSubjects } from "./jobParts";
import type { JobRowView } from "./jobView";

/** The queue's picks, for deleting several jobs at once — the screen asks before it deletes. */
export type JobQueuePicks = {
  picked: ReadonlySet<string>;
  onChange: (picked: Set<string>) => void;
  /** Delete the picked jobs — the screen's confirmation first. */
  onDeletePicked: () => void;
};

/** The queue's paging — the words are the table's own. */
export type JobQueuePaging = Omit<DataTablePaging, "labelRowsPerPage" | "labelDisplayedRows">;

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
  /** Above the table: the filters (`JobQueueFilters`). */
  filters?: ReactNode;
  /** A filter is on — no row then means no match, and `onClearFilters` is offered. */
  filtered?: boolean;
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

type Column = "title" | "kind" | "subjects" | "status" | "progress" | "created";

/**
 * **The Jobs queue** (CTA-217) — every background job, of any kind, as a
 * row: its title (the link to its page), its kind, what it is applied to
 * (each subject linked, a deleted one muted and said), its status in words,
 * how far it has got and when it was asked for — and, at the row's end,
 * Resume, Pause, Cancel (where the job allows them) and Delete, each named
 * for its job. Optional picks (a bar counting them, with Delete picked),
 * paging, a filters slot and its no-match row.
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
  filters,
  filtered = false,
  onClearFilters,
  loading = false,
  testId,
}: JobQueueTableProps) {
  const { t } = useTranslation();

  const columns = useMemo<DataTableColumn<JobRowView, Column>[]>(
    () => [
      { id: "title", header: t("jobs.queue.title"), wrap: true, dir: "auto", render: (job) => job.title },
      {
        id: "kind",
        header: t("jobs.queue.kind"),
        cellTestId: (job) => `${testId}-kind-${job.id}`,
        render: (job) => job.kindLabel,
      },
      {
        id: "subjects",
        header: t("jobs.queue.subjects"),
        wrap: true,
        render: (job) => <JobSubjects subjects={job.subjects} testId={`${testId}-subjects-${job.id}`} />,
      },
      {
        id: "status",
        header: t("jobs.queue.status"),
        render: (job) => <JobStatusText status={job.status} testId={`${testId}-status-${job.id}`} />,
      },
      {
        id: "progress",
        header: t("jobs.queue.progressColumn"),
        width: 200,
        render: (job) => <JobProgressBar title={job.title} status={job.status} progress={job.progress} testId={`${testId}-progress-${job.id}`} />,
      },
      { id: "created", header: t("jobs.queue.created"), render: (job) => <JobStamp value={job.createdAt} /> },
    ],
    [t, testId],
  );

  // Picks come with the hint that explains them (DataTable's union), or neither does.
  const pickProps: { picks?: undefined; hint?: undefined } | { picks: DataTablePicks<JobRowView>; hint: string } =
    picks === undefined
      ? {}
      : {
          picks: {
            picked: picks.picked,
            onChange: picks.onChange,
            selectAllLabel: t("jobs.queue.selectAll"),
            pickLabel: (job) => t("jobs.queue.pick", { name: job.title }),
          },
          hint: t("jobs.queue.hint"),
        };
  const pickedCount = picks === undefined ? 0 : rows.reduce((count, job) => (picks.picked.has(job.id) ? count + 1 : count), 0);

  return (
    <DataTable<JobRowView, Column>
      columns={columns}
      rows={rows}
      rowId={(job) => job.id}
      sorted
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
      filters={filters}
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
