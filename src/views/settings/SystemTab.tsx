import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { FieldLabel, SwitchField } from "../../design-system/components/forms";
import { useDeveloperMode } from "../../theme/developerMode";

/**
 * **Settings → System** (`/settings/system`): the developer mode toggle.
 * When enabled, the Development folder appears in the sidebar with the
 * Design system gallery and Theme editor entries.
 */
function SystemTab() {
  const { t } = useTranslation();
  const { enabled, setEnabled } = useDeveloperMode();

  return (
    <Box data-testid="system-tab" sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
      <Typography variant="body2" color="text.secondary">
        {t("settings.system.intro")}
      </Typography>
      <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, display: "grid", gap: 1 }}>
        <FieldLabel component="legend">{t("settings.system.developerMode")}</FieldLabel>
        <SwitchField
          label={t("settings.system.developerModeLabel")}
          help={t("settings.system.developerModeDescription")}
          checked={enabled}
          onChange={setEnabled}
          size="small"
          testId="developer-mode-switch"
        />
      </Box>
    </Box>
  );
}

export default SystemTab;