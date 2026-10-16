import { useId, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";

import type { VisibleLabel } from "../../a11y";
import BaseDialog, { type ExtraDialogProps } from "../BaseDialog/BaseDialog";

export type FormDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Save — from the button, Enter in a one-line field, or Ctrl / ⌘ + Enter anywhere. */
  onSubmit: () => void;
  title: VisibleLabel;
  /** The form's fields. */
  children: ReactNode;
  submitLabel: VisibleLabel;
  cancelLabel: VisibleLabel;
  /** Nothing to save yet (an empty name): the button is off and the keys do nothing. */
  submitDisabled?: boolean;
  /** The save is under way: both buttons off, a spinner in Save, no closing. */
  busy?: boolean;
  /**
   * Words beside the buttons, read with Save (`aria-describedby`) — why it is
   * off, or a refusal (CTA-217: the New job frame's "Choose a kind of job").
   * Absent, the actions row is the buttons alone.
   */
  submitNote?: ReactNode;
  width?: "xs" | "sm";
  /** The root's test id; the parts are `-form`, `-cancel`, `-submit` and `-submit-note`. */
  testId: string;
  /** The submit button's own test id, for a screen whose tests named it before (CTA-113: `…-name-save`). Absent, `<testId>-submit`. */
  submitTestId?: string;
  /** The cancel button's own test id (CTA-113). Absent, `<testId>-cancel`. */
  cancelTestId?: string;
  dialogProps?: ExtraDialogProps;
};

/**
 * **A dialog that is a form** (CTA-108): its fields, Cancel and Save. The
 * keyboard submits it as the name and comment dialogs did — **Enter in a
 * one-line field**, and **Ctrl / ⌘ + Enter** anywhere, a multiline field
 * included (where a plain Enter is a new line). A disabled or busy form
 * submits by no route.
 */
function FormDialog({
  open,
  onClose,
  onSubmit,
  title,
  children,
  submitLabel,
  cancelLabel,
  submitDisabled = false,
  busy = false,
  submitNote,
  width = "xs",
  testId,
  submitTestId = `${testId}-submit`,
  cancelTestId = `${testId}-cancel`,
  dialogProps,
}: FormDialogProps) {
  const formId = useId();
  const noteId = useId();
  const blocked = submitDisabled || busy;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!blocked) onSubmit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    // A text input is a one-line field; a checkbox or a button keeps its own Enter.
    const target = event.target as HTMLElement;
    const oneLineField =
      target instanceof HTMLInputElement && !["checkbox", "radio", "button", "submit", "file"].includes(target.type);
    if (event.ctrlKey || event.metaKey || (oneLineField && !event.shiftKey)) {
      event.preventDefault();
      if (!blocked) onSubmit();
    }
  };

  const buttons = (
    <>
      <Button onClick={onClose} disabled={busy} data-testid={cancelTestId}>
        {cancelLabel}
      </Button>
      <Button
        type="submit"
        form={formId}
        variant="contained"
        disabled={blocked}
        aria-busy={busy || undefined}
        aria-describedby={submitNote === undefined ? undefined : noteId}
        startIcon={busy ? <CircularProgress aria-hidden size={16} color="inherit" /> : undefined}
        data-testid={submitTestId}
      >
        {submitLabel}
      </Button>
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
        submitNote === undefined ? (
          buttons
        ) : (
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: 1, width: "100%" }}>
            <Box id={noteId} data-testid={`${testId}-submit-note`} sx={{ flex: "1 1 12rem", minWidth: 0, typography: "body2", color: "text.secondary" }}>
              {submitNote}
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>{buttons}</Box>
          </Box>
        )
      }
    >
      <Box
        component="form"
        id={formId}
        noValidate
        onSubmit={submit}
        onKeyDown={onKeyDown}
        data-testid={`${testId}-form`}
        sx={{ display: "grid", gap: 2, pt: 0.5 }}
      >
        {children}
      </Box>
    </BaseDialog>
  );
}

export default FormDialog;
