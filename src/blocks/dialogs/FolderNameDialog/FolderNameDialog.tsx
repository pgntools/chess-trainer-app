import { useState } from "react";
import TextField from "@mui/material/TextField";

import { FormDialog, type ExtraDialogProps } from "../../../design-system/components/dialogs";

/** The dialog's words. */
export type FolderNameDialogLabels = { name: string; cancel: string; save: string };

export type FolderNameDialogProps = {
  open: boolean;
  /** "New folder" or "Rename folder" — the caller's. */
  title: string;
  /** The name to start from — the folder's own when renaming, `""` for a new one. */
  initial: string;
  /** A name that is not blank; the dialog closes after it. */
  onSave: (name: string) => void;
  onClose: () => void;
  labels: FolderNameDialogLabels;
  /**
   * The prefix of its ids: the dialog is `<testId>-name`, the field
   * `<testId>-name-input`, the buttons `<testId>-name-cancel` and `-name-save`.
   */
  testId: string;
  dialogProps?: ExtraDialogProps;
};

/**
 * **A folder's name** (CTA-113) — the one dialog a new folder and a renamed
 * one open, in every list that has folders (the saved analyses, the
 * repertoires, the Library): a `FormDialog` with one field, re-seeded each
 * time it opens, Save off while the name is blank (the stores ignore a blank
 * name, and so does this), Enter saving. It was two dialogs that differed in
 * a margin and in whether Enter closed them.
 */
function FolderNameDialog({ open, title, initial, onSave, onClose, labels, testId, dialogProps }: FolderNameDialogProps) {
  const [name, setName] = useState(initial);

  // Re-seeded whenever it opens, on whichever folder — adjusted during render, not in an effect.
  const [seed, setSeed] = useState({ open, initial });
  if (seed.open !== open || seed.initial !== initial) {
    setSeed({ open, initial });
    setName(initial);
  }

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={() => {
        onSave(name);
        onClose();
      }}
      title={title}
      submitLabel={labels.save}
      cancelLabel={labels.cancel}
      submitDisabled={name.trim() === ""}
      testId={`${testId}-name`}
      submitTestId={`${testId}-name-save`}
      dialogProps={dialogProps}
    >
      <TextField
        // eslint-disable-next-line jsx-a11y/no-autofocus -- the dialog's field takes the focus as the dialog opens, as WAI-ARIA's dialog pattern asks (ACCESSIBILITY.md)
        autoFocus
        fullWidth
        label={labels.name}
        value={name}
        onChange={(event) => setName(event.target.value)}
        slotProps={{ htmlInput: { "data-testid": `${testId}-name-input`, dir: "auto" } }}
      />
    </FormDialog>
  );
}

export default FolderNameDialog;
