import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CallMergeRoundedIcon from "@mui/icons-material/CallMergeRounded";
import CallSplitRoundedIcon from "@mui/icons-material/CallSplitRounded";
import { useTranslation } from "react-i18next";

import { InlineAlert } from "../../../design-system/components/feedback";

export type MergeSplitChoiceProps = {
  /** The caller's catalog block: `title`, `explain`, `skipped`, `merge`, `mergeHelp`, `mergeUnavailable`, `split`, `splitHelp`. */
  labelKey: string;
  /** The root; the parts are `-skipped`, `-merge`, `-split` and `-problem`. */
  testId: string;
  /** How many playable games the text holds. */
  count: number;
  /** How many were left out — no moves, or unreadable. */
  skipped: number;
  /** Whether the games share a start position, so one tree can hold them. */
  mergeable: boolean;
  onMerge: () => void;
  /** Absent, no Split is offered — a board that keeps nothing (the Openings explorer). */
  onSplit?: () => void;
  /** What went wrong with the last choice, already worded; `null` for nothing. */
  problem: string | null;
};

/**
 * **The choice a text of many games makes** — merge them into one tree, or
 * split them into one record each. Presentational: the caller says what each
 * does (the Repertoires section writes repertoires, CTA-61; the Analysis
 * Board loads a merge onto its board and saves a split, CTA-73), and this
 * only lays the choice out — the count, the skipped games, a Merge that says
 * why it is off when the games do not share a start, a Split that says how
 * many it makes, and the caller's problem, already worded.
 *
 * `labelKey` names the caller's locale block and `testId` the ids — each
 * screen's words are its own. A block since CTA-113: each action is a button
 * described by the help caption under it (`aria-describedby`), and the
 * problem is an `InlineAlert`.
 */
function MergeSplitChoice({ labelKey, testId, count, skipped, mergeable, onMerge, onSplit, problem }: MergeSplitChoiceProps) {
  const { t } = useTranslation();

  return (
    <Box
      data-testid={testId}
      sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
    >
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {t(`${labelKey}.title`, { count })}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t(`${labelKey}.explain`)}
        </Typography>
        {skipped > 0 && (
          <Typography
            variant="caption"
            data-testid={`${testId}-skipped`}
            sx={{ display: "block", color: "text.secondary", mt: 0.5 }}
          >
            {t(`${labelKey}.skipped`, { count: skipped })}
          </Typography>
        )}
      </Box>

      <Box>
        <Button
          variant="contained"
          startIcon={<CallMergeRoundedIcon />}
          disabled={!mergeable}
          onClick={onMerge}
          aria-describedby={`${testId}-merge-help`}
          data-testid={`${testId}-merge`}
        >
          {t(`${labelKey}.merge`)}
        </Button>
        <Typography
          id={`${testId}-merge-help`}
          variant="caption"
          sx={{ display: "block", color: "text.secondary", mt: 0.5 }}
        >
          {t(mergeable ? `${labelKey}.mergeHelp` : `${labelKey}.mergeUnavailable`)}
        </Typography>
      </Box>

      {onSplit !== undefined && (
        <Box>
          <Button
            variant="outlined"
            startIcon={<CallSplitRoundedIcon />}
            onClick={onSplit}
            aria-describedby={`${testId}-split-help`}
            data-testid={`${testId}-split`}
          >
            {t(`${labelKey}.split`, { count })}
          </Button>
          <Typography
            id={`${testId}-split-help`}
            variant="caption"
            sx={{ display: "block", color: "text.secondary", mt: 0.5 }}
          >
            {t(`${labelKey}.splitHelp`)}
          </Typography>
        </Box>
      )}

      {problem !== null && (
        <InlineAlert severity="error" testId={`${testId}-problem`}>
          {problem}
        </InlineAlert>
      )}
    </Box>
  );
}

export default MergeSplitChoice;
