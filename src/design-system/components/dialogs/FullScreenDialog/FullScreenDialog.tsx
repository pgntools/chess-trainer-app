import { useId, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import type { ExtraDialogProps } from "../BaseDialog/BaseDialog";

export type FullScreenDialogProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** The close button's tooltip and accessible name. */
  closeLabel: string;
  /** Controls in the header, before the close button. */
  actions?: ReactNode;
  /** The body — it fills the rest of the window, and scrolls or not as it likes. */
  children: ReactNode;
  /** The root's test id; the parts are `-header`, `-title`, `-close` and `-body`. */
  testId: string;
  dialogProps?: ExtraDialogProps;
};

/**
 * **A dialog that takes the whole window** (CTA-108) — the map's full-screen
 * view: a header (the title, the caller's controls, a close button at the
 * inline end) over a body that fills the rest.
 */
function FullScreenDialog({ open, onClose, title, closeLabel, actions, children, testId, dialogProps }: FullScreenDialogProps) {
  const titleId = useId();
  const { direction } = useTheme();
  return (
    <Dialog
      {...dialogProps}
      fullScreen
      open={open}
      onClose={onClose}
      dir={direction}
      aria-labelledby={titleId}
      data-testid={testId}
    >
      <Box
        data-testid={`${testId}-header`}
        sx={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 2,
          py: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography
          id={titleId}
          variant="h6"
          component="h2"
          data-testid={`${testId}-title`}
          sx={{ fontWeight: 700, flexGrow: 1, minWidth: 0 }}
          noWrap
        >
          {title}
        </Typography>
        {actions}
        <Tooltip title={closeLabel}>
          <IconButton onClick={onClose} aria-label={closeLabel} edge="end" data-testid={`${testId}-close`}>
            <CloseRoundedIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Box data-testid={`${testId}-body`} sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {children}
      </Box>
    </Dialog>
  );
}

export default FullScreenDialog;
