import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { SelectField } from "../../../design-system/components/forms";
import { JOB_VIEW_STATUSES, type JobViewStatus } from "../../tables";
import type { JobQueueFilterOption, JobQueueFilterValues } from "./filterValues";

export type JobQueueFiltersProps = {
  values: JobQueueFilterValues;
  onChange: (patch: Partial<JobQueueFilterValues>) => void;
  /** Take every filter off. */
  onClear: () => void;
  /** The kinds there are — the kind filter shows when there are two or more (or one is on). */
  kinds: readonly JobQueueFilterOption[];
  /** The entity types a job can be applied to — shown as the kinds are. */
  entityTypes: readonly JobQueueFilterOption[];
  /** The root; the fields are `-status`, `-kind`, `-entity-type` and the clear `-clear`. */
  testId: string;
};

/**
 * **The Jobs queue's filters** (CTA-217) — as a collection's filters are
 * (`CollectionFilters`): a heading with Clear, then the status (every one
 * the runtime has), the kind and what the job is applied to, each with an
 * "any" first. A filter with one choice or none filters nothing, so the kind
 * and entity type show only where there are two (or one is on).
 *
 * Presentational: the values, the choices and every change are props. Its
 * words are `jobs.filters.*` and the statuses' `jobs.status.*`.
 */
function JobQueueFilters({ values, onChange, onClear, kinds, entityTypes, testId }: JobQueueFiltersProps) {
  const { t } = useTranslation();
  const active = values.status !== "" || values.kind !== "" || values.entityType !== "";
  const id = (part: string) => `${testId}-${part}`;

  return (
    <Box data-testid={testId} sx={{ display: "grid", gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="subtitle2" component="h2" sx={{ flexGrow: 1, fontWeight: 700 }}>
          {t("jobs.filters.title")}
        </Typography>
        <Button size="small" disabled={!active} onClick={onClear} data-testid={id("clear")}>
          {t("jobs.filters.clear")}
        </Button>
      </Box>

      <SelectField
        label={t("jobs.filters.status")}
        value={values.status}
        onChange={(status) => onChange({ status: status as JobViewStatus | "" })}
        emptyOption={t("jobs.filters.anyStatus")}
        options={JOB_VIEW_STATUSES.map((status) => ({ value: status, label: t(`jobs.status.${status}`) }))}
        fullWidth
        testId={id("status")}
      />

      {(kinds.length > 1 || values.kind !== "") && (
        <SelectField
          label={t("jobs.filters.kind")}
          value={values.kind}
          onChange={(kind) => onChange({ kind })}
          emptyOption={t("jobs.filters.anyKind")}
          options={kinds}
          fullWidth
          testId={id("kind")}
        />
      )}

      {(entityTypes.length > 1 || values.entityType !== "") && (
        <SelectField
          label={t("jobs.filters.entityType")}
          value={values.entityType}
          onChange={(entityType) => onChange({ entityType })}
          emptyOption={t("jobs.filters.anyEntityType")}
          options={entityTypes}
          fullWidth
          testId={id("entity-type")}
        />
      )}
    </Box>
  );
}

export default JobQueueFilters;
