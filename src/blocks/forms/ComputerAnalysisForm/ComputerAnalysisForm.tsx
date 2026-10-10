import { useId, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { StatusText } from "../../../design-system/components/feedback";
import {
  CheckboxField,
  RadioGroupField,
  SettingsSection,
  SideToggle,
  SliderField,
  SwitchField,
  TextInputField,
} from "../../../design-system/components/forms";
import { ExpandToggle } from "../../../design-system/components/navigation";
import {
  COMPUTER_ANALYSIS_BOUNDS,
  COMPUTER_ANALYSIS_VARIANTS,
  DEFAULT_COMPUTER_ANALYSIS_OPTIONS,
  type AnalysisSide,
  type ComputerAnalysisOptions,
  type ComputerAnalysisVariant,
} from "../../../lib/computerAnalysis";
import { MAX_VARIATIONS_OFFERED } from "../../../lib/engineAnalysis";
import type { DeviceEngineLimits } from "../../../lib/engineSettings";
import type { EngineOption } from "../../../lib/engineTypes";
import { engineOptionState, optionSlug } from "../EngineSettingsForm";

/** Why Start could not queue the job — `enqueueComputerAnalysis`'s answers (`lib/jobStore.ts`). */
export type ComputerAnalysisStartProblem = "invalid" | "storage" | "too-many";

export type ComputerAnalysisFormProps = {
  options: ComputerAnalysisOptions;
  /** A change, as a patch — the screen holds the options to their bounds (`computerAnalysisOptionsFrom`). */
  onChange: (patch: Partial<ComputerAnalysisOptions>) => void;
  /** What the engine declared (`engineOptionState`): Threads, Hash and MultiPV absent, pinned or adjustable. Empty before its handshake. */
  engineOptions: ReadonlyMap<string, EngineOption>;
  /**
   * Whether the engine can search on more than one thread — its descriptor's
   * `capabilities.multiThread`. Read only **before the handshake**, so a board
   * whose engine has not started yet still says a single-thread build pins
   * Threads at 1. Absent: nothing is assumed.
   */
  multiThread?: boolean;
  /** The engine the job will run, by name ("Stockfish 19 Lite") — absent, no line. */
  engineName?: string;
  /**
   * The most Threads and Hash to offer — `engineLimitsOf(descriptor)`: this
   * device's for an in-browser build (`deviceEngineLimits()`), what an engine
   * server's engine declares (CTA-175), which may be past the bounds' 1024 MB —
   * the range before the handshake too. Absent, the bounds' ceilings.
   */
  deviceLimits?: DeviceEngineLimits;
  /** The game's last move number — the move fields' ceiling. Absent, the bounds'. */
  lastMove?: number;
  /**
   * Why there is nothing to analyse, beside an unticked variant: the game has
   * no moves (`noMoves`), or none in the chosen range (`noRange`). Start is off
   * and the words say why.
   */
  blocked?: "noMoves" | "noRange";
  /** Queue the job. Off with no variant ticked, while `blocked` or `busy`. */
  onStart: () => void;
  /** The job is being queued. */
  busy?: boolean;
  /** The last Start's refusal, said under it. */
  problem?: ComputerAnalysisStartProblem;
  /**
   * The root; the sliders are `<testId>-<option>` (`-threads`, `-hash`,
   * `-multipv`, `-depth`, `-movetime`, `-mindepth`, `-inaccuracy`, `-mistake`,
   * `-blunder`, `-range`), the side `-side`, the move fields `-from-move`,
   * `-from-colour`, `-to-move`, the variants `-variant-<light|medium|full>`,
   * the Advanced toggle `-advanced`, Start `-start`, its note `-start-note`,
   * the refusal `-problem`.
   */
  testId: string;
};

const SIDES: readonly AnalysisSide[] = ["both", "w", "b"];

/** A move number typed: a whole number in range, `null` for an empty box, `undefined` for what is neither. */
const moveNumberOf = (text: string, max: number): number | null | undefined => {
  if (text.trim() === "") return null;
  const value = Number(text);
  if (!Number.isInteger(value) || value < COMPUTER_ANALYSIS_BOUNDS.move.min || value > max) return undefined;
  return value;
};

/**
 * A move number in a box — its own draft, so the reader can clear it and type
 * another; a number in range is passed on as it is typed, anything else is
 * marked and passed on as nothing. The value from outside (a clamp) replaces
 * the draft, adjusted during render.
 */
function MoveNumberField({
  label,
  value,
  max,
  optional,
  helperText,
  onCommit,
  testId,
}: {
  label: string;
  value: number | null;
  max: number;
  /** An empty box is a value (`null`): the end of the game. */
  optional: boolean;
  helperText: string;
  onCommit: (value: number | null) => void;
  testId: string;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value === null ? "" : String(value));
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (moveNumberOf(draft, max) !== value) setDraft(value === null ? "" : String(value));
  }
  const read = moveNumberOf(draft, max);
  const invalid = read === undefined || (read === null && !optional);
  return (
    <TextInputField
      type="number"
      label={label}
      value={draft}
      dir="ltr"
      error={invalid}
      helperText={invalid ? t("computerAnalysis.form.moveRange", { max }) : helperText}
      onChange={(text) => {
        setDraft(text);
        const next = moveNumberOf(text, max);
        if (next !== undefined && (next !== null || optional)) onCommit(next);
      }}
      testId={testId}
    />
  );
}

/**
 * **A computer analysis's options** (CTA-174, CTA-171) — the Analysis Board's
 * Computer analysis tab: how the engine searches (threads, hash, depth, time
 * per move, lines, the depth an early stop may start from), which moves are
 * analysed (a side, a first move and colour, a last move), and — under
 * **Advanced**, collapsed — the losses that make an inaccuracy, a mistake and
 * a blunder and the range a kept line may fall below the best; then the
 * variants to save (light, medium, full, each with a line saying what it
 * holds) and **Start**, off with no variant ticked or nothing to analyse.
 *
 * **No time limit** is a switch over the time slider (as the Engine tab's
 * infinite analysis is): on, each position is searched to the depth alone
 * (`moveTimeMs` 0); off, the last time set comes back.
 *
 * Threads, Hash and MultiPV follow what the engine declared — absent, pinned
 * or adjustable (`engineOptionState`, as `AnalysisEngineForm`) — and before
 * its handshake a single-thread engine (`multiThread` false) shows Threads
 * pinned at 1, which is what the job will find.
 *
 * Presentational: the options arrive, a change leaves as a patch; the screen
 * keeps them in bounds and queues the job. Its words are
 * `computerAnalysis.form.*`.
 */
function ComputerAnalysisForm({
  options,
  onChange,
  engineOptions,
  multiThread,
  engineName,
  deviceLimits,
  lastMove,
  blocked,
  onStart,
  busy = false,
  problem,
  testId,
}: ComputerAnalysisFormProps) {
  const { t } = useTranslation();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // The time a "No time limit" switched off again brings back: the last one set, else the default.
  const [lastMoveTimeMs, setLastMoveTimeMs] = useState(options.moveTimeMs || DEFAULT_COMPUTER_ANALYSIS_OPTIONS.moveTimeMs);
  const noTimeLimit = options.moveTimeMs === 0;
  const advancedId = useId();
  const bounds = COMPUTER_ANALYSIS_BOUNDS;
  const handshakeLanded = engineOptions.size > 0;
  const moveMax = Math.max(bounds.move.min, Math.min(bounds.move.max, lastMove ?? bounds.move.max));

  const optionSlider = (
    setting: "threads" | "hashMb" | "multiPv",
    optionName: string,
    label: string,
    range: { min: number; max: number },
  ) => {
    const declared = handshakeLanded
      ? engineOptions.get(optionName)
      : setting === "threads" && multiThread === false
        ? { name: optionName, type: "spin" as const, min: 1, max: 1 }
        : { name: optionName, type: "spin" as const };
    const state = engineOptionState(declared, range, range.max);
    const id = `${testId}-${optionSlug(optionName)}`;
    return (
      <SliderField
        label={label}
        value={state.kind === "pinned" ? state.fixedAt : options[setting]}
        min={state.min}
        max={state.max}
        disabled={state.kind !== "adjustable"}
        onChange={(next) => onChange({ [setting]: next })}
        notice={
          state.kind === "absent"
            ? t("engineOption.unsupported", { option: optionName })
            : state.kind === "pinned"
              ? t("engineOption.fixed", { option: optionName, value: state.fixedAt })
              : undefined
        }
        testId={id}
      />
    );
  };

  const cpSlider = (key: "inaccuracy" | "mistake" | "blunder") => (
    <SliderField
      label={t(`computerAnalysis.form.${key}`)}
      value={options.thresholds[key]}
      min={bounds.threshold.min}
      max={bounds.threshold.max}
      valueLabel={t("computerAnalysis.form.cp", { cp: options.thresholds[key] })}
      onChange={(next) => onChange({ thresholds: { ...options.thresholds, [key]: next } })}
      testId={`${testId}-${key}`}
    />
  );

  const noVariant = options.outputs.length === 0;
  const note = blocked !== undefined ? t(`computerAnalysis.form.${blocked}`) : noVariant ? t("computerAnalysis.form.noVariant") : undefined;
  const toggleVariant = (variant: ComputerAnalysisVariant, ticked: boolean) =>
    onChange({
      outputs: COMPUTER_ANALYSIS_VARIANTS.filter((each) => (each === variant ? ticked : options.outputs.includes(each))),
    });

  return (
    <Box data-testid={testId} sx={{ display: "grid", gap: 2 }}>
      <SettingsSection
        title={t("computerAnalysis.form.engine")}
        description={engineName === undefined ? undefined : t("computerAnalysis.form.engineName", { name: engineName })}
        testId={`${testId}-engine`}
      >
        {optionSlider("threads", "Threads", t("computerAnalysis.form.threads"), {
          min: bounds.threads.min,
          max: deviceLimits?.threads ?? bounds.threads.max,
        })}
        {optionSlider("hashMb", "Hash", t("computerAnalysis.form.hash"), {
          min: bounds.hashMb.min,
          max: deviceLimits?.hashMb ?? bounds.hashMb.max,
        })}
        <SliderField
          label={t("computerAnalysis.form.depth")}
          value={options.depth}
          min={bounds.depth.min}
          max={bounds.depth.max}
          onChange={(depth) => onChange({ depth })}
          testId={`${testId}-depth`}
        />
        <SwitchField
          label={t("computerAnalysis.form.noTimeLimit")}
          help={t("computerAnalysis.form.noTimeLimitHelp")}
          checked={noTimeLimit}
          onChange={(on) => onChange({ moveTimeMs: on ? 0 : lastMoveTimeMs })}
          testId={`${testId}-no-time-limit`}
        />
        <SliderField
          label={t("computerAnalysis.form.moveTime")}
          value={noTimeLimit ? lastMoveTimeMs : options.moveTimeMs}
          // No time limit is the switch above, not the slider's far end.
          min={Math.max(1000, bounds.moveTimeMs.min)}
          max={bounds.moveTimeMs.max}
          step={1000}
          disabled={noTimeLimit}
          valueLabel={
            noTimeLimit
              ? t("computerAnalysis.form.moveTimeNone")
              : t("computerAnalysis.form.seconds", { seconds: Math.round(options.moveTimeMs / 100) / 10 })
          }
          onChange={(moveTimeMs) => {
            setLastMoveTimeMs(moveTimeMs);
            onChange({ moveTimeMs });
          }}
          testId={`${testId}-movetime`}
        />
        {optionSlider("multiPv", "MultiPV", t("computerAnalysis.form.lines"), {
          min: bounds.multiPv.min,
          max: Math.min(bounds.multiPv.max, MAX_VARIATIONS_OFFERED),
        })}
        <SliderField
          label={t("computerAnalysis.form.minDepth")}
          value={options.minDepth}
          min={bounds.minDepth.min}
          max={options.depth}
          help={t("computerAnalysis.form.minDepthHelp")}
          onChange={(minDepth) => onChange({ minDepth })}
          testId={`${testId}-mindepth`}
        />
      </SettingsSection>

      <SettingsSection title={t("computerAnalysis.form.moves")} testId={`${testId}-moves`}>
        <RadioGroupField<AnalysisSide>
          row
          label={t("computerAnalysis.form.side")}
          options={SIDES.map((side) => ({ value: side, label: t(`computerAnalysis.form.sides.${side}`) }))}
          value={options.side}
          onChange={(side) => onChange({ side })}
          testId={`${testId}-side`}
        />
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(9rem, 1fr))", gap: 1.5, alignItems: "start" }}>
          <MoveNumberField
            label={t("computerAnalysis.form.fromMove")}
            value={options.fromMove}
            max={moveMax}
            optional={false}
            helperText={t("computerAnalysis.form.fromMoveHelp")}
            onCommit={(fromMove) => fromMove !== null && onChange({ fromMove })}
            testId={`${testId}-from-move`}
          />
          <MoveNumberField
            label={t("computerAnalysis.form.toMove")}
            value={options.toMove}
            max={moveMax}
            optional
            helperText={t("computerAnalysis.form.toMoveHelp")}
            onCommit={(toMove) => onChange({ toMove })}
            testId={`${testId}-to-move`}
          />
        </Box>
        <SideToggle
          value={options.fromColour === "b" ? "black" : "white"}
          onChange={(side) => onChange({ fromColour: side === "black" ? "b" : "w" })}
          labels={{ white: t("computerAnalysis.form.fromWhite"), black: t("computerAnalysis.form.fromBlack") }}
          ariaLabel={t("computerAnalysis.form.fromColour")}
          testId={`${testId}-from-colour`}
        />
      </SettingsSection>

      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <ExpandToggle
            expanded={advancedOpen}
            onToggle={() => setAdvancedOpen((open) => !open)}
            label={t("computerAnalysis.form.advancedToggle")}
            controls={advancedId}
            testId={`${testId}-advanced`}
          />
          <Typography variant="subtitle2" component="span" aria-hidden="true">
            {t("computerAnalysis.form.advanced")}
          </Typography>
        </Box>
        <Collapse in={advancedOpen} unmountOnExit id={advancedId}>
          <Box sx={{ display: "grid", gap: 2, pt: 1 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("computerAnalysis.form.thresholdsHelp")}
            </Typography>
            {cpSlider("inaccuracy")}
            {cpSlider("mistake")}
            {cpSlider("blunder")}
            <SliderField
              label={t("computerAnalysis.form.range")}
              value={options.variationRangeCp}
              min={bounds.variationRangeCp.min}
              max={bounds.variationRangeCp.max}
              valueLabel={t("computerAnalysis.form.cp", { cp: options.variationRangeCp })}
              help={t("computerAnalysis.form.rangeHelp")}
              onChange={(variationRangeCp) => onChange({ variationRangeCp })}
              testId={`${testId}-range`}
            />
          </Box>
        </Collapse>
      </Box>

      <SettingsSection
        title={t("computerAnalysis.form.variants")}
        description={t("computerAnalysis.form.variantsHelp")}
        testId={`${testId}-variants`}
      >
        {COMPUTER_ANALYSIS_VARIANTS.map((variant) => (
          <CheckboxField
            key={variant}
            label={t(`computerAnalysis.variants.${variant}`)}
            help={t(`computerAnalysis.form.variantHelp.${variant}`)}
            checked={options.outputs.includes(variant)}
            onChange={(ticked) => toggleVariant(variant, ticked)}
            testId={`${testId}-variant-${variant}`}
          />
        ))}
      </SettingsSection>

      <Box sx={{ display: "grid", gap: 1, justifyItems: "start" }}>
        <Button
          variant="contained"
          onClick={onStart}
          disabled={note !== undefined || busy}
          aria-describedby={note === undefined ? undefined : `${testId}-start-note`}
          data-testid={`${testId}-start`}
        >
          {t("computerAnalysis.form.start")}
        </Button>
        {note !== undefined && (
          <Typography id={`${testId}-start-note`} variant="body2" data-testid={`${testId}-start-note`} sx={{ color: "text.secondary" }}>
            {note}
          </Typography>
        )}
        {problem !== undefined && (
          <StatusText tone="error" testId={`${testId}-problem`}>
            {t(`computerAnalysis.form.problem.${problem}`)}
          </StatusText>
        )}
      </Box>
    </Box>
  );
}

export default ComputerAnalysisForm;
