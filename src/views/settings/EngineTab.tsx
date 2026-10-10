import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router";

import {
  EngineServerForm,
  EnginePicker,
  type EngineServerConnectFeedback,
  type EngineServerFormStatus,
} from "../../blocks/forms";
import { PanelTabs, tabPanelProps } from "../../design-system/components/tabs";
import {
  DEFAULT_ENGINE_SERVER_URL,
  engineServerStatus,
  normalizeEngineServerUrl,
  readEngineServerUrl,
  storeEngineServerUrl,
  type EngineServerStatus,
} from "../../lib/engineServer";
import { readStoredEngineId } from "../../lib/engineChoice";
import { HOSTED_ENGINE_PREFIX, describeEngines } from "../../lib/engines";
import { useEngineChoice } from "../shared/useEngineChoice";
import { RightPanel } from "../main/rightPanel";
import { useEngineServer } from "../shared/useEngineServer";
import EnginePresetsSection from "./EnginePresetsSection";

/** How long Connect's spinner shows at least — a local server answers in milliseconds, too fast to see. */
const CONNECT_MIN_CHECKING_MS = 400;
/** How long Connect shows its answer (a check mark, a warning) before it is plain again. */
const CONNECT_FEEDBACK_MS = 2000;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** The Blog's guide to the engine server — `articles/guides/local-engine.mdx`. */
export const LOCAL_ENGINE_GUIDE_PATH = "/blog/guides/local-engine";

/** The tab's two inner tabs: the page's own builds, and the engine server's. */
type EngineKindTab = "browser" | "api";

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
 * Two inner tabs say where the engine runs (`PanelTabs`): **Browser** — the
 * page's own builds — and **API** — the engine server on this computer
 * (`EngineServerForm`, `lib/engineServer.ts`, §8 of the engine doc): off by
 * default; turned on, its address is kept and checked, and while it answers
 * its engines are listed under it — a second `EnginePicker` on the same
 * choice. The tab opens on API when the stored choice is a server engine.
 * The address being typed is this screen's until Connect (or Enter) keeps and
 * checks it — and **every press is answered on the button**: a spinner for at
 * least {@link CONNECT_MIN_CHECKING_MS}, then a check mark or a warning for
 * {@link CONNECT_FEEDBACK_MS}.
 *
 * Under both, **the chosen engine's options, kept in presets**
 * (`EnginePresetsSection`, CTA-179): every option it declares, editable in
 * the preset it runs, the boards' own read-only.
 *
 * The right-hand panel shows **what the chosen server engine declared** — its
 * UCI options and defaults as the server sent them (`EngineOptionsTable`) —
 * or, on the API tab with none chosen, a pointer to **the Blog's guide** to
 * adding one, and on the Browser tab where to look.
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

  // Which inner tab: the API's while the stored choice is an engine-server engine (it is where that engine is listed).
  const [kind, setKind] = useState<EngineKindTab>(() =>
    readStoredEngineId()?.startsWith(HOSTED_ENGINE_PREFIX) ? "api" : "browser",
  );
  // The chosen engine-server engine's own description, as the server sent it — the panel's table.
  const chosenOnServer =
    status.state === "online"
      ? status.engines.find((engine) => `${HOSTED_ENGINE_PREFIX}${engine.id}` === engineId)
      : undefined;

  return (
    <>
      <Box data-testid="engine-tab" sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {t("settings.engine.intro")}
        </Typography>
        <PanelTabs
          tabs={[
            { id: "browser", label: t("settings.engine.tabs.browser") },
            { id: "api", label: t("settings.engine.tabs.api") },
          ]}
          value={kind}
          onChange={(id) => setKind(id as EngineKindTab)}
          fullWidth={false}
          ariaLabel={t("settings.engine.tabs.label")}
          idPrefix="engine-kind"
          testId="engine-kind"
        />
        {kind === "browser" && (
          <Box {...tabPanelProps("engine-kind", "browser")} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <EnginePicker entries={builtIn} value={engineId} onChange={setEngineId} testId="engine-picker" />
            <Typography variant="caption" color="text.secondary">
              {t("settings.engine.note")}
            </Typography>
          </Box>
        )}
        {kind === "api" && (
          <Box {...tabPanelProps("engine-kind", "api")}>
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
          </Box>
        )}
      </Box>

      <RightPanel>
        {/* The shell's aside does not scroll: this column is the panel's one scrolling region. */}
        <Box
          data-testid="engine-panel"
          sx={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}
        >
          {chosenOnServer === undefined && kind === "api" && (
            <Box sx={{ display: "grid", gap: 1 }} data-testid="engine-setup">
              <Typography variant="subtitle2" component="h2">
                {t("settings.engine.setup.title")}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {t("settings.engine.setup.intro")}{" "}
                <Link component={RouterLink} to={LOCAL_ENGINE_GUIDE_PATH} underline="hover" data-testid="engine-setup-guide">
                  {t("settings.engine.setup.guide")}
                </Link>
              </Typography>
            </Box>
          )}
          {/* The chosen engine's options in its preset (CTA-179) — whichever inner tab it was chosen on. */}
          <EnginePresetsSection engineId={engineId} />
          {chosenOnServer !== undefined && (
            <Typography variant="caption" sx={{ color: "text.secondary" }} data-testid="engine-uci-note">
              {t("settings.engine.uci.note", { maxDepth: chosenOnServer.maxDepth })}
            </Typography>
          )}
        </Box>
      </RightPanel>
    </>
  );
}

export default EngineTab;
