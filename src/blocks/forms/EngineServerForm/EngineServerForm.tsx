import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CircleIcon from "@mui/icons-material/Circle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { InlineAlert, StatusText } from "../../../design-system/components/feedback";
import { SettingsSection, SwitchField, TextInputField } from "../../../design-system/components/forms";
import type { EngineServerOfflineReason } from "../../../lib/engineServer";

/** What is known of the server, as the form shows it. */
export type EngineServerFormStatus =
  | { state: "connecting"; url: string }
  | {
      state: "online";
      url: string;
      /** When it last answered (ms since the epoch). */
      checkedAt: number;
      /** How long that answer took, in ms. */
      latencyMs: number;
    }
  | { state: "offline"; url: string; reason: EngineServerOfflineReason };

/** Connect's answer to its last press. */
export type EngineServerConnectFeedback = "idle" | "checking" | "answered" | "failed";

export type EngineServerFormProps = {
  /** Whether the reader turned the server on. */
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  /** The address field's text, as typed. */
  address: string;
  onAddressChange: (text: string) => void;
  /** Keep the address and check the server — Connect, Enter in the field, or Try again. */
  onConnect: () => void;
  /**
   * What became of the last Connect, on the button itself: `checking` (a
   * spinner), `answered` (a check mark), `failed` (a warning) — then `idle`
   * again. Each press is answered where it was made.
   */
  connectFeedback: EngineServerConnectFeedback;
  /** The text is not an address: the field is marked and says what one looks like, and Connect is off. */
  addressInvalid: boolean;
  /** The address the server listens on unless moved — the field's example. */
  example: string;
  /** What is known of the server; absent while it is off. */
  status?: EngineServerFormStatus;
  /** Under the details while it is on — Settings → Engine puts the server's engines here (an `EnginePicker`). */
  children?: ReactNode;
  /**
   * The section. The switch is `<testId>-enable`, the connection chip
   * `-indicator` (in the live region `-indicator-region`), the field
   * `-address`, the button `-connect` (its feedback in `data-feedback`), the
   * details `-status`, the retry `-retry`.
   */
  testId: string;
};

/** Machine words inside a sentence, isolated left to right — an address read in Hebrew stays an address. */
const ltr = (text: string) => `⁦${text}⁩`;

/** Connect's icon for each answer — none while idle. Beside the words, so `aria-hidden`: the chip announces. */
const CONNECT_ICON: Record<EngineServerConnectFeedback, ReactNode> = {
  idle: undefined,
  checking: <CircularProgress size={16} color="inherit" aria-hidden />,
  answered: <CheckCircleIcon aria-hidden />,
  failed: <ErrorOutlineIcon aria-hidden />,
};

/** The chip's look for each state: the theme's colours, a dot — or, while connecting, a spinner. */
const INDICATOR = {
  connecting: { color: "default", key: "settings.engine.server.indicator.connecting" },
  online: { color: "success", key: "settings.engine.server.indicator.online" },
  offline: { color: "warning", key: "settings.engine.server.indicator.offline" },
} as const;

/**
 * **The engine server on this computer** (Settings → Engine) — the reader's
 * switch for native engines served by `yarn api:start`
 * (`server/engine-api/`, `lib/engineServer.ts`): off by default, and while
 * off the app never contacts it. On, it takes the server's address
 * (`http://127.0.0.1:8800` unless moved) — the field's edits are a draft that
 * Connect (or Enter) keeps and checks. **Every press is answered on the
 * button**: a spinner while the check is out, then a check mark or a warning
 * for a moment (`connectFeedback`, the screen's).
 * Settings → Engine renders it in the right-hand panel.
 *
 * **The connection at a glance** is a chip beside the switch — *Connecting…*,
 * *Connected · 4 ms* (the round trip of the last check, so every check
 * visibly answers), *Not connected* — and the live region: a screen reader
 * hears each change once. Under the field, the details: when it last
 * answered, or what to check and Try again — and then `children`, where the
 * screen lists the server's engines to choose from.
 *
 * Presentational: the address being typed, the status and every change arrive
 * as props. The address is set in an isolate, so an address in a Hebrew
 * sentence reads left to right.
 */
function EngineServerForm({
  enabled,
  onEnabledChange,
  address,
  onAddressChange,
  onConnect,
  connectFeedback,
  addressInvalid,
  example,
  status,
  children,
  testId,
}: EngineServerFormProps) {
  const { t, i18n } = useTranslation();
  const indicator = status === undefined ? undefined : INDICATOR[status.state];

  return (
    <SettingsSection
      title={t("settings.engine.server.title")}
      description={t("settings.engine.server.description")}
      testId={testId}
    >
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <SwitchField
          label={t("settings.engine.server.enable")}
          help={t("settings.engine.server.enableHelp")}
          checked={enabled}
          onChange={onEnabledChange}
          size="medium"
          testId={`${testId}-enable`}
        />
        {enabled && (
          <Box role="status" data-testid={`${testId}-indicator-region`}>
            {status !== undefined && indicator !== undefined && (
              <Chip
                variant="outlined"
                color={indicator.color}
                icon={
                  status.state === "connecting" ? (
                    <CircularProgress size={12} color="inherit" aria-hidden />
                  ) : (
                    <CircleIcon aria-hidden sx={{ fontSize: 12 }} />
                  )
                }
                label={t(indicator.key, status.state === "online" ? { ms: status.latencyMs } : undefined)}
                data-testid={`${testId}-indicator`}
                data-state={status.state}
              />
            )}
          </Box>
        )}
      </Box>
      {enabled && (
        <>
          <Box
            component="form"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              if (!addressInvalid) onConnect();
            }}
            sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 1 }}
          >
            <Box sx={{ flex: "1 1 16rem", minWidth: 0 }}>
              <TextInputField
                label={t("settings.engine.server.address")}
                value={address}
                onChange={onAddressChange}
                dir="ltr"
                placeholder={example}
                error={addressInvalid}
                helperText={t(
                  addressInvalid ? "settings.engine.server.addressInvalid" : "settings.engine.server.addressHelp",
                  { example: ltr(example) },
                )}
                testId={`${testId}-address`}
              />
            </Box>
            <Button
              type="submit"
              variant="outlined"
              disabled={addressInvalid || connectFeedback === "checking"}
              color={connectFeedback === "answered" ? "success" : connectFeedback === "failed" ? "warning" : "primary"}
              startIcon={CONNECT_ICON[connectFeedback]}
              data-testid={`${testId}-connect`}
              data-feedback={connectFeedback}
              sx={{ mt: 1, minHeight: 40 }}
            >
              {t("settings.engine.server.connect")}
            </Button>
          </Box>
          <Box data-testid={`${testId}-status`}>
            {status?.state === "connecting" && (
              <StatusText tone="neutral" testId={`${testId}-connecting`}>
                {t("settings.engine.server.status.connecting", { url: ltr(status.url) })}
              </StatusText>
            )}
            {status?.state === "online" && (
              <StatusText tone="neutral" testId={`${testId}-online`}>
                {t("settings.engine.server.status.checkedAt", {
                  time: ltr(new Date(status.checkedAt).toLocaleTimeString(i18n.language)),
                })}
              </StatusText>
            )}
            {status?.state === "offline" && (
              <InlineAlert
                severity="warning"
                variant="outlined"
                dense
                action={
                  <Button size="small" color="inherit" onClick={onConnect} data-testid={`${testId}-retry`}>
                    {t("settings.engine.server.retry")}
                  </Button>
                }
                testId={`${testId}-offline`}
              >
                {t(`settings.engine.server.status.${status.reason}`, { url: ltr(status.url) })}
              </InlineAlert>
            )}
          </Box>
          {children}
        </>
      )}
    </SettingsSection>
  );
}

export default EngineServerForm;
