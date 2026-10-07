import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";

import { SliderField, SwitchField } from "../../../design-system/components/forms";
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
  settings: EngineSettings;
  onChange: (patch: Partial<EngineSettings>) => void;
  /** What the running worker declared. Empty until the handshake lands. */
  engineOptions: ReadonlyMap<string, EngineOption>;
  showEvalBar: boolean;
  onShowEvalBarChange: (next: boolean) => void;
  /**
   * The prefix of every id it sets: the form is `<testId>-settings`, each
   * control `<testId>-setting-<option>` (`engine-setting-skill-level`,
   * `-depth`, `-movetime`, `-multipv`, `-threads`, `-hash`, `-evalbar`), with
   * `-value`, `-unsupported` and `-fixed` under a slider. The strength is
   * `-setting-skill-level` — or, for an engine that takes an Elo, `-setting-elo`.
   */
  testId: string;
};

type OptionRow = {
  setting: "skillLevel" | "elo" | "multiPv" | "threads" | "hashMb";
  labelKey: string;
  /** The test id's part, where the option's own slug is not it (`UCI_Elo` → `elo`). */
  slug?: string;
  /** Cap the top below what the engine would take (MultiPV's 256, Hash's 33,554,432 MB). */
  maxOffered?: number;
};

/**
 * **The engine's settings** (CTA-109; the Engine tab of CTA-74) — strength
 * (an Elo, or Skill Level with its Elo an estimate), search depth, move time,
 * the lines to show, threads, hash and the eval bar. The form of Play with Engine's and
 * Masked Pieces' Engine tab, and of the Lobby's new-game form.
 *
 * **Every option-backed slider is rendered from what the running engine
 * declared** (`engineOptionState`): absent, pinned or adjustable — never a
 * roster written here, so a build that takes more threads turns the slider
 * on with no code change (`.claude/rules/chessboard.md` §4.1). Depth and move
 * time are arguments to `go`, not options, so they are always live. An engine
 * with no `UCI_Elo` is strengthened by Skill Level, and the Elo beside it is
 * worded as an estimate.
 *
 * Presentational: the settings, the declared options and the eval bar arrive
 * as props, a change leaves as a patch. Its words are the app's
 * (`playEngine.settings.*`, `engineOption.*`).
 */
function EngineSettingsForm({ settings, onChange, engineOptions, showEvalBar, onShowEvalBarChange, testId }: EngineSettingsFormProps) {
  const { t } = useTranslation();
  // Before the handshake there is nothing to judge a control against, so no
  // control is called unsupported.
  const handshakeLanded = engineOptions.size > 0;
  const optionFor = (name: string): EngineOption | undefined =>
    handshakeLanded ? engineOptions.get(name) : { name, type: "spin" };

  const optionSlider = ({ setting, labelKey, maxOffered, slug }: OptionRow, valueLabel?: string) => {
    const optionName = SETTING_UCI_OPTION[setting];
    const id = `${testId}-setting-${slug ?? optionSlug(optionName)}`;
    const state = engineOptionState(optionFor(optionName), ENGINE_SETTING_BOUNDS[setting], maxOffered);
    return (
      <SliderField
        key={setting}
        label={t(labelKey)}
        value={settings[setting]}
        min={state.min}
        max={state.max}
        onChange={(value) => onChange({ [setting]: value })}
        valueLabel={valueLabel}
        disabled={state.kind !== "adjustable"}
        notice={
          state.kind === "absent" ? (
            <span data-testid={`${id}-unsupported`}>{t("engineOption.unsupported", { option: optionName })}</span>
          ) : state.kind === "pinned" ? (
            <span data-testid={`${id}-fixed`}>{t("engineOption.fixed", { option: optionName, value: state.fixedAt })}</span>
          ) : undefined
        }
        testId={id}
      />
    );
  };

  return (
    <Box data-testid={`${testId}-settings`} sx={{ display: "grid", gap: 2 }}>
      {/*
        The strength is whichever control the running engine declared: an Elo
        where it has `UCI_Elo` with `UCI_LimitStrength` (every shipped engine),
        else `Skill Level` with its Elo an estimate. Read off the handshake, so
        before it lands the Elo slider — the shipped engines' — stands in.
      */}
      {!handshakeLanded || usesEloStrength(engineOptions)
        ? optionSlider(
            { setting: "elo", labelKey: "playEngine.settings.strengthElo", slug: "elo" },
            t("playEngine.settings.strengthEloValue", { elo: settings.elo }),
          )
        : optionSlider(
            { setting: "skillLevel", labelKey: "playEngine.settings.strength" },
            t("playEngine.settings.strengthValue", { level: settings.skillLevel, elo: approximateElo(settings.skillLevel) }),
          )}
      {/* Depth and move time are `go` arguments, not options — always available. */}
      <SliderField
        label={t("playEngine.settings.depth")}
        value={settings.depth}
        min={ENGINE_SETTING_BOUNDS.depth.min}
        // The wrapper clamps a search to 24 plies; offering more would be a
        // control that silently stops moving.
        max={ENGINE_SETTING_BOUNDS.depth.max}
        onChange={(depth) => onChange({ depth })}
        testId={`${testId}-setting-depth`}
      />
      <SliderField
        label={t("playEngine.settings.moveTime")}
        value={settings.moveTimeMs}
        min={ENGINE_SETTING_BOUNDS.moveTimeMs.min}
        max={ENGINE_SETTING_BOUNDS.moveTimeMs.max}
        step={250}
        valueLabel={
          settings.moveTimeMs === 0
            ? t("playEngine.settings.moveTimeNone")
            : t("playEngine.settings.moveTimeValue", { seconds: (settings.moveTimeMs / 1000).toFixed(1) })
        }
        onChange={(moveTimeMs) => onChange({ moveTimeMs })}
        testId={`${testId}-setting-movetime`}
      />
      {optionSlider({ setting: "multiPv", labelKey: "playEngine.settings.multiPv", maxOffered: ENGINE_SETTING_BOUNDS.multiPv.max })}
      {/*
        Capped at the app's own bounds, as the lines are: the Stockfish 19 builds
        declare `Hash` up to 33,554,432 MB and the multi-thread one 32 threads —
        far more than a browser tab can hold or use.
      */}
      {optionSlider({ setting: "threads", labelKey: "playEngine.settings.threads", maxOffered: ENGINE_SETTING_BOUNDS.threads.max })}
      {optionSlider({ setting: "hashMb", labelKey: "playEngine.settings.hash", maxOffered: ENGINE_SETTING_BOUNDS.hashMb.max })}
      <SwitchField
        label={t("playEngine.settings.evalBar")}
        checked={showEvalBar}
        onChange={onShowEvalBarChange}
        // The screens' tests reach the input inside the switch.
        testIdOn="control"
        testId={`${testId}-setting-evalbar`}
      />
    </Box>
  );
}

export default EngineSettingsForm;
