import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { SliderField, SwitchField } from "../../../design-system/components/forms";
import { linkProps, type LinkTarget } from "../../../design-system/components/link";
import type { EngineOption } from "../../../lib/engineTypes";
import {
  approximateElo,
  ENGINE_SETTING_BOUNDS,
  SETTING_UCI_OPTION,
  usesEloStrength,
  type EngineSettings,
} from "../../../lib/engineSettings";
import { engineOptionState, optionSlug } from "./engineOptionState";

export type EngineSettingsFormProps = {
  /** The strength — an Elo, or a Skill Level for an engine without one. */
  settings: Pick<EngineSettings, "skillLevel" | "elo">;
  onChange: (patch: Partial<Pick<EngineSettings, "skillLevel" | "elo">>) => void;
  /** What the running worker declared. Empty until the handshake lands. */
  engineOptions: ReadonlyMap<string, EngineOption>;
  /**
   * **The engine's preset has `UCI_LimitStrength` off** (CTA-181): the Elo
   * would do nothing, so its slider is off, with a note saying so and a link
   * to Settings → Engine, where the preset turns it on. Absent: the slider is
   * live. Only an engine that takes an Elo is affected — a Skill Level is
   * always Play's.
   */
  strengthOff?: { settingsLink: LinkTarget };
  /** The eval bar's switch — the Lobby's new-game form's; absent, none (a board's is in its engine menu, CTA-181). */
  evalBar?: { checked: boolean; onChange: (next: boolean) => void };
  /**
   * The prefix of every id it sets: the form is `<testId>-settings`, the
   * strength `<testId>-setting-elo` — or, for an engine that takes no Elo,
   * `<testId>-setting-skill-level` — with `-value`, `-unsupported` and
   * `-fixed` under it; the eval bar `<testId>-setting-evalbar`; the
   * strength-off note `<testId>-strength-off` and its link
   * `<testId>-strength-off-link`.
   */
  testId: string;
};

/**
 * **The opponent's strength** (CTA-109; the Engine tab of CTA-74) — an Elo,
 * or Skill Level with its Elo an estimate: Play with Engine's and Masked
 * Pieces' Engine tab, and the Lobby's new-game form (with the eval bar).
 * Since CTA-181 that is all of it: depth, move time, lines, Threads and Hash
 * are the reader's global search settings, the top bar's Engine menu.
 *
 * **The slider is rendered from what the running engine declared**
 * (`engineOptionState`): absent, pinned or adjustable — never a roster
 * written here (`.claude/rules/chessboard.md` §4.1). An engine with no
 * `UCI_Elo` is strengthened by Skill Level, and the Elo beside it is worded
 * as an estimate. **Whether an Elo limits the engine is its preset's call**
 * (`strengthOff`): while the preset has `UCI_LimitStrength` off, the Elo
 * slider is off and says how to turn it on.
 *
 * Presentational: the settings and the declared options arrive as props, a
 * change leaves as a patch. Its words are the app's
 * (`playEngine.settings.*`, `engineOption.*`).
 */
function EngineSettingsForm({ settings, onChange, engineOptions, strengthOff, evalBar, testId }: EngineSettingsFormProps) {
  const { t } = useTranslation();
  // Before the handshake there is nothing to judge a control against, so no
  // control is called unsupported.
  const handshakeLanded = engineOptions.size > 0;
  const optionFor = (name: string): EngineOption | undefined =>
    handshakeLanded ? engineOptions.get(name) : { name, type: "spin" };
  // The strength is whichever control the running engine declared — before the handshake, the Elo (every shipped engine's).
  const byElo = !handshakeLanded || usesEloStrength(engineOptions);
  const setting = byElo ? "elo" : "skillLevel";
  const optionName = SETTING_UCI_OPTION[setting];
  const id = `${testId}-setting-${byElo ? "elo" : optionSlug(optionName)}`;
  const bounds = ENGINE_SETTING_BOUNDS[setting];
  const state = engineOptionState(optionFor(optionName), bounds);
  const off = byElo && strengthOff !== undefined;

  return (
    <Box data-testid={`${testId}-settings`} sx={{ display: "grid", gap: 2 }}>
      <SliderField
        label={t(byElo ? "playEngine.settings.strengthElo" : "playEngine.settings.strength")}
        value={settings[setting]}
        min={state.min}
        max={state.max}
        onChange={(value) => onChange({ [setting]: value })}
        valueLabel={
          byElo
            ? t("playEngine.settings.strengthEloValue", { elo: settings.elo })
            : t("playEngine.settings.strengthValue", { level: settings.skillLevel, elo: approximateElo(settings.skillLevel) })
        }
        disabled={state.kind !== "adjustable" || off}
        notice={
          state.kind === "absent" ? (
            <span data-testid={`${id}-unsupported`}>{t("engineOption.unsupported", { option: optionName })}</span>
          ) : state.kind === "pinned" ? (
            <span data-testid={`${id}-fixed`}>{t("engineOption.fixed", { option: optionName, value: state.fixedAt })}</span>
          ) : undefined
        }
        testId={id}
      />
      {off && (
        // Why the Elo is off, and where to turn it on: the preset's UCI_LimitStrength (CTA-181).
        <Typography variant="body2" color="text.secondary" data-testid={`${testId}-strength-off`}>
          {t("playEngine.settings.strengthOff")}{" "}
          <Link data-testid={`${testId}-strength-off-link`} {...linkProps(strengthOff.settingsLink)}>
            {t("playEngine.settings.strengthOffLink")}
          </Link>
        </Typography>
      )}
      {evalBar !== undefined && (
        <SwitchField
          label={t("playEngine.settings.evalBar")}
          checked={evalBar.checked}
          onChange={evalBar.onChange}
          // The screens' tests reach the input inside the switch.
          testIdOn="control"
          testId={`${testId}-setting-evalbar`}
        />
      )}
    </Box>
  );
}

export default EngineSettingsForm;
