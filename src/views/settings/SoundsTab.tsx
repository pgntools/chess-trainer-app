import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import { useTranslation } from "react-i18next";

import { SliderField, SwitchField } from "../../design-system/components/forms";
import { playMoveSound } from "../../lib/moveSoundPlayer";
import { SOUND_VOLUME_BOUNDS } from "../../lib/soundSettings";
import { useSoundSettings } from "../shared/useSoundSettings";

/**
 * **Settings → Sounds** (`/settings/sounds`, CTA-260): the boards' move
 * sounds — a master switch (on by default), the volume, and whether stepping
 * through a game sounds too, so browsing can be quiet while a move played
 * still sounds; and a sample to hear the volume by. Every change applies at
 * once on every open board and is kept as a preference
 * (`chessapp.sounds`, `lib/soundSettings.ts`).
 */
function SoundsTab() {
  const { t } = useTranslation();
  const { settings, setSettings } = useSoundSettings();
  const off = !settings.enabled;
  const percent = `${settings.volume}%`;
  return (
    <Box data-testid="sounds-tab" sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1, maxWidth: 560 }}>
      <Typography variant="body1" color="text.secondary">
        {t("settings.sounds.intro")}
      </Typography>
      <SwitchField
        label={t("settings.sounds.enabled")}
        help={t("settings.sounds.enabledHelp")}
        checked={settings.enabled}
        onChange={(enabled) => setSettings({ enabled })}
        testId="sounds-enabled"
      />
      <SliderField
        label={t("settings.sounds.volume")}
        value={settings.volume}
        min={SOUND_VOLUME_BOUNDS.min}
        max={SOUND_VOLUME_BOUNDS.max}
        valueLabel={percent}
        valueText={percent}
        disabled={off}
        onChange={(volume) => setSettings({ volume })}
        testId="sounds-volume"
      />
      <SwitchField
        label={t("settings.sounds.stepping")}
        help={t("settings.sounds.steppingHelp")}
        checked={settings.stepping}
        disabled={off}
        onChange={(stepping) => setSettings({ stepping })}
        testId="sounds-stepping"
      />
      <Box>
        <Button
          variant="outlined"
          startIcon={<VolumeUpRoundedIcon />}
          disabled={off || settings.volume === 0}
          onClick={() => playMoveSound("move", settings.volume / 100)}
          data-testid="sounds-sample"
        >
          {t("settings.sounds.sample")}
        </Button>
      </Box>
    </Box>
  );
}

export default SoundsTab;
