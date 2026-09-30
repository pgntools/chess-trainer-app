import { useId, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";

import type { VisibleLabel } from "../../a11y";
import BaseDialog, { type ExtraDialogProps } from "../BaseDialog/BaseDialog";
import type { JobProgress } from "./useCancellableJob";

export type ProgressDialogProps = {
  open: boolean;
  title: VisibleLabel;
  /** Anything above the bar — what is being done. */
  children?: ReactNode;
  /** How far it has got; `null` or absent draws an indeterminate bar. */
  progress?: JobProgress | null;
  /** The line under the bar ("Indexing 120 of 800 games…"). */
  caption?: ReactNode;
  cancelLabel: VisibleLabel;
  /** Cancel, Escape or the backdrop. */
  onCancel: () => void;
  /** The part that cannot be stopped is under way (a write): Cancel is off and nothing closes. */
  cancelDisabled?: boolean;
  width?: "xs" | "sm";
  /** The root's test id; the parts are `-progress`, `-caption` and `-cancel`. */
  testId: string;
  /**
   * The bar's and the caption's own test ids, for a screen whose tests named
   * them before (CTA-113: the Library's import reads its caption as
   * `library-import-progress`). Absent, `-progress` and `-caption`.
   */
  barTestId?: string;
  captionTestId?: string;
  dialogProps?: ExtraDialogProps;
};

/**
 * **A job under way, in a dialog** (CTA-108): a determinate bar (or an
 * indeterminate one before the first report) named by the dialog's title and
 * described by the caption, and Cancel — off while the job writes. Pair it with `useCancellableJob`, which owns the
 * abort and the phases this only draws.
 */
function ProgressDialog({
  open,
  title,
  children,
  progress,
  caption,
  cancelLabel,
  onCancel,
  cancelDisabled = false,
  width = "xs",
  testId,
  barTestId = `${testId}-progress`,
  captionTestId = `${testId}-caption`,
  dialogProps,
}: ProgressDialogProps) {
  const titleId = useId();
  const captionId = useId();
  const percent =
    progress === null || progress === undefined || progress.total <= 0
      ? undefined
      : Math.min(100, Math.round((progress.done / progress.total) * 100));
  return (
    <BaseDialog
      open={open}
      onClose={() => {
        if (!cancelDisabled) onCancel();
      }}
      title={title}
      titleId={titleId}
      width={width}
      testId={testId}
      dialogProps={dialogProps}
      actions={
        <Button onClick={onCancel} disabled={cancelDisabled} data-testid={`${testId}-cancel`}>
          {cancelLabel}
        </Button>
      }
    >
      <Box sx={{ display: "grid", gap: 1 }}>
        {children}
        <LinearProgress
          variant={percent === undefined ? "indeterminate" : "determinate"}
          value={percent}
          aria-labelledby={titleId}
          aria-describedby={caption === undefined ? undefined : captionId}
          data-testid={barTestId}
          sx={{ height: 6, borderRadius: 3 }}
        />
        {caption !== undefined && (
          <Typography id={captionId} variant="body2" color="text.secondary" data-testid={captionTestId}>
            {caption}
          </Typography>
        )}
      </Box>
    </BaseDialog>
  );
}

export default ProgressDialog;
