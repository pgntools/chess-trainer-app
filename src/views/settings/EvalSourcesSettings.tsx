import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Suspense } from "react";
import { useTranslation } from "react-i18next";

import { EVAL_SOURCES } from "../../lib/evalSources";

/**
 * **The eval sources' settings** (CTA-196) — in Settings → Engine, under the
 * engine's own: every registered source's section (`EvalSource.SettingsSection`,
 * lazy), in registry order, under one line saying what they are for. The tab
 * names no source: removing one from the registry removes its section.
 * Nothing at all while no source has a section.
 */
function EvalSourcesSettings() {
  const { t } = useTranslation();
  const sections = EVAL_SOURCES.flatMap(({ id, SettingsSection }) => (SettingsSection === undefined ? [] : [{ id, SettingsSection }]));
  if (sections.length === 0) return null;
  return (
    <Box data-testid="eval-sources" sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {t("settings.engine.evalSources.intro")}
      </Typography>
      <Suspense fallback={null}>
        {sections.map(({ id, SettingsSection }) => (
          <SettingsSection key={id} testId={`eval-source-${id}`} />
        ))}
      </Suspense>
    </Box>
  );
}

export default EvalSourcesSettings;
