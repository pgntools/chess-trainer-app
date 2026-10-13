import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { JobsSettingsForm, type EngineServerConnectFeedback, type EngineServerFormStatus } from "../../../blocks/forms";
import { normalizeEngineServerUrl } from "../../../lib/engineServer";
import { selectedPresetOf } from "../../../lib/enginePresets";
import {
  enginePresetSelectionsSnapshot,
  enginePresetsSnapshot,
  subscribeEnginePresetSelections,
  subscribeEnginePresets,
} from "../../../lib/enginePresetStore";
import { describeEngines, resolveEngine } from "../../../lib/engines";
import {
  DEFAULT_LICHESS_EVAL_API_URL,
  lichessEvalApiStatus,
  storeJobsDefaultPreset,
  storeLichessEvalApi,
  storeLichessEvalApiWrite,
  type LichessEvalApiStatus,
} from "../../../lib/jobsSettings";
import { useEngineChoice } from "../../shared/useEngineChoice";
import { useSelectedEnginePreset } from "../../shared/useSelectedEnginePreset";
import { defaultPresetInEffect, useJobsSettings, useLichessEvalApiStatus } from "./useJobsSettings";

/** How long Connect's spinner shows at least — an API on the network answers in milliseconds, too fast to see. */
const CONNECT_MIN_CHECKING_MS = 400;
/** How long Connect shows its answer (a check mark, a warning) before it is plain again. */
const CONNECT_FEEDBACK_MS = 2000;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** The API's status as the form shows it — nothing while it is off. */
const formStatusOf = (status: LichessEvalApiStatus): EngineServerFormStatus | undefined => {
  switch (status.state) {
    case "off":
      return undefined;
    case "online":
      return { state: "online", url: status.url, checkedAt: status.checkedAt, latencyMs: status.latencyMs };
    default:
      return status;
  }
};

/**
 * **The Jobs settings** (CTA-193) — the Jobs V2 view's Settings tab
 * (`/analysis/jobs?tab=settings`), the `JobsSettingsForm` block over
 * `lib/jobsSettings.ts`:
 *
 * - **the default engine and preset for new jobs** — turned on from the
 *   board's engine and its selected preset; a stored pair whose engine or
 *   preset is gone shows off (and New Job V2 starts as before);
 * - **the lichess evaluation API** — off by default; on, its address, kept
 *   and checked by Connect (or Enter), each press answered on the button as
 *   Settings → Engine's engine server is (a spinner for at least
 *   {@link CONNECT_MIN_CHECKING_MS}, then a check mark or a warning); and,
 *   under it, whether a job sends the engine's evals there — said when its
 *   last check found it not in write mode.
 */
function JobsSettingsTab() {
  const { t } = useTranslation();
  const settings = useJobsSettings();
  const status = useLichessEvalApiStatus();
  const presets = useSyncExternalStore(subscribeEnginePresets, enginePresetsSnapshot, enginePresetsSnapshot);
  const selections = useSyncExternalStore(subscribeEnginePresetSelections, enginePresetSelectionsSnapshot, enginePresetSelectionsSnapshot);
  const { engineId: chosenEngine } = useEngineChoice();
  const boardEngine = resolveEngine(chosenEngine).id;
  const defaultPreset = defaultPresetInEffect(settings, presets);
  // Every preset named as the Engine menu names it — the library is shared, so the engine read does not matter.
  const named = useSelectedEnginePreset(boardEngine);

  const [address, setAddress] = useState(settings.evalApi.url);
  const addressUrl = normalizeEngineServerUrl(address);
  const [connectFeedback, setConnectFeedback] = useState<EngineServerConnectFeedback>("idle");
  // The press being answered: a newer one takes the button over, and an unmounted tab answers none.
  const press = useRef(0);
  useEffect(
    () => () => {
      press.current = -1;
    },
    [],
  );
  const connect = async () => {
    if (addressUrl === null) return;
    const mine = ++press.current;
    setAddress(addressUrl);
    setConnectFeedback("checking");
    await Promise.all([storeLichessEvalApi(true, addressUrl), wait(CONNECT_MIN_CHECKING_MS)]);
    if (press.current !== mine) return;
    setConnectFeedback(lichessEvalApiStatus().state === "online" ? "answered" : "failed");
    await wait(CONNECT_FEEDBACK_MS);
    if (press.current === mine) setConnectFeedback("idle");
  };

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
        evalApi={{
          enabled: settings.evalApi.enabled,
          onEnabledChange: (enabled) => void storeLichessEvalApi(enabled, addressUrl ?? undefined),
          address,
          onAddressChange: setAddress,
          onConnect: () => void connect(),
          connectFeedback,
          addressInvalid: addressUrl === null,
          example: DEFAULT_LICHESS_EVAL_API_URL,
          status: formStatusOf(status),
        }}
        evalApiWrite={{
          checked: settings.evalApi.write,
          onChange: storeLichessEvalApiWrite,
          writable: status.state === "online" ? status.writeEnabled : undefined,
        }}
        testId="analysis-v2-jobs-settings-form"
      />
    </Box>
  );
}

export default JobsSettingsTab;
