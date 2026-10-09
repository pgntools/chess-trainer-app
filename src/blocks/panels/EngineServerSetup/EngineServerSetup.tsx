import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { CopyField } from "../../../design-system/components/forms";
import { linkProps, type LinkTarget } from "../../../design-system/components/link";

export type EngineServerSetupProps = {
  /** The server's address unless moved (`http://127.0.0.1:8800`) — what step four names. */
  example: string;
  /** The whole guide (the Blog's *Guides → Run a chess engine on your own computer*) — linked under the intro. */
  guide: LinkTarget;
  /**
   * The panel's test id; the steps are `<testId>-step-<n>`, the copy fields
   * `-config-command`, `-config`, `-start`, the guide's link `-guide`.
   */
  testId: string;
};

/** The command that makes the server's config from its example — run from the app's source. */
export const ENGINE_SERVER_CONFIG_COMMAND =
  "cp server/engine-api/engines.example.json server/engine-api/engines.local.json";

/** What goes in `engines.local.json` — an id the app keeps, and the binary's path. */
export const ENGINE_SERVER_CONFIG_SAMPLE = `{
  "engines": [
    { "id": "stockfish-18", "path": "/path/to/stockfish-18" },
    { "id": "stockfish-19", "path": "/path/to/stockfish-19" }
  ]
}`;

/** The command that starts it. */
export const ENGINE_SERVER_START_COMMAND = "yarn api:start";

/** Machine words inside a sentence, isolated left to right — an address read in Hebrew stays an address. */
const ltr = (text: string) => `⁦${text}⁩`;

/**
 * **How to add an engine on this computer** (Settings → Engine's right-hand
 * panel, on the API tab while no server engine is chosen): the engine server
 * (`server/engine-api/`, `yarn api:start`) in five numbered steps — get a UCI
 * engine, make `engines.local.json` from its example and point it at the
 * binaries, start the server, turn it on here and Connect, choose an engine —
 * and a note for using it from the deployed site (`allowedOrigins`). The
 * commands and the config are `CopyField`s, ready to paste.
 *
 * The whole story — what you need, the optional settings, troubleshooting — is
 * the Blog's guide, linked under the intro (`guide`).
 *
 * Presentational: the address and the guide's link arrive as props; the words
 * are the catalogs' (`settings.engine.setup.*`, `copyable.*`).
 */
function EngineServerSetup({ example, guide, testId }: EngineServerSetupProps) {
  const { t } = useTranslation();
  const copy = {
    copyLabel: t("copyable.copy"),
    copiedLabel: t("copyable.copied"),
    failedLabel: t("copyable.copyFailed"),
  };

  const step = (n: number, words: string, extra?: ReactNode) => (
    <Box component="li" data-testid={`${testId}-step-${n}`} sx={{ display: "grid", gap: 1 }}>
      <Typography variant="body2">{words}</Typography>
      {extra}
    </Box>
  );

  return (
    <Box data-testid={testId} sx={{ display: "grid", gap: 1.5, minWidth: 0 }}>
      <Typography variant="subtitle2" component="h2">
        {t("settings.engine.setup.title")}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {t("settings.engine.setup.intro")}{" "}
        <Link {...(linkProps(guide) as Record<string, unknown>)} underline="hover" data-testid={`${testId}-guide`}>
          {t("settings.engine.setup.guide")}
        </Link>
      </Typography>
      <Box component="ol" sx={{ m: 0, ps: 2.5, display: "grid", gap: 1.5 }}>
        {step(1, t("settings.engine.setup.steps.engine"))}
        {step(
          2,
          t("settings.engine.setup.steps.config"),
          <>
            <CopyField
              label={t("settings.engine.setup.commandLabel")}
              value={ENGINE_SERVER_CONFIG_COMMAND}
              {...copy}
              testId={`${testId}-config-command`}
            />
            <Typography variant="body2">{t("settings.engine.setup.steps.configEdit")}</Typography>
            <CopyField
              label="engines.local.json"
              value={ENGINE_SERVER_CONFIG_SAMPLE}
              maxRows={8}
              {...copy}
              testId={`${testId}-config`}
            />
          </>,
        )}
        {step(
          3,
          t("settings.engine.setup.steps.start"),
          <CopyField
            label={t("settings.engine.setup.commandLabel")}
            value={ENGINE_SERVER_START_COMMAND}
            {...copy}
            testId={`${testId}-start`}
          />,
        )}
        {step(4, t("settings.engine.setup.steps.connect", { url: ltr(example) }))}
        {step(5, t("settings.engine.setup.steps.choose"))}
      </Box>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {t("settings.engine.setup.deployed")}
      </Typography>
    </Box>
  );
}

export default EngineServerSetup;
