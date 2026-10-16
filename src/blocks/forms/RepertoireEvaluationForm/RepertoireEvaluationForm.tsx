import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { CheckboxField, SettingsSection, SideToggle, SliderField } from "../../../design-system/components/forms";
import { COMPUTER_ANALYSIS_BOUNDS } from "../../../lib/computerAnalysis";
import type { DeviceEngineLimits } from "../../../lib/engineSettings";
import type { EngineOption } from "../../../lib/engineTypes";
import {
  evaluatedRepertoireName,
  REPERTOIRE_EVALUATION_PLY_BOUNDS,
  type RepertoireEvaluationOutputs,
  type RepertoireEvaluationSettings,
} from "../../../lib/jobs/kinds/repertoireEvaluation/core";
import { EngineSearchFields, type ComputerAnalysisEngineChoice } from "../ComputerAnalysisForm";

export type RepertoireEvaluationFormProps = {
  /** The settings — the side (the screen prefills it from the repertoire's), the ply limit, the search, the thresholds, the outputs. */
  settings: RepertoireEvaluationSettings;
  /** A change, as a patch — the screen holds the settings to their bounds (`repertoireEvaluationSettingsFrom`). */
  onChange: (patch: Partial<RepertoireEvaluationSettings>) => void;
  /** The repertoire's name — the new repertoire's ("<name> — evaluated") in the outputs' words. */
  repertoireName: string;
  /** What the engine declared (`engineOptionState`). Empty before its handshake. */
  engineOptions: ReadonlyMap<string, EngineOption>;
  /** The engine's `capabilities.multiThread`, read before the handshake. */
  multiThread?: boolean;
  /** The most Threads and Hash to offer (`engineLimitsOf(descriptor)`). */
  deviceLimits?: DeviceEngineLimits;
  /** The engine and preset selects at the head of the Engine section — absent, none. */
  engineChoice?: ComputerAnalysisEngineChoice;
  /**
   * The root. The engine's fields are `EngineSearchFields`' (`-depth`,
   * `-movetime`, `-threads` …, `-engine-select`, `-preset`); the side
   * `-side` (its buttons `-side-white`, `-side-black`), the ply limit
   * `-plies`, the thresholds `-inaccuracy`, `-mistake`, `-blunder`, the
   * outputs `-output-report`, `-output-repertoire`, `-output-pgn`.
   */
  testId: string;
};

const THRESHOLDS = ["inaccuracy", "mistake", "blunder"] as const;

/**
 * **A repertoire evaluation's New-job form** (CTA-219, the Jobs module's
 * `repertoire.evaluation` kind): the engine and its search — the computer
 * analysis's own fields (`EngineSearchFields`), no early stop; the side the
 * repertoire plays (the screen prefills it from the repertoire, the reader
 * may change it) and the ply limit; the verdicts' thresholds; and what is
 * made — the report always (ticked, not to be unticked), a new repertoire
 * "<name> — evaluated" and the annotated PGN as a file, each a box.
 *
 * Presentational: the settings arrive, a change leaves as a patch; Start and
 * its refusals are the New-job frame's. Its words are
 * `jobs.kinds.repertoireEvaluation.form.*`, the engine's and the thresholds'
 * `computerAnalysis.form.*`.
 */
function RepertoireEvaluationForm({
  settings,
  onChange,
  repertoireName,
  engineOptions,
  multiThread,
  deviceLimits,
  engineChoice,
  testId,
}: RepertoireEvaluationFormProps) {
  const { t } = useTranslation();
  const words = (key: string, options?: Record<string, unknown>) => t(`jobs.kinds.repertoireEvaluation.form.${key}`, options);
  const setOutput = (key: keyof RepertoireEvaluationOutputs, ticked: boolean) =>
    onChange({ outputs: { ...settings.outputs, [key]: ticked } });

  return (
    <Box data-testid={testId} sx={{ display: "grid", gap: 2 }}>
      <SettingsSection
        title={t("computerAnalysis.form.engine")}
        description={engineChoice === undefined ? undefined : t("computerAnalysis.form.presetHelp")}
        testId={`${testId}-engine`}
      >
        <EngineSearchFields
          values={settings.search}
          onChange={(patch) => onChange({ search: { ...settings.search, ...patch } })}
          engineOptions={engineOptions}
          multiThread={multiThread}
          deviceLimits={deviceLimits}
          engineChoice={engineChoice}
          testId={testId}
        />
      </SettingsSection>

      <SettingsSection title={words("moves")} testId={`${testId}-moves`}>
        <Box sx={{ display: "grid", gap: 0.5, justifyItems: "start" }}>
          <Typography variant="body2" component="p" aria-hidden="true">
            {words("side")}
          </Typography>
          <SideToggle
            value={settings.side === "b" ? "black" : "white"}
            onChange={(side) => onChange({ side: side === "black" ? "b" : "w" })}
            labels={{ white: words("white"), black: words("black") }}
            ariaLabel={words("side")}
            testId={`${testId}-side`}
          />
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {words("sideHelp")}
          </Typography>
        </Box>
        <SliderField
          label={words("maxPlies")}
          value={settings.maxPlies}
          min={REPERTOIRE_EVALUATION_PLY_BOUNDS.min}
          max={REPERTOIRE_EVALUATION_PLY_BOUNDS.max}
          valueLabel={words("maxPliesValue", { plies: settings.maxPlies, move: Math.ceil(settings.maxPlies / 2) })}
          help={words("maxPliesHelp")}
          onChange={(maxPlies) => onChange({ maxPlies })}
          testId={`${testId}-plies`}
        />
      </SettingsSection>

      <SettingsSection title={words("thresholds")} description={t("computerAnalysis.form.thresholdsHelp")} testId={`${testId}-thresholds`}>
        {THRESHOLDS.map((key) => (
          <SliderField
            key={key}
            label={t(`computerAnalysis.form.${key}`)}
            value={settings.thresholds[key]}
            min={COMPUTER_ANALYSIS_BOUNDS.threshold.min}
            max={COMPUTER_ANALYSIS_BOUNDS.threshold.max}
            valueLabel={t("computerAnalysis.form.cp", { cp: settings.thresholds[key] })}
            onChange={(next) => onChange({ thresholds: { ...settings.thresholds, [key]: next } })}
            testId={`${testId}-${key}`}
          />
        ))}
      </SettingsSection>

      <SettingsSection title={words("outputs")} description={words("outputsHelp")} testId={`${testId}-outputs`}>
        <CheckboxField label={words("report")} help={words("reportHelp")} checked disabled onChange={() => {}} testId={`${testId}-output-report`} />
        <CheckboxField
          label={words("repertoire")}
          help={words("repertoireHelp", { name: evaluatedRepertoireName(repertoireName) })}
          checked={settings.outputs.repertoire}
          onChange={(ticked) => setOutput("repertoire", ticked)}
          testId={`${testId}-output-repertoire`}
        />
        <CheckboxField
          label={words("pgnFile")}
          help={words("pgnFileHelp")}
          checked={settings.outputs.pgnFile}
          onChange={(ticked) => setOutput("pgnFile", ticked)}
          testId={`${testId}-output-pgn`}
        />
      </SettingsSection>
    </Box>
  );
}

export default RepertoireEvaluationForm;
