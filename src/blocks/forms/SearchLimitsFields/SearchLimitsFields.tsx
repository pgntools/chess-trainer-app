import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";

import { SliderField } from "../../../design-system/components/forms";
import { ENGINE_SEARCH_SETTING_BOUNDS } from "../../../lib/engineSearchSettings";
import {
  DEPTH_SLIDER_MAX,
  MOVE_TIME_INSTANT_MS,
  moveTimeOfSliderValue,
  MOVE_TIME_UNLIMITED_SLOT,
  moveTimeSliderMarks,
  moveTimeSliderValueOf,
} from "../../../lib/engineSettings";

export type SearchLimitsFieldsProps = {
  /** Plies — where every search stops, if its move time has not stopped it first. */
  depth: number;
  /** Milliseconds per search; `0` is no limit, `1` the instant reply (CTA-163). */
  moveTimeMs: number;
  /** A change, as a patch — each value already held to its bounds. */
  onChange: (patch: { depth?: number; moveTimeMs?: number }) => void;
  /** The prefix of its controls: `<testId>-depth` and `<testId>-movetime` (their number boxes `-number`). */
  testId: string;
};

/** The move time as the number box shows it — seconds; the instant reply 0, no limit empty. */
const moveTimeSecondsOf = (moveTimeMs: number): number | undefined =>
  moveTimeMs <= 0 ? undefined : moveTimeMs <= MOVE_TIME_INSTANT_MS ? 0 : moveTimeMs / 1000;

/** Seconds typed as a `moveTimeMs` — 0 the instant reply, never "no limit" (the slider's ∞ alone is). */
const moveTimeMsOfSeconds = (seconds: number): number => Math.max(Math.round(seconds * 1000), MOVE_TIME_INSTANT_MS);

/**
 * **Where a search stops** (CTA-185) — the depth and the move time, each a
 * slider with a number box at its end: depth a whole number — the slider 1–50,
 * typed up to 99 (CTA-185), shown at the slider's end past 50; move time
 * lichess's marked slider (1, 5, 10, 30, 60, 300, 600 seconds and ∞ — CTA-163,
 * CTA-185) and seconds typed, up to 86,400 (24 hours) — a value off the marks kept and
 * shown where it falls, one past 600 at the slider's last time mark, the box off while the slider is on ∞ (no limit has no number).
 * Every search stops at one or the other, whichever comes first.
 *
 * The top bar's Engine menu (`EngineSearchSettingsForm`) and Settings →
 * Engine's presets (`EnginePresetForm`) both show it — the two are the
 * running engine's preset's. Presentational: the values arrive, a change
 * leaves as a patch. Its words are `analysis.settings.*`, `engineMenu.*` and
 * `playEngine.settings.*`.
 */
function SearchLimitsFields({ depth, moveTimeMs, onChange, testId }: SearchLimitsFieldsProps) {
  const { t } = useTranslation();
  const bounds = ENGINE_SEARCH_SETTING_BOUNDS;

  /** The move-time slider's value as words — the screen reader's (CTA-163; the number box shows the number). */
  const moveTimeWords =
    moveTimeMs === 0
      ? t("playEngine.settings.moveTimeNone")
      : t("playEngine.settings.moveTimeValue", {
          // The instant reply is "0s", not "0.0s" — 0 seconds, not a rounding.
          seconds: moveTimeMs <= MOVE_TIME_INSTANT_MS ? "0" : (moveTimeMs / 1000).toFixed(1),
        });

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <SliderField
        label={t("analysis.settings.depth")}
        // The slider stops at 50; a deeper depth is typed, and the slider shows it at its end.
        value={Math.min(depth, DEPTH_SLIDER_MAX)}
        min={bounds.depth.min}
        max={DEPTH_SLIDER_MAX}
        onChange={(next) => onChange({ depth: next })}
        input={{
          label: t("engineMenu.depthTyped"),
          value: depth,
          onChange: (next) => onChange({ depth: next }),
          min: bounds.depth.min,
          max: bounds.depth.max,
        }}
        testId={`${testId}-depth`}
      />
      {/*
        Lichess's snap-to-mark slider (CTA-163): its value is the mark's slot,
        the slot past the last mark ∞, "no limit". A stored value off the
        marks — one typed in its box — is shown where it falls between them.
      */}
      <SliderField
        label={t("analysis.settings.moveTime")}
        value={moveTimeSliderValueOf(moveTimeMs)}
        min={0}
        max={MOVE_TIME_UNLIMITED_SLOT}
        marks={moveTimeSliderMarks()}
        valueText={moveTimeWords}
        onChange={(slot) => onChange({ moveTimeMs: moveTimeOfSliderValue(slot) })}
        input={{
          label: t("engineMenu.moveTimeTyped"),
          value: moveTimeSecondsOf(moveTimeMs),
          onChange: (seconds) => onChange({ moveTimeMs: moveTimeMsOfSeconds(seconds) }),
          min: bounds.moveTimeMs.min / 1000,
          max: bounds.moveTimeMs.max / 1000,
          step: 0.1,
          unit: t("engineMenu.seconds"),
          emptyText: "∞",
          disabled: moveTimeMs <= 0,
        }}
        testId={`${testId}-movetime`}
      />
    </Box>
  );
}

export default SearchLimitsFields;
