import { useState } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { FormDialog, type ExtraDialogProps } from "../../../design-system/components/dialogs";
import type { GameFolder } from "../../../lib/savedGameFolders";
import { FolderPicker } from "../../lists/FolderPicker";

/** The dialog's words. */
export type FolderNameDialogLabels = { name: string; cancel: string; save: string };

/** Where a new folder goes (CTA-231): the reader's folders, and the picker's words. */
export type FolderNameDialogParents = {
  /** Every folder in the reader's tree. */
  folders: readonly GameFolder[];
  /** The parent chosen as it opens — `null` (the default) the top level. */
  initial?: string | null;
  labels: {
    /** The picker's visible label and accessible name ("Make it in"). */
    picker: string;
    /** The top level's row ("Top level"). */
    none: string;
    untitled: string;
  };
};

export type FolderNameDialogProps = {
  open: boolean;
  /** "New folder" or "Rename folder" — the caller's. */
  title: string;
  /** The name to start from — the folder's own when renaming, `""` for a new one. */
  initial: string;
  /** A name that is not blank, and the parent picked (`null` the top level — and without a picker); the dialog closes after it. */
  onSave: (name: string, parentId: string | null) => void;
  onClose: () => void;
  labels: FolderNameDialogLabels;
  /**
   * A new folder's parent (CTA-231): the `FolderPicker` under the name, the
   * top level first. Absent — a rename, or a list that makes its folders in
   * place — no picker.
   */
  parents?: FolderNameDialogParents;
  /**
   * The prefix of its ids: the dialog is `<testId>-name`, the field
   * `<testId>-name-input`, the buttons `<testId>-name-cancel` and `-name-save`;
   * the parent picker `<testId>-name-parent` (each folder `-name-parent-<id>`,
   * the top level `-name-parent-top`).
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
 * a margin and in whether Enter closed them. A new folder can be given its
 * parent too (`parents`, CTA-231 — the Library's one New folder): the
 * reader's folders under the name, the top level by default.
 */
function FolderNameDialog({ open, title, initial, onSave, onClose, labels, parents, testId, dialogProps }: FolderNameDialogProps) {
  const [name, setName] = useState(initial);
  const initialParent = parents?.initial ?? null;
  const [parentId, setParentId] = useState<string | null>(initialParent);

  // Re-seeded whenever it opens, on whichever folder — adjusted during render, not in an effect.
  const [seed, setSeed] = useState({ open, initial, initialParent });
  if (seed.open !== open || seed.initial !== initial || seed.initialParent !== initialParent) {
    setSeed({ open, initial, initialParent });
    setName(initial);
    setParentId(initialParent);
  }

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={() => {
        onSave(name, parents === undefined ? null : parentId);
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
      {parents !== undefined && (
        <Box sx={{ display: "grid", gap: 1, mt: 2 }}>
          <Typography variant="body2" component="p" sx={{ fontWeight: 500 }}>
            {parents.labels.picker}
          </Typography>
          <FolderPicker
            folders={parents.folders}
            value={parentId}
            onChange={setParentId}
            noneLabel={parents.labels.none}
            untitledLabel={parents.labels.untitled}
            ariaLabel={parents.labels.picker}
            maxHeight={240}
            testId={`${testId}-name-parent`}
            noneTestId={`${testId}-name-parent-top`}
          />
        </Box>
      )}
    </FormDialog>
  );
}

export default FolderNameDialog;
