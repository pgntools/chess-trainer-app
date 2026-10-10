import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";

import { SliderField, SwitchField } from "../../../design-system/components/forms";
import type { EngineOption } from "../../../lib/engineTypes";
import {
  approximateElo,
  ENGINE_SETTING_BOUNDS,
  type DeviceEngineLimits,
  MOVE_TIME_INSTANT_MS,
  moveTimeOfSliderValue,
  MOVE_TIME_UNLIMITED_SLOT,
  moveTimeSliderMarks,
  moveTimeSliderValueOf,
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
   * The most Threads and Hash to offer — the screen's `engineLimitsOf(descriptor)`:
   * what this device can give an in-browser build (`deviceEngineLimits()`,
   * CTA-160), or what an engine server's engine declares (CTA-175), which may
   * be past `ENGINE_SETTING_BOUNDS`' WebAssembly ceilings — it is also the
   * range before the handshake. Absent: `ENGINE_SETTING_BOUNDS`' ceilings.
   */
  deviceLimits?: DeviceEngineLimits;
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
  /** Labelled marks within the offered range (the Hash slider's RAM points, CTA-163). */
  marks?: (state: { min: number; max: number }) => ReadonlyArray<{ value: number; label: string }>;
  /** A neutral helper caption under the slider (Hash and Threads, CTA-163). */
  helpKey?: string;
};

/**
 * The Hash slider's round RAM points (CTA-163) — labelled marks, shown where
 * they fall within the offered range: 2048 and 4096 only for an engine
 * server's engine (CTA-175), the in-browser builds stopping at 1024.
 */
const HASH_MARKS_MB = [128, 256, 512, 1024, 2048, 4096] as const;

const hashMarks = ({ min, max }: { min: number; max: number }): ReadonlyArray<{ value: number; label: string }> =>
  HASH_MARKS_MB.filter((mb) => mb >= min && mb <= max).map((mb) => ({ value: mb, label: String(mb) }));

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
function EngineSettingsForm({ settings, onChange, engineOptions, showEvalBar, onShowEvalBarChange, deviceLimits, testId }: EngineSettingsFormProps) {
  const { t } = useTranslation();
  // Before the handshake there is nothing to judge a control against, so no
  // control is called unsupported.
  const handshakeLanded = engineOptions.size > 0;
  const optionFor = (name: string): EngineOption | undefined =>
    handshakeLanded ? engineOptions.get(name) : { name, type: "spin" };

  /** The move-time slider's value as words — the header's and the screen reader's (CTA-163). */
  const moveTimeWords = (moveTimeMs: number): string =>
    moveTimeMs === 0
      ? t("playEngine.settings.moveTimeNone")
      : t("playEngine.settings.moveTimeValue", {
          // The instant reply is "0s", not "0.0s" — the 0-seconds mark, not a rounding.
          seconds: moveTimeMs <= MOVE_TIME_INSTANT_MS ? "0" : (moveTimeMs / 1000).toFixed(1),
        });

  const optionSlider = ({ setting, labelKey, maxOffered, slug, marks, helpKey }: OptionRow, valueLabel?: string) => {
    const optionName = SETTING_UCI_OPTION[setting];
    const id = `${testId}-setting-${slug ?? optionSlug(optionName)}`;
    // Before the handshake the top is what is offered: an engine server's engine's may be past the in-browser bounds (CTA-175).
    const bounds = ENGINE_SETTING_BOUNDS[setting];
    const state = engineOptionState(optionFor(optionName), { min: bounds.min, max: maxOffered ?? bounds.max }, maxOffered);
    return (
      <SliderField
        key={setting}
        label={t(labelKey)}
        value={settings[setting]}
        min={state.min}
        max={state.max}
        onChange={(value) => onChange({ [setting]: value })}
        valueLabel={valueLabel}
        marks={marks?.(state)}
        help={helpKey === undefined ? undefined : t(helpKey)}
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
        // 40 plies — past any search a reader would wait for (CTA-160); the wrapper's own clamp is higher.
        max={ENGINE_SETTING_BOUNDS.depth.max}
        onChange={(depth) => onChange({ depth })}
        testId={`${testId}-setting-depth`}
      />
      {/*
        Move time is lichess's snap-to-mark slider (CTA-163): marks at 0, 5,
        10 … 300 seconds and an ∞ mark for "no limit". The slider's value is
        the mark's slot, so the marks space evenly; its step is the slot, so a
        drag or a key lands on a mark. A stored value off the marks (the
        1000 ms default, an older record's 250 ms step) is shown where it
        falls between them — never rewritten on open — and the next drag
        snaps it onto a mark.
      */}
      <SliderField
        label={t("playEngine.settings.moveTime")}
        value={moveTimeSliderValueOf(settings.moveTimeMs)}
        min={0}
        max={MOVE_TIME_UNLIMITED_SLOT}
        marks={moveTimeSliderMarks()}
        valueLabel={moveTimeWords(settings.moveTimeMs)}
        valueText={moveTimeWords(settings.moveTimeMs)}
        onChange={(slot) => onChange({ moveTimeMs: moveTimeOfSliderValue(slot) })}
        testId={`${testId}-setting-movetime`}
      />
      {optionSlider({ setting: "multiPv", labelKey: "playEngine.settings.multiPv", maxOffered: ENGINE_SETTING_BOUNDS.multiPv.max })}
      {/*
        Capped at what this device can give, as the lines are capped: the
        Stockfish 19 builds declare `Hash` up to 33,554,432 MB (2048 crashed
        the tab) and the multi-thread one 32 threads. An engine server's engine
        is capped at what it declares instead (`deviceLimits`, CTA-175).
      */}
      {optionSlider({
        setting: "threads",
        labelKey: "playEngine.settings.threads",
        maxOffered: deviceLimits?.threads ?? ENGINE_SETTING_BOUNDS.threads.max,
        helpKey: "playEngine.settings.threadsHelp",
      })}
      {optionSlider({
        setting: "hashMb",
        labelKey: "playEngine.settings.hash",
        maxOffered: deviceLimits?.hashMb ?? ENGINE_SETTING_BOUNDS.hashMb.max,
        marks: hashMarks,
        helpKey: "playEngine.settings.hashHelp",
      })}
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
