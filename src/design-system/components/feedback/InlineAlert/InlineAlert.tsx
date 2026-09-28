import type { ReactNode } from "react";
import Alert, { type AlertColor } from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";

export type InlineAlertProps = {
  severity: AlertColor;
  /** A bold first line. */
  title?: ReactNode;
  /** What happened, and what to do. */
  children: ReactNode;
  /**
   * Machine words under it — a parse error, a file name, a FEN — set in
   * monospace and pinned left to right, so they are never mirrored.
   */
  detail?: string;
  /** A button at its end ("Retry"). */
  action?: ReactNode;
  /** Its close button; absent, it cannot be dismissed. */
  onClose?: () => void;
  /** `outlined` for a quieter one inside a form. */
  variant?: "standard" | "outlined";
  /** Tighter padding, for a panel. */
  dense?: boolean;
  /** The alert's test id; the detail is `<testId>-detail`. */
  testId: string;
};

/**
 * **An alert in the page's flow** (CTA-108): MUI's `Alert` with an optional
 * title, action, close button, and an LTR detail block — the repertoire
 * upload's problem-and-detail, made the one inline error. Its role is
 * MUI's: `alert`.
 */
function InlineAlert({ severity, title, children, detail, action, onClose, variant = "standard", dense = false, testId }: InlineAlertProps) {
  return (
    <Alert severity={severity} variant={variant} action={action} onClose={onClose} data-testid={testId} sx={dense ? { py: 0.25 } : undefined}>
      {title !== undefined && <AlertTitle sx={{ mb: 0.25 }}>{title}</AlertTitle>}
      {children}
      {detail !== undefined && (
        <Box
          component="pre"
          dir="ltr"
          data-testid={`${testId}-detail`}
          sx={{
            m: 0,
            mt: 0.5,
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            typography: "caption",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            textAlign: "start",
          }}
        >
          {detail}
        </Box>
      )}
    </Alert>
  );
}

export default InlineAlert;
