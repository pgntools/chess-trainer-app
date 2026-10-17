import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import { useTranslation } from "react-i18next";

/**
 * **Clear** — back to an empty board (the Analysis Board), the tree's own
 * start (the Openings explorer) or the repertoire as it arrived (the
 * repertoire player). On each board's Engine tab until CTA-181 took that tab
 * away: now under the Load tab (the Analysis Board, the Openings explorer)
 * and the Settings tab (the repertoire player's, until CTA-206 took it away —
 * its changes strip's Discard does that). What it clears is the screen's
 * `onClear`.
 */
export function ClearBoardButton({ onClear, testId }: { onClear: () => void; testId: string }) {
  const { t } = useTranslation();
  return (
    <Box sx={{ px: 1, pt: 2 }}>
      <Button variant="outlined" startIcon={<RestartAltRoundedIcon />} data-testid={testId} onClick={onClear}>
        {t("analysis.settings.clear")}
      </Button>
    </Box>
  );
}
