import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DialogContentText from "@mui/material/DialogContentText";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { BaseDialog, type ExtraDialogProps } from "../../../design-system/components/dialogs";
import { InlineAlert } from "../../../design-system/components/feedback";
import type { JobEngineChange } from "../../../lib/jobs/engineJobSettings";

export type JobSettingsChangedDialogProps = {
  open: boolean;
  /** The job's title, as its row and page name it. */
  name: string;
  /**
   * What the job was queued with that differs from the settings in effect —
   * `jobEngineChanges`, the engine row's values **its engines' names** (the
   * screen names them).
   */
  changes: readonly JobEngineChange[];
  /** The new job is being queued: every action off, no closing. */
  busy?: boolean;
  /** Why the new job could not be queued — said in the dialog; the job is as it was. */
  error?: ReactNode;
  /** **Continue with the job's settings** — the job resumed as it is. */
  onKeep: () => void;
  /** **Continue with current settings** — a new job with today's settings, the results so far carried over. */
  onCurrent: () => void;
  /** Cancel, Escape, the backdrop: nothing happens. */
  onClose: () => void;
  /**
   * The dialog's root; the list `<testId>-changes` (a row
   * `<testId>-change-<field>`, an option's `<testId>-change-option-<name>`),
   * the problem `<testId>-error`, the actions `<testId>-keep`,
   * `<testId>-current` and `<testId>-cancel`.
   */
  testId: string;
  /** Anything else MUI's `Dialog` takes — the gallery's frame. */
  dialogProps?: ExtraDialogProps;
};

/** Each search field's label — the words the job's page shows it under. */
const SEARCH_LABEL_KEY = {
  depth: "jobs.facts.depth",
  moveTimeMs: "jobs.facts.time",
  threads: "jobs.facts.threads",
  hashMb: "jobs.facts.hash",
} as const;

/** One side of a row in the reader's words. */
const valueWords = (t: TFunction, change: JobEngineChange, value: JobEngineChange["job"]): string => {
  if (value === undefined) return t("jobs.settingsChanged.notSent");
  if (typeof value === "boolean") return t(value ? "jobs.settingsChanged.on" : "jobs.settingsChanged.off");
  if (change.field === "moveTimeMs") {
    return value === 0 ? t("jobs.facts.noTimeLimit") : t("jobs.facts.seconds", { count: Math.round(Number(value) / 100) / 10 });
  }
  if (change.field === "hashMb") return t("jobs.settingsChanged.megabytes", { value });
  return String(value);
};

/** A row's setting: the engine, the preset, an option under its own name, a search field. */
const settingWords = (t: TFunction, change: JobEngineChange): string => {
  if (change.field === "engine") return t("jobs.facts.engine");
  if (change.field === "preset") return t("jobs.kinds.computerAnalysis.facts.preset");
  if (change.field === "option") return change.name;
  return t(SEARCH_LABEL_KEY[change.field]);
};

/**
 * **"Engine settings changed", asked on Resume** (CTA-236) — an engine job
 * paused, interrupted or failed whose engine settings differ from the ones a
 * new job would be given now: one row per setting that differs — the
 * engine, the preset and each of its options sent differently, depth, move
 * time, Threads, Hash — the job's value, then the current one; and three
 * answers: **Continue with the job's settings** (it resumes as it is),
 * **Continue with current settings** (the primary — queued again as a new
 * job, the positions it has analysed kept, the rest analysed with today's
 * settings, which the dialog says) and Cancel.
 *
 * Presentational: the changes arrive (`jobEngineChanges`), the busy state
 * and the problem are props, the answers leave as callbacks — the resume
 * and the new job are the screen's (`views/jobs/useResumeJob.tsx`). Its
 * words are `jobs.settingsChanged.*`.
 */
function JobSettingsChangedDialog({
  open,
  name,
  changes,
  busy = false,
  error,
  onKeep,
  onCurrent,
  onClose,
  testId,
  dialogProps,
}: JobSettingsChangedDialogProps) {
  const { t } = useTranslation();
  return (
    <BaseDialog
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={t("jobs.settingsChanged.title")}
      width="sm"
      testId={testId}
      dialogProps={dialogProps}
      actions={
        <>
          <Button onClick={onClose} disabled={busy} data-testid={`${testId}-cancel`}>
            {t("jobs.settingsChanged.cancel")}
          </Button>
          <Button onClick={onKeep} disabled={busy} data-testid={`${testId}-keep`}>
            {t("jobs.settingsChanged.keep")}
          </Button>
          <Button variant="contained" onClick={onCurrent} disabled={busy} data-testid={`${testId}-current`}>
            {t("jobs.settingsChanged.current")}
          </Button>
        </>
      }
    >
      <DialogContentText data-testid={`${testId}-message`}>{t("jobs.settingsChanged.message", { name })}</DialogContentText>
      <Box component="ul" data-testid={`${testId}-changes`} sx={{ m: 0, mt: 1, paddingInlineStart: 3 }}>
        {changes.map((change) => {
          const id = change.field === "option" ? `option-${change.name}` : change.field;
          return (
            <Box
              component="li"
              key={id}
              data-testid={`${testId}-change-${id}`}
              // An option is the preset's: drawn under it.
              sx={change.field === "option" ? { marginInlineStart: 2 } : undefined}
            >
              <bdi>
                {t("jobs.settingsChanged.change", {
                  setting: settingWords(t, change),
                  job: valueWords(t, change, change.job),
                  current: valueWords(t, change, change.current),
                })}
              </bdi>
            </Box>
          );
        })}
      </Box>
      <Typography variant="body2" color="text.secondary" data-testid={`${testId}-note`} sx={{ mt: 1.5 }}>
        {t("jobs.settingsChanged.note")}
      </Typography>
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

export default JobSettingsChangedDialog;
