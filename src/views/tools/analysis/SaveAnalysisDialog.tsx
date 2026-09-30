import { useState } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import { useTranslation } from "react-i18next";

import { FolderPicker } from "../../../blocks/lists";
import { FormDialog } from "../../../design-system/components/dialogs";
import { FieldLabel } from "../../../design-system/components/forms";
import type { AnalysisFolder } from "../../../lib/savedAnalysisFolders";
import { useAnalysisFolders } from "./saved/useAnalysisFolders";

const NO_FOLDERS: readonly AnalysisFolder[] = [];

/**
 * **Saving a board that is not a record yet** (CTA-73) — a name and a folder,
 * then the board is a saved analysis. The name is seeded with what the board
 * would be called anyway (its players, its event), and may be left empty; the
 * folder is picked from the reader's tree (the `FolderPicker` block), Unfiled
 * by default. A `FormDialog` since CTA-113: Enter in the name saves, Ctrl /
 * ⌘ + Enter anywhere.
 */
function SaveAnalysisDialog({
  open,
  initialName,
  onSave,
  onClose,
}: {
  open: boolean;
  initialName: string;
  onSave: (name: string, folderId: string | null) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  // The folders as read so far — none while the store's first read is out.
  const folders = useAnalysisFolders() ?? NO_FOLDERS;
  const [name, setName] = useState(initialName);
  const [folderId, setFolderId] = useState<string | null>(null);

  /* Seeded each time it opens — adjusted during render, not in an effect. */
  const [seed, setSeed] = useState({ open, initialName });
  if (seed.open !== open || seed.initialName !== initialName) {
    setSeed({ open, initialName });
    setName(initialName);
    if (open) setFolderId(null);
  }

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={() => {
        onSave(name, folderId);
        onClose();
      }}
      title={t("analysis.save.title")}
      submitLabel={t("analysis.save.confirm")}
      cancelLabel={t("savedAnalyses.folder.cancel")}
      testId="analysis-save-dialog"
      submitTestId="analysis-save-confirm"
      cancelTestId="analysis-save-cancel"
    >
      <TextField
        // eslint-disable-next-line jsx-a11y/no-autofocus -- the dialog's field takes the focus as the dialog opens, as WAI-ARIA's dialog pattern asks (ACCESSIBILITY.md)
        autoFocus
        fullWidth
        label={t("analysis.save.name")}
        value={name}
        onChange={(event) => setName(event.target.value)}
        slotProps={{ htmlInput: { "data-testid": "analysis-save-name", dir: "auto" } }}
      />
      <Box>
        <FieldLabel component="span" id="analysis-save-folder-label">
          {t("analysis.save.folder")}
        </FieldLabel>
        <FolderPicker
          folders={folders}
          value={folderId}
          onChange={setFolderId}
          noneLabel={t("savedAnalyses.folder.unfiled")}
          untitledLabel={t("savedAnalyses.folder.untitled")}
          ariaLabel={t("analysis.save.folder")}
          maxHeight={240}
          testId="analysis-folder-picker"
          noneTestId="analysis-folder-unfiled"
        />
      </Box>
    </FormDialog>
  );
}

export default SaveAnalysisDialog;
