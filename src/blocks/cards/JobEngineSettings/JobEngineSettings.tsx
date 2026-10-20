import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { KeyValueList, type KeyValueRow } from "../../../design-system/components/lists";
import type { UciOptionValue } from "../../../lib/engineTypes";

/** An engine job's engine settings, as its input snapshot them when it was queued. */
export type JobEngineSettingsView = {
  /** The engine — the one that ran it by name, else the registry id it was asked for. */
  engine: string;
  /** The preset — its name as the reader saw it, and the UCI option values it sent; `null` where none was recorded. */
  preset: { name: string; values: Readonly<Record<string, UciOptionValue>> } | null;
  depth: number;
  /** Per search; `0` no time limit. */
  moveTimeMs: number;
  /** Lines, MultiPV. */
  multiPv: number;
  threads: number;
  hashMb: number;
};

export type JobEngineSettingsProps = {
  settings: JobEngineSettingsView;
  /** The plate's heading level — `h3` under a job page's Parameters (`h2`); its options' one below. */
  headingLevel?: "h2" | "h3";
  /**
   * The root; the facts' list `-facts` (each value `-facts-<id>`: `engine`,
   * `preset`, `depth`, `time`, `lines`, `threads`, `hash`), the options'
   * list `-options` (each value `-options-<name>`), the empty state
   * `-no-options`.
   */
  testId: string;
};

/** A UCI value as the engine was sent it — a check `true` / `false`, a spin its number, a combo or string its text. */
const uciText = (value: UciOptionValue): string => String(value);

/**
 * **An engine job's engine settings, as a plate** (CTA-248) — the Evaluate
 * Position job's page: the engine, the preset, the search (depth, move time
 * — or no limit —, lines, Threads, Hash) and, under its own heading, the UCI
 * option values the preset sent, name → value, or the words that it sent
 * none. Numbers, option names and values are pinned LTR (`bdi dir="ltr"`),
 * as `ComputerAnalysisParameters`' are. Presentational: the settings arrive
 * read from the job's input (`views/jobs/kinds/`); its words are
 * `jobs.facts.*` and `jobs.engineSettings.*`.
 */
function JobEngineSettings({ settings, headingLevel = "h3", testId }: JobEngineSettingsProps) {
  const { t } = useTranslation();
  const { engine, preset, depth, moveTimeMs, multiPv, threads, hashMb } = settings;
  const time = moveTimeMs === 0 ? t("jobs.facts.noTimeLimit") : t("jobs.facts.seconds", { count: Math.round(moveTimeMs / 100) / 10 });
  const rows: KeyValueRow[] = [
    { id: "engine", label: t("jobs.facts.engine"), value: <bdi>{engine}</bdi> },
    { id: "preset", label: t("jobs.engineSettings.preset"), value: preset === null ? t("jobs.engineSettings.noPreset") : <bdi>{preset.name}</bdi> },
    { id: "depth", label: t("jobs.facts.depth"), value: <bdi dir="ltr">{depth}</bdi> },
    { id: "time", label: t("jobs.facts.time"), value: time },
    { id: "lines", label: t("jobs.facts.lines"), value: <bdi dir="ltr">{multiPv}</bdi> },
    { id: "threads", label: t("jobs.facts.threads"), value: <bdi dir="ltr">{threads}</bdi> },
    { id: "hash", label: t("jobs.facts.hash"), value: <bdi dir="ltr">{`${hashMb} MB`}</bdi> },
  ];
  const options = Object.entries(preset?.values ?? {});
  const optionRows: KeyValueRow[] = options.map(([name, value]) => ({
    id: name,
    label: <bdi dir="ltr">{name}</bdi>,
    value: <bdi dir="ltr">{uciText(value)}</bdi>,
  }));
  const optionsHeading = headingLevel === "h2" ? "h3" : "h4";

  return (
    <Box
      component="section"
      aria-labelledby={`${testId}-title`}
      data-testid={testId}
      sx={{ display: "grid", gap: 1.5, p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1 }}
    >
      <Typography id={`${testId}-title`} variant="subtitle1" component={headingLevel} sx={{ fontWeight: 700 }}>
        {t("jobs.engineSettings.title")}
      </Typography>
      <KeyValueList rows={rows} testId={`${testId}-facts`} />
      <Box sx={{ display: "grid", gap: 0.5 }}>
        <Typography id={`${testId}-options-title`} variant="subtitle2" component={optionsHeading} sx={{ fontWeight: 700 }}>
          {t("jobs.engineSettings.options")}
        </Typography>
        {optionRows.length === 0 ? (
          <Typography variant="body2" data-testid={`${testId}-no-options`} sx={{ color: "text.secondary" }}>
            {t("jobs.engineSettings.noOptions")}
          </Typography>
        ) : (
          <KeyValueList rows={optionRows} ariaLabel={t("jobs.engineSettings.options")} testId={`${testId}-options`} />
        )}
      </Box>
    </Box>
  );
}

export default JobEngineSettings;
