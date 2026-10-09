import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  EngineServerForm,
  EnginePicker,
  type EngineServerConnectFeedback,
  type EngineServerFormStatus,
} from "../../blocks/forms";
import {
  DEFAULT_ENGINE_SERVER_URL,
  engineServerStatus,
  normalizeEngineServerUrl,
  readEngineServerUrl,
  storeEngineServerUrl,
  type EngineServerStatus,
} from "../../lib/engineServer";
import { describeEngines } from "../../lib/engines";
import { useEngineChoice } from "../shared/useEngineChoice";
import { RightPanel } from "../main/rightPanel";
import { useEngineServer } from "../shared/useEngineServer";

/** How long Connect's spinner shows at least — a local server answers in milliseconds, too fast to see. */
export const CONNECT_MIN_CHECKING_MS = 400;
/** How long Connect shows its answer (a check mark, a warning) before it is plain again. */
export const CONNECT_FEEDBACK_MS = 2000;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** The server's status as the form shows it — absent while it is off. */
const formStatusOf = (status: EngineServerStatus): EngineServerFormStatus | undefined => {
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
 * **Settings → Engine** (`/settings/engine`, CTA-153): the reader picks which
 * engine every board runs, from the registry (`lib/engines/`,
 * [`docs/engine.md`](../../../docs/engine.md)). The list is the `EnginePicker`
 * block over the registry's entries — each with whether **this page** can run
 * it, read now (`crossOriginIsolated`), so an engine the host cannot run is
 * listed disabled with its reason. A choice applies at once and is a
 * preference (`localStorage`, `lib/engineChoice.ts`), not part of the export.
 *
 * In the right-hand panel, **the engine server on this computer**
 * (`EngineServerForm`, `lib/engineServer.ts`, §8 of the engine doc): off by
 * default; turned on, its address is kept and checked, and while it answers
 * its engines are listed there — a second `EnginePicker` on the same choice,
 * so a reader picks a browser build in the tab or a server engine in the panel.
 * The address being typed is this screen's until Connect (or Enter) keeps and
 * checks it — and **every press is answered on the button**: a spinner for at
 * least {@link CONNECT_MIN_CHECKING_MS}, then a check mark or a warning for
 * {@link CONNECT_FEEDBACK_MS}.
 */
function EngineTab() {
  const { t } = useTranslation();
  const { engineId, setEngineId } = useEngineChoice();
  const status = useEngineServer();
  // Read again on every render: each change of it is a change of the status, which renders this.
  const storedUrl = readEngineServerUrl();
  const [address, setAddress] = useState(() => storedUrl ?? DEFAULT_ENGINE_SERVER_URL);
  const addressUrl = normalizeEngineServerUrl(address);
  // Under the server's status, so the lists follow it: the page's builds in the tab, the server's in the panel.
  const entries = describeEngines();
  const builtIn = entries.filter((entry) => entry.descriptor.server === undefined);
  const onServer = entries.filter((entry) => entry.descriptor.server !== undefined);

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
    await Promise.all([storeEngineServerUrl(addressUrl), wait(CONNECT_MIN_CHECKING_MS)]);
    if (press.current !== mine) return;
    setConnectFeedback(engineServerStatus().state === "online" ? "answered" : "failed");
    await wait(CONNECT_FEEDBACK_MS);
    if (press.current === mine) setConnectFeedback("idle");
  };

  return (
    <>
      <Box data-testid="engine-tab" sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {t("settings.engine.intro")}
        </Typography>
        <EnginePicker entries={builtIn} value={engineId} onChange={setEngineId} testId="engine-picker" />
        <Typography variant="caption" color="text.secondary">
          {t("settings.engine.note")}
        </Typography>
      </Box>

      <RightPanel>
        <EngineServerForm
          enabled={storedUrl !== undefined}
          onEnabledChange={(enabled) =>
            storeEngineServerUrl(enabled ? (addressUrl ?? DEFAULT_ENGINE_SERVER_URL) : undefined)
          }
          address={address}
          onAddressChange={setAddress}
          onConnect={() => void connect()}
          connectFeedback={connectFeedback}
          addressInvalid={addressUrl === null}
          example={DEFAULT_ENGINE_SERVER_URL}
          status={formStatusOf(status)}
          testId="engine-server"
        >
          {onServer.length > 0 && (
            <EnginePicker
              entries={onServer}
              value={engineId}
              onChange={setEngineId}
              legend={t("settings.engine.server.engines")}
              testId="engine-server-picker"
            />
          )}
        </EngineServerForm>
      </RightPanel>
    </>
  );
}

export default EngineTab;
