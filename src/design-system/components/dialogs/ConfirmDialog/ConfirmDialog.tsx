import type { ReactNode } from "react";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import DialogContentText from "@mui/material/DialogContentText";

import BaseDialog, { type ExtraDialogProps } from "../BaseDialog/BaseDialog";

export type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  /** The question's body — one `DialogContentText` paragraph. */
  message?: ReactNode;
  /** Anything under the message (counts, a list, an error slot). */
  children?: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel: ReactNode;
  /** `destructive` paints the confirm in the error colour. */
  tone?: "default" | "destructive";
  /** A contained confirm (the default) or a text one. */
  confirmVariant?: "contained" | "text";
  /** The answer is being carried out: both buttons off, a spinner in the confirm, no closing. */
  busy?: boolean;
  /** Turns the confirm off without the busy look — a choice not yet valid. */
  confirmDisabled?: boolean;
  width?: "xs" | "sm";
  /** The root's test id; the parts are `-message`, `-cancel` and `-confirm`. */
  testId: string;
  dialogProps?: ExtraDialogProps;
};

/**
 * **A question with two answers** (CTA-108): Cancel, then the confirm at the
 * inline end. The one shape for every "are you sure?" — its tone, button
 * style and busy state are props, so a screen never writes its own.
 */
function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  children,
  confirmLabel,
  cancelLabel,
  tone = "default",
  confirmVariant = "contained",
  busy = false,
  confirmDisabled = false,
  width = "xs",
  testId,
  dialogProps,
}: ConfirmDialogProps) {
  const color = tone === "destructive" ? "error" : "primary";
  const body =
    message === undefined && children === undefined ? undefined : (
      <>
        {message !== undefined && (
          <DialogContentText data-testid={`${testId}-message`}>{message}</DialogContentText>
        )}
        {children}
      </>
    );
  return (
    <BaseDialog
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={title}
      width={width}
      testId={testId}
      dialogProps={dialogProps}
      actions={
        <>
          <Button onClick={onClose} disabled={busy} data-testid={`${testId}-cancel`}>
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            color={color}
            variant={confirmVariant}
            disabled={busy || confirmDisabled}
            aria-busy={busy || undefined}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
            data-testid={`${testId}-confirm`}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {body}
    </BaseDialog>
  );
}

export default ConfirmDialog;
