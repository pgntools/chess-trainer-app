import { useState } from "react";
import Box from "@mui/material/Box";
import CreateNewFolderOutlinedIcon from "@mui/icons-material/CreateNewFolderOutlined";
import FolderSpecialOutlinedIcon from "@mui/icons-material/FolderSpecialOutlined";
import { useTranslation } from "react-i18next";

import { FormDialog, type ExtraDialogProps } from "../../../design-system/components/dialogs";
import { InlineAlert } from "../../../design-system/components/feedback";
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
  /**
   * **A new Project offered too** (CTA-192 — a game handed to Analysis from
   * another screen): a first entry, "New project", its name asked under the
   * list, seeded with `initialName`; chosen at first when `current` names no
   * Project. Picking it submits through `onSubmit` here (the new Project's
   * name, and the result's name when asked). Absent, only the Projects held.
   */
  newProject?: { initialName: string; onSubmit: (projectName: string, name: string) => void };
  onClose: () => void;
  busy?: boolean;
  /** Why the last submit was refused, in words — under the list, the dialog left open (`<testId>-problem`). */
  problem?: string | null;
  /**
   * The prefix of its ids: the dialog `<testId>` (FormDialog's `-submit`,
   * `-cancel`), the list `<testId>-projects` (each Project
   * `<testId>-projects-<id>`), the name `<testId>-name`, a new Project's
   * name `<testId>-project-name`.
   */
  testId: string;
  dialogProps?: ExtraDialogProps;
};

/** The list's id for "New project" — never a record's (`newRecordId`'s start with `g`). */
const NEW_PROJECT = "new";

/**
 * **A Project to put a Case in** (CTA-186) — moving a Case to another Project,
 * or duplicating it into one (its own or another) under a name, or a game
 * handed over from another screen (`newProject`, CTA-192): the Projects as a
 * list to pick from, by name, and the name when one is asked for.
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
  newProject,
  onClose,
  busy = false,
  problem = null,
  testId,
  dialogProps,
}: ProjectPickerDialogProps) {
  const { t } = useTranslation();
  const firstChoice = (): string | undefined => {
    if (!excludeCurrent && projects.some((project) => project.id === current)) return current;
    return newProject === undefined ? (excludeCurrent ? undefined : current) : NEW_PROJECT;
  };
  const [chosen, setChosen] = useState<string | undefined>(firstChoice);
  const [name, setName] = useState(initialName ?? "");
  const [projectName, setProjectName] = useState(newProject?.initialName ?? "");

  // Opened afresh, it starts from the Case's own place and name — adjusted during render.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setChosen(firstChoice());
      setName(initialName ?? "");
      setProjectName(newProject?.initialName ?? "");
    }
  }
  const creating = newProject !== undefined && chosen === NEW_PROJECT;

  const offered = [...projects]
    .filter((project) => !(excludeCurrent && project.id === current))
    .sort((a, b) => a.name.localeCompare(b.name));
  const label = t("analysisV2.case.project");

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={() => {
        if (creating) newProject.onSubmit(projectName.trim(), name);
        else if (chosen !== undefined) onSubmit(chosen, name);
      }}
      title={title}
      submitLabel={submitLabel}
      cancelLabel={t("analysisV2.cancel")}
      submitDisabled={chosen === undefined || (creating && projectName.trim() === "")}
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
            items={[
              ...(newProject === undefined
                ? []
                : [{ id: NEW_PROJECT, label: t("analysisV2.case.newProject"), icon: <CreateNewFolderOutlinedIcon fontSize="small" /> }]),
              ...offered.map((project) => ({
                id: project.id,
                label: project.name || t("analysisV2.project.untitled"),
                icon: <FolderSpecialOutlinedIcon fontSize="small" />,
              })),
            ]}
            value={chosen}
            onChange={(id) => {
              if (id !== null) setChosen(id);
            }}
            maxHeight={280}
            testId={`${testId}-projects`}
          />
        </Box>
        {creating && (
          <TextInputField
            label={t("analysisV2.case.newProjectName")}
            value={projectName}
            onChange={setProjectName}
            dir="auto"
            error={projectName.trim() === ""}
            helperText={t("analysisV2.case.newProjectNameHelp")}
            testId={`${testId}-project-name`}
          />
        )}
        {problem !== null && (
          <InlineAlert severity="error" testId={`${testId}-problem`}>
            {problem}
          </InlineAlert>
        )}
      </Box>
    </FormDialog>
  );
}

export default ProjectPickerDialog;
