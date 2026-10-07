import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DialogContentText from "@mui/material/DialogContentText";
import { useTranslation } from "react-i18next";

import { BaseDialog, type ExtraDialogProps } from "../../../design-system/components/dialogs";

export type DevelopmentNoticeDialogProps = {
  open: boolean;
  /** The Dismiss button, Escape or the backdrop. */
  onDismiss: () => void;
  /** The dialog's root id; its parts are `-intro`, `-local`, `-changes` and `-dismiss`. */
  testId: string;
  /** Anything else MUI's `Dialog` takes — the gallery's frame. */
  dialogProps?: ExtraDialogProps;
};

/**
 * **The app is still in development** (CTA-155) — told once, as a modal, on
 * the first load of a session: use it with caution, what is saved lives in
 * this browser only, and things may change or break. One button, Dismiss; the
 * shell keeps the dismissal for the session (`lib/developmentNotice.ts`).
 *
 * Presentational: whether it is open is a prop. Its words are the app's
 * (`developmentNotice.*`).
 */
function DevelopmentNoticeDialog({ open, onDismiss, testId, dialogProps }: DevelopmentNoticeDialogProps) {
  const { t } = useTranslation();
  return (
    <BaseDialog
      open={open}
      onClose={onDismiss}
      title={t("developmentNotice.title", { name: t("app.brandText") })}
      width="xs"
      testId={testId}
      dialogProps={dialogProps}
      actions={
        <Button variant="contained" onClick={onDismiss} data-testid={`${testId}-dismiss`}>
          {t("developmentNotice.dismiss")}
        </Button>
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <DialogContentText data-testid={`${testId}-intro`}>{t("developmentNotice.intro")}</DialogContentText>
        <DialogContentText data-testid={`${testId}-local`}>{t("developmentNotice.local")}</DialogContentText>
        <DialogContentText data-testid={`${testId}-changes`}>{t("developmentNotice.changes")}</DialogContentText>
      </Box>
    </BaseDialog>
  );
}

export default DevelopmentNoticeDialog;
