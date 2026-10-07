import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import ConstructionIcon from "@mui/icons-material/Construction";
import { useTranslation } from "react-i18next";

import logo from "../../../assets/chessapp-logo.png";
import { BaseDialog, type ExtraDialogProps } from "../../../design-system/components/dialogs";

/** What a reader should know, each with the emoji that leads its line — decorative, the words carry the meaning. */
const ITEMS = [
  { id: "local", emoji: "💾" },
  { id: "export", emoji: "📦" },
  { id: "changes", emoji: "🚧" },
] as const;

const LOGO_PX = 48;

export type DevelopmentNoticeDialogProps = {
  open: boolean;
  /** The Dismiss button, Escape or the backdrop. */
  onDismiss: () => void;
  /** The dialog's root id; its parts are `-badge`, `-intro`, `-item-<id>` and `-dismiss`. */
  testId: string;
  /** Anything else MUI's `Dialog` takes — the gallery's frame. */
  dialogProps?: ExtraDialogProps;
};

/**
 * **The app is still in development** (CTA-155) — told once, as a modal, on
 * the first load of a session: the logo and the title for a header, an *Early
 * beta* badge, a line saying to use it with caution, and a list of what to
 * expect — what is saved lives in this browser only, so export it; things may
 * change or break. One button, Dismiss; the shell keeps the dismissal for the
 * session (`lib/developmentNotice.ts`).
 *
 * Presentational: whether it is open is a prop. Its words are the app's
 * (`developmentNotice.*`); the logo is decorative, the title names the dialog.
 */
function DevelopmentNoticeDialog({ open, onDismiss, testId, dialogProps }: DevelopmentNoticeDialogProps) {
  const { t } = useTranslation();
  return (
    <BaseDialog
      open={open}
      onClose={onDismiss}
      title={
        <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            component="img"
            src={logo}
            alt=""
            width={LOGO_PX}
            height={LOGO_PX}
            sx={{ flexShrink: 0, borderRadius: 1.5, boxShadow: 2 }}
            data-testid={`${testId}-logo`}
          />
          <span>{t("developmentNotice.title", { name: t("app.brandText") })}</span>
        </Box>
      }
      width="xs"
      testId={testId}
      dialogProps={dialogProps}
      actions={
        <Button variant="contained" onClick={onDismiss} data-testid={`${testId}-dismiss`}>
          {t("developmentNotice.dismiss")}
        </Button>
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
          <Chip
            size="small"
            color="warning"
            variant="outlined"
            icon={<ConstructionIcon aria-hidden />}
            label={t("developmentNotice.badge")}
            data-testid={`${testId}-badge`}
          />
          <Typography variant="body1" color="text.secondary" data-testid={`${testId}-intro`}>
            {t("developmentNotice.intro")}
          </Typography>
        </Box>
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
          {ITEMS.map(({ id, emoji }) => (
            <Box component="li" key={id} sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }} data-testid={`${testId}-item-${id}`}>
              <Box component="span" aria-hidden sx={{ fontSize: "1.5rem", lineHeight: 1.25, flexShrink: 0 }}>
                {emoji}
              </Box>
              <Box>
                <Typography variant="subtitle2" component="p">
                  {t(`developmentNotice.items.${id}.title`)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t(`developmentNotice.items.${id}.text`)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </BaseDialog>
  );
}

export default DevelopmentNoticeDialog;
