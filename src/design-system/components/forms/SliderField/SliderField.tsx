import { useId, useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import Slider from "@mui/material/Slider";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import type { VisibleLabel } from "../../a11y";

/**
 * The number box at the end of a slider (CTA-185) — its value in its own unit
 * (seconds where the slider's is a mark's slot), so it is not tied to the
 * slider's scale.
 */
export type SliderFieldInput = {
  /** The box's accessible name — required with it ("Search depth, typed"). */
  label: string;
  /** What it shows; `undefined` shows it empty, with `emptyText`. */
  value: number | undefined;
  /** A typed number, held to `min` … `max` (and to whole numbers where `step` is 1). */
  onChange: (value: number) => void;
  min: number;
  max: number;
  /** The spin buttons' step — 1, the default, takes whole numbers only. */
  step?: number;
  /** A unit after the number ("s"). */
  unit?: string;
  /** What an empty box shows ("∞"). */
  emptyText?: string;
  /** Off on its own, the slider still live — move time on its ∞ mark. The slider's `disabled` turns it off too. */
  disabled?: boolean;
};

export type SliderFieldProps = {
  label: VisibleLabel;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  /** The slider's step — 1, the default; `null` snaps it to the marks alone (MUI's own). */
  step?: number | null;
  /** What the header shows beside the label — absent, the number itself. */
  valueLabel?: ReactNode;
  /**
   * Labelled marks on the slider (CTA-163), positioned by their value. The
   * slider still steps by `step`; a caller whose marks are the only legal
   * values makes them the step's grid, or passes `step={null}`.
   */
  marks?: ReadonlyArray<{ value: number; label?: ReactNode }>;
  /** The slider's value as words for a screen reader (`aria-valuetext`, CTA-163). */
  valueText?: string;
  /** A neutral helper caption under the slider ("Engine memory (RAM)"). */
  help?: ReactNode;
  /** A caption under the slider (a notice: "fixed at 1 in this build"). */
  notice?: ReactNode;
  disabled?: boolean;
  /**
   * A number box at the slider's end (CTA-185), to type a value — the slider
   * and it in step both ways. With it the header shows the label alone: the
   * box is the value. Absent, no box.
   */
  input?: SliderFieldInput;
  /** The root's test id; `<testId>-value` is the header's value, `<testId>-input` the slider's input, `<testId>-number` the number box, `<testId>-help` its helper, `<testId>-notice` the caption. */
  testId: string;
};

/**
 * **A labelled slider** (CTA-108): a header with the label at the start and
 * the value at the end (`dir="ltr"`, so a number never reverses), a small
 * slider under it, the slider dimmed while off. The option sliders and the four
 * depth and move-time rows each wrote this header; this is it once.
 *
 * The notice is never dimmed (CTA-109): it says why the slider is off, and at
 * 60 % a warning caption fell to 2.5:1 — a browser audit of the Engine tab
 * found it. Nor is the header (CTA-142): its value in the secondary text
 * colour fell to 4.0:1 at 60 % — the browser audit again, once the Lobby's
 * panel was shown whole. Nor is the help (CTA-163) — same reason. Only the
 * slider fades.
 *
 * `input` adds a number box at the slider's end (CTA-185, the top bar's
 * Engine menu): a value typed is held to its bounds and reported at once, the
 * box keeping the reader's own text while they type and showing the value
 * again when they leave it (or press Enter).
 */
function SliderField({ label, value, onChange, min, max, step = 1, valueLabel, marks, valueText, help, notice, disabled = false, input, testId }: SliderFieldProps) {
  const labelId = useId();
  // Room on both sides for the thumb (and its focus ring) at either end of the rail, where it is half past it.
  const slider = (
    <Box sx={{ paddingInline: 1 }}>
      <Slider
        size="small"
        value={value}
        min={min}
        max={max}
        step={step}
        marks={marks === undefined ? undefined : [...marks]}
        aria-valuetext={valueText}
        disabled={disabled}
        onChange={(_event, next) => onChange(Array.isArray(next) ? next[0] : next)}
        sx={{ opacity: disabled ? 0.6 : 1 }}
        slotProps={{ input: { "aria-labelledby": labelId, "data-testid": `${testId}-input` } as object }}
      />
    </Box>
  );
  return (
    <Box data-testid={testId}>
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1 }}>
        <Typography id={labelId} variant="body2" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        {input === undefined && (
          <Typography variant="body2" color="text.secondary" dir="ltr" data-testid={`${testId}-value`}>
            {valueLabel ?? value}
          </Typography>
        )}
      </Box>
      {input === undefined ? (
        slider
      ) : (
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
          {/* Down by half the box's extra height, so the rail meets the box's middle. */}
          <Box sx={{ flex: 1, minWidth: 0, pt: 0.75 }}>{slider}</Box>
          <SliderNumberBox input={input} disabled={disabled || input.disabled === true} testId={`${testId}-number`} />
        </Box>
      )}
      {help !== undefined && (
        <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }} data-testid={`${testId}-help`}>
          {help}
        </Typography>
      )}
      {notice !== undefined && (
        <Typography variant="caption" sx={{ display: "block", color: "warning.main" }} data-testid={`${testId}-notice`}>
          {notice}
        </Typography>
      )}
    </Box>
  );
}

/**
 * The number box's one width, unit or none (CTA-185): five digits ("120.5"),
 * a unit and the browser's spin buttons — so boxes in a column line up.
 */
const NUMBER_BOX_WIDTH_PX = 112;

/** A typed number held to the box's bounds — whole where it steps by 1 — or `undefined` where it is no number. */
const heldTyped = (text: string, { min, max, step = 1 }: SliderFieldInput): number | undefined => {
  if (text.trim() === "") return undefined;
  const typed = Number(text);
  if (!Number.isFinite(typed)) return undefined;
  const held = Math.min(Math.max(typed, min), max);
  return step === 1 ? Math.round(held) : held;
};

/** The number box: the reader's text while they type, the value otherwise. */
function SliderNumberBox({ input, disabled, testId }: { input: SliderFieldInput; disabled: boolean; testId: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = disabled || draft === null ? (input.value === undefined ? "" : String(input.value)) : draft;
  const settle = () => setDraft(null);
  return (
    <TextField
      type="number"
      size="small"
      value={shown}
      placeholder={input.value === undefined ? input.emptyText : undefined}
      disabled={disabled}
      onChange={(event) => {
        setDraft(event.target.value);
        const typed = heldTyped(event.target.value, input);
        if (typed !== undefined) input.onChange(typed);
      }}
      onBlur={settle}
      onKeyDown={(event) => {
        if (event.key === "Enter") settle();
      }}
      sx={{ width: NUMBER_BOX_WIDTH_PX, flexShrink: 0 }}
      slotProps={{
        input: {
          endAdornment:
            input.unit === undefined ? undefined : (
              <InputAdornment position="end" disableTypography sx={{ color: "text.secondary" }}>
                {input.unit}
              </InputAdornment>
            ),
        },
        htmlInput: {
          "aria-label": input.label,
          min: input.min,
          max: input.max,
          step: input.step ?? 1,
          inputMode: (input.step ?? 1) === 1 ? "numeric" : "decimal",
          dir: "ltr",
          autoComplete: "off",
          "data-testid": testId,
        },
      }}
    />
  );
}

export default SliderField;
