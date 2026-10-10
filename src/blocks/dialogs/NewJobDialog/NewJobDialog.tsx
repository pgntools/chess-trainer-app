import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { BaseDialog, type ExtraDialogProps } from "../../../design-system/components/dialogs";
import { StatusText } from "../../../design-system/components/feedback";
import type { JobStatus } from "../../../lib/jobs";
import { ComputerAnalysisForm, computerAnalysisStartNote, type ComputerAnalysisFormProps } from "../../forms/ComputerAnalysisForm";

export type NewJobDialogProps = Omit<ComputerAnalysisFormProps, "testId" | "onStart"> & {
  open: boolean;
  /** Escape, the backdrop, Cancel — never while the job is being queued. */
  onClose: () => void;
  /** The game the job is for, said under the title — the reader's name for it, or its players'. */
  gameName: string;
  /**
   * This game has a job already (CTA-177): the dialog opens on a choice —
   * **Start a new analysis** (the form) or **Check existing** (`onCheck`, the
   * screen's way to the job) — with the job's status said. Read as the dialog
   * opens; absent, it opens on the form.
   */
  existing?: { status: JobStatus; onCheck: () => void };
  /** Queue the job — the actions row's Start, off while the form says why or `busy`. */
  onStart: () => void;
  /**
   * The root; the form is `<testId>-form` (its parts as `ComputerAnalysisForm`
   * names them), the game line `-game`, Start `-start`, its note
   * `-start-note`, a refusal `-problem`, Cancel `-cancel`; the choice's
   * words `-existing`, its buttons `-new` and `-check`.
   */
  testId: string;
  /** Anything else MUI's `Dialog` takes — the gallery's frame. */
  dialogProps?: ExtraDialogProps;
};

/**
 * **New Job** (CTA-177) — the one way a game's computer analysis is started,
 * from the Analyse icon on the Analysis Board's header and on every saved
 * analysis in the list: `ComputerAnalysisForm` (every option the job takes)
 * in a dialog, its **Start** in the actions row beside Cancel, why Start is
 * off said there (`computerAnalysisStartNote`) and a refusal too.
 *
 * When the game has a job already (`existing`) the dialog first asks:
 * **Start a new analysis** turns it to the form, the focus put on the game's
 * line so it is not lost with the button; **Check existing** is the screen's
 * (the Jobs screen at that job).
 *
 * Presentational: the options, the engine, the game's name and every outcome
 * are props; the queueing, the snackbar and the closing are the screen's
 * (`views/tools/analysis/NewJob.tsx`). Its words are `computerAnalysis.newJob.*`
 * and the form's `computerAnalysis.form.*`.
 */
function NewJobDialog({
  open,
  onClose,
  gameName,
  existing,
  onStart,
  busy = false,
  problem,
  testId,
  dialogProps,
  ...form
}: NewJobDialogProps) {
  const { t } = useTranslation();
  // The choice first when the game has a job — decided as the dialog opens, adjusted during render.
  const [choosing, setChoosing] = useState(open && existing !== undefined);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setChoosing(existing !== undefined);
  }
  // Start a new analysis takes its button away: the focus goes to the game's line as it mounts.
  const focusGame = useRef(false);
  const gameLine = (node: HTMLParagraphElement | null) => {
    if (node === null || !focusGame.current) return;
    focusGame.current = false;
    node.focus();
  };

  const noteKey = computerAnalysisStartNote(form.options, form.blocked);
  const showChoice = choosing && existing !== undefined;

  return (
    <BaseDialog
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={t("computerAnalysis.newJob.title")}
      width="sm"
      dividers={!showChoice}
      testId={testId}
      dialogProps={dialogProps}
      actions={
        showChoice ? (
          <>
            <Button onClick={onClose} data-testid={`${testId}-cancel`}>
              {t("computerAnalysis.newJob.cancel")}
            </Button>
            <Button onClick={existing.onCheck} data-testid={`${testId}-check`}>
              {t("computerAnalysis.newJob.existing.check")}
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                focusGame.current = true;
                setChoosing(false);
              }}
              data-testid={`${testId}-new`}
            >
              {t("computerAnalysis.newJob.existing.startNew")}
            </Button>
          </>
        ) : (
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: 1, width: "100%" }}>
            <Box sx={{ flex: "1 1 12rem", minWidth: 0 }}>
              {noteKey !== undefined && (
                <Typography id={`${testId}-start-note`} variant="body2" data-testid={`${testId}-start-note`} sx={{ color: "text.secondary" }}>
                  {t(noteKey)}
                </Typography>
              )}
              {problem !== undefined && (
                <StatusText tone="error" testId={`${testId}-problem`}>
                  {t(`computerAnalysis.form.problem.${problem}`)}
                </StatusText>
              )}
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button onClick={onClose} disabled={busy} data-testid={`${testId}-cancel`}>
                {t("computerAnalysis.newJob.cancel")}
              </Button>
              <Button
                variant="contained"
                onClick={onStart}
                disabled={noteKey !== undefined || busy}
                aria-busy={busy || undefined}
                aria-describedby={noteKey === undefined ? undefined : `${testId}-start-note`}
                startIcon={busy ? <CircularProgress aria-hidden size={16} color="inherit" /> : undefined}
                data-testid={`${testId}-start`}
              >
                {t("computerAnalysis.form.start")}
              </Button>
            </Box>
          </Box>
        )
      }
    >
      {showChoice ? (
        <Typography variant="body2" data-testid={`${testId}-existing`}>
          {t("computerAnalysis.newJob.existing.text", { name: gameName, status: t(`jobs.status.${existing.status}`) })}
        </Typography>
      ) : (
        <Box sx={{ display: "grid", gap: 2 }}>
          <Box>
            <Typography
              ref={gameLine}
              tabIndex={-1}
              variant="subtitle2"
              data-testid={`${testId}-game`}
              sx={(theme) => ({ fontWeight: 700, "&:focus": { outline: "none" }, "&:focus-visible": theme.mixins.focusRing })}
            >
              {t("computerAnalysis.newJob.game")} <bdi dir="auto">{gameName}</bdi>
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("computerAnalysis.newJob.intro")}
            </Typography>
          </Box>
          <ComputerAnalysisForm {...form} testId={`${testId}-form`} />
        </Box>
      )}
    </BaseDialog>
  );
}

export default NewJobDialog;
