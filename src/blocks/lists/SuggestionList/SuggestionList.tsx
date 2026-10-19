import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useTranslation } from "react-i18next";

import { IconAction } from "../../../design-system/components/toolbars";

export type SuggestionListProps = {
  /** The moves suggested, in SAN, in the order they were played. */
  moves: readonly string[];
  /** Take one off the list. Absent, the list is read only (a position already graded). */
  onRemove?: (san: string) => void;
  /** The root; the heading `-title`, a move `-<index>`, its remove `-<index>-remove`, none `-empty`. */
  testId: string;
};

/**
 * **The reader's suggested moves** at one position of the Accuracy Trainer
 * (CTA-238): each move played on the board joins the list, in SAN, and a
 * remove button named for it takes it off again. None: a line saying how to
 * add one. The list is announced as it changes (a polite live region), so a
 * move played on the board is heard to land.
 *
 * Presentational: the moves and the remove are props; the screen keeps the
 * list. Its words are `accuracyTrainer.suggestions.*`.
 */
function SuggestionList({ moves, onRemove, testId }: SuggestionListProps) {
  const { t } = useTranslation();
  return (
    <Box component="section" aria-labelledby={`${testId}-title`} data-testid={testId} sx={{ display: "grid", gap: 0.5 }}>
      <Typography id={`${testId}-title`} component="h3" variant="subtitle2" sx={{ fontWeight: 700 }}>
        {t("accuracyTrainer.suggestions.label")}
      </Typography>
      <Box aria-live="polite">
        {moves.length === 0 ? (
          <Typography variant="body2" data-testid={`${testId}-empty`} sx={{ color: "text.secondary" }}>
            {t("accuracyTrainer.suggestions.empty")}
          </Typography>
        ) : (
          <Box component="ol" aria-labelledby={`${testId}-title`} sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {moves.map((san, index) => (
              <Box
                component="li"
                key={san}
                data-testid={`${testId}-${index}`}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.25,
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  paddingInlineStart: 1,
                  paddingInlineEnd: onRemove === undefined ? 1 : 0,
                  minHeight: 32,
                }}
              >
                <Typography component="span" variant="body2" dir="ltr" sx={{ fontWeight: 600 }}>
                  {san}
                </Typography>
                {onRemove !== undefined && (
                  <IconAction label={t("accuracyTrainer.suggestions.remove", { san })} onClick={() => onRemove(san)} testId={`${testId}-${index}-remove`}>
                    <CloseRoundedIcon fontSize="small" />
                  </IconAction>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default SuggestionList;
