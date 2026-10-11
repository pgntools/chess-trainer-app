import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import MemoryRoundedIcon from "@mui/icons-material/MemoryRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { SelectField, SliderField } from "../../../design-system/components/forms";
import { ENGINE_SEARCH_SETTING_BOUNDS, type EngineSearchSettings } from "../../../lib/engineSearchSettings";
import type { EngineEntry } from "../../../lib/engines";
import { SearchLimitsFields } from "../SearchLimitsFields";

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
  /**
   * The engines the reader can choose between (CTA-185) — Settings → Engine's
   * list (`describeEngines()`), one this page cannot run listed disabled with
   * its reason.
   */
  engines: readonly EngineEntry[];
  /** The engine running — one of `engines`. */
  engineId: string;
  /** The reader chose another engine (one that can run here). */
  onEngineChange: (engineId: string) => void;
  /** The running engine's presets (Settings → Engine) — Default in the screen's words. */
  presets: readonly { id: string; name: string }[];
  /** The preset it runs — one of `presets`. */
  presetId: string;
  /** The reader chose another preset for the running engine. */
  onPresetChange: (presetId: string) => void;
  /** The form's root; each control `<testId>-<setting>` (`-depth`, `-movetime`, `-multipv`, `-threads`, `-hash`; the depth's and move time's number boxes `-depth-number`, `-movetime-number`), the engine select `<testId>-engine`, the preset select `<testId>-preset`. */
  testId: string;
};

/** A select with its icon before it — the engine, the preset. */
function WithIcon({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box component="span" aria-hidden sx={{ display: "inline-flex", color: "text.secondary", flexShrink: 0 }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

/** The Hash slider's round RAM points (CTA-163), where they fall within the range offered. */
const HASH_MARKS_MB = [128, 256, 512, 1024, 2048, 4096] as const;

/**
 * **The top bar's Engine menu** (CTA-181) — the search settings every board
 * uses: depth, move time (lichess's marked slider, 1–600 s and ∞ — Play
 * with Engine's, CTA-163, its marks CTA-185's), the lines, Threads and Hash,
 * under the engine running and the preset it runs — each a select, chosen
 * right here (CTA-185), the depth and move time under the preset, theirs
 * (`SearchLimitsFields`); the way to Settings → Engine is the screen's,
 * beside its title. One global set: what was each board's Engine tab until CTA-181.
 *
 * `Threads` and `Hash` stop at what the engine takes (`limits`) and a value
 * past it is shown held to it — a request, never cut back in the store
 * (`docs/engine.md` §5); a single-thread engine's Threads is fixed at one and
 * says so. **Every search stops** at the depth or the move time, whichever
 * comes first — no infinite analysis (CTA-185 took its switch away; the ∞
 * mark is "no time limit", the depth still deciding). Each of the two has a
 * number box at its slider's end (CTA-185):
 * depth a whole number, move time seconds — a value off the slider's marks
 * kept, the slider showing where it falls — and the move time's box off while
 * the slider is on ∞ (no limit has no number).
 *
 * Presentational: the settings arrive, a change leaves as a patch. Its words
 * are `engineMenu.*`, `playEngine.settings.*` (the move-time and Hash words)
 * and `engineOption.*`.
 */
function EngineSearchSettingsForm({
  settings,
  onChange,
  limits,
  engines,
  engineId,
  onEngineChange,
  presets,
  presetId,
  onPresetChange,
  testId,
}: EngineSearchSettingsFormProps) {
  const { t } = useTranslation();

  const threadsMax = Math.max(limits.threads, ENGINE_SEARCH_SETTING_BOUNDS.threads.min);
  const hashMax = Math.max(limits.hashMb, ENGINE_SEARCH_SETTING_BOUNDS.hashMb.min);

  return (
    <Box data-testid={testId} sx={{ display: "grid", gap: 2 }}>
      <Box sx={{ display: "grid", gap: 1.5 }}>
        <WithIcon icon={<MemoryRoundedIcon fontSize="small" />}>
          <SelectField
            label={t("engineMenu.engine")}
            value={engineId}
            onChange={onEngineChange}
            options={engines.map(({ descriptor, availability }) => ({
              value: descriptor.id,
              disabled: !availability.available,
              label: (
                <Box component="span" sx={{ display: "grid", minWidth: 0 }}>
                  {/* A build's own name and version, pinned left to right — in the list and in the select alike. */}
                  <bdi dir="ltr">
                    {descriptor.name} ({descriptor.version})
                  </bdi>
                  {!availability.available && (
                    <Typography component="span" variant="caption" sx={{ whiteSpace: "normal" }}>
                      {t(`enginePicker.unavailable.${availability.reason}`)}
                    </Typography>
                  )}
                </Box>
              ),
            }))}
            fullWidth
            testId={`${testId}-engine`}
          />
        </WithIcon>
        <WithIcon icon={<TuneRoundedIcon fontSize="small" />}>
          <SelectField
            label={t("engineMenu.preset")}
            value={presetId}
            onChange={onPresetChange}
            options={presets.map((preset) => ({ value: preset.id, label: <bdi>{preset.name}</bdi> }))}
            optionDir="auto"
            fullWidth
            testId={`${testId}-preset`}
          />
        </WithIcon>
        {/* Where its searches stop — the preset's own (CTA-185): another preset, or engine, brings its own. */}
        <SearchLimitsFields depth={settings.depth} moveTimeMs={settings.moveTimeMs} onChange={onChange} testId={testId} />
      </Box>
      <Divider />
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
