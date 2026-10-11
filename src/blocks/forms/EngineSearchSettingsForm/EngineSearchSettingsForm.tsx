import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { SliderField, SwitchField } from "../../../design-system/components/forms";
import { linkProps, type LinkTarget } from "../../../design-system/components/link";
import { ENGINE_SEARCH_SETTING_BOUNDS, type EngineSearchSettings } from "../../../lib/engineSearchSettings";
import {
  MOVE_TIME_INSTANT_MS,
  moveTimeOfSliderValue,
  MOVE_TIME_UNLIMITED_SLOT,
  moveTimeSliderMarks,
  moveTimeSliderValueOf,
} from "../../../lib/engineSettings";

export type EngineSearchSettingsFormProps = {
  settings: EngineSearchSettings;
  /** A change, as a patch — the screen writes it into the global settings. */
  onChange: (patch: Partial<EngineSearchSettings>) => void;
  /**
   * The most `Threads` and `Hash` the engine running takes
   * (`searchSettingLimitsOf`): a single-thread build's one thread, what this
   * device gives a multi-thread build, what an engine server's engine
   * declares. The sliders stop there and show a stored value past it held to
   * it — the store keeps what was asked.
   */
  limits: { threads: number; hashMb: number };
  /** The engine running — its name and version, as the reader chose it in Settings → Engine. */
  engine: { name: string; version: string };
  /** The name of the preset it runs (Settings → Engine) — the screen's words for Default. */
  presetName: string;
  /** Settings → Engine, where the engine and its preset are chosen. */
  settingsLink: LinkTarget;
  /** The form's root; each control `<testId>-<setting>` (`-infinite`, `-depth`, `-movetime`, `-multipv`, `-threads`, `-hash`), the engine `<testId>-engine`, the preset `<testId>-preset`, the link `<testId>-settings-link`. */
  testId: string;
};

/** The Hash slider's round RAM points (CTA-163), where they fall within the range offered. */
const HASH_MARKS_MB = [128, 256, 512, 1024, 2048, 4096] as const;

/**
 * **The top bar's Engine menu** (CTA-181) — the search settings every board
 * uses: infinite analysis, depth, move time (lichess's marked slider,
 * 0–300 s and ∞ — Play with Engine's, CTA-163), the lines, Threads and Hash,
 * under the engine running and the preset it runs, with the way to Settings
 * → Engine to change either. One global set: what was each board's Engine
 * tab until CTA-181.
 *
 * `Threads` and `Hash` stop at what the engine takes (`limits`) and a value
 * past it is shown held to it — a request, never cut back in the store
 * (`docs/engine.md` §5); a single-thread engine's Threads is fixed at one and
 * says so. Depth and move time stay live under infinite analysis: Play still
 * searches to them.
 *
 * Presentational: the settings arrive, a change leaves as a patch. Its words
 * are `engineMenu.*`, `playEngine.settings.*` (the move-time and Hash words)
 * and `engineOption.*`.
 */
function EngineSearchSettingsForm({ settings, onChange, limits, engine, presetName, settingsLink, testId }: EngineSearchSettingsFormProps) {
  const { t } = useTranslation();

  /** The move-time slider's value as words — the header's and the screen reader's (CTA-163). */
  const moveTimeWords = (moveTimeMs: number): string =>
    moveTimeMs === 0
      ? t("playEngine.settings.moveTimeNone")
      : t("playEngine.settings.moveTimeValue", {
          // The instant reply is "0s", not "0.0s" — the 0-seconds mark, not a rounding.
          seconds: moveTimeMs <= MOVE_TIME_INSTANT_MS ? "0" : (moveTimeMs / 1000).toFixed(1),
        });

  const threadsMax = Math.max(limits.threads, ENGINE_SEARCH_SETTING_BOUNDS.threads.min);
  const hashMax = Math.max(limits.hashMb, ENGINE_SEARCH_SETTING_BOUNDS.hashMb.min);

  return (
    <Box data-testid={testId} sx={{ display: "grid", gap: 2 }}>
      <Box sx={{ display: "grid", gap: 0.25 }}>
        <Typography variant="body2" data-testid={`${testId}-engine`}>
          {t("engineMenu.engine")}{" "}
          {/* A build's own name and version, pinned left to right. */}
          <bdi dir="ltr">
            {engine.name} ({engine.version})
          </bdi>
        </Typography>
        <Typography variant="body2" data-testid={`${testId}-preset`}>
          {t("engineMenu.preset")} <bdi>{presetName}</bdi>
        </Typography>
        <Link variant="body2" data-testid={`${testId}-settings-link`} {...linkProps(settingsLink)}>
          {t("engineMenu.settingsLink")}
        </Link>
      </Box>
      <Divider />
      <SwitchField
        label={t("analysis.settings.infinite")}
        help={t("analysis.settings.infiniteHelp")}
        checked={settings.infinite}
        onChange={(infinite) => onChange({ infinite })}
        testId={`${testId}-infinite`}
      />
      <SliderField
        label={t("analysis.settings.depth")}
        value={settings.depth}
        min={ENGINE_SEARCH_SETTING_BOUNDS.depth.min}
        max={ENGINE_SEARCH_SETTING_BOUNDS.depth.max}
        onChange={(depth) => onChange({ depth })}
        testId={`${testId}-depth`}
      />
      {/*
        Lichess's snap-to-mark slider (CTA-163): marks at 0, 5, 10 … 300
        seconds and ∞ for "no limit"; its value is the mark's slot. A stored
        value off the marks is shown where it falls between them.
      */}
      <SliderField
        label={t("analysis.settings.moveTime")}
        value={moveTimeSliderValueOf(settings.moveTimeMs)}
        min={0}
        max={MOVE_TIME_UNLIMITED_SLOT}
        marks={moveTimeSliderMarks()}
        valueLabel={moveTimeWords(settings.moveTimeMs)}
        valueText={moveTimeWords(settings.moveTimeMs)}
        onChange={(slot) => onChange({ moveTimeMs: moveTimeOfSliderValue(slot) })}
        testId={`${testId}-movetime`}
      />
      <SliderField
        label={t("analysis.settings.multiPv")}
        value={settings.multiPv}
        min={ENGINE_SEARCH_SETTING_BOUNDS.multiPv.min}
        max={ENGINE_SEARCH_SETTING_BOUNDS.multiPv.max}
        onChange={(multiPv) => onChange({ multiPv })}
        testId={`${testId}-multipv`}
      />
      <SliderField
        label={t("analysis.settings.threads")}
        value={Math.min(settings.threads, threadsMax)}
        min={ENGINE_SEARCH_SETTING_BOUNDS.threads.min}
        max={threadsMax}
        disabled={threadsMax <= ENGINE_SEARCH_SETTING_BOUNDS.threads.min}
        help={t("playEngine.settings.threadsHelp")}
        notice={
          threadsMax <= ENGINE_SEARCH_SETTING_BOUNDS.threads.min ? (
            <span data-testid={`${testId}-threads-fixed`}>{t("engineOption.fixed", { option: "Threads", value: threadsMax })}</span>
          ) : undefined
        }
        onChange={(threads) => onChange({ threads })}
        testId={`${testId}-threads`}
      />
      <SliderField
        label={t("analysis.settings.hash")}
        value={Math.min(settings.hashMb, hashMax)}
        min={ENGINE_SEARCH_SETTING_BOUNDS.hashMb.min}
        max={hashMax}
        marks={HASH_MARKS_MB.filter((mb) => mb <= hashMax).map((mb) => ({ value: mb, label: String(mb) }))}
        help={t("playEngine.settings.hashHelp")}
        onChange={(hashMb) => onChange({ hashMb })}
        testId={`${testId}-hash`}
      />
    </Box>
  );
}

export default EngineSearchSettingsForm;
