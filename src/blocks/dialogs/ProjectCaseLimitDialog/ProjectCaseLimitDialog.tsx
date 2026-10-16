import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DialogContentText from "@mui/material/DialogContentText";
import { useTranslation } from "react-i18next";

import { BaseDialog, type ExtraDialogProps } from "../../../design-system/components/dialogs";
import { InlineAlert } from "../../../design-system/components/feedback";
import { MAX_CASES_PER_PROJECT } from "../../../lib/analysisProjects";

export type ProjectCaseLimitDialogProps = {
  open: boolean;
  /** The Cases the add would make. */
  count: number;
  /** The Cases the Project holds already — `0` for a Project made for these games. */
  existing: number;
  /**
   * The games come out of the Library (its picks): the button saves them as a
   * collection of their own, and the dialog says they are there already.
   */
  inLibrary?: boolean;
  /** The collection is being made: every action off, no closing. */
  busy?: boolean;
  /** Why the collection could not be made — said in the dialog, nothing created. */
  error?: ReactNode;
  /** **Create a Library collection instead** — the same games as a collection; no Case made. */
  onCollection: () => void;
  /** **Create anyway** — the Cases written past the limit. */
  onCreateAnyway: () => void;
  /** Cancel, Escape, the backdrop: nothing made. */
  onClose: () => void;
  /**
   * The dialog's root; the message `<testId>-message`, the suggestion
   * `<testId>-suggestion`, the problem `<testId>-error`, the actions
   * `<testId>-collection`, `<testId>-anyway` and `<testId>-cancel`.
   */
  testId: string;
  /** Anything else MUI's `Dialog` takes — the gallery's frame. */
  dialogProps?: ExtraDialogProps;
};

/**
 * **A Project past its limit of Cases** (CTA-225) — what New project, New
 * case and Send to Analysis open, before any work, when the games would take
 * a Project past {@link MAX_CASES_PER_PROJECT}: how many Cases it would hold,
 * that a Project that large is slow, and a Library collection suggested for a
 * large set of games. Three answers: **Create a Library collection instead**
 * (the primary one — or, for games out of the Library, *Save them as a
 * Library collection instead*), **Create anyway** and Cancel. The limit is
 * soft: the store never refuses past it.
 *
 * Presentational: the numbers, the busy state and the problem are props; the
 * collection's write and the Cases' are the screen's
 * (`views/analysisV2/useProjectCaseLimit.tsx`). Its words are
 * `analysisV2.caseLimit.*`.
 */
function ProjectCaseLimitDialog({
  open,
  count,
  existing,
  inLibrary = false,
  busy = false,
  error,
  onCollection,
  onCreateAnyway,
  onClose,
  testId,
  dialogProps,
}: ProjectCaseLimitDialogProps) {
  const { t, i18n } = useTranslation();
  const number = (value: number) => value.toLocaleString(i18n.language);
  const numbers = {
    count,
    number: number(count),
    existing: number(existing),
    total: number(existing + count),
    max: number(MAX_CASES_PER_PROJECT),
  };
  return (
    <BaseDialog
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={t("analysisV2.caseLimit.title")}
      width="sm"
      testId={testId}
      dialogProps={dialogProps}
      actions={
        <>
          <Button onClick={onClose} disabled={busy} data-testid={`${testId}-cancel`}>
            {t("analysisV2.cancel")}
          </Button>
          <Button onClick={onCreateAnyway} disabled={busy} data-testid={`${testId}-anyway`}>
            {t("analysisV2.caseLimit.anyway")}
          </Button>
          <Button variant="contained" onClick={onCollection} disabled={busy} data-testid={`${testId}-collection`}>
            {t(inLibrary ? "analysisV2.caseLimit.collectionFromLibrary" : "analysisV2.caseLimit.collection")}
          </Button>
        </>
      }
    >
      <DialogContentText data-testid={`${testId}-message`}>
        {t(existing === 0 ? "analysisV2.caseLimit.messageNew" : "analysisV2.caseLimit.messageExisting", numbers)}
      </DialogContentText>
      <DialogContentText data-testid={`${testId}-suggestion`} sx={{ mt: 1.5 }}>
        {t(inLibrary ? "analysisV2.caseLimit.inLibrary" : "analysisV2.caseLimit.suggestion")}
      </DialogContentText>
      {error !== undefined && error !== null && error !== false && (
        <Box sx={{ mt: 1.5 }}>
          <InlineAlert severity="error" dense testId={`${testId}-error`}>
            {error}
          </InlineAlert>
        </Box>
      )}
    </BaseDialog>
  );
}

export default ProjectCaseLimitDialog;
