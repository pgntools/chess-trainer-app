import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Typography from "@mui/material/Typography";
import { useId } from "react";
import { useTranslation } from "react-i18next";

import { FieldLabel } from "../../../design-system/components/forms";
import type { EngineCapabilities } from "../../../lib/engineTypes";
import type { EngineEntry } from "../../../lib/engines";

export type EnginePickerProps = {
  /** The registered engines, each with whether it can run on this page and, if not, why. */
  entries: readonly EngineEntry[];
  /** The id of the engine in use. */
  value: string;
  /** The reader chose an engine that can run here. */
  onChange: (id: string) => void;
  /** On the group (`role="radiogroup"`); each engine is `<testId>-option-<id>`, its radio `<testId>-radio-<id>`. */
  testId: string;
};

/** The words for how an engine's strength can be limited (`EngineCapabilities.strength`). */
const STRENGTH_KEY: Record<EngineCapabilities["strength"], string> = {
  skill: "enginePicker.strength.skill",
  elo: "enginePicker.strength.elo",
  both: "enginePicker.strength.both",
};

/**
 * **The engines to choose between** (CTA-153) — a radio per registered engine
 * (`lib/engines/`): its name, its version, whether it searches on one thread
 * or several, how its strength is set, and — for one this page cannot run — a
 * disabled radio that **says why** ("Needs cross-origin isolation — not
 * available on this host"). Settings → Engine's list.
 *
 * Presentational: the entries (descriptor + availability, computed by the
 * screen at runtime) and the choice arrive as props, a choice leaves through
 * `onChange`. The facts shown are the descriptor's own declaration — what the
 * build says it can do before it runs; the running engine's real option roster
 * is the Engine tab of each board's business (`engineOptionState`), not this
 * list's.
 *
 * Each radio is described by its facts (and its reason, when disabled) through
 * `aria-describedby`, so a screen reader reads the version and the threading
 * with the name. A disabled engine stays in the list: hiding it would leave the
 * reader unable to learn that it exists or what it needs. Names are the
 * builds' own (Latin, pinned left to right); the rest is the app's words
 * (`enginePicker.*`).
 */
function EnginePicker({ entries, value, onChange, testId }: EnginePickerProps) {
  const { t } = useTranslation();
  const legendId = useId();

  return (
    <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, minWidth: 0, display: "grid", gap: 1 }}>
      <FieldLabel component="legend" id={legendId}>
        {t("enginePicker.legend")}
      </FieldLabel>
      <RadioGroup
        value={value}
        onChange={(_event, next) => onChange(next)}
        aria-labelledby={legendId}
        data-testid={testId}
        sx={{ gap: 1 }}
      >
        {entries.map(({ descriptor, availability }) => {
          const { id, name, version, capabilities } = descriptor;
          const unavailable = !availability.available;
          // The radio is named by the engine's name alone and described by the rest, so a screen reader
          // says "Stockfish 19 Lite" and then "Version 19, single-thread …" rather than one long name.
          const nameId = `${testId}-name-${id}`;
          const factsId = `${testId}-facts-${id}`;
          const reasonId = `${testId}-reason-${id}`;
          return (
            <FormControlLabel
              key={id}
              value={id}
              disabled={unavailable}
              data-testid={`${testId}-option-${id}`}
              sx={{
                mx: 0,
                p: 1,
                gap: 1,
                alignItems: "flex-start",
                borderRadius: 1,
                border: "1px solid",
                borderColor: id === value ? "primary.main" : "divider",
              }}
              control={
                <Radio
                  size="small"
                  sx={{ pt: 0.5 }}
                  slotProps={{
                    input: {
                      "aria-labelledby": nameId,
                      "aria-describedby": unavailable ? `${factsId} ${reasonId}` : factsId,
                      "data-testid": `${testId}-radio-${id}`,
                    } as object,
                  }}
                />
              }
              label={
                <Box sx={{ display: "grid", gap: 0.25 }}>
                  <Typography id={nameId} variant="body2" dir="ltr" sx={{ fontWeight: 600, textAlign: "start" }}>
                    {name}
                  </Typography>
                  <Typography id={factsId} variant="caption" color="text.secondary" component="span" data-testid={factsId}>
                    {t("enginePicker.version")} <bdi dir="ltr">{version}</bdi>
                    {" · "}
                    {t(capabilities.multiThread ? "enginePicker.threading.multi" : "enginePicker.threading.single")}
                    {" · "}
                    {t(STRENGTH_KEY[capabilities.strength])}
                  </Typography>
                  {!availability.available && (
                    <Typography id={reasonId} variant="caption" color="text.secondary" component="span" data-testid={reasonId}>
                      {t(`enginePicker.unavailable.${availability.reason}`)}
                    </Typography>
                  )}
                </Box>
              }
            />
          );
        })}
      </RadioGroup>
    </Box>
  );
}

export default EnginePicker;
