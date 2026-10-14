import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Suspense } from "react";
import { useTranslation } from "react-i18next";

import type { EvalSource } from "../../lib/evalSources";

/**
 * **An eval source's tab of Settings → Engine** (CTA-196) — beside Stockfish
 * connectors, one per registered source that has settings (`EngineTab.tsx`): a line
 * saying what an eval source is for, then the source's own section
 * (`EvalSource.SettingsSection`, lazy, `eval-source-<id>`). The tab names no
 * source: removing one from the registry removes its tab.
 */
function EvalSourceTab({ source }: { source: EvalSource }) {
  const { t } = useTranslation();
  const { id, SettingsSection } = source;
  return (
    <Box data-testid={`eval-source-tab-${id}`} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {t("settings.engine.evalSources.intro")}
      </Typography>
      {SettingsSection !== undefined && (
        <Suspense fallback={null}>
          <SettingsSection testId={`eval-source-${id}`} />
        </Suspense>
      )}
    </Box>
  );
}

export default EvalSourceTab;
