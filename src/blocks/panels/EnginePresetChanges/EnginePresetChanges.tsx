import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { FormDialog } from "../../../design-system/components/dialogs";
import { FeedbackStrip } from "../../../design-system/components/feedback";
import { TextInputField } from "../../../design-system/components/forms";
import { HintButton } from "../../../design-system/components/toolbars";
import { MAX_PRESET_NAME_LENGTH, presetNameOf } from "../../../lib/enginePresets";

export type EnginePresetChangesProps = {
  /** The preset edited, in the reader's language. */
  presetName: string;
  /**
   * How it is drawn: the strip under a preset select (the default, Settings →
   * Engine), or the actions alone — no strip, no texts (the Engine menu's
   * title row, CTA-189).
   */
  variant?: "strip" | "actions";
  /** Keep the changes in that preset. */
  onSave: () => void;
  /** Keep that preset as it was, and the changes as a new preset of this name. */
  onSaveAs: (name: string) => void;
  /** The strip (or the actions); its parts `-save`, `-save-as`, the name dialog `-name` (its field `-name-input`). */
  testId: string;
};

/**
 * **An engine preset's unsaved changes** (CTA-185) — the strip Settings →
 * Engine's preset form shows while the preset's draft differs from what is
 * saved (`lib/enginePresetDraft.ts`): the changes are in effect already, and
 * **Save** keeps them in the preset or **Save as new preset** keeps them as a
 * new one — named in a dialog, "‹preset› (copy)" to start — leaving the preset
 * as it was. A `FeedbackStrip` in the `success` tone, as a board's changes
 * strip.
 *
 * The **`actions` variant** (CTA-189) is the same two actions without the
 * strip — the top bar's Engine menu places them in its title row, where the
 * texts would not fit; the naming dialog is shared.
 *
 * Presentational: what changed and what each save does are the screen's.
 * Its words are `enginePresets.changes.*` and `enginePresets.*`.
 */
function EnginePresetChanges({ presetName, variant = "strip", onSave, onSaveAs, testId }: EnginePresetChangesProps) {
  const { t } = useTranslation();
  const [naming, setNaming] = useState<string | null>(null);
  const name = presetNameOf(naming ?? "");

  const actions = (
    <>
      <HintButton
        hint={t("enginePresets.changes.saveHelp", { preset: presetName })}
        variant="contained"
        color="success"
        onClick={onSave}
        testId={`${testId}-save`}
      >
        {t("enginePresets.changes.save")}
      </HintButton>
      <HintButton
        hint={t("enginePresets.changes.saveAsHelp", { preset: presetName })}
        variant="outlined"
        onClick={() => setNaming(t("enginePresets.copyName", { name: presetName }))}
        testId={`${testId}-save-as`}
      >
        {t("enginePresets.changes.saveAs")}
      </HintButton>
    </>
  );

  return (
    <>
      {variant === "strip" ? (
        <FeedbackStrip
          tone="success"
          ariaLabel={t("enginePresets.changes.title", { preset: presetName })}
          testId={testId}
          actions={actions}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {t("enginePresets.changes.title", { preset: presetName })}
          </Typography>
          <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
            {t("enginePresets.changes.help")}
          </Typography>
        </FeedbackStrip>
      ) : (
        // The strip's actions row, the same gap, one unit for a title row's end.
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }} data-testid={testId}>
          {actions}
        </Box>
      )}
      <FormDialog
        open={naming !== null}
        onClose={() => setNaming(null)}
        onSubmit={() => {
          if (name === "") return;
          setNaming(null);
          onSaveAs(name);
        }}
        title={t("enginePresets.changes.saveAsTitle")}
        submitLabel={t("enginePresets.create")}
        cancelLabel={t("enginePresets.cancel")}
        submitDisabled={name === ""}
        testId={`${testId}-name`}
      >
        <TextInputField
          label={t("enginePresets.name")}
          value={naming ?? ""}
          onChange={(value) => setNaming(value.slice(0, MAX_PRESET_NAME_LENGTH))}
          dir="auto"
          testId={`${testId}-name-input`}
        />
      </FormDialog>
    </>
  );
}

export default EnginePresetChanges;
