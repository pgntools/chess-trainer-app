import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ExtensionOutlinedIcon from "@mui/icons-material/ExtensionOutlined";
import SportsEsportsOutlinedIcon from "@mui/icons-material/SportsEsportsOutlined";
import { useTranslation } from "react-i18next";

import { FormDialog, type ExtraDialogProps } from "../../../design-system/components/dialogs";
import { StatusText } from "../../../design-system/components/feedback";
import { FieldLabel, SelectField } from "../../../design-system/components/forms";
import { PickerList } from "../../../design-system/components/lists";

/** A Case that may be picked: its Project, its name as shown and its type. */
export type PickableCase = { id: string; projectId: string; name: string; type: "game" | "position" };

export type CasePickerDialogProps = {
  open: boolean;
  /** Every Project by name — those holding a Case to pick are offered. */
  projects: readonly { id: string; name: string }[];
  /** The Cases that may be picked — the screen leaves out the Case itself and the ones it links to already. */
  cases: readonly PickableCase[];
  /** The Project chosen at first — the Case's own, where it has a Case to pick. */
  initialProjectId: string;
  /** The chosen Case; the dialog does not close itself. */
  onSubmit: (caseId: string) => void;
  onClose: () => void;
  busy?: boolean;
  /** Why the last Link was refused — said in the dialog. */
  problem?: string;
  /**
   * The prefix of its ids: the dialog `<testId>` (FormDialog's `-submit`,
   * `-cancel`), the Project `-project`, the Cases `-cases` (each
   * `-cases-<id>`), none `-empty`, the refusal `-problem`.
   */
  testId: string;
  dialogProps?: ExtraDialogProps;
};

/**
 * **A Case to link to** (CTA-188) — a Case's Info tab's *Link a case*: a
 * Project (a select, the Case's own first chosen), then one of its Cases from
 * a list; **Link** links the Case on the board to it. Projects with nothing
 * to pick are not offered.
 *
 * Presentational: the Projects, the Cases and the outcome are props; the
 * screen writes the link. Its words are `analysisV2.links.picker.*`.
 */
function CasePickerDialog({
  open,
  projects,
  cases,
  initialProjectId,
  onSubmit,
  onClose,
  busy = false,
  problem,
  testId,
  dialogProps,
}: CasePickerDialogProps) {
  const { t } = useTranslation();
  const offered = projects
    .filter((project) => cases.some((record) => record.projectId === project.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const firstProject = () => (offered.some((project) => project.id === initialProjectId) ? initialProjectId : (offered[0]?.id ?? ""));
  const [projectId, setProjectId] = useState(firstProject);
  const [chosen, setChosen] = useState<string | undefined>();

  // Opened afresh: the Case's own Project, nothing picked — adjusted during render.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setProjectId(firstProject());
      setChosen(undefined);
    }
  }

  const here = cases.filter((record) => record.projectId === projectId);
  const casesLabel = t("analysisV2.links.picker.cases");

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={() => {
        if (chosen !== undefined) onSubmit(chosen);
      }}
      title={t("analysisV2.links.picker.title")}
      submitLabel={t("analysisV2.links.picker.submit")}
      cancelLabel={t("analysisV2.cancel")}
      submitDisabled={chosen === undefined}
      busy={busy}
      testId={testId}
      dialogProps={dialogProps}
    >
      {offered.length === 0 ? (
        <Typography variant="body2" data-testid={`${testId}-empty`} sx={{ color: "text.secondary" }}>
          {t("analysisV2.links.picker.none")}
        </Typography>
      ) : (
        <Box sx={{ display: "grid", gap: 2 }}>
          <SelectField
            label={t("analysisV2.links.picker.project")}
            value={projectId}
            onChange={(next) => {
              setProjectId(next);
              setChosen(undefined);
            }}
            options={offered.map((project) => ({ value: project.id, label: <bdi>{project.name || t("analysisV2.project.untitled")}</bdi> }))}
            fullWidth
            testId={`${testId}-project`}
          />
          <Box>
            <FieldLabel component="span">{casesLabel}</FieldLabel>
            <PickerList
              ariaLabel={casesLabel}
              items={here.map((record) => ({
                id: record.id,
                label: record.name,
                icon: record.type === "game" ? <SportsEsportsOutlinedIcon fontSize="small" /> : <ExtensionOutlinedIcon fontSize="small" />,
              }))}
              value={chosen}
              onChange={(id) => {
                if (id !== null) setChosen(id);
              }}
              maxHeight={280}
              testId={`${testId}-cases`}
            />
          </Box>
          {problem !== undefined && (
            <StatusText tone="error" testId={`${testId}-problem`}>
              {problem}
            </StatusText>
          )}
        </Box>
      )}
    </FormDialog>
  );
}

export default CasePickerDialog;
