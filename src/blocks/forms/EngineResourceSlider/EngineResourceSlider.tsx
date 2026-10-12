import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { SliderField } from "../../../design-system/components/forms";
import { ENGINE_SEARCH_SETTING_BOUNDS } from "../../../lib/engineSearchSettings";

/** Which resource: the engine's CPU threads or its hash table. */
export type EngineResource = "threads" | "hashMb";

export type EngineResourceSliderProps = {
  resource: EngineResource;
  /** The stored request — kept as asked; shown held to `typedMax` (the slider to `sliderMax`). */
  value: number;
  /** Where the slider stops: what this device gives the engine (`searchSettingLimitsOf`). */
  sliderMax: number;
  /** What its number box takes: what the engine declares (`searchSettingTypedLimitsOf`) — at least `sliderMax`. */
  typedMax: number;
  /** A new request, held to `typedMax`. */
  onChange: (value: number) => void;
  /** A caption under it — absent, the resource's own ("Engine CPU cores", "Engine memory (RAM)"). */
  help?: ReactNode;
  /** The root; the slider `<testId>-input`, the box `<testId>-number`, the fixed notice `<testId>-fixed`. */
  testId: string;
};

/** The Hash slider's round RAM points (CTA-163), where they fall within the slider. */
const HASH_MARKS_MB = [128, 256, 512, 1024, 2048, 4096] as const;

/**
 * **Threads or Hash, as a slider with a number box** (CTA-185) — the slider
 * stops at what this device gives the engine, the box goes past it up to what
 * the engine declares (a multi-thread build's 32 threads; an in-browser
 * build's Hash at most 1024 MB, since 2048 crashed the tab; an engine
 * server's engine its own tops), and a value past the slider's top shows at
 * its end, the number in the box. A single-thread build's Threads is fixed at
 * one and says so.
 *
 * The top bar's Engine menu (`EngineSearchSettingsForm`) and Settings →
 * Engine's preset form (`EnginePresetForm`) both show it — the one global
 * request every board sends. Presentational. Its words are
 * `analysis.settings.*`, `playEngine.settings.*` and `engineOption.*`.
 */
function EngineResourceSlider({ resource, value, sliderMax, typedMax, onChange, help, testId }: EngineResourceSliderProps) {
  const { t } = useTranslation();
  const { min } = ENGINE_SEARCH_SETTING_BOUNDS[resource];
  const slider = Math.max(sliderMax, min);
  const typed = Math.max(typedMax, slider);
  const shown = Math.min(value, typed);
  const fixed = resource === "threads" && typed <= min;
  return (
    <SliderField
      label={t(resource === "threads" ? "analysis.settings.threads" : "analysis.settings.hash")}
      value={Math.min(shown, slider)}
      min={min}
      max={slider}
      marks={
        resource === "hashMb"
          ? HASH_MARKS_MB.filter((mb) => mb <= slider).map((mb) => ({ value: mb, label: String(mb) }))
          : undefined
      }
      disabled={fixed}
      help={help ?? t(resource === "threads" ? "playEngine.settings.threadsHelp" : "playEngine.settings.hashHelp")}
      notice={
        fixed ? <span data-testid={`${testId}-fixed`}>{t("engineOption.fixed", { option: "Threads", value: typed })}</span> : undefined
      }
      onChange={onChange}
      input={{
        label: t(resource === "threads" ? "engineMenu.threadsTyped" : "engineMenu.hashTyped"),
        value: shown,
        onChange,
        min,
        max: typed,
      }}
      testId={testId}
    />
  );
}

export default EngineResourceSlider;
