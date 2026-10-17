import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { SelectField, SettingsSection, SwitchField } from "../../../design-system/components/forms";
import { linkProps, type LinkTarget } from "../../../design-system/components/link";
import type { EngineEntry } from "../../../lib/engines";
import type { JobsDefaultPreset } from "../../../lib/jobsSettings";
import { engineSelectOptions } from "../EnginePicker";

export type JobsSettingsFormProps = {
  /** The engine and preset new jobs start with — `null`: the board's engine and its selected preset. */
  defaultPreset: JobsDefaultPreset | null;
  onDefaultPresetChange: (next: JobsDefaultPreset | null) => void;
  /** The pair the switch starts from when it is turned on — the board's engine and its preset now. */
  initialDefault: JobsDefaultPreset;
  /** The engines to choose from (`describeEngines()`). */
  engines: readonly EngineEntry[];
  /** Every preset, named in the reader's language — the library is shared, so any fits any engine. */
  presets: readonly { id: string; name: string }[];
  /**
   * **Settings → Engine**, where the eval sources a job asks first (the
   * lichess evaluation API) are set for the whole app since CTA-196.
   */
  evalSourcesLink: LinkTarget;
  /**
   * The root. The default's section is `<testId>-default` (its switch
   * `-default-enable`, the selects `-default-engine` and `-default-preset`);
   * the eval sources' pointer `<testId>-eval-sources`, its link
   * `-eval-sources-link`.
   */
  testId: string;
};

/**
 * **The Jobs settings** (CTA-193), on the Jobs settings page (`/jobs/settings`, CTA-221):
 *
 * - **New jobs**: a switch, *Use a default engine and preset*; off, a new
 *   job starts with the board's engine and its selected preset (as before);
 *   on, with the engine and the preset picked under it.
 * - **Evaluation sources**: where a job looks a position up before its
 *   engine searches it — the lichess evaluation API, the app's since CTA-196
 *   — said, with a link to Settings → Engine, where it is set.
 *
 * Presentational: the settings, the engines, the presets, the link and every
 * change arrive as props.
 */
function JobsSettingsForm({
  defaultPreset,
  onDefaultPresetChange,
  initialDefault,
  engines,
  presets,
  evalSourcesLink,
  testId,
}: JobsSettingsFormProps) {
  const { t } = useTranslation();

  return (
    <Box data-testid={testId} sx={{ display: "grid", gap: 2 }}>
      <SettingsSection
        title={t("jobs.settings.default.title")}
        description={t("jobs.settings.default.description")}
        testId={`${testId}-default`}
      >
        <SwitchField
          label={t("jobs.settings.default.enable")}
          help={t("jobs.settings.default.enableHelp")}
          checked={defaultPreset !== null}
          onChange={(on) => onDefaultPresetChange(on ? initialDefault : null)}
          size="medium"
          testId={`${testId}-default-enable`}
        />
        {defaultPreset !== null && (
          <>
            <SelectField
              label={t("jobs.settings.default.engine")}
              value={defaultPreset.engineId}
              onChange={(engineId) => onDefaultPresetChange({ ...defaultPreset, engineId })}
              options={engineSelectOptions(engines, t)}
              fullWidth
              testId={`${testId}-default-engine`}
            />
            <SelectField
              label={t("jobs.settings.default.preset")}
              value={defaultPreset.presetId}
              onChange={(presetId) => onDefaultPresetChange({ ...defaultPreset, presetId })}
              options={presets.map((preset) => ({ value: preset.id, label: <bdi>{preset.name}</bdi> }))}
              fullWidth
              testId={`${testId}-default-preset`}
            />
          </>
        )}
      </SettingsSection>
      <SettingsSection title={t("jobs.settings.evalSources.title")} testId={`${testId}-eval-sources`}>
        {/* A link in a sentence: the theme's underline, never "hover" — colour alone fails high-contrast (axe's link-in-text-block). */}
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("jobs.settings.evalSources.description")}{" "}
          <Link data-testid={`${testId}-eval-sources-link`} {...linkProps(evalSourcesLink)}>
            {t("jobs.settings.evalSources.link")}
          </Link>
        </Typography>
      </SettingsSection>
    </Box>
  );
}

export default JobsSettingsForm;
