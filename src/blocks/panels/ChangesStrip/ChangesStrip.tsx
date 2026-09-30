import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { FeedbackStrip, StatusText } from "../../../design-system/components/feedback";
import { linkProps, type LinkTarget } from "../../../design-system/components/link";
import { HintButton } from "../../../design-system/components/toolbars";

export type ChangesStripProps = {
  /** The strip; its parts are `-summary`, `-read-only`, `-protected`, `-update`, `-settings`, `-copy`, `-discard`, `-problem`. */
  testId: string;
  /** The caller's catalog block — `title`, `update`, `updateHelp`, `copy`, `copyHelp`, `discard`, `readOnly`, `protected.*`, `problem.*`. */
  labelKey: string;
  /** What changed, already worded — "2 moves added". */
  summary: string;
  /** Why the last save did not happen — a key under `<labelKey>.problem`; `null` for nothing. */
  problem: string | null;
  /** A protected record: Update gives way to a link to its settings, where protection is switched off. */
  protectedLink?: LinkTarget;
  /** Nothing to update (a shipped game): a note saying why, then only copy and discard. */
  readOnly?: boolean;
  onUpdate?: () => void;
  onCopy: () => void;
  onDiscard: () => void;
};

/**
 * **What to do with a session's changes** (CTA-113; `RepertoireChangesBar`
 * since CTA-63) — the strip a board shows above its footer while its tree
 * differs from the record it opened: make them part of the record
 * (**Update**), keep the record and save a copy with them (**Save as copy**),
 * or drop them (**Discard**). A `FeedbackStrip` in the `success` tone, the
 * comment block's sibling.
 *
 * - **Protected** (a repertoire's setting): Update gives way to a link to the
 *   record's settings, and a note says why.
 * - **Read-only** (a shipped Library game): no Update, a note saying why.
 * - A save that failed says so as an `alert`.
 *
 * Each action's help describes it (a tooltip that describes, never renames —
 * the old strip's Update was named by its help). Presentational: what
 * "changed" means and what each action does are the screen's. Its words are
 * the caller's catalog block (`labelKey`) — the repertoires', the analyses'
 * and the Library's each keep their own.
 */
function ChangesStrip({ testId, labelKey, summary, problem, protectedLink, readOnly = false, onUpdate, onCopy, onDiscard }: ChangesStripProps) {
  const { t } = useTranslation();
  return (
    <Box sx={{ mb: 1 }}>
      <FeedbackStrip
        tone="success"
        ariaLabel={t(`${labelKey}.title`)}
        testId={testId}
        actions={
          <>
            {readOnly ? null : protectedLink === undefined ? (
              <HintButton hint={t(`${labelKey}.updateHelp`)} variant="contained" color="success" onClick={onUpdate} testId={`${testId}-update`}>
                {t(`${labelKey}.update`)}
              </HintButton>
            ) : (
              <Button size="small" variant="outlined" data-testid={`${testId}-settings`} {...linkProps(protectedLink)}>
                {t(`${labelKey}.protected.settings`)}
              </Button>
            )}
            <HintButton hint={t(`${labelKey}.copyHelp`)} variant="outlined" onClick={onCopy} testId={`${testId}-copy`}>
              {t(`${labelKey}.copy`)}
            </HintButton>
            <Button size="small" onClick={onDiscard} data-testid={`${testId}-discard`}>
              {t(`${labelKey}.discard`)}
            </Button>
          </>
        }
      >
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {t(`${labelKey}.title`)}
          <Typography
            component="span"
            variant="body2"
            data-testid={`${testId}-summary`}
            sx={{ color: "text.secondary", fontWeight: 400, marginInlineStart: 1 }}
          >
            {summary}
          </Typography>
        </Typography>
        {readOnly && (
          <Typography variant="caption" data-testid={`${testId}-read-only`} sx={{ display: "block", color: "text.secondary", mt: 0.25 }}>
            {t(`${labelKey}.readOnly`)}
          </Typography>
        )}
        {protectedLink !== undefined && (
          <Typography variant="caption" data-testid={`${testId}-protected`} sx={{ display: "block", color: "text.secondary", mt: 0.25 }}>
            {t(`${labelKey}.protected.note`)}
          </Typography>
        )}
        {problem !== null && (
          <StatusText tone="error" testId={`${testId}-problem`}>
            {t(`${labelKey}.problem.${problem}`)}
          </StatusText>
        )}
      </FeedbackStrip>
    </Box>
  );
}

export default ChangesStrip;
