import { useState } from "react";
import TextField from "@mui/material/TextField";
import { useTranslation } from "react-i18next";

import { FormDialog } from "../../design-system/components/dialogs";

/** What a comment dialog is open on: the move, and the text it starts with. */
export type CommentDraft = {
  /** The move as the list prints it — `"9. O-O"` — or the start position. */
  label: string;
  /** `""` to add a comment; the stored text to edit one. */
  initial: string;
  /** Where the text goes once saved — the caller's tree edit. */
  onSave: (text: string) => void;
};

/**
 * **Add or edit one comment** (CTA-69) — the variations explorer's, opened
 * from the move menu's *Add comment* and from the player's comment block.
 *
 * The text is the stored comment as it is, `[%eval 0.3]`-style commands
 * included, so editing one never rewrites what it did not touch; saving an
 * empty text is the caller's delete (`setComments` drops it). Presentational:
 * the caller turns the text into a tree edit, which lands through the core's
 * `replaceTree` like every other edit — so it is a session change the Save
 * strip offers to keep, and Discard takes it back.
 *
 * A `FormDialog` (CTA-113): Ctrl / ⌘ + Enter saves, a plain Enter is a new
 * line. Mounted only while open (`draft !== null`), so each opening starts from
 * its own `initial` without an effect to reset the field.
 */
function CommentDialog({
  draft,
  onClose,
}: {
  draft: CommentDraft | null;
  onClose: () => void;
}) {
  return draft === null ? null : <OpenCommentDialog draft={draft} onClose={onClose} />;
}

function OpenCommentDialog({ draft, onClose }: { draft: CommentDraft; onClose: () => void }) {
  const { t } = useTranslation();
  const [text, setText] = useState(draft.initial);
  const adding = draft.initial === "";

  return (
    <FormDialog
      open
      onClose={onClose}
      onSubmit={() => {
        draft.onSave(text);
        onClose();
      }}
      title={
        <>
          {t(adding ? "commentDialog.addTitle" : "commentDialog.editTitle")} <span dir="ltr">{draft.label}</span>
        </>
      }
      submitLabel={t("commentDialog.save")}
      cancelLabel={t("commentDialog.cancel")}
      // Adding nothing is not a change; emptying an existing one deletes it.
      submitDisabled={adding && text.trim() === ""}
      width="sm"
      testId="comment-dialog"
      submitTestId="comment-dialog-save"
    >
      <TextField
        // eslint-disable-next-line jsx-a11y/no-autofocus -- the dialog's field takes the focus as the dialog opens, as WAI-ARIA's dialog pattern asks (ACCESSIBILITY.md)
        autoFocus
        multiline
        minRows={3}
        maxRows={12}
        fullWidth
        // Named, where it had only a placeholder (CTA-113).
        label={t("commentDialog.label")}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={t("commentDialog.placeholder")}
        helperText={t("commentDialog.help")}
        slotProps={{ htmlInput: { "data-testid": "comment-dialog-text", dir: "auto" } }}
      />
    </FormDialog>
  );
}

export default CommentDialog;
