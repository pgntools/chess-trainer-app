import { useState } from "react";
import Box from "@mui/material/Box";
import FolderSpecialOutlinedIcon from "@mui/icons-material/FolderSpecialOutlined";
import { useTranslation } from "react-i18next";

import { FormDialog, type ExtraDialogProps } from "../../../design-system/components/dialogs";
import { FieldLabel, TextInputField } from "../../../design-system/components/forms";
import { PickerList } from "../../../design-system/components/lists";
import type { AnalysisProject } from "../../../lib/analysisProjects";

export type ProjectPickerDialogProps = {
  open: boolean;
  /** "Move case to another project", "Duplicate case". */
  title: string;
  /** "Move", "Duplicate". */
  submitLabel: string;
  /** Every Project, as the store holds them. */
  projects: readonly AnalysisProject[];
  /** The Project the thing is in now — chosen at first, or left out (`excludeCurrent`). */
  current: string;
  /** A move: the Project it is in is not offered. */
  excludeCurrent?: boolean;
  /** A name to give the result — a duplicate's, seeded with this; absent, no name field. */
  initialName?: string;
  /** The chosen Project (and the name, when asked); the dialog does not close itself. */
  onSubmit: (projectId: string, name: string) => void;
  onClose: () => void;
  busy?: boolean;
  /**
   * The prefix of its ids: the dialog `<testId>` (FormDialog's `-submit`,
   * `-cancel`), the list `<testId>-projects` (each Project
   * `<testId>-projects-<id>`), the name `<testId>-name`.
   */
  testId: string;
  dialogProps?: ExtraDialogProps;
};

/**
 * **A Project to put a Case in** (CTA-186) — moving a Case to another Project,
 * or duplicating it into one (its own or another) under a name: the Projects
 * as a list to pick from, by name, and the name when one is asked for.
 * Presentational; its words are the app's (`analysisV2.*`).
 */
function ProjectPickerDialog({
  open,
  title,
  submitLabel,
  projects,
  current,
  excludeCurrent = false,
  initialName,
  onSubmit,
  onClose,
  busy = false,
  testId,
  dialogProps,
}: ProjectPickerDialogProps) {
  const { t } = useTranslation();
  const [chosen, setChosen] = useState<string | undefined>(excludeCurrent ? undefined : current);
  const [name, setName] = useState(initialName ?? "");

  // Opened afresh, it starts from the Case's own place and name — adjusted during render.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setChosen(excludeCurrent ? undefined : current);
      setName(initialName ?? "");
    }
  }

  const offered = [...projects]
    .filter((project) => !(excludeCurrent && project.id === current))
    .sort((a, b) => a.name.localeCompare(b.name));
  const label = t("analysisV2.case.project");

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={() => {
        if (chosen !== undefined) onSubmit(chosen, name);
      }}
      title={title}
      submitLabel={submitLabel}
      cancelLabel={t("analysisV2.cancel")}
      submitDisabled={chosen === undefined}
      busy={busy}
      testId={testId}
      dialogProps={dialogProps}
    >
      <Box sx={{ display: "grid", gap: 2 }}>
        {initialName !== undefined && (
          <TextInputField
            label={t("analysisV2.case.name")}
            value={name}
            onChange={setName}
            dir="auto"
            helperText={t("analysisV2.case.nameHelp")}
            testId={`${testId}-name`}
          />
        )}
        <Box>
          <FieldLabel component="span">{label}</FieldLabel>
          <PickerList
            ariaLabel={label}
            items={offered.map((project) => ({
              id: project.id,
              label: project.name || t("analysisV2.project.untitled"),
              icon: <FolderSpecialOutlinedIcon fontSize="small" />,
            }))}
            value={chosen}
            onChange={(id) => {
              if (id !== null) setChosen(id);
            }}
            maxHeight={280}
            testId={`${testId}-projects`}
          />
        </Box>
      </Box>
    </FormDialog>
  );
}

export default ProjectPickerDialog;
