import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { Link as RouterLink } from "react-router";
import { useTranslation } from "react-i18next";

import {
  JOB_QUEUE_DEFAULT_SORT,
  JobQueueTable,
  NO_JOB_QUEUE_FILTERS,
  type JobQueueColumn,
  type JobQueueFilterValues,
  type JobRowView,
} from "../../blocks/tables";
import type { DataTableSort } from "../../design-system/patterns/tables";
import { ConfirmDialog, DeleteManyDialog } from "../../design-system/components/dialogs";
import { ListScreenHeader } from "../../design-system/components/toolbars";
import { JOB_KIND_LOCALE_KEYS } from "../../lib/jobs/kinds";
import { jobRuntime } from "../../lib/jobs/runtime";
import { useOwnPageHeading } from "../main/pageTitle";
import { jobRowOf, kindLabelOf, newestFirst } from "./jobViews";
import { JOBS_SETTINGS_PATH, jobPath } from "./paths";
import { useJobEntitiesVersion, useJobRecords } from "./useJobs";

/**
 * **The Jobs screen** (`/jobs`, CTA-221) — every background job of every
 * kind, full width: the `JobQueueTable` block — title (its own page), kind,
 * status, progress and when it was created — every column sortable (newest
 * first to start), paged, the status's and the kind's filters over their
 * columns, each row's Pause / Resume / Cancel / Delete, and picks to delete
 * several at once. What a job is applied to is its page's. Every delete asks first. Pause, Resume, Cancel and
 * Delete are the runtime's commands — store writes any tab can make, which
 * the tab running the job acts on.
 */
function JobsScreen() {
  useOwnPageHeading();
  const { t } = useTranslation();
  const jobs = useJobRecords();
  // The subjects' names and links come from their stores: a rename or a delete re-renders the rows.
  const entities = useJobEntitiesVersion();
  const [filters, setFilters] = useState<JobQueueFilterValues>(NO_JOB_QUEUE_FILTERS);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [deleting, setDeleting] = useState<JobRowView | undefined>();
  const [deletingPicked, setDeletingPicked] = useState(false);
  const [sort, setSort] = useState<DataTableSort<JobQueueColumn>>(JOB_QUEUE_DEFAULT_SORT);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const rows = useMemo(() => {
    void entities;
    // The table sorts them; newest first is only the order they arrive in.
    return newestFirst(jobs ?? [])
      .filter((job) => (filters.status === "" || job.status === filters.status) && (filters.kind === "" || job.kind === filters.kind))
      .map((job) => jobRowOf(t, job));
  }, [jobs, filters, t, entities]);
  // The kinds the app runs, then any other a stored job is of (a retired kind's, CTA-232) — as one string, so a progress write keeps them.
  const kindIds = useMemo(() => [...new Set([...Object.keys(JOB_KIND_LOCALE_KEYS), ...(jobs ?? []).map((job) => job.kind)])].join("\n"), [jobs]);
  const kinds = useMemo(() => kindIds.split("\n").map((id) => ({ value: id, label: kindLabelOf(t, id) })), [kindIds, t]);
  // Held, so the table's columns are not made again on every render.
  const headerFilters = useMemo(
    () => ({
      values: filters,
      onChange: (patch: Partial<JobQueueFilterValues>) => {
        setFilters((current) => ({ ...current, ...patch }));
        setPage(0);
      },
      kinds,
    }),
    [filters, kinds],
  );
  const runtime = jobRuntime();
  const pickedCount = [...picked].filter((id) => jobs?.some((job) => job.id === id)).length;

  return (
    <Box data-testid="jobs-screen" sx={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <ListScreenHeader
        title={t("jobs.screen.title")}
        count={<span data-testid="jobs-count">{jobs === undefined ? "" : t("jobs.count", { count: jobs.length })}</span>}
        actions={
          <Button
            size="small"
            variant="outlined"
            startIcon={<SettingsRoundedIcon />}
            component={RouterLink}
            to={JOBS_SETTINGS_PATH}
            data-testid="jobs-settings-link"
          >
            {t("jobs.screen.settings")}
          </Button>
        }
        testId="jobs-header"
      >
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("jobs.screen.intro")}
        </Typography>
      </ListScreenHeader>
      <JobQueueTable
        rows={rows}
        loading={jobs === undefined}
        rowLink={(job) => ({ component: RouterLink, to: jobPath(job.id) })}
        onPause={(job) => void runtime.pause(job.id)}
        onResume={(job) => void runtime.resume(job.id)}
        onCancel={(job) => void runtime.cancel(job.id)}
        onDelete={setDeleting}
        picks={{ picked, onChange: setPicked, onDeletePicked: () => setDeletingPicked(true) }}
        sort={sort}
        onSort={(column, direction) => {
          setSort({ column, direction });
          setPage(0);
        }}
        paging={{
          page,
          rowsPerPage,
          onPageChange: setPage,
          onRowsPerPageChange: (next) => {
            setRowsPerPage(next);
            setPage(0);
          },
        }}
        filters={headerFilters}
        onClearFilters={() => {
          setFilters(NO_JOB_QUEUE_FILTERS);
          setPage(0);
        }}
        testId="jobs-table"
      />

      <ConfirmDialog
        open={deleting !== undefined}
        onClose={() => setDeleting(undefined)}
        onConfirm={() => {
          if (deleting !== undefined) void runtime.remove([deleting.id]);
          setDeleting(undefined);
        }}
        title={t("jobs.confirmDelete.title")}
        message={deleting === undefined ? undefined : t("jobs.screen.confirmDelete", { name: deleting.title })}
        confirmLabel={t("jobs.confirmDelete.confirm")}
        cancelLabel={t("jobs.confirmDelete.cancel")}
        tone="destructive"
        testId="jobs-delete-dialog"
      />
      <DeleteManyDialog
        open={deletingPicked}
        onClose={() => setDeletingPicked(false)}
        onConfirm={() => {
          void runtime.remove([...picked]);
          setPicked(new Set());
          setDeletingPicked(false);
        }}
        title={t("jobs.screen.confirmDeletePicked", { count: pickedCount })}
        message={t("jobs.screen.confirmDeletePickedBody")}
        confirmLabel={t("jobs.confirmDelete.confirm")}
        cancelLabel={t("jobs.confirmDelete.cancel")}
        testId="jobs-delete-picked-dialog"
      />
    </Box>
  );
}

export default JobsScreen;
