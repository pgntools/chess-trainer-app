import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { EngineServerForm, type EngineServerConnectFeedback, type EngineServerFormStatus } from "../../../blocks/forms";
import { StatusText } from "../../../design-system/components/feedback";
import { CheckboxField } from "../../../design-system/components/forms";
import { normalizeEngineServerUrl } from "../../engineServer";
import {
  DEFAULT_LICHESS_EVAL_API_SETTINGS,
  DEFAULT_LICHESS_EVAL_API_URL,
  ensureLichessEvalApiChecked,
  lichessEvalApiStatus,
  readLichessEvalApiSettings,
  storeLichessEvalApi,
  storeLichessEvalApiWrite,
  subscribeLichessEvalApi,
  type LichessEvalApiStatus,
} from "./settings";

/** How long Connect's spinner shows at least — an API on the network answers in milliseconds, too fast to see. */
const CONNECT_MIN_CHECKING_MS = 400;
/** How long Connect shows its answer (a check mark, a warning) before it is plain again. */
const CONNECT_FEEDBACK_MS = 2000;
/** The catalog block of its words — `EngineServerForm`'s keys (its `localeKey`), and `write.*`. */
const WORDS = "evalSources.lichess";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const OFF: LichessEvalApiStatus = { state: "off" };

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

/** Test connection's icon for each answer — none while idle. Beside the words below it, so `aria-hidden`. */
const TEST_ICON: Record<EngineServerConnectFeedback, ReactNode> = {
  idle: undefined,
  checking: <CircularProgress size={16} color="inherit" aria-hidden />,
  answered: <CheckCircleIcon aria-hidden />,
  failed: <ErrorOutlineIcon aria-hidden />,
};

/**
 * **The lichess evaluation API in Settings → Engine** (CTA-193; moved here
 * from the Jobs settings and made the app's in CTA-196) — the eval source's
 * own section, rendered from the registry
 * (`views/settings/EvalSourcesSettings.tsx`) over `settings.ts`:
 *
 * - **the API** — `EngineServerForm` with its words: off by default, and
 *   while off the app never contacts it; on, its address, kept and checked by
 *   Connect (or Enter), each press answered on the button as the engine
 *   server's is (a spinner for at least {@link CONNECT_MIN_CHECKING_MS}, then
 *   a check mark or a warning), the connection chip and the reason;
 * - **Enable evaluations Write API** under it — whether every engine search
 *   that finished at its target depth is sent there — and, while ticked,
 *   **Test connection**, which checks `GET /health` again and answers on its
 *   button whether the API is in write mode (`write_enabled`), saying so in
 *   words under it.
 *
 * The section is `testId`; `EngineServerForm`'s parts under it, the write
 * checkbox `-write`, its Test connection `-write-test` (its feedback in
 * `data-feedback`), and what the check said, `-writable` or `-not-writable`.
 */
function LichessEvalApiSection({ testId }: { testId: string }) {
  const { t } = useTranslation();
  const settings = useSyncExternalStore(
    subscribeLichessEvalApi,
    readLichessEvalApiSettings,
    () => DEFAULT_LICHESS_EVAL_API_SETTINGS,
  );
  const status = useSyncExternalStore(subscribeLichessEvalApi, lichessEvalApiStatus, () => OFF);
  // The first check, where the reader turned it on.
  useEffect(ensureLichessEvalApiChecked, []);

  const [address, setAddress] = useState(settings.url);
  const addressUrl = normalizeEngineServerUrl(address);
  const [connectFeedback, setConnectFeedback] = useState<EngineServerConnectFeedback>("idle");
  const [testFeedback, setTestFeedback] = useState<EngineServerConnectFeedback>("idle");
  // The press being answered, per button: a newer one takes the button over, and an unmounted section answers none.
  const connectPress = useRef(0);
  const testPress = useRef(0);
  useEffect(
    () => () => {
      connectPress.current = -1;
      testPress.current = -1;
    },
    [],
  );
  /**
   * Keep the address in the field and check the API (`GET /health`), the
   * answer on the button pressed: Connect's when it answers at all, Test
   * connection's when it answers in write mode (`write_enabled`).
   */
  const check = async (
    press: { current: number },
    setFeedback: (feedback: EngineServerConnectFeedback) => void,
    succeeded: (status: LichessEvalApiStatus) => boolean,
  ) => {
    if (addressUrl === null) return;
    const mine = ++press.current;
    setAddress(addressUrl);
    setFeedback("checking");
    await Promise.all([storeLichessEvalApi(true, addressUrl), wait(CONNECT_MIN_CHECKING_MS)]);
    if (press.current !== mine) return;
    setFeedback(succeeded(lichessEvalApiStatus()) ? "answered" : "failed");
    await wait(CONNECT_FEEDBACK_MS);
    if (press.current === mine) setFeedback("idle");
  };
  const connect = () => check(connectPress, setConnectFeedback, (checked) => checked.state === "online");
  const testWrite = () => check(testPress, setTestFeedback, (checked) => checked.state === "online" && checked.writeEnabled);

  const writable = status.state === "online" ? status.writeEnabled : undefined;
  const shownUrl = `⁦${(status.state === "off" ? undefined : status.url) ?? address}⁩`;

  return (
    <EngineServerForm
      enabled={settings.enabled}
      onEnabledChange={(enabled) => void storeLichessEvalApi(enabled, addressUrl ?? undefined)}
      address={address}
      onAddressChange={setAddress}
      onConnect={() => void connect()}
      connectFeedback={connectFeedback}
      addressInvalid={addressUrl === null}
      example={DEFAULT_LICHESS_EVAL_API_URL}
      status={formStatusOf(status)}
      localeKey={WORDS}
      testId={testId}
    >
      <CheckboxField
        label={t(`${WORDS}.write.label`)}
        help={t(`${WORDS}.write.help`)}
        checked={settings.write}
        onChange={storeLichessEvalApiWrite}
        testId={`${testId}-write`}
      />
      {settings.write && (
        <Box sx={{ display: "grid", justifyItems: "start", gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => void testWrite()}
            disabled={addressUrl === null || testFeedback === "checking"}
            color={testFeedback === "answered" ? "success" : testFeedback === "failed" ? "warning" : "primary"}
            startIcon={TEST_ICON[testFeedback]}
            data-testid={`${testId}-write-test`}
            data-feedback={testFeedback}
            sx={{ minHeight: 40 }}
          >
            {t(`${WORDS}.write.test`)}
          </Button>
          {writable === true && (
            <StatusText tone="success" testId={`${testId}-writable`}>
              {t(`${WORDS}.write.writable`, { url: shownUrl })}
            </StatusText>
          )}
          {writable === false && (
            <StatusText tone="warning" testId={`${testId}-not-writable`}>
              {t(`${WORDS}.write.notWritable`, { url: shownUrl })}
            </StatusText>
          )}
        </Box>
      )}
    </EngineServerForm>
  );
}

export default LichessEvalApiSection;
