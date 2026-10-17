import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";

import { FormDialog } from "../../design-system/components/dialogs";
import { InlineAlert, StatusText } from "../../design-system/components/feedback";
import { SettingsSection } from "../../design-system/components/forms";
import type { RepertoireFolder } from "../../lib/savedRepertoireFolders";
import type { SavedRepertoire } from "../../lib/savedRepertoires";
import { REPERTOIRE_SETTINGS_SECTIONS, useRepertoireSettingsDraft } from "./repertoireSettingsDraft";

/**
 * **A repertoire's settings, in a popup over its board** (CTA-206) — the
 * left panel's gear: the settings screen's sections (`/repertoires/<id>/settings`,
 * which the list's gear still opens) over the same one draft, written on
 * Save and dropped on Cancel. A note opens it: these are the repertoire's
 * own, **permanent** settings, unlike the left panel's Settings tab, which
 * lasts the session.
 *
 * Mount it while open: the draft is seeded from the record as it is then.
 */
function RepertoireSettingsDialog({
  saved,
  folders,
  onClose,
}: {
  saved: SavedRepertoire;
  folders: readonly RepertoireFolder[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { draft, onChange, save, busy, failed } = useRepertoireSettingsDraft(saved, folders);
  return (
    <FormDialog
      open
      onClose={onClose}
      onSubmit={() => {
        void save().then((written) => {
          if (written) onClose();
        });
      }}
      title={t("repertoires.settings.title")}
      submitLabel={t("repertoires.settings.save")}
      cancelLabel={t("repertoires.settings.cancel")}
      busy={busy}
      width="sm"
      testId="repertoire-settings-dialog"
    >
      <Box sx={{ display: "grid", gap: 3 }}>
        <InlineAlert severity="info" variant="outlined" dense testId="repertoire-settings-dialog-note">
          {t("repertoires.settings.permanentNote")}
        </InlineAlert>
        {REPERTOIRE_SETTINGS_SECTIONS.map(({ id, labelKey, Body }) => (
          <SettingsSection key={id} title={t(labelKey)} testId={`repertoire-settings-dialog-section-${id}`}>
            <Body draft={draft} onChange={onChange} />
          </SettingsSection>
        ))}
        {failed && (
          <StatusText tone="error" testId="repertoire-settings-dialog-problem">
            {t("repertoires.settings.problem")}
          </StatusText>
        )}
      </Box>
    </FormDialog>
  );
}

export default RepertoireSettingsDialog;
