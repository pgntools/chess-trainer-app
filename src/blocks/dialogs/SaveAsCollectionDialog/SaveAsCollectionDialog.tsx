import { useState, type ReactNode } from "react";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { FormDialog, type ExtraDialogProps } from "../../../design-system/components/dialogs";
import { InlineAlert } from "../../../design-system/components/feedback";
import { MAX_COLLECTION_NAME_CHARS } from "../../../lib/libraryCollections";

export type SaveAsCollectionDialogProps = {
  open: boolean;
  /**
   * The name to start from — the one derived the way Analyse derives its
   * folder name (`batchFolderNameOf`), the reader free to edit it.
   */
  initial: string;
  /** How many games the write will hold — "N games will be saved…". */
  count: number;
  /** The write is under way: both buttons off, a spinner in the confirm, no closing. */
  busy?: boolean;
  /** A failed write's problem, shown in the dialog — nothing was created. */
  error?: ReactNode;
  /**
   * A name that is not blank. The write is the caller's (all or nothing), so
   * it closes the dialog on success and leaves it open on failure — unlike
   * `FolderNameDialog`, which closes after saving.
   */
  onSave: (name: string) => void;
  onClose: () => void;
  /**
   * The prefix of its ids: the dialog `<testId>`, the field `<testId>-input`,
   * the count `<testId>-count`, the problem `<testId>-error`, the buttons
   * `<testId>-submit` and `<testId>-cancel`.
   */
  testId: string;
  /** Anything else MUI's `Dialog` takes — the gallery's frame. */
  dialogProps?: ExtraDialogProps;
};

/**
 * **Save the picked games as a new collection** (CTA-122) — the name dialog
 * the collection table's *Save as collection* opens: one field, prefilled
 * with the name derived from the collection, the count and the filters that
 * are on, and — what a plain `FolderNameDialog` cannot say — a count line, a
 * busy state and a problem slot, because the write is all-or-nothing and a
 * failure is answered in the dialog, nothing created. Presentational: the
 * name, the count and the problem are props; the write and the closing are
 * the screen's (`views/library/CollectionScreen.tsx`). Its words are the
 * app's (`library.table.picks.saveAs*`).
 */
function SaveAsCollectionDialog({
  open,
  initial,
  count,
  busy = false,
  error,
  onSave,
  onClose,
  testId,
  dialogProps,
}: SaveAsCollectionDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial);

  // Re-seeded whenever it opens, on the picks it is opened for — adjusted during render, not in an effect.
  const [seed, setSeed] = useState({ open, initial });
  if (seed.open !== open || seed.initial !== initial) {
    setSeed({ open, initial });
    setName(initial);
  }

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={() => onSave(name)}
      title={t("library.table.picks.saveAsTitle")}
      submitLabel={t("library.table.picks.saveAsConfirm")}
      cancelLabel={t("library.table.picks.saveAsCancel")}
      submitDisabled={name.trim() === ""}
      busy={busy}
      testId={testId}
      dialogProps={dialogProps}
    >
      <TextField
        // eslint-disable-next-line jsx-a11y/no-autofocus -- the dialog's field takes the focus as the dialog opens, as WAI-ARIA's dialog pattern asks (ACCESSIBILITY.md)
        autoFocus
        fullWidth
        disabled={busy}
        label={t("library.table.picks.saveAsName")}
        value={name}
        onChange={(event) => setName(event.target.value)}
        slotProps={{
          htmlInput: { "data-testid": `${testId}-input`, maxLength: MAX_COLLECTION_NAME_CHARS, dir: "auto" },
        }}
      />
      <Typography variant="body2" data-testid={`${testId}-count`} sx={{ color: "text.secondary" }}>
        {t("library.table.picks.saveAsCount", { count })}
      </Typography>
      {error !== undefined && error !== null && error !== false && (
        <InlineAlert severity="error" dense testId={`${testId}-error`}>
          {error}
        </InlineAlert>
      )}
    </FormDialog>
  );
}

export default SaveAsCollectionDialog;
