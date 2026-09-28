import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useId } from "react";
import { useTranslation } from "react-i18next";

import { FieldLabel, SelectField, SwitchField } from "../../../design-system/components/forms";
import {
  MASK_PIECE_LETTERS,
  MASK_PRESET_IDS,
  MASK_PRESETS,
  maskPresetOf,
  withMaskEntry,
  type MaskPieceLetter,
  type MaskPieceType,
  type MaskPresetId,
  type PieceMask,
} from "../../../lib/pieceMask";

export type MaskEditorProps = {
  mask: PieceMask;
  onMaskChange: (mask: PieceMask) => void;
  /** Whether every printed move hides a masked piece's letter. */
  notation: boolean;
  onNotationChange: (next: boolean) => void;
  /** Whether the pinned engine lines show — off by default on Masked Pieces. */
  showLines: boolean;
  onShowLinesChange: (next: boolean) => void;
  /**
   * The prefix of every id it sets: `<testId>-editor` (the root),
   * `-presets`, `-preset-<id>`, `-column-<w|b>`, `-select-<type>` (its
   * options `-option`), `-setting-notation`, `-setting-lines`.
   */
  testId: string;
};

/**
 * **The Masking tab** (CTA-109; CTA-79's editor) — which piece is drawn for
 * which, and what the notation and the engine's lines give away:
 *
 * - **the presets**, the specification's variants (§8) — *Show real pieces*
 *   is the way out without leaving the screen; none is pressed for a mask of
 *   the reader's own;
 * - **twelve selects**, a column per colour, each offering only its own
 *   colour's six types — colour is visible information (§3.1), so a white
 *   rook is never drawn as a black pawn;
 * - **the notation switch** and **the engine-lines switch**, each with the
 *   caption that says what it hides.
 *
 * Presentational: the mask (`lib/pieceMask.ts`) and both switches are props,
 * a change leaves as the whole next mask (`withMaskEntry`). Its words are the
 * app's (`masking.*`).
 */
function MaskEditor({ mask, onMaskChange, notation, onNotationChange, showLines, onShowLinesChange, testId }: MaskEditorProps) {
  const { t } = useTranslation();
  const presetsLabelId = useId();
  // `null` for an arrangement of the reader's own — the group has nothing pressed.
  const preset = maskPresetOf(mask);
  const pieceName = (letter: MaskPieceLetter) => t(`masking.pieces.${letter.toLowerCase()}`);

  return (
    <Box data-testid={`${testId}-editor`} sx={{ display: "grid", gap: 2 }}>
      <Box>
        <FieldLabel component="span" id={presetsLabelId}>
          {t("masking.presets.title")}
        </FieldLabel>
        {/* No base component is a list of named, exclusive choices; SideToggle is the sides alone. */}
        <ToggleButtonGroup
          exclusive
          size="small"
          orientation="vertical"
          fullWidth
          value={preset}
          aria-labelledby={presetsLabelId}
          data-testid={`${testId}-presets`}
          onChange={(_event, next: MaskPresetId | null) => {
            // A second click on the pressed preset would leave no mask at all: it changes nothing.
            if (next !== null) onMaskChange(MASK_PRESETS[next]);
          }}
        >
          {MASK_PRESET_IDS.map((id) => (
            <ToggleButton key={id} value={id} data-testid={`${testId}-preset-${id}`}>
              {t(`masking.presets.${id}`)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Box>
        <FieldLabel component="span">{t("masking.drawnAs")}</FieldLabel>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 2 }}>
          {(["w", "b"] as const).map((color) => (
            <Box
              key={color}
              component="fieldset"
              data-testid={`${testId}-column-${color}`}
              sx={{ border: 0, p: 0, m: 0, minWidth: 0, display: "grid", gap: 1.5 }}
            >
              <FieldLabel component="legend">{t(color === "w" ? "masking.white" : "masking.black")}</FieldLabel>
              {MASK_PIECE_LETTERS.map((letter) => {
                const type = `${color}${letter}` as MaskPieceType;
                return (
                  <SelectField
                    key={type}
                    fullWidth
                    label={pieceName(letter)}
                    value={mask[type]}
                    // Its own colour's six types, never the other's.
                    options={MASK_PIECE_LETTERS.map((drawn) => ({ value: `${color}${drawn}`, label: pieceName(drawn) }))}
                    onChange={(value) => onMaskChange(withMaskEntry(mask, type, value as MaskPieceType))}
                    testId={`${testId}-select-${type}`}
                  />
                );
              })}
            </Box>
          ))}
        </Box>
      </Box>

      <SwitchField
        label={t("masking.notation")}
        help={t("masking.notationHint")}
        checked={notation}
        onChange={onNotationChange}
        // The screens' tests reach the input inside the switch, as they did before.
        testIdOn="control"
        testId={`${testId}-setting-notation`}
      />
      <Divider />
      <SwitchField
        label={t("masking.lines")}
        help={t("masking.linesHint")}
        checked={showLines}
        onChange={onShowLinesChange}
        testIdOn="control"
        testId={`${testId}-setting-lines`}
      />
    </Box>
  );
}

export default MaskEditor;
