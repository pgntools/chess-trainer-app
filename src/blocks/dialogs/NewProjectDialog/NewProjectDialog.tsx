import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import { useTranslation } from "react-i18next";

import { FormDialog, type ExtraDialogProps } from "../../../design-system/components/dialogs";
import { InlineAlert } from "../../../design-system/components/feedback";
import { FieldLabel, FileInputButton, TextInputField } from "../../../design-system/components/forms";
import { IconAction } from "../../../design-system/components/toolbars";
import { PGN_OR_ZIP_ACCEPT } from "../../forms/PgnInput";

export type NewProjectDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Create — the name, and the `.pgn` (or a zip of them) picked, if any: its games become the Project's Cases. */
  onCreate: (name: string, file: File | undefined) => void;
  /** The file is being read, or the Project written: the buttons off. */
  busy?: boolean;
  /** What went wrong, worded by the screen — an alert in the dialog. */
  problem?: string | null;
  /**
   * The prefix of its ids: the dialog `<testId>` (FormDialog's `-submit`,
   * `-cancel`), the name `<testId>-name`, the file button `<testId>-file`
   * (its input `-file-input`), the file picked `<testId>-picked` (its remove
   * `-picked-remove`), the problem `<testId>-problem`.
   */
  testId: string;
  dialogProps?: ExtraDialogProps;
};

/** A file's name without its `.pgn` or `.zip` — what a Project is named when the reader typed none. */
const stemOf = (file: File): string => file.name.replace(/\.(pgn|zip)$/i, "");

/**
 * **A new Project** (CTA-186) — its name, and **optionally a `.pgn` file, or a
 * zip of them,** whose games come in as its Cases: one game, one Game Case; several, a
 * choice of which (the screen opens the Library's import popup on them,
 * filters and all), each a Case. Picking a file with no name typed names the
 * Project after the file. Presentational: reading the file and writing are
 * the screen's; its words are the app's (`analysisV2.newProject.*`).
 */
function NewProjectDialog({ open, onClose, onCreate, busy = false, problem = null, testId, dialogProps }: NewProjectDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | undefined>(undefined);

  // A dialog opened afresh starts empty — adjusted during render, as the screens' strips are.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName("");
      setFile(undefined);
    }
  }

  const ready = name.trim() !== "" && !busy;

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={() => {
        if (ready) onCreate(name, file);
      }}
      title={t("analysisV2.newProject.title")}
      submitLabel={t("analysisV2.newProject.create")}
      cancelLabel={t("analysisV2.cancel")}
      submitDisabled={!ready}
      busy={busy}
      width="sm"
      testId={testId}
      dialogProps={dialogProps}
    >
      <Box sx={{ display: "grid", gap: 2 }}>
        <TextInputField
          label={t("analysisV2.project.name")}
          value={name}
          onChange={setName}
          dir="auto"
          disabled={busy}
          testId={`${testId}-name`}
        />
        <Box sx={{ display: "grid", gap: 1 }}>
          <FieldLabel component="span">{t("analysisV2.newProject.games")}</FieldLabel>
          {file === undefined ? (
            <Box>
              <FileInputButton
                label={t("analysisV2.newProject.pick")}
                accept={PGN_OR_ZIP_ACCEPT}
                onFiles={([picked]) => {
                  if (picked === undefined) return;
                  setFile(picked);
                  if (name.trim() === "") setName(stemOf(picked));
                }}
                variant="outlined"
                size="small"
                startIcon={<UploadFileRoundedIcon fontSize="small" />}
                disabled={busy}
                testId={`${testId}-file`}
              />
            </Box>
          ) : (
            <Box data-testid={`${testId}-picked`} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" dir="auto" sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere", fontWeight: 600 }}>
                {file.name}
              </Typography>
              <IconAction
                label={t("analysisV2.newProject.removeFile", { name: file.name })}
                onClick={() => setFile(undefined)}
                disabled={busy}
                testId={`${testId}-picked-remove`}
              >
                <CloseRoundedIcon fontSize="small" />
              </IconAction>
            </Box>
          )}
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {t("analysisV2.newProject.gamesHelp")}
          </Typography>
        </Box>
        {problem !== null && (
          <InlineAlert severity="error" testId={`${testId}-problem`}>
            {problem}
          </InlineAlert>
        )}
      </Box>
    </FormDialog>
  );
}

export default NewProjectDialog;
