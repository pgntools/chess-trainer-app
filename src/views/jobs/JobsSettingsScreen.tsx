import { useSyncExternalStore } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router";

import { JobsSettingsForm } from "../../../blocks/forms";
import { selectedPresetOf } from "../../../lib/enginePresets";
import {
  enginePresetSelectionsSnapshot,
  enginePresetsSnapshot,
  subscribeEnginePresetSelections,
  subscribeEnginePresets,
} from "../../../lib/enginePresetStore";
import { describeEngines, resolveEngine } from "../../../lib/engines";
import { EVAL_SOURCES } from "../../../lib/evalSources";
import { storeJobsDefaultPreset } from "../../../lib/jobsSettings";
import { useEngineChoice } from "../../shared/useEngineChoice";
import { useSelectedEnginePreset } from "../../shared/useSelectedEnginePreset";
import { defaultPresetInEffect, useJobsSettings } from "./useJobsSettings";

/**
 * Settings → Engine — where the eval sources a job asks first are set, for
 * the whole app (CTA-196): on the first source's own tab, where one has one.
 */
const firstSourceTab = EVAL_SOURCES.find((source) => source.SettingsSection !== undefined);
const ENGINE_SETTINGS_PATH =
  firstSourceTab === undefined ? "/settings/engine" : `/settings/engine?source=${encodeURIComponent(firstSourceTab.id)}`;

/**
 * **The Jobs settings** (CTA-193) — the Jobs V2 view's Settings tab
 * (`/analysis/jobs?tab=settings`), the `JobsSettingsForm` block over
 * `lib/jobsSettings.ts`: **the default engine and preset for new jobs** —
 * turned on from the board's engine and its selected preset; a stored pair
 * whose engine or preset is gone shows off (and New Job V2 starts as before).
 *
 * The lichess evaluation API left this tab in CTA-196 — it is the app's,
 * every analysis search asks it, and it is set in Settings → Engine; the tab
 * says so and links there.
 */
function JobsSettingsTab() {
  const { t } = useTranslation();
  const settings = useJobsSettings();
  const presets = useSyncExternalStore(subscribeEnginePresets, enginePresetsSnapshot, enginePresetsSnapshot);
  const selections = useSyncExternalStore(subscribeEnginePresetSelections, enginePresetSelectionsSnapshot, enginePresetSelectionsSnapshot);
  const { engineId: chosenEngine } = useEngineChoice();
  const boardEngine = resolveEngine(chosenEngine).id;
  const defaultPreset = defaultPresetInEffect(settings, presets);
  // Every preset named as the Engine menu names it — the library is shared, so the engine read does not matter.
  const named = useSelectedEnginePreset(boardEngine);

  return (
    <Box data-testid="analysis-v2-jobs-settings" sx={{ display: "grid", gap: 2, pt: 1 }}>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {t("analysisV2.jobs.settings.intro")}
      </Typography>
      <JobsSettingsForm
        defaultPreset={defaultPreset}
        onDefaultPresetChange={storeJobsDefaultPreset}
        initialDefault={{ engineId: boardEngine, presetId: selectedPresetOf(presets ?? [], selections ?? [], boardEngine).id }}
        engines={describeEngines()}
        presets={named.presets}
        evalSourcesLink={{ component: RouterLink, to: ENGINE_SETTINGS_PATH }}
        testId="analysis-v2-jobs-settings-form"
      />
    </Box>
  );
}

export default JobsSettingsTab;
