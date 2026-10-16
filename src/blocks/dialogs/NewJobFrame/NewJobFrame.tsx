import { useId, type ReactNode } from "react";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { FormDialog, type ExtraDialogProps } from "../../../design-system/components/dialogs";
import { StatusText } from "../../../design-system/components/feedback";
import { FieldLabel } from "../../../design-system/components/forms";

/** A kind of job the entity can be given — its name, what it does, and why not where it cannot be started. */
export type NewJobKindOption = {
  /** The kind's id (`repertoire.evaluation`). */
  id: string;
  name: string;
  /** One line: what it does. */
  description: string;
  /** It cannot be started here, and why ("Needs an engine server"). Absent, it can. */
  disabledReason?: string;
};

export type NewJobFrameProps = {
  open: boolean;
  /** Escape, the backdrop, Cancel — never while the job is being queued. */
  onClose: () => void;
  /** Queue the job — Start, off while `startBlockedNote` or the frame says why, or `busy`. */
  onStart: () => void;
  /** The kinds whose `appliesTo` holds the entity's type, in the order offered. */
  kinds: readonly NewJobKindOption[];
  /** The kind chosen; `undefined` before one is. */
  kindId: string | undefined;
  onKindChange: (kindId: string) => void;
  /** The chosen kind's form (its view registry's) — under the kinds. Absent, nothing there. */
  children?: ReactNode;
  /** What the job is for, said under the title — the entity's name ("My Caro-Kann"). Absent, no line. */
  subjectLabel?: string;
  /** The dialog's title. Absent, "New job". */
  title?: string;
  /** Start is off for the form's own reason (an option out of range) — said beside it. Absent, none. */
  startBlockedNote?: string;
  /** Queueing was refused — said beside Start, as an alert. */
  problem?: string;
  /** Being queued: both buttons off, a spinner in Start, no closing. */
  busy?: boolean;
  /**
   * The root; the kinds are `-kinds` (each radio `-kind-<id>`), the subject
   * line `-subject`, Start `-submit`, its note `-submit-note`, a refusal
   * `-problem`, Cancel `-cancel`.
   */
  testId: string;
  /** Anything else MUI's `Dialog` takes — the gallery's frame. */
  dialogProps?: ExtraDialogProps;
};

/**
 * **New job** (CTA-217) — the one dialog every entity starts a job from,
 * whatever its kind: **the kinds** that apply to it, as radio cards (each its
 * name and one line on what it does; one that cannot start here says why,
 * and cannot be chosen), then **the chosen kind's form** in a slot, then
 * **Start** beside Cancel — off until a kind is chosen, while the form says
 * why (`startBlockedNote`), or while queueing, the reason said beside it and
 * read with it; a refusal said there too, as an alert.
 *
 * Over `FormDialog`, so Enter in a one-line field and Ctrl / ⌘ + Enter start
 * it as Start does. Presentational: the kinds, the choice, the form and every
 * outcome are props; the queueing is the screen's (`useNewJob`). Its words
 * are `jobs.newJob.*`.
 */
function NewJobFrame({
  open,
  onClose,
  onStart,
  kinds,
  kindId,
  onKindChange,
  children,
  subjectLabel,
  title,
  startBlockedNote,
  problem,
  busy = false,
  testId,
  dialogProps,
}: NewJobFrameProps) {
  const { t } = useTranslation();
  const legendId = useId();
  const descriptionId = useId();
  const chosen = kinds.find((kind) => kind.id === kindId && kind.disabledReason === undefined);
  const note = chosen === undefined ? (kinds.length === 0 ? t("jobs.newJob.noKinds") : t("jobs.newJob.chooseKind")) : startBlockedNote;
  const id = (part: string) => `${testId}-${part}`;

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={onStart}
      title={title ?? t("jobs.newJob.title")}
      submitLabel={t("jobs.newJob.start")}
      cancelLabel={t("jobs.newJob.cancel")}
      submitDisabled={note !== undefined}
      busy={busy}
      submitNote={
        note === undefined && problem === undefined ? undefined : (
          <>
            {note}
            {problem !== undefined && (
              <StatusText tone="error" testId={id("problem")}>
                {problem}
              </StatusText>
            )}
          </>
        )
      }
      width="sm"
      testId={testId}
      dialogProps={dialogProps}
    >
      {subjectLabel !== undefined && (
        <Typography variant="subtitle2" data-testid={id("subject")} sx={{ fontWeight: 700 }}>
          {t("jobs.newJob.for")} <bdi dir="auto">{subjectLabel}</bdi>
        </Typography>
      )}

      <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
        <FieldLabel component="legend" id={legendId}>
          {t("jobs.newJob.kinds")}
        </FieldLabel>
        {kinds.length === 0 ? (
          <Typography variant="body2" data-testid={id("kinds")} sx={{ color: "text.secondary" }}>
            {t("jobs.newJob.noKinds")}
          </Typography>
        ) : (
          <RadioGroup
            value={kindId ?? ""}
            onChange={(_event, next) => onKindChange(next)}
            aria-labelledby={legendId}
            data-testid={id("kinds")}
            sx={{ display: "grid", gap: 1 }}
          >
            {kinds.map((kind) => {
              const off = kind.disabledReason !== undefined;
              const selected = kind.id === kindId;
              return (
                <Box
                  key={kind.id}
                  sx={{
                    border: 1,
                    borderColor: selected && !off ? "primary.main" : "divider",
                    borderRadius: 1,
                    px: 1.5,
                    py: 1,
                  }}
                >
                  <FormControlLabel
                    value={kind.id}
                    disabled={off || busy}
                    control={
                      <Radio
                        size="small"
                        slotProps={{
                          input: {
                            "aria-describedby": `${descriptionId}-${kind.id}`,
                            "data-testid": id(`kind-${kind.id}`),
                          } as object,
                        }}
                      />
                    }
                    label={
                      <Typography variant="body2" dir="auto" sx={{ fontWeight: 600 }}>
                        {kind.name}
                      </Typography>
                    }
                    sx={{ m: 0 }}
                  />
                  <Box id={`${descriptionId}-${kind.id}`} sx={(theme) => ({ paddingInlineStart: theme.spacing(4), display: "grid" })}>
                    <Typography variant="caption" dir="auto" sx={{ color: "text.secondary" }}>
                      {kind.description}
                    </Typography>
                    {off && (
                      <Typography variant="caption" dir="auto" data-testid={id(`kind-${kind.id}-off`)} sx={{ color: "text.secondary", fontStyle: "italic" }}>
                        {t("jobs.newJob.kindOff", { reason: kind.disabledReason })}
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            })}
          </RadioGroup>
        )}
      </Box>

      {chosen !== undefined && children}
    </FormDialog>
  );
}

export default NewJobFrame;
