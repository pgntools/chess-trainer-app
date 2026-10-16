import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { Link as RouterLink } from "react-router";
import { useTranslation } from "react-i18next";

import { JobQueueFilters, NO_JOB_QUEUE_FILTERS, type JobQueueFilterValues } from "../../blocks/forms";
import { JobQueueTable, type JobRowView } from "../../blocks/tables";
import { ConfirmDialog, DeleteManyDialog } from "../../design-system/components/dialogs";
import { ListScreenHeader } from "../../design-system/components/toolbars";
import { JOB_ENTITY_TYPES } from "../../lib/jobs/entityTypes";
import { JOB_KIND_LOCALE_KEYS } from "../../lib/jobs/kinds";
import { jobRuntime } from "../../lib/jobs/runtime";
import { useOwnPageHeading } from "../main/pageTitle";
import { jobRowOf, kindLabelOf, newestFirst } from "./jobViews";
import { JOBS_SETTINGS_PATH, jobPath } from "./paths";
import { useJobEntitiesVersion, useJobRecords } from "./useJobs";

/**
 * **The Jobs screen** (`/jobs`, CTA-221) — every background job of every
 * kind, full width: the `JobQueueTable` block, newest first — title (its own
 * page), kind, what it is applied to (linked; a deleted one said so), status,
 * progress and when it was created — with each row's Pause / Resume / Cancel
 * / Delete, filters by status, kind and what it is applied to, and picks to
 * delete several at once. Every delete asks first. Pause, Resume, Cancel and
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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const rows = useMemo(() => {
    void entities;
    return newestFirst(jobs ?? [])
      .filter(
        (job) =>
          (filters.status === "" || job.status === filters.status) &&
          (filters.kind === "" || job.kind === filters.kind) &&
          (filters.entityType === "" || job.subjects.some((subject) => subject.type === filters.entityType)),
      )
      .map((job) => jobRowOf(t, job));
  }, [jobs, filters, t, entities]);
  const filtered = filters.status !== "" || filters.kind !== "" || filters.entityType !== "";
  const kinds = useMemo(
    () => Object.keys(JOB_KIND_LOCALE_KEYS).map((id) => ({ value: id, label: kindLabelOf(t, id) })),
    [t],
  );
  const entityTypes = useMemo(() => JOB_ENTITY_TYPES.map((type) => ({ value: type, label: t(`jobs.entities.${type}`) })), [t]);
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
        paging={
          rows.length > 25
            ? {
                page,
                rowsPerPage,
                onPageChange: setPage,
                onRowsPerPageChange: (next) => {
                  setRowsPerPage(next);
                  setPage(0);
                },
              }
            : undefined
        }
        filters={
          <JobQueueFilters
            values={filters}
            onChange={(patch) => {
              setFilters((current) => ({ ...current, ...patch }));
              setPage(0);
            }}
            onClear={() => {
              setFilters(NO_JOB_QUEUE_FILTERS);
              setPage(0);
            }}
            kinds={kinds}
            entityTypes={entityTypes}
            testId="jobs-filters"
          />
        }
        filtered={filtered}
        onClearFilters={() => setFilters(NO_JOB_QUEUE_FILTERS)}
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
