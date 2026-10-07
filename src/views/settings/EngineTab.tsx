import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { EnginePicker } from "../../blocks/forms";
import { describeEngines } from "../../lib/engines";
import { useEngineChoice } from "../shared/useEngineChoice";

/**
 * **Settings → Engine** (`/settings/engine`, CTA-153): the reader picks which
 * engine every board runs, from the registry (`lib/engines/`,
 * [`docs/engine.md`](../../../docs/engine.md)). The list is the `EnginePicker`
 * block over the registry's entries — each with whether **this page** can run
 * it, read now (`crossOriginIsolated`), so an engine the host cannot run is
 * listed disabled with its reason. A choice applies at once and is a
 * preference (`localStorage`, `lib/engineChoice.ts`), not part of the export.
 */
function EngineTab() {
  const { t } = useTranslation();
  const { engineId, setEngineId } = useEngineChoice();
  const entries = describeEngines();

  return (
    <Box data-testid="engine-tab" sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
      <Typography variant="body2" color="text.secondary">
        {t("settings.engine.intro")}
      </Typography>
      <EnginePicker entries={entries} value={engineId} onChange={setEngineId} testId="engine-picker" />
      <Typography variant="caption" color="text.secondary">
        {t("settings.engine.note")}
      </Typography>
    </Box>
  );
}

export default EngineTab;
