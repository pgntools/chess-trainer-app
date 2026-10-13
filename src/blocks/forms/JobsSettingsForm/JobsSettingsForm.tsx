import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";

import { StatusText } from "../../../design-system/components/feedback";
import { CheckboxField, SelectField, SettingsSection, SwitchField } from "../../../design-system/components/forms";
import type { EngineEntry } from "../../../lib/engines";
import type { JobsDefaultPreset } from "../../../lib/jobsSettings";
import { engineSelectOptions } from "../EnginePicker";
import { EngineServerForm, type EngineServerFormProps } from "../EngineServerForm";

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
  /** The lichess evaluation API's switch, address and Connect — `EngineServerForm`'s, its words the API's. */
  evalApi: Omit<EngineServerFormProps, "localeKey" | "testId" | "children">;
  /**
   * **Sending the engine's evals to the API** (its write mode, `POST /evals`)
   * — a checkbox under the API's details while it is on. `writable`: what
   * the API's last check said of its write mode — `false` says it will refuse
   * them; absent while unknown.
   */
  evalApiWrite: { checked: boolean; onChange: (checked: boolean) => void; writable?: boolean };
  /**
   * The root. The default's section is `<testId>-default` (its switch
   * `-default-enable`, the selects `-default-engine` and `-default-preset`);
   * the API's `<testId>-eval-api`, with `EngineServerForm`'s parts under it,
   * the write checkbox `-eval-api-write` and its warning `-eval-api-not-writable`.
   */
  testId: string;
};

/**
 * **The Jobs settings** (CTA-193), on the Jobs V2 view's Settings tab — two
 * sections:
 *
 * - **New jobs**: a switch, *Use a default engine and preset*; off, a new
 *   job starts with the board's engine and its selected preset (as before);
 *   on, with the engine and the preset picked under it.
 * - **The lichess evaluation API** (`EngineServerForm` with the API's words):
 *   off by default — while off the app never contacts it; on, its address,
 *   Connect (`GET /health`) and the connection chip. A job then asks it about
 *   each position before the engine; with **Send the engine's evaluations
 *   to the API** ticked, it sends what the engine found (said when the
 *   API's check says it is not in write mode).
 *
 * Presentational: the settings, the engines, the presets and every change
 * arrive as props.
 */
function JobsSettingsForm({
  defaultPreset,
  onDefaultPresetChange,
  initialDefault,
  engines,
  presets,
  evalApi,
  evalApiWrite,
  testId,
}: JobsSettingsFormProps) {
  const { t } = useTranslation();

  return (
    <Box data-testid={testId} sx={{ display: "grid", gap: 2 }}>
      <SettingsSection
        title={t("analysisV2.jobs.settings.default.title")}
        description={t("analysisV2.jobs.settings.default.description")}
        testId={`${testId}-default`}
      >
        <SwitchField
          label={t("analysisV2.jobs.settings.default.enable")}
          help={t("analysisV2.jobs.settings.default.enableHelp")}
          checked={defaultPreset !== null}
          onChange={(on) => onDefaultPresetChange(on ? initialDefault : null)}
          size="medium"
          testId={`${testId}-default-enable`}
        />
        {defaultPreset !== null && (
          <>
            <SelectField
              label={t("analysisV2.jobs.settings.default.engine")}
              value={defaultPreset.engineId}
              onChange={(engineId) => onDefaultPresetChange({ ...defaultPreset, engineId })}
              options={engineSelectOptions(engines, t)}
              fullWidth
              testId={`${testId}-default-engine`}
            />
            <SelectField
              label={t("analysisV2.jobs.settings.default.preset")}
              value={defaultPreset.presetId}
              onChange={(presetId) => onDefaultPresetChange({ ...defaultPreset, presetId })}
              options={presets.map((preset) => ({ value: preset.id, label: <bdi>{preset.name}</bdi> }))}
              fullWidth
              testId={`${testId}-default-preset`}
            />
          </>
        )}
      </SettingsSection>
      <EngineServerForm {...evalApi} localeKey="analysisV2.jobs.settings.evalApi" testId={`${testId}-eval-api`}>
        <CheckboxField
          label={t("analysisV2.jobs.settings.write.label")}
          help={t("analysisV2.jobs.settings.write.help")}
          checked={evalApiWrite.checked}
          onChange={evalApiWrite.onChange}
          testId={`${testId}-eval-api-write`}
        />
        {evalApiWrite.checked && evalApiWrite.writable === false && (
          <StatusText tone="warning" testId={`${testId}-eval-api-not-writable`}>
            {t("analysisV2.jobs.settings.write.notWritable", { url: `⁦${evalApi.status?.url ?? evalApi.address}⁩` })}
          </StatusText>
        )}
      </EngineServerForm>
    </Box>
  );
}

export default JobsSettingsForm;
