import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";

import { RadioGroupField, SelectField, SettingsSection, TextInputField } from "../../../design-system/components/forms";
import type { JobV2TargetKind } from "../../../lib/jobsV2";
import type { JobTargetChoice, JobTargetProject } from "./jobTarget";

export type JobTargetFieldsProps = {
  value: JobTargetChoice;
  /** A change, as a patch. */
  onChange: (patch: Partial<JobTargetChoice>) => void;
  /** The source Case's Project, by name — where "New Cases in this Project" puts them. */
  projectName: string;
  /** Every other Project, the ones the source's links to first — an existing one to file the results in. */
  projects: readonly JobTargetProject[];
  /**
   * The root; the kind's radios `<testId>-kind-<project|linked|case>`, the
   * linked Project's `<testId>-linked-<new|existing>`, its name `-name`, the
   * Project picked `-project`.
   */
  testId: string;
};

const KINDS: readonly JobV2TargetKind[] = ["project", "linked", "case"];

/**
 * **Where to save the results** (CTA-188) — the New Job V2 popup's first
 * section: **new Cases in this Project**, each ticked variant a Game Case
 * beside the source; **a linked project** — a **new** one (its name asked,
 * filed beside the source's Project and linked from it) or an **existing** one
 * (one the source's Project links to, listed first and marked, or any other,
 * which gets linked); or **into this Case** — one variant, its evaluations,
 * verdicts and comments merged into the Case, the reader's own work kept.
 *
 * Presentational: the choice, the Projects and the change are props; the
 * screen makes the Project and the link, and holds the form to one variant for
 * the Case. Its words are `analysisV2.jobs.target.*`.
 */
function JobTargetFields({ value, onChange, projectName, projects, testId }: JobTargetFieldsProps) {
  const { t } = useTranslation();
  const nameMissing = value.kind === "linked" && value.linkedMode === "new" && value.newName.trim() === "";

  return (
    <SettingsSection title={t("analysisV2.jobs.target.title")} testId={testId}>
      <RadioGroupField<JobV2TargetKind>
        label={t("analysisV2.jobs.target.kind")}
        options={KINDS.map((kind) => ({ value: kind, label: t(`analysisV2.jobs.target.kinds.${kind}`, { name: projectName }) }))}
        value={value.kind}
        onChange={(kind) => onChange({ kind })}
        help={t(`analysisV2.jobs.target.help.${value.kind}`)}
        testId={`${testId}-kind`}
      />
      {value.kind === "linked" && (
        <Box sx={{ display: "grid", gap: 1.5, paddingInlineStart: 2 }}>
          <RadioGroupField<"new" | "existing">
            row
            label={t("analysisV2.jobs.target.linked")}
            options={[
              { value: "new", label: t("analysisV2.jobs.target.linkedNew") },
              { value: "existing", label: t("analysisV2.jobs.target.linkedExisting"), disabled: projects.length === 0 },
            ]}
            value={value.linkedMode}
            onChange={(linkedMode) => onChange({ linkedMode })}
            testId={`${testId}-linked`}
          />
          {value.linkedMode === "new" ? (
            <TextInputField
              label={t("analysisV2.jobs.target.name")}
              value={value.newName}
              onChange={(newName) => onChange({ newName })}
              error={nameMissing}
              helperText={nameMissing ? t("analysisV2.jobs.target.nameRequired") : t("analysisV2.jobs.target.nameHelp", { name: projectName })}
              dir="auto"
              testId={`${testId}-name`}
            />
          ) : (
            <SelectField
              label={t("analysisV2.jobs.target.project")}
              value={value.projectId ?? ""}
              onChange={(projectId) => onChange({ projectId })}
              options={projects.map((project) => ({
                value: project.id,
                label: (
                  <span>
                    <bdi>{project.name || t("analysisV2.project.untitled")}</bdi>
                    {project.linked && ` · ${t("analysisV2.jobs.target.alreadyLinked")}`}
                  </span>
                ),
              }))}
              helperText={t("analysisV2.jobs.target.projectHelp", { name: projectName })}
              fullWidth
              testId={`${testId}-project`}
            />
          )}
        </Box>
      )}
    </SettingsSection>
  );
}

export default JobTargetFields;
