import { useState } from "react";
import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";

import type { ExtraDialogProps } from "../../../design-system/components/dialogs";
import { FormDialog } from "../../../design-system/components/dialogs";
import { CheckboxField, RadioGroupField } from "../../../design-system/components/forms";
import type { OpeningTreePgnTags } from "../../../lib/openingTreePgn";

type Mode = "no" | "tags";

export type OpeningTreePgnDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Save, with the tags to write — none for No. */
  onSave: (tags: OpeningTreePgnTags) => void;
  /** The root; the parts are `-mode` (its radios `<prefix>-no`, `-tags`), `-games`, `-prc`, `-confirm`, `-cancel`. */
  testId: string;
  /** The parts' prefix — the Library's `library-filter-moves-save`. Absent, `testId`. */
  partsTestId?: string;
  dialogProps?: ExtraDialogProps;
};

/**
 * **Save tree as PGN's choice** (CTA-113; the dialog of CTA-99) — whether
 * the opening board's tree is written with its counts: **No** (the moves
 * alone) or **Add tags**, and then which — `[%games N]`, `[%prc P]`, or both
 * in one comment. The boxes are off while No is picked, and Save is off
 * while Add tags has neither ticked. Opens on Add tags with `games` ticked;
 * the choice then stays while the screen does. A `FormDialog` over a
 * `RadioGroupField` and two `CheckboxField`s; presentational: `onSave` is
 * handed the tags to write. Its words are the Library's
 * (`library.filters.moves.saveDialog.*`).
 */
function OpeningTreePgnDialog({ open, onClose, onSave, testId, partsTestId = testId, dialogProps }: OpeningTreePgnDialogProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("tags");
  const [games, setGames] = useState(true);
  const [prc, setPrc] = useState(false);
  const tagging = mode === "tags";
  const key = (part: string) => `library.filters.moves.saveDialog.${part}`;

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={() => onSave(tagging ? { games, prc } : { games: false, prc: false })}
      title={t(key("title"))}
      submitLabel={t(key("save"))}
      cancelLabel={t(key("cancel"))}
      submitDisabled={tagging && !games && !prc}
      testId={testId}
      submitTestId={`${partsTestId}-confirm`}
      cancelTestId={`${partsTestId}-cancel`}
      dialogProps={dialogProps}
    >
      <RadioGroupField<Mode>
        label={t(key("mode"))}
        options={[
          { value: "no", label: t(key("no")) },
          { value: "tags", label: t(key("tags")) },
        ]}
        value={mode}
        onChange={setMode}
        testId={`${partsTestId}-mode`}
        optionTestId={(value) => `${partsTestId}-${value}`}
      />
      <Box sx={{ display: "grid", gap: 0.5, paddingInlineStart: 4 }}>
        <CheckboxField
          label={t(key("games"))}
          help={t(key("gamesHelp"))}
          checked={games}
          onChange={setGames}
          disabled={!tagging}
          testId={`${partsTestId}-games`}
        />
        <CheckboxField
          label={t(key("prc"))}
          help={t(key("prcHelp"))}
          checked={prc}
          onChange={setPrc}
          disabled={!tagging}
          testId={`${partsTestId}-prc`}
        />
      </Box>
    </FormDialog>
  );
}

export default OpeningTreePgnDialog;
