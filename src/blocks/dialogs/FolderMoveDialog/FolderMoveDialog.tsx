import Button from "@mui/material/Button";

import { BaseDialog, type ExtraDialogProps } from "../../../design-system/components/dialogs";
import type { GameFolder } from "../../../lib/savedGameFolders";
import { FolderPicker } from "../../lists/FolderPicker";

/** The dialog's words. */
export type FolderMoveDialogLabels = {
  title: string;
  cancel: string;
  /** The "none" row — "Top level" for a folder, "Unfiled" for a record. */
  none: string;
  untitled: string;
  /** The picker's accessible name ("Folder"). */
  picker: string;
};

export type FolderMoveDialogProps = {
  open: boolean;
  /** Every folder in the reader's tree. */
  folders: readonly GameFolder[];
  /** Where the moved thing is now — its row is marked. */
  current: string | null | undefined;
  /** Folders it cannot go into — a moved folder's own subtree (`gameFolderSubtree`). */
  exclude?: readonly string[];
  /** A pick moves it at once; the dialog does not close itself. */
  onMove: (folderId: string | null) => void;
  onClose: () => void;
  labels: FolderMoveDialogLabels;
  /**
   * The prefix of its ids: the dialog `<testId>-move-dialog`, the picker
   * `<testId>-picker` (each folder `<testId>-picker-<id>`), its none row
   * `<testId>-move-top`, Cancel `<testId>-move-cancel`.
   */
  testId: string;
  /** The picker's own prefix, when a screen's tests named it apart from the dialog (the Library's collection move). Absent, `<testId>-picker`. */
  pickerTestId?: string;
  dialogProps?: ExtraDialogProps;
};

/**
 * **Where it moves** (CTA-113) — a folder into another (never into its own
 * subtree, which the stores refuse and this never offers) or a record into a
 * folder: the `FolderPicker` in a dialog, a pick moving it at once, Cancel
 * the only button. The saved analyses' and the Library's folder moves, and
 * the Library's collection move, were this three times.
 */
function FolderMoveDialog({
  open,
  folders,
  current,
  exclude,
  onMove,
  onClose,
  labels,
  testId,
  pickerTestId = `${testId}-picker`,
  dialogProps,
}: FolderMoveDialogProps) {
  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      title={labels.title}
      testId={`${testId}-move-dialog`}
      dialogProps={dialogProps}
      actions={
        <Button onClick={onClose} data-testid={`${testId}-move-cancel`}>
          {labels.cancel}
        </Button>
      }
    >
      <FolderPicker
        folders={folders}
        value={current}
        onChange={onMove}
        noneLabel={labels.none}
        untitledLabel={labels.untitled}
        ariaLabel={labels.picker}
        exclude={exclude}
        testId={pickerTestId}
        noneTestId={`${testId}-move-top`}
      />
    </BaseDialog>
  );
}

export default FolderMoveDialog;
