import { useId, type ReactNode } from "react";
import Dialog, { type DialogProps } from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useTheme } from "@mui/material/styles";

import type { VisibleLabel } from "../../a11y";

/** The modal props a caller may add — never `open`, `onClose` or the content. */
export type ExtraDialogProps = Omit<Partial<DialogProps>, "open" | "onClose" | "children" | "title">;

export type BaseDialogProps = {
  open: boolean;
  /** Escape, the backdrop, or the caller's own Cancel. */
  onClose: () => void;
  title: VisibleLabel;
  /** The body, inside `DialogContent`. */
  children?: ReactNode;
  /** The buttons, inside `DialogActions`; absent, there is no actions row. */
  actions?: ReactNode;
  /** The paper's cap — `xs` for a question or a short form, `sm` for a longer body. */
  width?: "xs" | "sm";
  /** Stretch to the cap (the default) rather than to the content. */
  fullWidth?: boolean;
  /** Rules above and below the content — for a body that scrolls. */
  dividers?: boolean;
  /** The title's id, for a part the title also names (a progress bar); absent, one of its own. */
  titleId?: string;
  /** The root's test id; the parts are `<testId>-title`, `-content` and `-actions`. */
  testId: string;
  /** Anything else MUI's `Dialog` takes — a `container`, `keepMounted`, … */
  dialogProps?: ExtraDialogProps;
  /** The title's own test id, for a screen whose tests named it before (CTA-113). Absent, `<testId>-title`. */
  titleTestId?: string;
};

/**
 * **The dialog every dialog is built on** (CTA-108): a title, a body and an
 * actions row at one of two widths, labelled by its title (a required
 * `VisibleLabel`, so no dialog is nameless), with a test id on its root.
 * MUI's modal traps the focus inside while it is open and gives it back to
 * whatever opened it when it closes. It carries the theme's direction as `dir`, so a dialog portalled
 * outside a mirrored tree still reads the right way.
 */
function BaseDialog({
  open,
  onClose,
  title,
  children,
  actions,
  width = "xs",
  fullWidth = true,
  dividers = false,
  titleId: titleIdProp,
  testId,
  dialogProps,
  titleTestId = `${testId}-title`,
}: BaseDialogProps) {
  const ownTitleId = useId();
  const titleId = titleIdProp ?? ownTitleId;
  const { direction } = useTheme();
  return (
    <Dialog
      {...dialogProps}
      open={open}
      onClose={onClose}
      maxWidth={width}
      fullWidth={fullWidth}
      dir={direction}
      aria-labelledby={titleId}
      data-testid={testId}
    >
      <DialogTitle id={titleId} data-testid={titleTestId}>
        {title}
      </DialogTitle>
      {children !== undefined && (
        <DialogContent dividers={dividers} data-testid={`${testId}-content`}>
          {children}
        </DialogContent>
      )}
      {actions !== undefined && <DialogActions data-testid={`${testId}-actions`}>{actions}</DialogActions>}
    </Dialog>
  );
}

export default BaseDialog;
