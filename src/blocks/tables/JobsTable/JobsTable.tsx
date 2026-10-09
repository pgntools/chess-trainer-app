import { useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { useTranslation } from "react-i18next";

import type { LinkTarget } from "../../../design-system/components/link";
import { ProgressLine } from "../../../design-system/components/states";
import { tableDate } from "../../../design-system/components/tables";
import { IconAction } from "../../../design-system/components/toolbars";
import { DataTable, type DataTableColumn } from "../../../design-system/patterns/tables";
import { canCancelJob, canResumeJob, jobMoveLabel, jobProgress, type Job } from "../../../lib/jobs";
import { JOB_STATUS_TONES } from "./jobStatusTones";

export type JobsTableProps = {
  /** The jobs, in the order shown (the store's: newest first). */
  rows: readonly Job[];
  /** Where a job's row goes — its details (`?job=<id>`). */
  rowLink: (job: Job) => LinkTarget;
  /** The job whose details are open — its row is marked as the current one. */
  selectedId?: string | null;
  onCancel: (job: Job) => void;
  onResume: (job: Job) => void;
  onDelete: (job: Job) => void;
  /** The store is still being read. */
  loading?: boolean;
  /** The root; the parts are `DataTable`'s under it, a job's status `<testId>-status-<id>` and progress `<testId>-progress-<id>`. */
  testId: string;
};

type Column = "source" | "status" | "progress" | "started" | "finished";


/** A date and time as the tables write a date, with the time after it: `2026-10-10 14:05`. */
const Stamp = ({ value }: { value: string | null }) => {
  const day = tableDate(value);
  if (value === null || day === undefined) return "–";
  const time = new Date(value).toTimeString().slice(0, 5);
  return (
    <time dir="ltr" dateTime={value}>
      {day.text} {time}
    </time>
  );
};

/**
 * **The Jobs screen's list** (CTA-173): a row per background job — what it
 * analyses (a link to its details), its status in words, how far it has got
 * (a bar named for the job, "12 of 80 positions · 7. Nf3"), when it started
 * and ended — and, always visible at the row's end, **Cancel** (a job not
 * ended), **Resume** (one a reload or a failure stopped) and **Delete**, each
 * named for its job.
 *
 * Presentational: the jobs, the link and the three actions are props; the
 * screen reads the store and writes it. Its words are the app's (`jobs.*`).
 */
function JobsTable({ rows, rowLink, selectedId, onCancel, onResume, onDelete, loading = false, testId }: JobsTableProps) {
  const { t } = useTranslation();
  const nameOf = (job: Job) => job.source.name || t("jobs.untitled");

  const columns = useMemo<DataTableColumn<Job, Column>[]>(
    () => [
      {
        id: "source",
        header: t("jobs.table.source"),
        wrap: true,
        render: (job) => (
          <Box component="span" dir="auto" sx={{ fontWeight: job.id === selectedId ? 700 : undefined }} aria-current={job.id === selectedId ? "true" : undefined}>
            {nameOf(job)}
          </Box>
        ),
      },
      {
        id: "status",
        header: t("jobs.table.status"),
        cellTestId: (job) => `${testId}-status-${job.id}`,
        render: (job) => (
          <Typography component="span" variant="body2" sx={{ color: JOB_STATUS_TONES[job.status], fontWeight: 600 }}>
            {t(`jobs.status.${job.status}`)}
          </Typography>
        ),
      },
      {
        id: "progress",
        header: t("jobs.table.progress"),
        width: 220,
        render: (job) => {
          const progress = jobProgress(job);
          const move = job.status === "done" || progress.current === undefined ? undefined : jobMoveLabel(progress.current);
          return (
            <ProgressLine
              value={progress.percent}
              label={t("jobs.table.progressOf", { name: nameOf(job) })}
              caption={
                <>
                  {t("jobs.progress", { done: progress.done, total: progress.total })}
                  {move !== undefined && (
                    <>
                      {" · "}
                      <bdi dir="ltr">{move}</bdi>
                    </>
                  )}
                </>
              }
              testId={`${testId}-progress-${job.id}`}
            />
          );
        },
      },
      { id: "started", header: t("jobs.table.started"), render: (job) => <Stamp value={job.startedAt} /> },
      { id: "finished", header: t("jobs.table.finished"), render: (job) => <Stamp value={job.finishedAt} /> },
    ],
    // `nameOf` reads only `t`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, testId, selectedId],
  );

  return (
    <DataTable<Job, Column>
      columns={columns}
      rows={rows}
      rowId={(job) => job.id}
      rowLink={rowLink}
      linkColumn="source"
      rowLinkLabel={(job) => t("jobs.table.open", { name: nameOf(job) })}
      rowActions={(job) => (
        <>
          {canResumeJob(job) && (
            <IconAction label={t("jobs.resumeNamed", { name: nameOf(job) })} onClick={() => onResume(job)} testId={`${testId}-resume-${job.id}`}>
              <PlayArrowRoundedIcon fontSize="small" />
            </IconAction>
          )}
          {canCancelJob(job) && (
            <IconAction label={t("jobs.cancelNamed", { name: nameOf(job) })} onClick={() => onCancel(job)} testId={`${testId}-cancel-${job.id}`}>
              <BlockRoundedIcon fontSize="small" />
            </IconAction>
          )}
          <IconAction label={t("jobs.deleteNamed", { name: nameOf(job) })} color="error" onClick={() => onDelete(job)} testId={`${testId}-delete-${job.id}`}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconAction>
        </>
      )}
      actionsLabel={t("jobs.table.actions")}
      loading={loading}
      loadingLabel={t("jobs.loading")}
      emptyLabel={t("jobs.empty")}
      ariaLabel={t("jobs.title")}
      testId={testId}
    />
  );
}

export default JobsTable;
