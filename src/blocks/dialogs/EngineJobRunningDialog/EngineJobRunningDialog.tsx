import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { ConfirmDialog, type ExtraDialogProps } from "../../../design-system/components/dialogs";

export type EngineJobRunningDialogProps = {
  open: boolean;
  /** The running job's title, as the Jobs screens name it. */
  jobTitle: string;
  /** **Pause the job** — the job paused (Resume from Jobs goes on from its checkpoint), then the board's engine starts. */
  onPause: () => void;
  /** **Wait for it to finish** (Escape and the backdrop too) — the board's engine stays off. */
  onWait: () => void;
  /** The dialog's root; the message `<testId>-message`, the actions `<testId>-wait` and `<testId>-pause`. */
  testId: string;
  /** Anything else MUI's `Dialog` takes — the gallery's frame. */
  dialogProps?: ExtraDialogProps;
};

/**
 * **A board's engine asked for while an engine job runs** (CTA-237) — one
 * engine runs at a time in the whole app, so turning a board's engine on (or
 * arriving at a board whose engine starts on, Play with Engine) while a job's
 * engine runs, in any tab, asks first: it names the job, and offers **Pause
 * the job** (the board's engine starts once it has paused) or **Wait for it
 * to finish** (the engine stays off; turning it on later asks again while a
 * job still runs).
 *
 * Presentational: the job's title arrives, the answers leave as callbacks;
 * the gate is the board core's (`views/board/core/useEngineGate.ts`), drawn by
 * its host (`EngineGateHost`). Its words are `engineGate.*`.
 */
function EngineJobRunningDialog({ open, jobTitle, onPause, onWait, testId, dialogProps }: EngineJobRunningDialogProps) {
  const { t } = useTranslation();
  return (
    <ConfirmDialog
      open={open}
      onClose={onWait}
      onConfirm={onPause}
      title={t("engineGate.title")}
      message={t("engineGate.message", { title: jobTitle })}
      confirmLabel={t("engineGate.pause")}
      cancelLabel={t("engineGate.wait")}
      width="sm"
      testId={testId}
      confirmTestId={`${testId}-pause`}
      cancelTestId={`${testId}-wait`}
      dialogProps={dialogProps}
    >
      <DialogHint testId={testId} />
    </ConfirmDialog>
  );
}

/** What each answer does — under the question. */
function DialogHint({ testId }: { testId: string }) {
  const { t } = useTranslation();
  return (
    <Typography variant="body2" color="text.secondary" data-testid={`${testId}-hint`} sx={{ mt: 1.5 }}>
      {t("engineGate.hint")}
    </Typography>
  );
}

export default EngineJobRunningDialog;
