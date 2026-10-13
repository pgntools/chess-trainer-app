import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { StatusText } from "../../../design-system/components/feedback";
import { CheckboxField, SelectField, SettingsSection, SwitchField } from "../../../design-system/components/forms";
import type { EngineEntry } from "../../../lib/engines";
import type { JobsDefaultPreset } from "../../../lib/jobsSettings";
import { engineSelectOptions } from "../EnginePicker";
import { EngineServerForm, type EngineServerConnectFeedback, type EngineServerFormProps } from "../EngineServerForm";

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
   * **The evaluations Write API** (the API's write mode, `POST /evals`) — a
   * checkbox under the API's details while it is on, and while ticked **Test
   * connection**: `onTest` checks `GET /health`'s `write_enabled`, its answer
   * on the button (`testFeedback`, as Connect's). `writable`: what the API's
   * last check said of its write mode — `true` said in words, `false` a
   * warning that it will refuse them; absent while unknown.
   */
  evalApiWrite: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    writable?: boolean;
    onTest: () => void;
    testFeedback: EngineServerConnectFeedback;
  };
  /**
   * The root. The default's section is `<testId>-default` (its switch
   * `-default-enable`, the selects `-default-engine` and `-default-preset`);
   * the API's `<testId>-eval-api`, with `EngineServerForm`'s parts under it,
   * the write checkbox `-eval-api-write`, its Test connection
   * `-eval-api-write-test` (its feedback in `data-feedback`), and what the
   * check said, `-eval-api-writable` or `-eval-api-not-writable`.
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
 *   each position before the engine; with **Enable evaluations Write API**
 *   ticked, it sends what the engine found — and **Test connection** checks
 *   that the API is in write mode (`write_enabled`), saying so either way.
 *
 * Presentational: the settings, the engines, the presets and every change
 * arrive as props.
 */
/** Test connection's icon for each answer — none while idle. Beside the words below it, so `aria-hidden`. */
const TEST_ICON: Record<EngineServerConnectFeedback, ReactNode> = {
  idle: undefined,
  checking: <CircularProgress size={16} color="inherit" aria-hidden />,
  answered: <CheckCircleIcon aria-hidden />,
  failed: <ErrorOutlineIcon aria-hidden />,
};

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
        {evalApiWrite.checked && (
          <Box sx={{ display: "grid", justifyItems: "start", gap: 1 }}>
            <Button
              variant="outlined"
              onClick={evalApiWrite.onTest}
              disabled={evalApi.addressInvalid || evalApiWrite.testFeedback === "checking"}
              color={evalApiWrite.testFeedback === "answered" ? "success" : evalApiWrite.testFeedback === "failed" ? "warning" : "primary"}
              startIcon={TEST_ICON[evalApiWrite.testFeedback]}
              data-testid={`${testId}-eval-api-write-test`}
              data-feedback={evalApiWrite.testFeedback}
              sx={{ minHeight: 40 }}
            >
              {t("analysisV2.jobs.settings.write.test")}
            </Button>
            {evalApiWrite.writable === true && (
              <StatusText tone="success" testId={`${testId}-eval-api-writable`}>
                {t("analysisV2.jobs.settings.write.writable", { url: `⁦${evalApi.status?.url ?? evalApi.address}⁩` })}
              </StatusText>
            )}
            {evalApiWrite.writable === false && (
              <StatusText tone="warning" testId={`${testId}-eval-api-not-writable`}>
                {t("analysisV2.jobs.settings.write.notWritable", { url: `⁦${evalApi.status?.url ?? evalApi.address}⁩` })}
              </StatusText>
            )}
          </Box>
        )}
      </EngineServerForm>
    </Box>
  );
}

export default JobsSettingsForm;
