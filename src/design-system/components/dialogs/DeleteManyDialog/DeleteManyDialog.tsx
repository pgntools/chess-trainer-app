import type { ReactNode } from "react";
import Alert from "@mui/material/Alert";

import type { VisibleLabel } from "../../a11y";
import type { ExtraDialogProps } from "../BaseDialog/BaseDialog";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";

export type DeleteManyDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** "Delete N picked games?" — the count is the caller's words. */
  title: VisibleLabel;
  message?: ReactNode;
  confirmLabel: VisibleLabel;
  cancelLabel: VisibleLabel;
  /** A failed delete's problem, shown in the dialog so the picks stay put. */
  error?: ReactNode;
  busy?: boolean;
  /** The root's test id; the parts are ConfirmDialog's and `-error`. */
  testId: string;
  /** The confirm button's own test id — ConfirmDialog's `confirmTestId`. */
  confirmTestId?: string;
  /** The cancel button's and the title's own test ids (CTA-113) — ConfirmDialog's. */
  cancelTestId?: string;
  titleTestId?: string;
  dialogProps?: ExtraDialogProps;
};

/**
 * **Delete the picked rows** (CTA-108): the destructive confirm with an
 * error slot, for the lists and tables whose picks go in one delete. A
 * failed write stays in the dialog, beside the question, until it is
 * answered again or dismissed.
 */
function DeleteManyDialog({ error, ...props }: DeleteManyDialogProps) {
  return (
    <ConfirmDialog {...props} tone="destructive">
      {error !== undefined && error !== null && error !== false && (
        <Alert severity="error" sx={{ mt: 1.5 }} data-testid={`${props.testId}-error`}>
          {error}
        </Alert>
      )}
    </ConfirmDialog>
  );
}

export default DeleteManyDialog;
