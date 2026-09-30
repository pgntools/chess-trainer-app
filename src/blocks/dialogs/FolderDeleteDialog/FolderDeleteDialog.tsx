import type { ReactNode } from "react";
import Typography from "@mui/material/Typography";

import { ConfirmDialog, type ExtraDialogProps } from "../../../design-system/components/dialogs";

export type FolderDeleteDialogProps = {
  open: boolean;
  /** "Delete folder: Openings". */
  title: string;
  /** What happens to what is in it — it stays: records become Unfiled, sub-folders move up. */
  message: ReactNode;
  /** How much is behind the click ("3 games and 1 sub-folder"). Absent, no count line. */
  counts?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  /** Delete; the dialog closes after it. */
  onConfirm: () => void;
  onClose: () => void;
  /**
   * The prefix of its ids: the dialog `<testId>-delete`, the message
   * `<testId>-delete-text`, the counts `<testId>-delete-counts`, the
   * buttons `<testId>-delete-cancel` and `<testId>-delete-confirm`.
   */
  testId: string;
  dialogProps?: ExtraDialogProps;
};

/**
 * **Delete a folder that is not empty** (CTA-113) — the destructive confirm
 * (a contained red button), saying before it runs that the contents stay:
 * the records filed in it become Unfiled, its sub-folders move up to its
 * parent. An empty folder never asks. The saved analyses', the Library's and
 * the repertoires' folder deletes, as one.
 */
function FolderDeleteDialog({
  open,
  title,
  message,
  counts,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
  testId,
  dialogProps,
}: FolderDeleteDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={() => {
        onConfirm();
        onClose();
      }}
      title={title}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      tone="destructive"
      testId={`${testId}-delete`}
      dialogProps={dialogProps}
    >
      <Typography variant="body2" data-testid={`${testId}-delete-text`}>
        {message}
      </Typography>
      {counts !== undefined && (
        <Typography variant="caption" data-testid={`${testId}-delete-counts`} sx={{ display: "block", mt: 1, color: "text.secondary" }}>
          {counts}
        </Typography>
      )}
    </ConfirmDialog>
  );
}

export default FolderDeleteDialog;
