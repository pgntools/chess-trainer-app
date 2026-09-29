import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";

import { CheckboxField, FieldLabel, SelectField, SideToggle } from "../../../design-system/components/forms";
import { enPassantOptions, type CastlingFlag, type PositionFields as Fields } from "../../../lib/positionEditor";

export type PositionFieldsProps = {
  /** The editor's test-id prefix: `<testId>-position-fields`, `-turn-w` / `-turn-b`, `-castling-<flag>`, `-en-passant`. */
  testId: string;
  fields: Fields;
  onTurnChange: (turn: "w" | "b") => void;
  onCastlingChange: (flag: CastlingFlag, allowed: boolean) => void;
  onEnPassantChange: (square: string) => void;
};

/** The four flags, with the label each one is shown under. */
const CASTLING_CONTROLS = [
  { flag: "K", labelKey: "positionEditor.fields.whiteKingside" },
  { flag: "Q", labelKey: "positionEditor.fields.whiteQueenside" },
  { flag: "k", labelKey: "positionEditor.fields.blackKingside" },
  { flag: "q", labelKey: "positionEditor.fields.blackQueenside" },
] as const;

/**
 * **A position's other fields** (CTA-113; the position editor's Position tab)
 * — FEN fields 2, 3 and 4, one control each: the side to move (`SideToggle`),
 * the four castling rights (`CheckboxField`s in a named `fieldset`) and the en
 * passant target (a `SelectField` over the squares `enPassantOptions` says are
 * possible for the side to move — eight squares and "none" is the whole
 * space, so nothing typed needs checking). One label style (`FieldLabel`),
 * where it had two.
 *
 * The board answers field 1 and these the rest, and each writes straight into
 * the editor's fields and reads back out of them — a FEN pasted in shows up
 * here, a box ticked here shows up in the FEN. Changing the side to move does
 * **not** turn the board: arranging a position is not being handed one.
 *
 * Presentational: the fields arrive, each change leaves as a callback. Its
 * words are the editor's (`positionEditor.fields.*`).
 */
function PositionFields({ testId, fields, onTurnChange, onCastlingChange, onEnPassantChange }: PositionFieldsProps) {
  const { t } = useTranslation();
  const turnLabelId = `${testId}-turn-label`;

  return (
    <Box data-testid={`${testId}-position-fields`} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box>
        <FieldLabel component="span" id={turnLabelId}>
          {t("positionEditor.fields.turn")}
        </FieldLabel>
        <SideToggle
          value={fields.turn === "w" ? "white" : "black"}
          onChange={(side) => onTurnChange(side === "white" ? "w" : "b")}
          labels={{ white: t("positionEditor.fields.white"), black: t("positionEditor.fields.black") }}
          ariaLabel={t("positionEditor.fields.turn")}
          buttonTestIds={{ white: `${testId}-turn-w`, black: `${testId}-turn-b` }}
          testId={`${testId}-turn`}
        />
      </Box>

      <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
        <FieldLabel component="legend">{t("positionEditor.fields.castling")}</FieldLabel>
        {CASTLING_CONTROLS.map(({ flag, labelKey }) => (
          <CheckboxField
            key={flag}
            // The castle is notation and reads left to right in every language.
            label={<span dir="ltr">{t(labelKey)}</span>}
            checked={fields.castling[flag]}
            onChange={(allowed) => onCastlingChange(flag, allowed)}
            // The editor's tests reach the input inside the checkbox.
            testIdOn="control"
            testId={`${testId}-castling-${flag}`}
          />
        ))}
      </Box>

      <SelectField
        label={t("positionEditor.fields.enPassant")}
        value={fields.enPassant}
        onChange={onEnPassantChange}
        options={enPassantOptions(fields.turn).map((square) => ({
          value: square,
          label: square === "-" ? t("positionEditor.fields.enPassantNone") : square,
        }))}
        optionDir="ltr"
        // The editor's tests click the visible select.
        testIdOn="display"
        testId={`${testId}-en-passant`}
      />
    </Box>
  );
}

export default PositionFields;
